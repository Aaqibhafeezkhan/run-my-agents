// Reads the Claude Code sessions on this computer from ~/.claude/projects/*/*.jsonl, the transcripts Claude Code
// writes itself. Nothing is sent anywhere and no sign-in is needed.
//
//   ~/.claude/projects/<folder>/<session>.jsonl ──► Session { title, last words, files edited, role }
//   files edited by 2+ sessions in the last 10 min ──► Clash

import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

export interface Session {
	id: string;
	cwd: string;
	branch: string;
	title: string;
	/** The last thing the agent said. */
	said: string;
	/** The last tool it used, like "Edit api.ts". */
	doing: string;
	/** Files it edited, newest last, with the time of the edit. */
	edits: { file: string; at: number }[];
	updatedAt: number;
	role: string;
	/** The last few turns, oldest first, for the agent's channel. */
	feed: FeedItem[];
}

export interface FeedItem {
	at: number;
	who: "you" | "agent";
	text: string;
	tools: string[];
}

const FEED_SIZE = 12;

export interface Clash {
	file: string;
	sessions: string[];
}

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

/** Guesses what kind of agent a session is from its title and the files it touched. */
export function guessRole(title: string, files: string[]): string {
	const text = `${title} ${files.join(" ")}`.toLowerCase();
	const rules: [string, RegExp][] = [
		["Video", /video|film|ffmpeg|\.mp4|gif|record/],
		["SEO", /\bseo\b|sitemap|robots\.txt|meta tag|canonical|search console/],
		["Social", /tweet|post on|linkedin|reddit|product ?hunt|launch post|\bhn\b|social/],
		["Design", /design|\.css|style|layout|ui\b|avatar|figma|logo|icon/],
		["Calendar", /calendar|schedule|meeting|week plan/],
		["Calls", /\bcall\b|transcript|interview|notes\//],
		["Planner", /plan|roadmap|prd|spec|todo|review/],
		["Chores", /bump|dependenc|lint|format|cleanup|rename|upgrade|ci\b/],
	];
	for (const [role, re] of rules) if (re.test(text)) return role;
	return "Code";
}

function textOf(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.filter((c) => c?.type === "text")
		.map((c) => String(c.text ?? ""))
		.join(" ");
}

/** One transcript to a Session, or undefined when it has no conversation in it. */
export function parseSession(id: string, lines: string[], updatedAt: number): Session | undefined {
	const s: Session = { id, cwd: "", branch: "", title: "", said: "", doing: "", edits: [], updatedAt, role: "Code", feed: [] };
	for (const line of lines) {
		let e: {
			type?: string;
			cwd?: string;
			gitBranch?: string;
			timestamp?: string;
			isMeta?: boolean;
			message?: { content?: unknown };
		};
		try {
			e = JSON.parse(line);
		} catch {
			continue;
		}
		if (e.cwd) s.cwd = e.cwd;
		if (e.gitBranch) s.branch = e.gitBranch;
		const at = e.timestamp ? Date.parse(e.timestamp) : updatedAt;
		if (e.type === "user" && !e.isMeta && !s.title) {
			const t = textOf(e.message?.content).trim();
			if (t && !t.startsWith("<")) s.title = t.split("\n")[0].slice(0, 90);
		}
		if (e.type === "user" && !e.isMeta) {
			const t = textOf(e.message?.content).trim();
			if (t && !t.startsWith("<")) s.feed.push({ at, who: "you", text: t.slice(0, 400), tools: [] });
		}
		if (e.type === "assistant" && Array.isArray(e.message?.content)) {
			const words = textOf(e.message.content).trim();
			if (words) s.said = words.replace(/\s+/g, " ").slice(0, 160);
			const last = s.feed[s.feed.length - 1];
			const item =
				last?.who === "agent" ? last : { at, who: "agent" as const, text: "", tools: [] as string[] };
			if (item !== last) s.feed.push(item);
			if (words) item.text = words.slice(0, 600);
			item.at = at;
			for (const c of e.message.content as { type?: string; name?: string; input?: Record<string, unknown> }[]) {
				if (c?.type !== "tool_use" || !c.name) continue;
				const file = String(c.input?.file_path ?? c.input?.notebook_path ?? "");
				s.doing = file ? `${c.name} ${basename(file)}` : c.name.replace(/^mcp__[^_]+__/, "");
				if (file && EDIT_TOOLS.has(c.name)) s.edits.push({ file, at });
				if (item.tools.length < 6) item.tools.push(s.doing);
			}
		}
	}
	if (!s.title && !s.said) return undefined;
	s.feed = s.feed.filter((f) => f.text || f.tools.length).slice(-FEED_SIZE);
	s.role = guessRole(s.title, s.edits.map((x) => x.file));
	return s;
}

/** Files edited by two or more sessions within the window. */
export function findClashes(sessions: Session[], now = Date.now(), windowMs = 10 * 60_000): Clash[] {
	const byFile = new Map<string, Set<string>>();
	for (const s of sessions)
		for (const e of s.edits)
			if (now - e.at < windowMs) byFile.set(e.file, (byFile.get(e.file) ?? new Set()).add(s.id));
	return [...byFile]
		.filter(([, ids]) => ids.size > 1)
		.map(([file, ids]) => ({ file, sessions: [...ids] }));
}

/** Sessions whose transcript changed within maxAgeMs, newest first. */
export function readSessions(
	root = process.env.CLAUDE_PROJECTS_DIR || join(homedir(), ".claude", "projects"),
	maxAgeMs = 60 * 60_000,
	now = Date.now(),
): Session[] {
	const out: Session[] = [];
	let folders: string[] = [];
	try {
		folders = readdirSync(root);
	} catch {
		return out;
	}
	for (const folder of folders) {
		let files: string[] = [];
		try {
			files = readdirSync(join(root, folder)).filter((f) => f.endsWith(".jsonl"));
		} catch {
			continue;
		}
		for (const f of files) {
			const path = join(root, folder, f);
			const mtime = statSync(path).mtimeMs;
			if (now - mtime > maxAgeMs) continue;
			const s = parseSession(f.replace(/\.jsonl$/, ""), readFileSync(path, "utf8").split("\n"), mtime);
			if (s) out.push(s);
		}
	}
	return out.sort((a, b) => b.updatedAt - a.updatedAt);
}
