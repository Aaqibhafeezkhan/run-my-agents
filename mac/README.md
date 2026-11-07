# Run My Agents (macOS)

A native window and menu bar item around the local board (http://127.0.0.1:4100/).

    ./build.sh                          # needs swiftc (Command Line Tools)
    open "build/Run My Agents.app"

If nothing answers on port 4100, the app starts `bun src/index.ts` in `services/app/board`
(override with `RUN_MY_AGENTS_BOARD=/path/to/board`) and stops it again on quit.

Updates: a released app (board compiled in) installs the latest GitHub release on launch, and stages one found while it
runs for when you quit. A dev build (this script without `--release`) instead pulls the board's checkout on launch, only
when it is clean and on `main`, and only as a fast-forward. **Check for Updates…** and **Restart Board** are in the menu
bar item. Set `RUN_MY_AGENTS_NO_UPDATE=1` to turn updates off.
