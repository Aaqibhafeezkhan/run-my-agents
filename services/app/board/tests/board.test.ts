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
