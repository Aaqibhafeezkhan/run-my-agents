// The agents board: every Claude Code and Codex session on this computer as an agent with a face, its channel,
// its tokens against the limit, and skills for its job. Local only; started by `flisk up` or the Mac app.
import { spawn } from "node:child_process";
import { Hono } from "hono";
import { lowerModel, readLimits, setProjectModel, writeLimits } from "../../../../hooks/limits.mjs";
import { AGENTS } from "../../web/src/avatars";
import { PAGE } from "./page";
import { findClashes, readAllSessions, type Session } from "./sessions";
import SKILLS from "./skills.json";

/** The avatar for a session: its role's face, or for plain Code sessions one picked from the id. */
export function faceOf(s: Session) {
	const hash = [...s.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
	const a = (s.role !== "Code" && AGENTS.find((x) => x.role === s.role)) || AGENTS[hash % AGENTS.length];
	return { shape: a.shape, eyes: a.eyes, color: a.color };
}

/** Which roadmap skill categories fit each agent's job. */
const ROLE_CATS: Record<string, string[]> = {
	Code: ["code", "debug", "test"],
	Design: ["frontend"],
	Planner: ["plan", "review"],
	Chores: ["git", "ops"],
	SEO: ["docs", "frontend"],
	Social: ["docs"],
	Video: ["frontend", "docs"],
	Calls: ["docs", "plan"],
	Calendar: ["plan"],
};

/** Up to `n` skills for a role, Flisk's own first. */
export function skillsFor(role: string, n = 8) {
	const cats = ROLE_CATS[role] ?? ROLE_CATS.Code;
	return SKILLS.filter((s) => cats.includes(s.cat))
		.sort((a, b) => Number(b.source.startsWith("flisk-sh/")) - Number(a.source.startsWith("flisk-sh/")))
		.slice(0, n);
}

/**
 * Writes come only from this page: a JSON body (which a cross-site form cannot send without a preflight this
 * server never answers) and, when the browser sends one, a localhost Origin.
 */
function sameOrigin(c: { req: { header: (n: string) => string | undefined } }): boolean {
	if (!(c.req.header("content-type") ?? "").startsWith("application/json")) return false;
	const origin = c.req.header("origin");
	return !origin || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin);
}

/** Sessions with a message on its way, so a second send waits for the first reply. */
const sending = new Set<string>();
const PROMPT_LIMIT = 20_000;

/**
 * Sends one message into an existing session, headless, the way FliskOS drives agents: Claude Code with
 * `claude -p --resume`, Codex with `codex exec resume`. The prompt goes on stdin, never into argv. The reply lands
 * in the session's own transcript, which the board already reads.
 */
export function sendToSession(s: Session, text: string, run = spawn): Promise<void> {
	const [cmd, args] =
		s.agent === "codex"
			? ["codex", ["exec", "--skip-git-repo-check", "--sandbox", "workspace-write", "resume", s.id]]
			: ["claude", ["-p", "--resume", s.id, "--permission-mode", "acceptEdits"]];
	return new Promise((resolve, reject) => {
		const child = run(cmd, args as string[], { cwd: s.cwd || undefined, stdio: ["pipe", "ignore", "ignore"] });
		child.on("error", reject);
		child.on("close", () => resolve());
		child.stdin?.end(text);
	});
}

export function createApp(read = () => readAllSessions(), send = sendToSession) {
	const app = new Hono();
	app.get("/health", (c) => c.json({ status: "ok", service: "board" }));
	app.get("/ready", (c) => c.json({ ready: true }));
	app.get("/api/sessions", (c) => {
		const sessions = read();
		const limits = readLimits();
		return c.json({
			sessions: sessions.map((s) => ({
				...s,
				face: faceOf(s),
				lower: s.agent === "claude" ? lowerModel(s.model) : null,
				skills: skillsFor(s.role),
				sending: sending.has(s.id),
			})),
			clashes: findClashes(sessions),
			limits,
		});
	});
	app.post("/api/limits", async (c) => {
		if (!sameOrigin(c)) return c.json({ error: "Send JSON from the board." }, 403);
		return c.json(writeLimits(await c.req.json().catch(() => ({}))));
	});
	// Moves a Claude project's new sessions one step down the model ladder. Never up: the target is computed
	// here from the session's own model, not taken from the request.
	app.post("/api/downgrade", async (c) => {
		if (!sameOrigin(c)) return c.json({ error: "Send JSON from the board." }, 403);
		const { id } = (await c.req.json().catch(() => ({}))) as { id?: string };
		const s = read().find((x) => x.id === id && x.agent === "claude");
		const lower = s ? lowerModel(s.model) : null;
		if (!s || !s.cwd || !lower) return c.json({ error: "No cheaper model for this session." }, 400);
		return c.json({ model: lower, file: setProjectModel(s.cwd, lower) });
	});
	app.post("/api/send", async (c) => {
		if (!sameOrigin(c)) return c.json({ error: "Send JSON from the board." }, 403);
		const { id, text } = (await c.req.json().catch(() => ({}))) as { id?: string; text?: string };
		const message = String(text ?? "").trim();
		if (!message) return c.json({ error: "Type a message first." }, 400);
		if (message.length > PROMPT_LIMIT) return c.json({ error: "That message is too long." }, 400);
		const s = read().find((x) => x.id === id);
		if (!s) return c.json({ error: "That session is gone." }, 404);
		if (sending.has(s.id)) return c.json({ error: `${s.role} is still answering your last message.` }, 409);
		sending.add(s.id);
		send(s, message)
			.catch((e) => console.error(`send to ${s.id} failed:`, e))
			.finally(() => sending.delete(s.id));
		return c.json({ sent: true }, 202);
	});
	app.get("/", (c) => c.html(PAGE));
	return app;
}

if (import.meta.main) {
	const port = Number(process.env.PORT || 4100);
	Bun.serve({ port, hostname: "127.0.0.1", fetch: createApp().fetch });
	console.log(`Run My Agents board on http://localhost:${port}`);
}
