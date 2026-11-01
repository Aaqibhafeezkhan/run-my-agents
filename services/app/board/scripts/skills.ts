// Builds src/skills.json from the DevEx Roadmap's skills catalog (roadmap.flisk.si/skills), so the board can
// suggest skills for each agent's job. Run: bun scripts/skills.ts <path to a flisk-sh/roadmap checkout>
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
if (!root) throw new Error("Usage: bun scripts/skills.ts <roadmap checkout>");
const dir = join(root, "_data", "skills");
const skills: { id: string; name: string; source: string; path: string; cat: string; what: string }[] = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith(".yml"))) {
	const list = Bun.YAML.parse(readFileSync(join(dir, f), "utf8")) as Record<string, string>[];
	for (const s of list ?? [])
		if (s.id && s.cat && s.what)
			skills.push({ id: s.id, name: s.name ?? s.id, source: s.source ?? "", path: s.path ?? "", cat: s.cat, what: s.what });
}
writeFileSync(join(import.meta.dir, "..", "src", "skills.json"), `${JSON.stringify(skills)}\n`);
console.log(`${skills.length} skills`);
