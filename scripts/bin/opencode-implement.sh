#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s [--base <branch>] <branch-name>\n' "$(basename "$0")" >&2
  printf 'Reads the OpenCode handoff prompt from stdin.\n' >&2
}

BASE=""
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

if ! command -v opencode >/dev/null 2>&1; then
  printf 'opencode was not found in PATH.\n' >&2
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

CONFIG_DIR="${OPENCODE_CONFIG_DIR:-${HOME}/.config/opencode}"
PLAN_DIR="${OPENCODE_COCKPIT_TMPDIR:-${CONFIG_DIR}/tmp/opencode-cockpit}"
mkdir -p "$PLAN_DIR"
PLAN_FILE="$(mktemp "$PLAN_DIR/implement-plan.XXXXXX.md")"
cat > "$PLAN_FILE"

if [ ! -s "$PLAN_FILE" ]; then
  cat > "$PLAN_FILE" <<'PLAN'
Continue from the previous OpenCode planning session. No explicit plan text was provided.
PLAN
fi

OPEN_SCRIPT="${OPENCODE_IMPLEMENT_OPEN_SCRIPT:-${HOME}/.config/opencode/bin/opencode-implement-open}"
if [ ! -x "$OPEN_SCRIPT" ]; then
  printf 'OpenCode implement opener not found or not executable: %s\n' "$OPEN_SCRIPT" >&2
  exit 1
fi

printf 'Creating worktree for %s with Worktrunk...\n' "$BRANCH"

WT_ARGS=(switch --create --yes -x "$OPEN_SCRIPT")
if [ -n "$BASE" ]; then
  WT_ARGS+=(--base "$BASE")
fi
WT_ARGS+=("$BRANCH" -- "$PLAN_FILE")

wt "${WT_ARGS[@]}"
