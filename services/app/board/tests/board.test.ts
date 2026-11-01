import { describe, expect, it } from "bun:test";
import { createApp } from "../src/index";
import { findClashes, guessRole, parseSession } from "../src/sessions";

const line = (o: object) => JSON.stringify(o);
const now = Date.parse("2026-11-01T12:00:00Z");
const edit = (file: string, ts = "2026-11-01T11:58:00Z") =>
	line({
		type: "assistant",
		cwd: "/repo",
		gitBranch: "main",
		timestamp: ts,
		message: { content: [{ type: "text", text: "Fixing it." }, { type: "tool_use", name: "Edit", input: { file_path: file } }] },
	});
const ask = (text: string) => line({ type: "user", cwd: "/repo", message: { content: text } });

describe("sessions", () => {
	it("reads the title, last words, last tool and edited files", () => {
		const s = parseSession("abc", [ask("fix the login bug"), "not json", edit("/repo/src/api.ts")], now);
		expect(s?.title).toBe("fix the login bug");
		expect(s?.said).toBe("Fixing it.");
		expect(s?.doing).toBe("Edit api.ts");
		expect(s?.edits.map((e) => e.file)).toEqual(["/repo/src/api.ts"]);
		expect(s?.role).toBe("Code");
	});

	it("skips transcripts with no conversation", () => {
		expect(parseSession("x", [line({ type: "summary" })], now)).toBeUndefined();
	});

	it("guesses roles from the title and files", () => {
		expect(guessRole("redesign the pricing page", [])).toBe("Design");
		expect(guessRole("x", ["/repo/public/sitemap.xml"])).toBe("SEO");
		expect(guessRole("cut the demo video", [])).toBe("Video");
	});

	it("reports a file edited by two sessions within 10 minutes, not older edits", () => {
		const a = parseSession("a", [ask("one"), edit("/repo/api.ts")], now);
		const b = parseSession("b", [ask("two"), edit("/repo/api.ts")], now);
		const old = parseSession("c", [ask("three"), edit("/repo/api.ts", "2026-11-01T10:00:00Z")], now);
		const clashes = findClashes([a, b, old].filter((s) => s !== undefined), now);
		expect(clashes).toEqual([{ file: "/repo/api.ts", sessions: ["a", "b"] }]);
	});
});

describe("board", () => {
	it("serves the page and the sessions with a face and the clash", async () => {
		const a = parseSession("a", [ask("fix <b>one</b>"), edit("/repo/api.ts")], Date.now());
		const b = parseSession("b", [ask("two"), edit("/repo/api.ts")], Date.now());
		const sessions = [a, b].filter((s) => s !== undefined);
		for (const s of sessions) s.edits = s.edits.map((e) => ({ ...e, at: Date.now() }));
		const app = createApp(() => sessions);
		expect(await (await app.request("/")).text()).toContain('<nav class="side" id="side">');
		const json = await (await app.request("/api/sessions")).json();
		expect(json.sessions).toHaveLength(2);
		expect(json.sessions[0].face.shape).toBeString();
		expect(json.sessions[0].feed.map((f: { who: string }) => f.who)).toEqual(["you", "agent"]);
		expect(json.clashes).toEqual([{ file: "/repo/api.ts", sessions: ["a", "b"] }]);
	});

	it("escapes text in the page script, not the server", async () => {
		const html = await (await createApp(() => []).request("/")).text();
		expect(html).toContain("const esc=");
		expect(html).toContain("No Claude Code sessions in the last hour");
	});
});

describe("codex, limits and skills", () => {
	it("reads a Codex rollout: id, model, tokens without cache reads, and the turns", async () => {
		const { parseCodexSession } = await import("../src/sessions");
		const s = parseCodexSession(
			[
				line({ type: "session_meta", payload: { id: "cx1", cwd: "/repo" } }),
				line({ type: "turn_context", payload: { model: "gpt-6" } }),
				line({ type: "response_item", payload: { type: "message", role: "user", content: [{ text: "add a sitemap" }] } }),
				line({ type: "response_item", payload: { type: "message", role: "assistant", content: [{ text: "Done." }] } }),
				line({ type: "response_item", payload: { type: "custom_tool_call", name: "exec" } }),
				line({ type: "event_msg", payload: { type: "token_count", info: { total_token_usage: { input_tokens: 1000, cached_input_tokens: 800, output_tokens: 50 } } } }),
			],
			now,
		);
		expect(s).toMatchObject({ id: "cx1", agent: "codex", model: "gpt-6", role: "SEO", tokens: { used: 250, cached: 800 } });
		expect(s?.feed.map((f) => f.who)).toEqual(["you", "agent"]);
		expect(s?.feed[1].tools).toEqual(["exec"]);
	});

	it("only ever moves a model down the ladder", async () => {
		const { lowerModel } = await import("../../../../hooks/limits.mjs");
		expect(lowerModel("claude-opus-5-5")).toBe("sonnet");
		expect(lowerModel("claude-sonnet-5-5")).toBe("haiku");
		expect(lowerModel("claude-haiku-5-5")).toBeNull();
		expect(lowerModel("gpt-6")).toBeNull();
	});

	it("refuses writes that are not JSON or come from another site", async () => {
		const app = createApp(() => []);
		expect((await app.request("/api/limits", { method: "POST", body: "sessionTokens=1" })).status).toBe(403);
		const evil = await app.request("/api/limits", {
			method: "POST",
			headers: { "content-type": "application/json", origin: "https://evil.example" },
			body: "{}",
		});
		expect(evil.status).toBe(403);
	});

	it("will not downgrade a session that is already on the cheapest model", async () => {
		const s = parseSession("h", [ask("x"), line({ type: "assistant", message: { model: "claude-haiku-5-5", content: [{ type: "text", text: "hi" }] } })], now);
		const app = createApp(() => (s ? [s] : []));
		const res = await app.request("/api/downgrade", { method: "POST", headers: { "content-type": "application/json" }, body: '{"id":"h"}' });
		expect(res.status).toBe(400);
	});

	it("suggests skills for each role from the roadmap catalog", async () => {
		const { skillsFor } = await import("../src/index");
		expect(skillsFor("Design").every((k) => k.cat === "frontend")).toBe(true);
		expect(skillsFor("Code").length).toBe(8);
	});
});
