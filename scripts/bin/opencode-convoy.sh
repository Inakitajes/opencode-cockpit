#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s [--base <branch>] [--pipeline <name>] <branch-name>\n' "$(basename "$0")" >&2
  printf 'Reads the Convoy PRD from stdin.\n' >&2
}

SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
CONFIG_DIR="${OPENCODE_CONFIG_DIR:-${HOME}/.config/opencode}"
PLAN_DIR="${OPENCODE_COCKPIT_TMPDIR:-${CONFIG_DIR}/tmp/opencode-cockpit}"

resolve_convoy_bin() {
  if [ -n "${OPENCODE_CONVOY_BIN:-}" ]; then
    printf '%s' "$OPENCODE_CONVOY_BIN"
    return 0
  fi
  command -v convoy || true
}

resolve_login_shell() {
  local shell="${OPENCODE_CONVOY_SHELL:-${OPENCODE_IMPLEMENT_SHELL:-${SHELL:-/bin/bash}}}"
  if [ ! -x "$shell" ]; then
    shell="/bin/bash"
  fi
  case "$(basename "$shell")" in
    bash|zsh|ksh|sh|fish) ;;
    *) shell="/bin/bash" ;;
  esac
  printf '%s' "$shell"
}

# Opener mode. Worktrunk runs this inside the freshly created worktree, so the
# working directory is already the target repo root that Convoy needs.
if [ "${1:-}" = "--open" ]; then
  shift
  PLAN_FILE="${1:-}"
  shift || true

  BASE=""
  PIPELINE=""
  for arg in "$@"; do
    case "$arg" in
      base=*) BASE="${arg#base=}" ;;
      pipeline=*) PIPELINE="${arg#pipeline=}" ;;
    esac
  done

  if [ -z "$PLAN_FILE" ] || [ ! -f "$PLAN_FILE" ]; then
    printf 'PRD file not found: %s\n' "$PLAN_FILE" >&2
    exit 2
  fi

  WORKTREE_DIR="$(pwd)"
  CONVOY_BIN="$(resolve_convoy_bin)"
  if [ -z "$CONVOY_BIN" ]; then
    printf 'convoy was not found in PATH.\n' >&2
    exit 127
  fi

  # Worktrunk already created the isolated worktree this runs in, so Convoy's
  # own default (a second worktree under ~/.convoy/worktrees) is turned off.
  CONVOY_ARGS=(--prompt-file "$PLAN_FILE" --dir "$WORKTREE_DIR" --no-worktree)
  if [ -n "$BASE" ]; then
    CONVOY_ARGS+=(--base "$BASE")
  fi
  if [ -n "$PIPELINE" ]; then
    CONVOY_ARGS+=(--pipeline "$PIPELINE")
  fi

  LOGIN_SHELL="$(resolve_login_shell)"

  if [ "$(uname -s)" = "Darwin" ]; then
    # Convoy lives in ~/.local/bin, which only joins PATH once the profile is
    # loaded, so the window always runs through a login shell. The trailing
    # shell keeps the window open on the final report instead of closing it.
    INNER="$(printf '%q ' "$CONVOY_BIN" "${CONVOY_ARGS[@]}")"
    INNER+="; rm -f $(printf '%q' "$PLAN_FILE")"
    INNER+="; exec $(printf '%q' "$LOGIN_SHELL") -l"

    case "$(basename "$LOGIN_SHELL")" in
      fish)
        LAUNCH_COMMAND="$(printf '%q' "$LOGIN_SHELL") -l -i -c $(printf '%q' "$INNER")"
        ;;
      *)
        LAUNCH_COMMAND="$(printf '%q' "$LOGIN_SHELL") -lic $(printf '%q' "$INNER")"
        ;;
    esac

    # Ghostty's AppleScript surface API is the primary path. Launching with
    # `open -na Ghostty -e` instead makes Ghostty ask for confirmation before
    # running the command, which would prompt on every single run.
    if command -v osascript >/dev/null 2>&1 && osascript \
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
      "$WORKTREE_DIR" "$LAUNCH_COMMAND" >/dev/null 2>&1; then
      printf 'Opened a new Ghostty tab with Convoy in %s\n' "$WORKTREE_DIR"
      exit 0
    fi

    if /usr/bin/open -na Ghostty --args \
      --working-directory="$WORKTREE_DIR" \
      -e "$LOGIN_SHELL" -lic "$INNER" >/dev/null 2>&1; then
      printf 'Opened a new Ghostty window with Convoy in %s (via open; Ghostty may ask to confirm the command)\n' "$WORKTREE_DIR"
      exit 0
    fi
  fi

  printf 'Worktree ready at: %s\n' "$WORKTREE_DIR"
  printf 'Open a new terminal and run:\n'
  printf '  cd %q && convoy' "$WORKTREE_DIR"
  printf ' %q' "${CONVOY_ARGS[@]}"
  printf '\n'
  exit 0
