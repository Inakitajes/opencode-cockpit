---
description: Start implementation from the current plan in a repo-aware Worktrunk worktree
agent: fast
model: "openrouter/z-ai/glm-4.7"
---

Start implementing the current plan by creating a fresh Worktrunk worktree, then open a clean OpenCode session in that new worktree with a repository-aware implementation handoff prompt.

Use `$ARGUMENTS` as optional guidance for branch name, branch type, base branch, issue key, or saved plan path. If the user provides an explicit branch name, prefer it only when it matches the repository conventions.

Rules:

- Inspect repository instructions first. Read `AGENTS.md`, `CLAUDE.md`, `README*`, and any referenced plan file before deciding the branch name or workflow.
- Follow repository-specific branch naming, setup, and verification rules when they exist.
- Use Worktrunk through the `wt` command only.
- Do not use plain `git worktree` unless the user explicitly asks for a fallback.
- If the repository requires an issue key or ticket id in branch names and it is missing, stop and ask for it before creating the worktree.
- Do not modify project files in the current worktree.
- Do not commit anything.
- Do not run `opencode` directly from the current session. The helper is responsible for opening a separate terminal tab/window.
- If the helper prints a manual command to run, report it to the user; do not execute that command inside this agent session.
- If there is no clear plan in the conversation, ask for the missing plan before creating the worktree.
- If the current repository has uncommitted changes, warn briefly and ask whether to continue from the current HEAD or stop.

Workflow:

1. Inspect the current branch and dirty state with `git status --short --branch`.
2. Determine the plan source from the current conversation and any referenced saved plan file.
3. Generate a safe branch name from repository rules first and from the plan second.
   - If the repository documents a branch naming convention, follow it.
   - Otherwise use this fallback style:
     - `feat/<short-feature-name>` for new functionality.
     - `fix/<short-bug-name>` for bug fixes.
     - `refactor/<short-area-name>` for refactors.
     - `chore/<short-task-name>` for maintenance.
4. Build a complete handoff prompt for the new OpenCode session. Include:
   - Goal.
   - Context from the conversation.
   - Proposed plan or saved plan path.
   - Repository workflow rules that must be followed.
   - Branch naming rule that was applied.
   - Required setup commands after entering the worktree.
   - Files or areas likely to inspect.
   - Acceptance criteria.
   - Required verification commands.
   - Explicit TDD loop: write a failing test first, verify the expected failure, implement the minimum code to pass, rerun the targeted tests, then refactor while keeping tests green.
   - Known risks, open questions, and constraints.
   - Instruction to inspect the codebase before editing.
5. Run the installed helper with the branch name and pass the handoff prompt on stdin:

```sh
~/.config/opencode/bin/opencode-implement '<branch-name>' <<'EOF'
<handoff prompt>
EOF
```

6. Report the branch name and that a fresh OpenCode session was opened in the new worktree.

If the user includes `base <branch>` in `$ARGUMENTS`, pass it to the helper with `--base <branch>`.

RTK handling:

- If shell commands are rewritten to `rtk` forms, treat them as the expected execution of the original command.
- Do not rerun a raw command only because the transcript shows an `rtk` prefix or compact output.
