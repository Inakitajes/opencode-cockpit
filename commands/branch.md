---
description: Create a Worktrunk worktree from the current plan and open a fresh OpenCode session there
agent: fast
model: "openrouter/z-ai/glm-4.7"
---

Create a new Worktrunk worktree from the plan we have just designed in this conversation, then open a clean OpenCode session in that new worktree with the plan passed as the starting prompt.

Use `$ARGUMENTS` as optional guidance for branch name, branch type, or base branch. If the user provides an explicit branch name, prefer it. Otherwise infer a concise branch name from the current plan.

Rules:

- Use Worktrunk through the `wt` command only.
- Do not use plain `git worktree` unless the user explicitly asks for a fallback.
- Do not modify project files in the current worktree.
- Do not commit anything.
- If there is no clear plan in the conversation, ask for the missing plan before creating the worktree.
- If the current repository has uncommitted changes, warn briefly and ask whether to continue from the current HEAD or stop.

Workflow:

1. Inspect the current branch and dirty state with `git status --short --branch`.
2. Generate a safe branch name from the plan using this style:
   - `feat/<short-feature-name>` for new functionality.
   - `fix/<short-bug-name>` for bug fixes.
   - `refactor/<short-area-name>` for refactors.
   - `chore/<short-task-name>` for maintenance.
3. Build a complete handoff prompt for the new OpenCode session. Include:
   - Goal.
   - Context from the conversation.
   - Proposed plan.
   - Files or areas likely to inspect.
   - Acceptance criteria.
   - Known risks, open questions, and constraints.
   - Instruction to inspect the codebase before editing.
4. Run the installed helper with the branch name and pass the handoff prompt on stdin:

```sh
~/.config/opencode/bin/opencode-branch '<branch-name>' <<'EOF'
<handoff prompt>
EOF
```

5. Report the branch name and that a fresh OpenCode session was opened in the new worktree.

If the user includes `base <branch>` in `$ARGUMENTS`, pass it to the helper with `--base <branch>`.
