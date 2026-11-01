// The pages, rendered on the server with no JavaScript (the Content-Security-Policy allows none): home, about with
// the FAQ, and not found. Each one passes its own PageMeta to head(), which writes every SEO tag. The look is the
// roadmap.flisk.si one: dark first, Satoshi and JetBrains Mono when installed, one green accent.
import { installSteps } from "./install";
import { esc, faqJsonLd, head, type PageMeta } from "./seo";
import { SITE } from "./site";

const STYLE = `
:root{color-scheme:dark;--bg:${SITE.themeColor.dark};--glow:rgba(34,197,94,.07);--surface:#111117;--text:#ececf1;--muted:rgba(236,236,241,.7);--faint:rgba(236,236,241,.48);--line:rgba(255,255,255,.08);--line-strong:rgba(255,255,255,.2);--accent:#22c55e;--accent-text:#6ee7a0;--accent-tint:rgba(34,197,94,.12);--warn:#f59e0b;--shadow:0 18px 50px rgba(0,0,0,.55),0 2px 8px rgba(0,0,0,.4);--body:"Satoshi","DM Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"JetBrains Mono",ui-monospace,"SF Mono",Menlo,Consolas,monospace}
@media (prefers-color-scheme:light){:root{color-scheme:light;--bg:${SITE.themeColor.light};--glow:rgba(34,197,94,.08);--surface:#fff;--text:#16161a;--muted:#52525b;--faint:#71717a;--line:rgba(0,0,0,.09);--line-strong:rgba(0,0,0,.22);--accent-text:#15803d;--accent-tint:rgba(34,197,94,.1);--warn:#b45309;--shadow:0 18px 50px rgba(0,0,0,.16),0 2px 8px rgba(0,0,0,.08)}}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(60rem 30rem at 85% -10%,var(--glow),transparent 70%),radial-gradient(40rem 24rem at -10% 20%,rgba(14,165,233,.05),transparent 70%),var(--bg);color:var(--text);font:16px/1.55 var(--body);-webkit-font-smoothing:antialiased}
a{color:var(--accent-text)}.wrap{max-width:56rem;margin:0 auto;padding:0 16px}
header.top{border-bottom:1px solid var(--line)}header.top .wrap{display:flex;align-items:center;gap:12px;height:56px}
header.top a{color:var(--muted);text-decoration:none;font-size:.9rem}header.top a:first-child{color:var(--text);font-weight:700;font-size:1rem;display:flex;gap:8px;align-items:center;margin-right:auto}
.hero{padding:72px 0 40px}
.pill{display:inline-block;font:500 .75rem var(--mono);color:var(--accent-text);background:var(--accent-tint);border-radius:999px;padding:4px 12px}
h1{font-size:clamp(2.4rem,7vw,4rem);line-height:1.05;letter-spacing:-.03em;margin:18px 0 16px;font-weight:900}h1 span{color:var(--accent)}
.lede{font-size:1.2rem;color:var(--muted);max-width:38rem;margin:0 0 28px}
.install{background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);overflow:hidden}
.install .bar{padding:10px 16px;border-bottom:1px solid var(--line);font-size:.8rem;color:var(--faint)}
pre{margin:0;padding:16px;font:.9rem/1.7 var(--mono);overflow-x:auto}.p{color:var(--faint);user-select:none}
.meta{margin-top:14px;color:var(--faint);font-size:.9rem}
section{padding:40px 0}h2{font-size:1.6rem;letter-spacing:-.02em;margin:0 0 8px}.sub{color:var(--muted);margin:0 0 24px}
.term{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px;font:.85rem/1.7 var(--mono)}
.who{color:var(--faint)}.ok{color:var(--accent-text)}.warn{color:var(--warn)}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:14px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px}
.card .n{font:.8rem var(--mono);color:var(--accent-text)}.card h3{margin:6px 0;font-size:1.05rem}.card p{margin:0;color:var(--muted);font-size:.95rem}
ul.limits{margin:0;padding-left:20px;color:var(--muted)}
dt{font-weight:700;margin-top:20px;font-size:1.05rem}dd{margin:6px 0 0;color:var(--muted)}
.prose{padding:56px 0 0}
footer{margin-top:48px;border-top:1px solid var(--line);padding:24px 0 40px;color:var(--faint);font-size:.85rem}
`;

