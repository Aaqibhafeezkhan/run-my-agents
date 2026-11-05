import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const hookPath = fileURLToPath(new URL("../hooks/check.mjs", import.meta.url));

function runHook(root, session, file) {
  const result = spawnSync("node", [hookPath], {
    input: JSON.stringify({ session_id: session, cwd: root, tool_input: { file_path: file } }),
    env: { ...process.env, RUN_MY_AGENTS_DIR: join(root, "state") },
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `hook exited ${result.status}: ${result.stderr}`);
  return result.stdout;
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

test(
  "two sessions reaching one file with a different letter case share a claim",
  { skip: process.platform !== "win32" && process.platform !== "darwin" },
  (t) => {
    const root = mkdtempSync(join(tmpdir(), "rma-claims-"));
    const real = join(root, "real");
    mkdirSync(real);
    const file = join(real, "api.ts");
    writeFileSync(file, "");
    if (!existsSync(real.toUpperCase())) {
      t.skip("temporary filesystem is case-sensitive");
      return;
    }

    assert.equal(runHook(root, "aaaa1111", file), "");
    const out = runHook(root, "bbbb2222", file.toUpperCase());
    assert.ok(out.includes('"deny"'), `expected a deny for the different-case path, got: "${out}"`);
  },
);

test(
  "claims for a missing file with different letter case share a claim",
  { skip: process.platform !== "win32" && process.platform !== "darwin" },
  (t) => {
    const root = mkdtempSync(join(tmpdir(), "rma-claims-"));
    const real = join(root, "real");
    mkdirSync(real);
    if (!existsSync(real.toUpperCase())) {
      t.skip("temporary filesystem is case-sensitive");
      return;
    }
    const file = join(real, "api.ts");

    assert.equal(runHook(root, "aaaa1111", file), "");
    const out = runHook(root, "bbbb2222", file.toUpperCase());
    assert.ok(
      out.includes('"deny"'),
      `expected a deny for the different-case missing file, got: "${out}"`,
    );
  },
);

test(
  "two sessions editing a new file share a claim across file creation",
  { skip: process.platform !== "win32" && process.platform !== "darwin" },
  (t) => {
    const root = mkdtempSync(join(tmpdir(), "rma-claims-"));
    const real = join(root, "real");
    mkdirSync(real);
    if (!existsSync(real.toUpperCase())) {
      t.skip("temporary filesystem is case-sensitive");
      return;
    }
    const file = join(real, "MyComponent.tsx");

    assert.equal(runHook(root, "aaaa1111", file), "");
    writeFileSync(file, "export const MyComponent = () => null;");
    const out = runHook(root, "bbbb2222", file);
    assert.ok(
      out.includes('"deny"'),
      `expected a deny for session B editing after file creation, got: "${out}"`,
    );
  },
);

test("warnings show the file symlink name rather than its target name", (t) => {
  const root = mkdtempSync(join(tmpdir(), "rma-claims-"));
  const target = join(root, "real.ts");
  const alias = join(root, "alias.ts");
  writeFileSync(target, "");
  try {
    symlinkSync(target, alias, "file");
  } catch (error) {
    if (["EACCES", "EPERM", "ENOTSUP"].includes(error.code)) {
      t.skip(`file symlinks are unavailable: ${error.code}`);
      return;
    }
    throw error;
  }

  assert.equal(runHook(root, "aaaa1111", target), "");
  const out = runHook(root, "bbbb2222", alias);
  assert.ok(
    out.includes("edited alias.ts"),
    `expected the supplied filename in the warning, got: "${out}"`,
  );
});

test("a file on an unmounted drive still gets a claim", { skip: process.platform !== "win32" || !unmountedDrive() }, () => {
  const root = mkdtempSync(join(tmpdir(), "rma-claims-"));
  const file = join(unmountedDrive(), "x", "a.ts");

  assert.equal(runHook(root, "aaaa1111", file), "");
  const out = runHook(root, "bbbb2222", file);
  assert.ok(out.includes('"deny"'), `expected a deny for the unmounted-drive path, got: "${out}"`);
});
