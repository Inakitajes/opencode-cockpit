# Custom Commands

This repo includes global OpenCode commands stored in `commands/*.md`. When installed, each file becomes a slash command in the OpenCode TUI.

## Commands

| Command | Agent | Model | Purpose |
| --- | --- | --- | --- |
| `/audit` | `plan` | Current/default plan model | Read-only security audit for the current PR branch or full repository. |
| `/clean-code` | Current session | Current session | Read-only architecture and maintainability audit. |
| `/external-review` | `plan` | Current/default plan model | Run Claude Code external review, then adjudicate findings before implementation. |
| `/write-plan` | `fast` | `openrouter/z-ai/glm-4.7` with throughput routing | Write a repository-aware implementation plan and save it to the preferred plan path. |
| `/implement` | `fast` | `openrouter/z-ai/glm-4.7` with throughput routing | Start implementation from the current plan in a repo-aware Worktrunk worktree. |
| `/convoy` | `fast` | `openrouter/z-ai/glm-4.7` with throughput routing | Run a Convoy pipeline from the current plan in a repo-aware Worktrunk worktree. |
| `/sync-main` | `build` | Current/default build model | Detect the remote default branch, merge it into the current branch, and resolve real or semantic conflicts. |
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

## `/external-review`

Use this when you want a second opinion on the current PR or branch before implementing review changes. It runs Claude Code `ultrareview` through the local helper, waits for the external report, then asks OpenCode's `plan` agent to independently assess which findings are valid and worth implementing.

The helper requests Claude's JSON findings by default so OpenCode can analyze the structured report. Pass `--text` if you want Claude's formatted findings instead.

Example:

```text
/external-review
```

With guidance:

```text
/external-review --timeout 45 123
```

Requirements:

- Claude Code must be installed, authenticated, and available as `claude`.
- The installed Claude Code version must support `claude ultrareview`.
- The command is read-only: it recommends changes and waits for confirmation before any implementation.

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

## `/convoy`

Use this after a planning conversation when you want the same isolated Worktrunk workflow as `/implement`, but want a Convoy pipeline to own the work instead of a fresh OpenCode session. The command asks OpenCode to inspect the repository instructions first, infer a branch name that follows repository conventions when present, create a Worktrunk worktree with `wt switch --create`, and open a fresh Convoy run in that new worktree with a repository-aware PRD.

Convoy runs a pipeline of specialized agents and leaves one commit per phase. The default `implement` pipeline is `implementer` -> `patterns` -> `security` -> `design` -> `tests` -> `adversarial`, so the PRD is written as a specification, not as a step-by-step handoff: pattern alignment, security auditing, tests, and adversarial review are already part of the run. Convoy also attaches `.convoy/rules.md`, `AGENTS.md`, and `CLAUDE.md` to every phase automatically, so the PRD does not repeat them.

This command pins `openrouter/z-ai/glm-4.7` for stronger PRD automation. The installer configures OpenRouter throughput routing for this model, which is equivalent to OpenRouter's `:nitro` variant.

Example:

```text
/convoy
```

Picking a pipeline:

```text
/convoy ship
/convoy pipeline ultra-implement
/convoy --pipeline review-lite
```

All three forms work. A bare argument that matches a known pipeline is read as a pipeline, not as a branch name. The command resolves the list by running `opencode-convoy --list-pipelines`, which asks Convoy itself, so project and global config pipelines are included and nothing is hardcoded. A name that is not on the list stops the command before the worktree is created, showing the available pipelines, instead of quietly running the default.

With full guidance:

```text
/convoy feat/billing-retry base main pipeline ultra-implement
```

The PRD is passed to `convoy --prompt-file <path> --dir <worktree> --no-worktree`, with `--base <branch>` and `--pipeline <name>` when the slash command guidance includes them. `--no-worktree` is always passed because Worktrunk already created the isolated worktree; without it Convoy would isolate the run again under `~/.convoy/worktrees/<branch>`, which is its default, and the command would end up with two worktrees. Convoy defaults to the `implement` pipeline; the other built-ins are `implement-lite`, `ultra-implement`, `refine`, `ultra-refine`, and the report-only `review`, `review-lite`, `review-cc`, `hunter`, and `hunter-max`. Any pipeline defined in `~/.convoy/config.yaml` or `.convoy/config.yaml` works too.

The run does not start unattended: Convoy renders the resolved plan (pipeline, models, gateway) in the new tab and waits at `Start run? [y/N]`. Convoy's branch naming step is skipped, since the run commits on the branch Worktrunk created. `convoy finish` still works from inside that tab; only `convoy finish --branch <name>` from the main checkout does not apply, because it looks for a Convoy-managed worktree under `~/.convoy/worktrees/`.

Requirements:

- `wt` must be installed and configured. See <https://github.com/max-sixty/worktrunk>.
- `convoy` must be installed, authenticated/configured, and available in `PATH`. See <https://github.com/Inakitajes/convoy>.
- The installer copies helper scripts to `~/.config/opencode/bin/`.
- On macOS, the helper opens a new Ghostty tab in the front window, falling back to a new Ghostty window. Other systems print the command to run manually.

## `/sync-main`

Use this when a feature branch has fallen behind the project's remote default branch and should be updated with a merge, not a rebase. It asks OpenCode's default `build` agent to detect the default branch from the selected remote, fetch it, merge the remote-tracking ref into the current branch, resolve text conflicts and semantic conflicts while preserving behavior from both sides, and run relevant verification.

This command intentionally does not pin a model. It uses whatever model is configured for the `build` agent in the current OpenCode setup.

Example:

```text
/sync-main
```

With guidance:

```text
/sync-main focus package manager lockfile conflicts
```

Safety behavior:

- It stops before starting the merge if there are uncommitted changes, rather than stashing, discarding, or committing them automatically.
- It does not push unless explicitly requested.
- It never rebases, force pushes, or blindly chooses ours/theirs for conflict resolution.

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
rm -f ~/.config/opencode/commands/safe-commit.md ~/.config/opencode/commands/ready-pr.md ~/.config/opencode/commands/branch.md ~/.config/opencode/commands/archer-implement.md
mkdir -p ~/.config/opencode/bin
cp scripts/bin/opencode-implement.sh ~/.config/opencode/bin/opencode-implement
cp scripts/bin/opencode-implement-open.sh ~/.config/opencode/bin/opencode-implement-open
cp scripts/bin/opencode-convoy.sh ~/.config/opencode/bin/opencode-convoy
cp scripts/bin/opencode-external-review.sh ~/.config/opencode/bin/opencode-external-review
chmod +x ~/.config/opencode/bin/opencode-implement ~/.config/opencode/bin/opencode-implement-open ~/.config/opencode/bin/opencode-convoy ~/.config/opencode/bin/opencode-external-review
rm -f ~/.config/opencode/bin/opencode-branch ~/.config/opencode/bin/opencode-branch-open ~/.config/opencode/bin/opencode-archer-implement ~/.config/opencode/bin/opencode-archer-implement-open
```

Restart OpenCode after installing or updating commands.
