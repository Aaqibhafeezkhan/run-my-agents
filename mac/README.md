# Run My Agents (macOS)

A native window and menu bar item around the local board (http://127.0.0.1:4100/).

    ./build.sh                          # needs swiftc (Command Line Tools)
    open "build/Run My Agents.app"

If nothing answers on port 4100, the app starts `bun src/index.ts` in `services/app/board`
(override with `RUN_MY_AGENTS_BOARD=/path/to/board`) and stops it again on quit.
