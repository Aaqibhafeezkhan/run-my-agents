// The agents board: every Claude Code session on this computer as a card with a face, what it is doing and the
// files it touched, and a warning when two sessions edit the same file. Local only; started by `flisk up`.
import { Hono } from "hono";
import { AGENTS, avatar } from "../../web/src/avatars";
import { type Clash, findClashes, readSessions, type Session } from "./sessions";

const esc = (s: string) =>
	s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

function ago(ms: number): string {
	const s = Math.round(ms / 1000);
	if (s < 60) return `${s}s ago`;
	const m = Math.round(s / 60);
	return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}

function face(s: Session, size = 56): string {
	// A known role keeps its own face; plain Code sessions get one picked from their id, so no two look alike.
	const hash = [...s.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
	const base = (s.role !== "Code" && AGENTS.find((a) => a.role === s.role)) || AGENTS[hash % AGENTS.length];
	// Busy agents look at the work; quiet ones look down.
	const busy = Date.now() - s.updatedAt < 60_000;
	return avatar({ ...base, look: busy ? base.look : "down" }, size);
}

const STYLE = `
:root{color-scheme:dark;--bg:#08080c;--surface:#111117;--text:#ececf1;--muted:rgba(236,236,241,.7);--faint:rgba(236,236,241,.48);--line:rgba(255,255,255,.08);--accent:#22c55e;--accent-text:#6ee7a0;--tint:rgba(34,197,94,.12);--warn:#f59e0b;--hold:#f43f5e;--body:"Satoshi","DM Sans",system-ui,-apple-system,sans-serif;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace}
@media (prefers-color-scheme:light){:root{color-scheme:light;--bg:#f6f6f4;--surface:#fff;--text:#16161a;--muted:#52525b;--faint:#71717a;--line:rgba(0,0,0,.09);--accent-text:#15803d;--tint:rgba(34,197,94,.1);--warn:#b45309}}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(60rem 30rem at 85% -10%,rgba(34,197,94,.07),transparent 70%),var(--bg);color:var(--text);font:15px/1.5 var(--body);-webkit-font-smoothing:antialiased}
.wrap{max-width:72rem;margin:0 auto;padding:0 16px}
header{display:flex;align-items:center;gap:12px;height:60px;border-bottom:1px solid var(--line);margin-bottom:24px}
header h1{font-size:1.1rem;margin:0}header span{color:var(--faint);font:.8rem var(--mono);margin-left:auto}
.alert{border:1px solid var(--warn);background:rgba(245,158,11,.08);border-radius:14px;padding:12px 16px;margin:0 0 20px;color:var(--warn)}
.alert code{font:.85rem var(--mono)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(20rem,1fr));gap:14px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px}
.card.clash{border-color:var(--warn)}
.top{display:flex;gap:12px;align-items:center}.top b{display:block}.top small{color:var(--faint);font:.75rem var(--mono)}
.st{margin-left:auto;font:600 .7rem var(--mono);border-radius:999px;padding:3px 10px;white-space:nowrap}
.live{color:var(--accent-text);background:var(--tint)}.idle{color:var(--faint);background:var(--line)}
.title{font-weight:600}.said{color:var(--muted);font-size:.9rem;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.doing{font:.8rem var(--mono);color:var(--accent-text)}
.files{display:flex;flex-wrap:wrap;gap:6px}.files code{font:.72rem var(--mono);background:var(--line);border-radius:6px;padding:2px 7px}.files code.hot{background:rgba(245,158,11,.18);color:var(--warn)}
.resume{font:.72rem var(--mono);color:var(--faint);user-select:all}
.empty{color:var(--muted);text-align:center;padding:80px 0}
.ava{display:block;flex:none}
`;

export function boardPage(sessions: Session[], clashes: Clash[], now = Date.now()): string {
	const hot = new Set(clashes.map((c) => c.file));
	const names = new Map(sessions.map((s) => [s.id, `${s.role} (${s.id.slice(0, 6)})`]));
	const alerts = clashes
		.map(
			(c) =>
				`<p class="alert">⚠ ${c.sessions.map((id) => esc(names.get(id) ?? id.slice(0, 6))).join(" and ")} both edited <code>${esc(c.file)}</code> in the last 10 minutes.</p>`,
		)
		.join("");
	const cards = sessions
		.map((s) => {
			const live = now - s.updatedAt < 2 * 60_000;
			const files = [...new Set(s.edits.map((e) => e.file))].slice(-5);
			const clash = files.some((f) => hot.has(f));
			return `<article class="card${clash ? " clash" : ""}">
<div class="top">${face(s)}<div><b>${esc(s.role)}</b><small>${esc(s.branch || s.cwd.split("/").pop() || "")} · ${ago(now - s.updatedAt)}</small></div><em class="st ${live ? "live" : "idle"}">${live ? "working" : "idle"}</em></div>
<div class="title">${esc(s.title || "Untitled session")}</div>
${s.said ? `<div class="said">${esc(s.said)}</div>` : ""}
${s.doing ? `<div class="doing">→ ${esc(s.doing)}</div>` : ""}
${files.length ? `<div class="files">${files.map((f) => `<code class="${hot.has(f) ? "hot" : ""}" title="${esc(f)}">${esc(f.split("/").pop() ?? f)}</code>`).join("")}</div>` : ""}
<div class="resume">cd ${esc(s.cwd)} &amp;&amp; claude --resume ${esc(s.id)}</div>
</article>`;
		})
		.join("");
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="5"><title>Run My Agents · Board</title><style>${STYLE}</style></head><body><div class="wrap">
<header><h1>Run My Agents</h1><span>${sessions.length} sessions in the last hour · refreshes every 5s</span></header>
${alerts}
${sessions.length ? `<div class="grid">${cards}</div>` : `<p class="empty">No Claude Code sessions in the last hour. Start one and it shows up here.</p>`}
</div></body></html>`;
}

export function createApp(read = () => readSessions()) {
	const app = new Hono();
	app.get("/health", (c) => c.json({ status: "ok", service: "board" }));
	app.get("/ready", (c) => c.json({ ready: true }));
	app.get("/api/sessions", (c) => {
		const sessions = read();
		return c.json({ sessions, clashes: findClashes(sessions) });
	});
	app.get("/", (c) => {
		const sessions = read();
		return c.html(boardPage(sessions, findClashes(sessions)));
	});
	return app;
}

if (import.meta.main) {
	const port = Number(process.env.PORT || 4100);
	Bun.serve({ port, hostname: "127.0.0.1", fetch: createApp().fetch });
	console.log(`Run My Agents board on http://localhost:${port}`);
}
