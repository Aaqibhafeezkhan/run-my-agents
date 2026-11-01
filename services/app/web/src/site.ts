// Everything about the product that shows up in search results, link previews, AI answers and the app's own pages.
// Titles, meta tags, JSON-LD, robots.txt, sitemap.xml, llms.txt, site.webmanifest and security.txt are built from it.

export const SITE = {
	name: "Run My Agents",
	/** Under 60 characters: the <title> of the home page and the Product Hunt tagline. */
	tagline: "Run many Claude Code agents on one repo, safely",
	/** 140 to 160 characters: the meta description and the link preview text. */
	description:
		"A free Claude Code plugin: before an agent edits a file another session just changed, it gets a warning. No server, no account, no keys. Open source.",
	/** Where the site lives online, ending in a slash. PUBLIC_URL overrides it at run time. */
	url: "https://run-my-agents.flisk.si/",
	repo: "https://github.com/flisk-sh/run-my-agents",
	lang: "en",
	locale: "en_US",
	/** The organization or person behind it, for JSON-LD and the footer. */
	author: { name: "Flisk", url: "https://flisk.sh" },
	/** An X handle with the @, or empty. */
	twitter: "",
	/** Matches the background of the page in each color scheme (roadmap.flisk.si colors). */
	themeColor: { light: "#f6f6f4", dark: "#08080c" },
	/** Where to report a security problem, for /.well-known/security.txt. */
	securityContact:
		"https://github.com/flisk-sh/run-my-agents/security/advisories/new",
	/** Shown on /about and sent as FAQPage JSON-LD. Write the questions people type into search and AI assistants. */
	faq: [
		{
			q: "How do I run multiple Claude Code sessions on one repo without conflicts?",
			a: "Install Run My Agents. Before a session edits a file that another session on your computer edited in the last 10 minutes, the edit is stopped once with a note naming the other session. The agent re-reads the file and carries on.",
		},
		{
			q: "Does it lock files?",
			a: "No. It is a warning, not a lock: if the agent makes the same edit again, it goes through.",
		},
		{
			q: "Does it work with worktrees?",
			a: "Yes. It matches files by their full path on disk, so sessions in the same folder are matched. Sessions in different worktrees are separate copies and cannot overwrite each other.",
		},
		{
			q: "What is stored, and where?",
			a: "Only which session edited which file and when, in ~/.run-my-agents/claims.json on your computer. Nothing leaves your machine.",
		},
		{
			q: "What does it not catch yet?",
			a: "Sessions on other computers, edits made through shell commands such as sed, and overlaps inside a file at the line level.",
		},
	],
} as const;
