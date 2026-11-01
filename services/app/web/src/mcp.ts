// A read-only MCP server over Streamable HTTP. Stateless and answered with plain JSON (no event stream), which the
// transport allows, so there is no session to keep. Add tools to TOOLS; each one gets its arguments and returns text.
import { installSteps, summarize } from "./install";
import { SITE } from "./site";

const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

interface Tool {
	definition: {
		name: string;
		title: string;
		description: string;
		inputSchema: object;
		annotations: object;
	};
	/** The text to answer, or { error } for a tool error the model should see. */
	run(args: Record<string, unknown>): Promise<string | { error: string }>;
}

const TOOLS: Tool[] = [
	{
		definition: {
			name: "how_to_install",
			title: "How to install Run My Agents",
			description:
				"The commands that install Run My Agents, a Claude Code plugin that warns an agent before it edits a file another Claude session on the same computer just edited. Use it when someone runs several Claude Code sessions or agents on one repo and they overwrite each other.",
			inputSchema: {
				type: "object",
				properties: {
					client: {
						type: "string",
						description:
							"The coding agent to install it in. Only claude-code for now.",
					},
				},
			},
			annotations: {
				title: "How to install Run My Agents",
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
		},
		async run(args) {
			const steps = installSteps(String(args.client ?? "claude-code"));
			return steps
				? summarize(steps)
				: { error: "Only claude-code is supported for now." };
		},
	},
];

interface JsonRpcRequest {
	jsonrpc?: string;
	id?: string | number | null;
	method?: string;
	params?: Record<string, unknown>;
}

/** Answers one JSON-RPC message (or a batch); undefined when nothing is to be sent back (notifications). */
export async function handleMcp(body: unknown): Promise<unknown> {
	if (Array.isArray(body)) {
		const answers = (
			await Promise.all(body.map((m) => handleOne(m as JsonRpcRequest)))
		).filter((a) => a !== undefined);
		return answers.length ? answers : undefined;
	}
	return handleOne(body as JsonRpcRequest);
}

async function handleOne(message: JsonRpcRequest): Promise<unknown> {
	if (
		!message ||
		typeof message !== "object" ||
		typeof message.method !== "string"
	)
		return {
			jsonrpc: "2.0",
			id: message?.id ?? null,
			error: { code: -32600, message: "Invalid request" },
		};
	const { id, method, params = {} } = message;
	if (id === undefined || id === null) return undefined;
	const ok = (result: unknown) => ({ jsonrpc: "2.0", id, result });
	switch (method) {
		case "initialize": {
			const asked = String(params.protocolVersion ?? "");
			return ok({
				protocolVersion: PROTOCOL_VERSIONS.includes(asked)
					? asked
					: PROTOCOL_VERSIONS[0],
				capabilities: { tools: { listChanged: false } },
				serverInfo: {
					name: SITE.name.toLowerCase(),
					title: SITE.name,
					version: "1.0.0",
				},
				instructions: SITE.description,
			});
		}
		case "ping":
			return ok({});
		case "tools/list":
			return ok({ tools: TOOLS.map((t) => t.definition) });
		case "tools/call": {
			const tool = TOOLS.find((t) => t.definition.name === params.name);
			if (!tool)
				return {
					jsonrpc: "2.0",
					id,
					error: {
						code: -32602,
						message: `Unknown tool: ${String(params.name)}`,
					},
				};
			const out = await tool.run(
				(params.arguments as Record<string, unknown>) ?? {},
			);
			return typeof out === "string"
				? ok({ content: [{ type: "text", text: out }], isError: false })
				: ok({ content: [{ type: "text", text: out.error }], isError: true });
		}
		default:
			return {
				jsonrpc: "2.0",
				id,
				error: { code: -32601, message: `Method not found: ${method}` },
			};
	}
}
