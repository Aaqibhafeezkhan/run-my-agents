// The agents board: every Claude Code session on this computer as a card with a face, what it is doing and the
// files it touched, and a warning when two sessions edit the same file. Local only; started by `flisk up`.
import { Hono } from "hono";
import { AGENTS } from "../../web/src/avatars";
import { PAGE } from "./page";
import { findClashes, readSessions, type Session } from "./sessions";

/** The avatar for a session: its role's face, or for plain Code sessions one picked from the id. */
export function faceOf(s: Session) {
	const hash = [...s.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
	const a = (s.role !== "Code" && AGENTS.find((x) => x.role === s.role)) || AGENTS[hash % AGENTS.length];
	return { shape: a.shape, eyes: a.eyes, color: a.color };
}

export function createApp(read = () => readSessions()) {
	const app = new Hono();
	app.get("/health", (c) => c.json({ status: "ok", service: "board" }));
	app.get("/ready", (c) => c.json({ ready: true }));
	app.get("/api/sessions", (c) => {
		const sessions = read();
		return c.json({
			sessions: sessions.map((s) => ({ ...s, face: faceOf(s) })),
			clashes: findClashes(sessions),
		});
	});
	app.get("/", (c) => c.html(PAGE));
	return app;
}

if (import.meta.main) {
	const port = Number(process.env.PORT || 4100);
	Bun.serve({ port, hostname: "127.0.0.1", fetch: createApp().fetch });
	console.log(`Run My Agents board on http://localhost:${port}`);
}
