# Custom Commands

This repo includes global OpenCode commands stored in `commands/*.md`. When installed, each file becomes a slash command in the OpenCode TUI.

## Commands

| Command | Agent | Model | Purpose |
| --- | --- | --- | --- |
| `/clean-code` | Current session | Current session | Read-only architecture and maintainability audit. |
| `/branch` | `fast` | `openrouter/z-ai/glm-4.7` with throughput routing | Create a Worktrunk worktree from the current plan and open a fresh OpenCode session there. |
| `/push` | `fast` | `openrouter/z-ai/glm-4.7` with throughput routing | Run relevant tests, create a conventional commit, and push the branch. |
| `/ship` | `fast` | `openrouter/z-ai/glm-4.7` with throughput routing | Verify tests, push work, open or reuse a PR, and check CI status. |

## `/clean-code`

Use this when you want an audit report without code changes. It uses the agent and model currently selected in the OpenCode session, so you can run it with a stronger model when needed. It checks SRP, SOLID-style design issues, code smells, project architecture conventions, maintainability risks, and consistency with existing patterns.

Example:

```text
/clean-code src/features/billing
```

The optional argument narrows the audit scope.

## `/branch`

Use this after a planning conversation when you want to turn the plan into a new isolated worktree. The command asks OpenCode to infer a branch name from the plan, create a Worktrunk worktree with `wt switch --create`, and open a fresh OpenCode session in that new worktree with the plan passed as the initial prompt.

This command pins `openrouter/z-ai/glm-4.7` for stronger branch handoff automation. The installer configures OpenRouter throughput routing for this model, which is equivalent to OpenRouter's `:nitro` variant.

Example:

```text
/branch
```

With guidance:

```text
/branch feat/billing-retry base main
```

Requirements:

- `wt` must be installed and configured. See <https://github.com/max-sixty/worktrunk>.
- The installer copies helper scripts to `~/.config/opencode/bin/`.
- On macOS, the helper opens a new Ghostty tab in the front window when possible, falls back to a new Ghostty window, then Terminal. Other systems print the command to run manually.

## `/push`

Use this when the current work is ready to commit and push. It asks OpenCode to inspect the diff, run relevant tests/checks when available, create a conventional commit, and push the current branch.

This command pins `openrouter/z-ai/glm-4.7` for stronger delivery automation. The installer configures OpenRouter throughput routing for this model, which is equivalent to OpenRouter's `:nitro` variant.

Example:

```text
/push add billing retry handling
```

The optional argument is used as guidance for the intended commit scope/message.

## `/ship`

Use this when a branch should be prepared for review. It checks local state, commits uncommitted work if needed, runs relevant tests/checks, pushes the branch, creates or reuses a GitHub PR, and checks CI status.

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

Or copy commands manually:

```sh
mkdir -p ~/.config/opencode/commands
cp commands/*.md ~/.config/opencode/commands/
rm -f ~/.config/opencode/commands/safe-commit.md ~/.config/opencode/commands/ready-pr.md
```

Restart OpenCode after installing or updating commands.
