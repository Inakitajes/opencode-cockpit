#!/usr/bin/env bash
set -euo pipefail

PLAN_FILE="${1:-}"
WORKTREE_DIR="$(pwd)"

if [ -z "$PLAN_FILE" ] || [ ! -f "$PLAN_FILE" ]; then
  printf 'Plan file not found: %s\n' "$PLAN_FILE" >&2
  exit 2
fi

if ! command -v opencode >/dev/null 2>&1; then
  printf 'opencode was not found in PATH.\n' >&2
  exit 127
fi

BOOTSTRAP="$(mktemp "${TMPDIR:-/tmp}/opencode-cockpit-open.XXXXXX.sh")"
cat > "$BOOTSTRAP" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd $(printf '%q' "$WORKTREE_DIR")
exec opencode --prompt "\$(cat $(printf '%q' "$PLAN_FILE"))"
EOF
chmod +x "$BOOTSTRAP"

open_ghostty_tab() {
  osascript \
    -e 'on run argv' \
    -e 'set worktreeDir to item 1 of argv' \
    -e 'set commandLine to item 2 of argv' \
    -e 'tell application id "com.mitchellh.ghostty"' \
    -e 'set cfg to new surface configuration from {initial working directory:worktreeDir, command:commandLine, wait after command:false}' \
    -e 'if (count of windows) > 0 then' \
    -e 'set createdTab to new tab in front window with configuration cfg' \
    -e 'select tab createdTab' \
    -e 'else' \
    -e 'new window with configuration cfg' \
    -e 'end if' \
    -e 'activate' \
    -e 'end tell' \
    -e 'end run' \
    "$WORKTREE_DIR" "/bin/bash $BOOTSTRAP"
}

open_ghostty_window() {
  /usr/bin/open -na Ghostty --args --working-directory="$WORKTREE_DIR" -e /bin/bash "$BOOTSTRAP"
}

if [ "$(uname -s)" = "Darwin" ] && command -v osascript >/dev/null 2>&1; then
  if open_ghostty_tab >/dev/null 2>&1; then
    printf 'Opened a new Ghostty tab with OpenCode in %s\n' "$WORKTREE_DIR"
    exit 0
  fi

  if open_ghostty_window >/dev/null 2>&1; then
    printf 'Opened a new Ghostty window with OpenCode in %s\n' "$WORKTREE_DIR"
    exit 0
  fi

  CMD="/bin/bash $(printf '%q' "$BOOTSTRAP")"
  ESCAPED_CMD="${CMD//\\/\\\\}"
  ESCAPED_CMD="${ESCAPED_CMD//\"/\\\"}"
  osascript -e 'tell application "Terminal" to activate' -e "tell application \"Terminal\" to do script \"$ESCAPED_CMD\""
  printf 'Opened a new Terminal session with OpenCode in %s\n' "$WORKTREE_DIR"
  exit 0
fi

printf 'Worktree ready at: %s\n' "$WORKTREE_DIR"
printf 'Open a new terminal and run:\n'
printf '  cd %q && opencode --prompt "$(cat %q)"\n' "$WORKTREE_DIR" "$PLAN_FILE"
