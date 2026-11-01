// What you decided about agents, kept on this computer in ~/.run-my-agents/roles.json: the type (role) you gave a
// session, which beats the board's guess. Also the type chosen for a Codex session that was just started and has
// no id yet, matched to its session once it shows up.

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { AGENTS } from "../../web/src/avatars";
import type { Session } from "./sessions";

export const ROLES: string[] = AGENTS.map((a) => a.role);

/** Read on every call, so a different RUN_MY_AGENTS_DIR (tests, a second profile) just works. */
const file = () => join(process.env.RUN_MY_AGENTS_DIR || join(homedir(), ".run-my-agents"), "roles.json");

export function readRoles(): Record<string, string> {
	try {
		const raw = JSON.parse(readFileSync(file(), "utf8")) as Record<string, unknown>;
		return Object.fromEntries(Object.entries(raw).filter(([, v]) => ROLES.includes(String(v)))) as Record<string, string>;
	} catch {
		return {};
	}
}

/** Gives a session a type, or with null goes back to the board's guess. */
export function setRole(id: string, role: string | null): void {
	const roles = readRoles();
	if (role && ROLES.includes(role)) roles[id] = role;
	else delete roles[id];
	mkdirSync(dirname(file()), { recursive: true });
	const tmp = `${file()}.${process.pid}.tmp`;
	writeFileSync(tmp, JSON.stringify(roles, null, 2));
	renameSync(tmp, file());
}

interface Pending {
	agent: string;
	cwd: string;
	/** The first line of the prompt, which is how the new session's title starts. */
	prefix: string;
	role: string;
	at: number;
}
const pending: Pending[] = [];

export function addPending(p: Omit<Pending, "at">): void {
	pending.push({ ...p, at: Date.now() });
}

/** Applies your types to the sessions, and hands a just-started session the type chosen for it. */
export function applyRoles(sessions: Session[]): Session[] {
	const now = Date.now();
	for (let i = pending.length - 1; i >= 0; i--) {
		const p = pending[i];
		if (now - p.at > 10 * 60_000) {
			pending.splice(i, 1);
			continue;
		}
		const fits = sessions.filter((s) => s.agent === p.agent && s.title.startsWith(p.prefix) && s.updatedAt >= p.at - 5000);
		const found = fits.find((s) => s.cwd === p.cwd) ?? (fits.length === 1 ? fits[0] : undefined);
		if (found) {
			setRole(found.id, p.role);
			pending.splice(i, 1);
		}
	}
	const roles = readRoles();
	for (const s of sessions)
		if (roles[s.id]) {
			s.role = roles[s.id];
			s.roleSet = true;
		}
	return sessions;
}