fi

BASE=""
PIPELINE=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    -b|--base)
      if [ "$#" -lt 2 ]; then
        usage
        exit 2
      fi
      BASE="$2"
      shift 2
      ;;
    -p|--pipeline)
      if [ "$#" -lt 2 ]; then
        usage
        exit 2
      fi
      PIPELINE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    -* )
      printf 'Unknown option: %s\n' "$1" >&2
      usage
      exit 2
      ;;
    *)
      break
      ;;
  esac
done

if [ "$#" -lt 1 ]; then
  usage
  exit 2
fi

RAW_BRANCH="$1"

if ! command -v wt >/dev/null 2>&1; then
  printf 'Worktrunk is required but wt was not found in PATH.\n' >&2
  printf 'Install it with: brew install worktrunk && wt config shell install\n' >&2
  exit 127
fi

if [ -z "$(resolve_convoy_bin)" ]; then
  printf 'convoy was not found in PATH.\n' >&2
  printf 'Install it from https://github.com/Inakitajes/convoy (make install).\n' >&2
  exit 127
fi

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  printf 'This command must be run inside a git repository.\n' >&2
  exit 1
fi

BRANCH="$(printf '%s' "$RAW_BRANCH" | tr '[:upper:]' '[:lower:]')"
BRANCH="${BRANCH// /-}"
BRANCH="${BRANCH//_/-}"
BRANCH="$(printf '%s' "$BRANCH" | tr -cd 'a-z0-9./-')"

while [[ "$BRANCH" == *--* ]]; do
  BRANCH="${BRANCH//--/-}"
done
while [[ "$BRANCH" == *//* ]]; do
  BRANCH="${BRANCH//\/\//\/}"
done

BRANCH="${BRANCH#/}"
BRANCH="${BRANCH%/}"
BRANCH="${BRANCH#-}"
BRANCH="${BRANCH%-}"

if [[ "$BRANCH" != */* ]]; then
  BRANCH="feat/${BRANCH}"
fi

if [ -z "$BRANCH" ] || [ "$BRANCH" = "feat/" ]; then
  printf 'Branch name became empty after sanitization. Input was: %s\n' "$RAW_BRANCH" >&2
  exit 2
fi

case "$BRANCH" in
  main|master|develop|dev|trunk|feat/main|feat/master)
    printf 'Refusing unsafe branch name: %s\n' "$BRANCH" >&2
    exit 2
    ;;
esac

if ! git check-ref-format --branch "$BRANCH" >/dev/null 2>&1; then
  printf 'Invalid git branch name after sanitization: %s\n' "$BRANCH" >&2
  exit 2
fi

mkdir -p "$PLAN_DIR"
# BSD mktemp only substitutes the X placeholder when it ends the template, so
# the .md suffix is appended after the unique name has been reserved.
PLAN_STUB="$(mktemp "$PLAN_DIR/convoy-prd.XXXXXX")"
PLAN_FILE="${PLAN_STUB}.md"
mv "$PLAN_STUB" "$PLAN_FILE"
cat > "$PLAN_FILE"

if [ ! -s "$PLAN_FILE" ]; then
  cat > "$PLAN_FILE" <<'PLAN'
# Goal

No PRD was provided. Inspect the repository, infer the intended change from the
current branch and its diff against the base, and stop to ask for clarification
before writing code.
PLAN
fi

printf 'Creating worktree for %s with Worktrunk...\n' "$BRANCH"

WT_ARGS=(switch --create --yes -x "$SELF --open")
if [ -n "$BASE" ]; then
  WT_ARGS+=(--base "$BASE")
fi
# The extras travel as never-empty key=value tokens so an unset --base cannot
# shift --pipeline into its position.
WT_ARGS+=("$BRANCH" -- "$PLAN_FILE" "base=$BASE" "pipeline=$PIPELINE")

wt "${WT_ARGS[@]}"
