import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const hookPath = new URL("../hooks/check.mjs", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function runHook(root, session, file) {
  return spawnSync("node", [hookPath], {
    input: JSON.stringify({ session_id: session, cwd: root, tool_input: { file_path: file } }),
    env: { ...process.env, RUN_MY_AGENTS_DIR: join(root, "state") },
    encoding: "utf8",
  }).stdout;
}

/** A drive letter with nothing mounted on it, or undefined when every letter is in use. */
function unmountedDrive() {
  for (let code = "Z".charCodeAt(0); code >= "D".charCodeAt(0); code--) {
    const drive = `${String.fromCharCode(code)}:\\`;
    if (!existsSync(drive)) return drive;
  }
  return undefined;
}

test("two sessions reaching one file through a symlinked folder share a claim", () => {
  const root = mkdtempSync(join(tmpdir(), "rma-claims-"));
  const real = join(root, "real");
  const link = join(root, "link");
  mkdirSync(real);
  symlinkSync(real, link, "junction");

  assert.equal(runHook(root, "aaaa1111", join(real, "api.ts")), "");
  const out = runHook(root, "bbbb2222", join(link, "api.ts"));
  assert.ok(out.includes('"deny"'), `expected a deny for the symlinked path, got: "${out}"`);
});

test("two sessions reaching one file with a different letter case share a claim", { skip: process.platform !== "win32" && process.platform !== "darwin" }, () => {
  const root = mkdtempSync(join(tmpdir(), "rma-claims-"));
  const real = join(root, "real");
  mkdirSync(real);
  writeFileSync(join(real, "api.ts"), "");

  assert.equal(runHook(root, "aaaa1111", join(real, "api.ts")), "");
  const out = runHook(root, "bbbb2222", join(real, "api.ts").toUpperCase());
  assert.ok(out.includes('"deny"'), `expected a deny for the different-case path, got: "${out}"`);
});

test("a file on an unmounted drive still gets a claim", { skip: process.platform !== "win32" || !unmountedDrive() }, () => {
  const root = mkdtempSync(join(tmpdir(), "rma-claims-"));
  const file = join(unmountedDrive(), "x", "a.ts");

  assert.equal(runHook(root, "aaaa1111", file), "");
  const out = runHook(root, "bbbb2222", file);
  assert.ok(out.includes('"deny"'), `expected a deny for the unmounted-drive path, got: "${out}"`);
});