function layout(base: string, meta: PageMeta, body: string): string {
	const root = new URL(`${base}/`).pathname.replace(/\/$/, "");
	return `<!doctype html><html lang="${SITE.lang}"><head>
${head(base, meta)}
<style>${STYLE}</style></head><body>
<header class="top"><nav class="wrap" aria-label="Site"><a href="${root}/"><img src="${root}/icon.svg" alt="" width="20" height="20">${esc(SITE.name)}</a><a href="${root}/about">About</a><a href="${SITE.repo}">GitHub</a></nav></header>
<main>${body}</main>
<footer><div class="wrap">MIT licensed. Made by <a href="${SITE.author.url}">${esc(SITE.author.name)}</a> and run locally with <a href="https://github.com/flisk-sh/flisk">Flisk</a>. <a href="${SITE.repo}">Source on GitHub</a>.</div></footer>
</body></html>`;
}

function installBox(): string {
	const steps = installSteps();
	if (!steps) return "";
	return `<div class="install"><div class="bar">In Claude Code</div><pre>${steps.commands
		.map((c) => `<span class="p">&gt; </span>${esc(c)}`)
		.join("\n")}</pre></div>`;
}

export function homePage(base: string): string {
	return layout(
		base,
		{
			path: "",
			title: `${SITE.name}: ${SITE.tagline}`,
			description: SITE.description,
		},
		`<div class="wrap"><div class="hero"><span class="pill">Free Claude Code plugin</span>
<h1>Run My <span>Agents</span></h1>
<p class="lede">Run many Claude Code sessions on one repo, and stop them overwriting each other's work.</p>
${installBox()}
<p class="meta">No server. No account. No keys. Everything stays on your computer.</p></div>
<section><h2>What your agent sees</h2><p class="sub">Session 2 tries to edit a file session 1 changed two minutes ago.</p>
<div class="term"><div><span class="who">session 1 ·</span> Edit api.ts <span class="ok">✓</span></div>
<div><span class="who">session 2 ·</span> Edit api.ts</div>
<div class="warn">⚠ Another Claude session (9d5f2846 on branch fix-login) edited api.ts 2 min ago.</div>
<div class="warn">&nbsp;&nbsp;Read the file again first, or work on a different file.</div>
<div><span class="who">session 2 ·</span> Read api.ts, then Edit api.ts <span class="ok">✓ nothing lost</span></div></div></section>
<section><h2>How it works</h2><p class="sub">One small hook. A warning, not a lock.</p><div class="steps">
<div class="card"><div class="n">01</div><h3>Every edit is noted</h3><p>Before Claude edits a file, the hook writes down which session touched it.</p></div>
<div class="card"><div class="n">02</div><h3>Overlaps get a warning</h3><p>If another session edited that file in the last 10 minutes, the edit stops once, with a note.</p></div>
<div class="card"><div class="n">03</div><h3>The agent carries on</h3><p>It re-reads the file and edits again. A second try always goes through.</p></div></div></section>
<section><h2>What it doesn't do yet</h2><ul class="limits"><li>It only sees sessions on this computer.</li><li>It doesn't see edits made through shell commands like <code>sed</code>.</li><li>It matches whole files, not lines.</li></ul></section></div>`,
	);
}

export function aboutPage(base: string): string {
	return layout(
		base,
		{
			path: "about",
			title: "About and FAQ",
			description:
				`How ${SITE.name} works, what it stores and what it does not catch yet. ${SITE.tagline}.`.slice(
					0,
					160,
				),
			jsonLd: [faqJsonLd()],
			crumbs: [{ name: "About", path: "about" }],
		},
		`<div class="wrap prose"><h1>About ${esc(SITE.name)}</h1>
<p class="lede">${esc(SITE.description)}</p>
${installBox()}
<h2 style="margin-top:40px">Questions</h2>
<dl>${SITE.faq.map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join("")}</dl>
<h2 style="margin-top:40px">Ask an AI assistant how to install it</h2>
<div class="install"><pre>claude mcp add --transport http run-my-agents ${esc(base)}/mcp</pre></div></div>`,
	);
}

export function notFoundPage(base: string): string {
	const root = new URL(`${base}/`).pathname.replace(/\/$/, "");
	return layout(
		base,
		{
			path: "404",
			title: "Page not found",
			description: `This address is not a page on ${SITE.name}.`,
			noindex: true,
		},
		`<div class="wrap prose"><h1>Page not found</h1><p class="lede">Go to the <a href="${root}/">home page</a> to install ${esc(SITE.name)}.</p></div>`,
	);
}
