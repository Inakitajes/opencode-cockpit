---
description: Run Claude Code external PR review and adjudicate findings without editing files
agent: plan
---

Run an external read-only PR review with Claude Code, then independently evaluate the findings before recommending any changes.

Use `$ARGUMENTS` as optional Claude review target or helper flags. Examples: PR number, PR URL, base branch, `--timeout 45`, or `--text`. The helper requests Claude's JSON output by default; use `--text` for formatted findings. If no target is provided, review the current branch or PR context.

Stay in review mode. Do not modify files, apply patches, commit, push, install dependencies, or implement any finding. Stop after recommending what should be changed and wait for user confirmation.

Workflow:

1. Inspect repository state with safe read-only commands such as `git status --short --branch`, current branch, and PR/base discovery when useful.
2. Run the installed helper and wait for Claude Code to finish:

```sh
~/.config/opencode/bin/opencode-external-review $ARGUMENTS
```

3. If Claude Code fails because `claude` is missing, authentication is unavailable, there is no reviewable diff, or the review times out, report the exact blocker and stop.
4. Treat Claude Code's output as an external reviewer report, not as ground truth.
5. Inspect the relevant diff and code before agreeing with any finding. Prefer concrete evidence from this repository over the external report.
6. Classify each finding as `implement`, `do not implement`, `needs clarification`, or `optional/later`.
7. Return the assessment and wait for user confirmation before any implementation.

Return the report in this format:

## Claude Code Findings

Summarize the external findings. Preserve severity and file references when available.

## My Assessment

For each finding include:

- Classification: `implement`, `do not implement`, `needs clarification`, or `optional/later`.
- Reason: concise evidence-backed rationale.
- Location: file path and line reference when possible.

## Recommended Changes

List only the changes you would implement now, ordered by priority, with a short reason for each.

## Confirmation Needed

Ask the user which recommended changes to implement. Do not edit files yet.
