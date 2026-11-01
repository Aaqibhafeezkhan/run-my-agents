# Run My Agents

Run many Claude Code sessions on one repo, and stop them overwriting each other.

When one session is about to edit a file that another session on your computer edited in the last 10 minutes, the edit is stopped once with a note:

> Run My Agents: another Claude session (9d5f2846 on branch fix-login, in ~/code/app) edited api.ts 2 min ago. Your edit could overwrite its work. Read the file again first, or work on a different file. If you are sure, make the edit again and it will go through.

The agent re-reads the file and carries on. It is a warning, not a lock: a second try always goes through.

No server, no account, no keys. Everything stays in `~/.run-my-agents/claims.json` on your computer.

## Install

In Claude Code:

```
/plugin marketplace add flisk-sh/run-my-agents
/plugin install run-my-agents@run-my-agents
```

Then open two or more sessions on the same repo, or on worktrees of it, and work as usual.

## How it works

```
session A edits api.ts ──► claims.json { api.ts: A, 1 min ago }
session B edits api.ts ──► sees A's claim ──► edit stopped once, with a note
session B edits again  ──► goes through, B now holds the claim
```

A `PreToolUse` hook runs before `Edit`, `Write`, `MultiEdit` and `NotebookEdit`. Claims expire after 10 minutes.

## Settings

| Variable | Default | What it does |
|---|---|---|
| `RUN_MY_AGENTS_TTL_MINUTES` | `10` | How long an edit counts as "recent" |
| `RUN_MY_AGENTS_DIR` | `~/.run-my-agents` | Where claims are kept |

## Limits

- One computer only. Sessions on other machines are not seen.
- Edits made through Bash (`sed`, `echo > file`) are not seen; only Claude's edit tools are.
- It matches whole files, not functions or lines.
- It needs `node` on your PATH.

## Test

```
bash test/test.sh
```

## License

MIT. Made by [Flisk](https://flisk.sh).
