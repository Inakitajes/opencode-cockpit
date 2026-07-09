#!/usr/bin/env bash
set -euo pipefail

PLAN_FILE="${1:-}"
BASE="${2:-}"
WORKTREE_DIR="$(pwd)"
CONFIG_DIR="${OPENCODE_CONFIG_DIR:-${HOME}/.config/opencode}"
BOOTSTRAP_DIR="${OPENCODE_COCKPIT_TMPDIR:-${CONFIG_DIR}/tmp/opencode-cockpit}"

if [ -z "$PLAN_FILE" ] || [ ! -f "$PLAN_FILE" ]; then
  printf 'Plan file not found: %s\n' "$PLAN_FILE" >&2
  exit 2
fi

ARCHER_BIN="$(command -v archer || true)"
if [ -z "$ARCHER_BIN" ]; then
  printf 'archer was not found in PATH.\n' >&2
  exit 127
fi

mkdir -p "$BOOTSTRAP_DIR"
BOOTSTRAP="$(mktemp "$BOOTSTRAP_DIR/opencode-cockpit-archer-open.XXXXXX.sh")"
cat > "$BOOTSTRAP" <<EOF
#!/usr/bin/env bash
set -euo pipefail
PLAN_FILE=$(printf '%q' "$PLAN_FILE")
BASE=$(printf '%q' "$BASE")
WORKTREE_DIR=$(printf '%q' "$WORKTREE_DIR")
BOOTSTRAP=$(printf '%q' "$BOOTSTRAP")
ARCHER_BIN=$(printf '%q' "$ARCHER_BIN")

cleanup() {
  rm -f "\$PLAN_FILE" "\$BOOTSTRAP"
}
trap cleanup EXIT

cd "\$WORKTREE_DIR"
ARCHER_ARGS=(--prompt-file "\$PLAN_FILE" --dir "\$WORKTREE_DIR")
if [ -n "\$BASE" ]; then
  ARCHER_ARGS+=(--base "\$BASE")
fi

"\$ARCHER_BIN" "\${ARCHER_ARGS[@]}"
EOF
chmod +x "$BOOTSTRAP"

DEFAULT_SHELL="${OPENCODE_ARCHER_IMPLEMENT_SHELL:-${OPENCODE_IMPLEMENT_SHELL:-${SHELL:-/bin/bash}}}"
if [ ! -x "$DEFAULT_SHELL" ]; then
  DEFAULT_SHELL="/bin/bash"
fi

SHELL_COMMAND="exec $(printf '%q' "$BOOTSTRAP")"
case "$(basename "$DEFAULT_SHELL")" in
  bash|zsh|ksh|sh)
    LAUNCH_COMMAND="$(printf '%q' "$DEFAULT_SHELL") -lic $(printf '%q' "$SHELL_COMMAND")"
    ;;
  fish)
    LAUNCH_COMMAND="$(printf '%q' "$DEFAULT_SHELL") -l -i -c $(printf '%q' "$SHELL_COMMAND")"
    ;;
  *)
    DEFAULT_SHELL="/bin/bash"
    LAUNCH_COMMAND="$(printf '%q' "$DEFAULT_SHELL") -lic $(printf '%q' "$SHELL_COMMAND")"
    ;;
esac

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
    "$WORKTREE_DIR" "$LAUNCH_COMMAND"
}

open_ghostty_window() {
  case "$(basename "$DEFAULT_SHELL")" in
    fish)
      /usr/bin/open -na Ghostty --args --working-directory="$WORKTREE_DIR" -e "$DEFAULT_SHELL" -l -i -c "$SHELL_COMMAND"
      ;;
    *)
      /usr/bin/open -na Ghostty --args --working-directory="$WORKTREE_DIR" -e "$DEFAULT_SHELL" -lic "$SHELL_COMMAND"
      ;;
  esac
}

if [ "$(uname -s)" = "Darwin" ] && command -v osascript >/dev/null 2>&1; then
  if open_ghostty_tab >/dev/null 2>&1; then
    printf 'Opened a new Ghostty tab with Archer in %s\n' "$WORKTREE_DIR"
    exit 0
  fi

  if open_ghostty_window >/dev/null 2>&1; then
    printf 'Opened a new Ghostty window with Archer in %s\n' "$WORKTREE_DIR"
    exit 0
  fi

  CMD="$LAUNCH_COMMAND"
  ESCAPED_CMD="${CMD//\\/\\\\}"
  ESCAPED_CMD="${ESCAPED_CMD//\"/\\\"}"
  osascript -e 'tell application "Terminal" to activate' -e "tell application \"Terminal\" to do script \"$ESCAPED_CMD\""
  printf 'Opened a new Terminal session with Archer in %s\n' "$WORKTREE_DIR"
  exit 0
fi

printf 'Worktree ready at: %s\n' "$WORKTREE_DIR"
printf 'Open a new terminal and run:\n'
printf '  cd %q && archer --prompt-file %q --dir %q' "$WORKTREE_DIR" "$PLAN_FILE" "$WORKTREE_DIR"
if [ -n "$BASE" ]; then
  printf ' --base %q' "$BASE"
fi
printf '\n'
