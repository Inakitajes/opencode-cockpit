# Custom Commands

This repo includes global OpenCode commands stored in `commands/*.md`. When installed, each file becomes a slash command in the OpenCode TUI.

## Commands

| Command | Agent | Model | Purpose |
| --- | --- | --- | --- |
| `/audit` | `plan` | Current/default plan model | Read-only security audit for the current PR branch or full repository. |
| `/clean-code` | Current session | Current session | Read-only architecture and maintainability audit. |
| `/write-plan` | `fast` | `openrouter/z-ai/glm-4.7` with throughput routing | Write a repository-aware implementation plan and save it to the preferred plan path. |
| `/implement` | `fast` | `openrouter/z-ai/glm-4.7` with throughput routing | Start implementation from the current plan in a repo-aware Worktrunk worktree. |
| `/push` | `fast` | `openrouter/z-ai/glm-4.7` with throughput routing | Run relevant tests, create a conventional commit, and push the branch. |
| `/ship` | `fast` | `openrouter/z-ai/glm-4.7` with throughput routing | Verify tests, push work, open or reuse a PR, and check CI status. |

## `/audit`

Use this when you want a security audit report without code changes. It runs with the `plan` agent by default. On feature branches, it audits the PR branch diff against the most likely base branch and includes local uncommitted changes when present. On `main`, `master`, the default branch, detached HEAD, or when no concrete branch scope can be established, it audits the full repository.

Example:

```text
/audit base main, focus auth/session changes
```

The output is a concise report with scope, risks found, a prioritized action plan, and audit notes.

## `/clean-code`

Use this when you want an audit report without code changes. It uses the agent and model currently selected in the OpenCode session, so you can run it with a stronger model when needed. It checks SRP, SOLID-style design issues, code smells, project architecture conventions, maintainability risks, and consistency with existing patterns.

Example:

```text
/clean-code src/features/billing
```

The optional argument narrows the audit scope.

## `/write-plan`

Use this when you want a concrete implementation plan saved into the current repository before starting code changes. The command asks OpenCode to inspect repository instructions and relevant code, follow the repository's planning conventions when present, and write an execution-ready plan with exact file paths, verification commands, and an explicit TDD loop.

This command pins `openrouter/z-ai/glm-4.7` for stronger planning automation. The installer configures OpenRouter throughput routing for this model, which is equivalent to OpenRouter's `:nitro` variant.

Example:

```text
/write-plan add billing retry handling
```

With guidance:

```text
/write-plan PROJ-325 billing retry handling
```

The command saves the plan to the repository's preferred plan path when documented, otherwise it falls back to `docs/plans/YYYY-MM-DD-<short-name>.md`.

## `/implement`

Use this after a planning conversation when you want to start implementing the plan in a new isolated worktree. The command asks OpenCode to inspect the repository instructions first, infer a branch name that follows repository conventions when present, create a Worktrunk worktree with `wt switch --create`, and open a fresh OpenCode session in that new worktree with a repository-aware handoff prompt.

This command pins `openrouter/z-ai/glm-4.7` for stronger implementation handoff automation. The installer configures OpenRouter throughput routing for this model, which is equivalent to OpenRouter's `:nitro` variant.

Example:

```text
/implement
```

With guidance:

```text
/implement feat/billing-retry base main
```

The implementation handoff includes repository workflow rules, required setup and verification commands, and an explicit TDD loop so the new session starts with the expected execution discipline.

Requirements:

- `wt` must be installed and configured. See <https://github.com/max-sixty/worktrunk>.
- The installer copies helper scripts to `~/.config/opencode/bin/`.
- On macOS, the helper opens a new Ghostty tab in the front window when possible, falls back to a new Ghostty window, then Terminal. Other systems print the command to run manually.

## Recommended

I recommend using RTK to save tokens when working with these tools. It is optional, but useful for reducing token usage in larger workflows. See <https://github.com/rtk-ai/rtk>.

Initialize RTK for OpenCode with `rtk init --global --opencode`. The delivery commands run through RTK-aware agents, so a verification command rewritten from `pnpm lint` to an `rtk` form should be accepted as the same verification step instead of retried in a loop. Use `RTK_DISABLED=1 <command>` only for a deliberate raw-output rerun.

## `/push`

Use this when the current work is ready to commit and push. It asks OpenCode to inspect the diff, run relevant tests/checks when available, create a conventional commit, push the current branch, and include an existing PR URL in the final summary when one is found.

This command pins `openrouter/z-ai/glm-4.7` for stronger delivery automation. The installer configures OpenRouter throughput routing for this model, which is equivalent to OpenRouter's `:nitro` variant.

Example:

```text
/push add billing retry handling
```

The optional argument is used as guidance for the intended commit scope/message.

## `/ship`

Use this when a branch should be prepared for review. It checks local state, commits uncommitted work if needed, runs relevant tests/checks, pushes the branch, creates or reuses a GitHub PR, checks CI status, and includes the PR URL in the final summary.

This command pins `openrouter/z-ai/glm-4.7` for stronger PR automation. The installer configures OpenRouter throughput routing for this model, which is equivalent to OpenRouter's `:nitro` variant.

Example:

```text
/ship base main, title fix billing retry handling
```

The optional argument can provide PR title, base branch, or review context.

## Install

Run the main installer from the repo root:

```sh
bash scripts/install.sh
```

Or copy commands and helpers manually:

```sh
mkdir -p ~/.config/opencode/commands
cp commands/*.md ~/.config/opencode/commands/
rm -f ~/.config/opencode/commands/safe-commit.md ~/.config/opencode/commands/ready-pr.md ~/.config/opencode/commands/branch.md
mkdir -p ~/.config/opencode/bin
cp scripts/bin/opencode-implement.sh ~/.config/opencode/bin/opencode-implement
cp scripts/bin/opencode-implement-open.sh ~/.config/opencode/bin/opencode-implement-open
chmod +x ~/.config/opencode/bin/opencode-implement ~/.config/opencode/bin/opencode-implement-open
rm -f ~/.config/opencode/bin/opencode-branch ~/.config/opencode/bin/opencode-branch-open
```

Restart OpenCode after installing or updating commands.
