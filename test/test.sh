#!/usr/bin/env bash
# Two fake sessions edit the same file; the second is warned once, then allowed.
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
export RUN_MY_AGENTS_DIR=$(mktemp -d)
hook() { printf '{"session_id":"%s","cwd":"/tmp","tool_input":{"file_path":"/tmp/api.ts"}}' "$1" | node "$here/hooks/check.mjs"; }
fail() { echo "FAIL: $1"; exit 1; }

[ -z "$(hook aaaa1111)" ] || fail "first session should be allowed"
[ -z "$(hook aaaa1111)" ] || fail "same session again should be allowed"
out=$(hook bbbb2222); echo "$out" | grep -q '"deny"' || fail "second session should be warned"
echo "$out" | grep -q 'aaaa1111' || fail "warning should name the other session"
[ -z "$(hook bbbb2222)" ] || fail "second try should go through"
out=$(hook aaaa1111); echo "$out" | grep -q '"deny"' || fail "first session should now be warned about the second"
printf 'not json' | node "$here/hooks/check.mjs" || fail "bad input must not error"
echo "PASS: 6 checks"
