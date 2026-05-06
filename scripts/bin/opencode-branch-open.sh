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

if [ "$(uname -s)" = "Darwin" ] && command -v osascript >/dev/null 2>&1; then
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
