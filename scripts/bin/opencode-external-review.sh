#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s [--timeout <minutes>] [--text] [target]\n' "$(basename "$0")" >&2
  printf 'Runs Claude Code ultrareview and prints the completed external review.\n' >&2
  printf 'Defaults to Claude JSON output; pass --text for formatted findings.\n' >&2
  printf 'If target is omitted, Claude reviews the current branch or PR context.\n' >&2
}

TIMEOUT="${OPENCODE_EXTERNAL_REVIEW_TIMEOUT:-30}"
OUTPUT_JSON=1
TARGET=()

while [ "$#" -gt 0 ]; do
  case "$1" in
    -t|--timeout)
      if [ "$#" -lt 2 ]; then
        usage
        exit 2
      fi
      TIMEOUT="$2"
      shift 2
      ;;
    --text)
      OUTPUT_JSON=0
      shift
      ;;
    --json)
      OUTPUT_JSON=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      TARGET+=("$@")
      break
      ;;
    -* )
      printf 'Unknown option: %s\n' "$1" >&2
      usage
      exit 2
      ;;
    *)
      TARGET+=("$1")
      shift
      ;;
  esac
done

if ! command -v claude >/dev/null 2>&1; then
  printf 'Claude Code is required but claude was not found in PATH.\n' >&2
  exit 127
fi

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  printf 'This command must be run inside a git repository.\n' >&2
  exit 1
fi

if ! [[ "$TIMEOUT" =~ ^[0-9]+$ ]] || [ "$TIMEOUT" -lt 1 ]; then
  printf 'Timeout must be a positive integer number of minutes: %s\n' "$TIMEOUT" >&2
  exit 2
fi

printf 'Running Claude Code ultrareview' >&2
if [ "${#TARGET[@]}" -gt 0 ]; then
  printf ' for target:' >&2
  printf ' %q' "${TARGET[@]}" >&2
fi
printf ' with timeout %s minutes...\n\n' "$TIMEOUT" >&2

ARGS=(ultrareview --timeout "$TIMEOUT")
if [ "$OUTPUT_JSON" -eq 1 ]; then
  ARGS+=(--json)
fi
ARGS+=("${TARGET[@]}")

claude "${ARGS[@]}"
