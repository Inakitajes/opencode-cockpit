---
description: Run a Convoy pipeline from the current plan in a repo-aware Worktrunk worktree
agent: fast
model: "openrouter/z-ai/glm-4.7"
---

Run a Convoy pipeline against the current plan by creating a fresh Worktrunk worktree, then opening a clean Convoy run in that new worktree with a repository-aware PRD. Convoy runs directly in the Worktrunk worktree with `--no-worktree`, so it does not create a second worktree of its own.

Use `$ARGUMENTS` as optional guidance for branch name, branch type, base branch, pipeline, issue key, or saved plan path. If the user provides an explicit branch name, prefer it only when it matches the repository conventions.

Convoy runs a pipeline of specialized agents over the PRD, one commit per phase. The default `implement` pipeline is `implementer` -> `patterns` -> `security` -> `design` -> `tests` -> `adversarial`, so pattern alignment, security auditing, tests, and adversarial review are already part of the run.

Rules:

- Inspect repository instructions first. Read `AGENTS.md`, `CLAUDE.md`, `README*`, and any referenced plan file before deciding the branch name or workflow.
- Follow repository-specific branch naming, setup, and verification rules when they exist.
- Do not paste `AGENTS.md`, `CLAUDE.md`, or `.convoy/rules.md` into the PRD. Convoy attaches those files to every phase automatically. Reference them and add only what is missing.
- Use Worktrunk through the `wt` command only. Worktrunk owns the worktree; Convoy runs inside it and never creates one.
- Do not use plain `git worktree` unless the user explicitly asks for a fallback.
- If the repository requires an issue key or ticket id in branch names and it is missing, stop and ask for it before creating the worktree.
- Do not modify project files or commit in the current worktree. Convoy commits once per phase inside the new worktree, which is expected.
- Do not run `convoy` directly from the current session. The helper is responsible for opening a separate terminal tab/window.
- If the helper prints a manual command to run, report it to the user; do not execute that command inside this agent session.
- If there is no clear plan in the conversation, ask for the missing plan before creating the worktree.
- If the current repository has uncommitted changes, warn briefly and ask whether to continue from the current HEAD or stop.

Workflow:

1. Resolve the requested pipeline and base branch from `$ARGUMENTS` before anything else. The PRD shape depends on the pipeline, so this cannot be left until the end.

   - List the pipelines this repository actually resolves:

     ```sh
     ~/.config/opencode/bin/opencode-convoy --list-pipelines
     ```

   - Accept the pipeline in any of these forms: a bare name (`/convoy ship`), the phrase `pipeline <name>`, or the flag `--pipeline <name>`.
   - A token that matches a listed pipeline is a pipeline request, not a branch name.
   - If `$ARGUMENTS` asks for a pipeline that is not in the list, stop and ask which one to use, showing the available names. Never fall back to the default pipeline in silence.
   - Accept the base branch as `base <branch>` or `--base <branch>`.
   - When no pipeline is requested, Convoy uses `implement`.

2. Inspect the current branch and dirty state with `git status --short --branch`.
3. Determine the plan source from the current conversation and any referenced saved plan file.
4. Generate a safe branch name from repository rules first and from the plan second.
   - If the repository documents a branch naming convention, follow it.
   - Otherwise use this fallback style:
     - `feat/<short-feature-name>` for new functionality.
     - `fix/<short-bug-name>` for bug fixes.
     - `refactor/<short-area-name>` for refactors.
     - `chore/<short-task-name>` for maintenance.
5. Write the PRD that Convoy will run. Use this structure:

```md
# Goal

<what gets built, in one or two sentences>

# Context

<relevant context from the conversation; path to the saved plan when one exists>

# Scope

- In scope: <what this run must deliver>
- Out of scope: <what it must not touch>

# Acceptance criteria

- [ ] <observable, verifiable outcome>

# Relevant files and areas

<concrete repository paths worth inspecting>

# Constraints

<repository conventions that are not already in AGENTS.md, CLAUDE.md, or .convoy/rules.md>

# Risks and open questions

<known risks, unknowns, and decisions the run should surface instead of guessing>
```

   If the pipeline resolved in step 1 is report-only (`review`, `review-lite`, `review-cc`, `hunter`, `hunter-max`), scope the audit instead of describing an implementation: state what to review, against which base, and what counts as a blocking finding.

6. Run the installed helper with the resolved flags and the branch name, and pass the PRD on stdin:

```sh
~/.config/opencode/bin/opencode-convoy --pipeline '<pipeline>' --base '<base>' '<branch-name>' <<'EOF'
<PRD>
EOF
```

   Omit `--pipeline` or `--base` entirely when the user did not ask for them. With neither, the call is `~/.config/opencode/bin/opencode-convoy '<branch-name>' <<'EOF' ... EOF`. Never substitute a placeholder like `<pipeline>` literally.

7. Report the branch name, the pipeline the run will use, and that a new Ghostty tab opened in the fresh worktree. Tell the user the tab shows the resolved run plan (pipeline, models, gateway) and waits at `Start run? [y/N]`, so nothing runs until they confirm it there. There is no branch naming step: the run uses the branch Worktrunk already created.
