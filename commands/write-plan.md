---
description: Write an implementation plan that follows the current repository's conventions
agent: fast
model: "openrouter/z-ai/glm-4.7"
---

Write an implementation plan for the requested work and save it to the current repository's preferred plan location.

Use `$ARGUMENTS` as optional guidance for the plan title, issue key, scope, branch type, or relevant files.

Rules:

- Inspect the repository before planning. Read `AGENTS.md`, `CLAUDE.md`, `README*`, and the relevant source and test files. Do not write the plan from summaries alone.
- Follow repository-specific conventions exactly when they exist.
- If the repository requires an issue key, ticket id, or specific plan filename format and it is missing, stop and ask for it before writing the plan.
- Do not implement code. This command produces and saves a plan only.

Workflow:

1. Inspect the repository instructions, project structure, and relevant code paths.
2. Determine the preferred plan location and naming convention from repository docs. If none exists, default to `docs/plans/YYYY-MM-DD-<short-name>.md`.
3. Determine any repository-specific rules that the implementation must follow:
   - branch naming
   - workspace or worktree tool
   - package manager and setup commands
   - test and lint commands
   - PR or ticket workflow requirements
4. Build an implementation-ready plan with exact file paths, matching test paths, and concrete verification commands.
5. Save the plan file.
6. Return a concise summary with the saved plan path, intended branch name, and the command the user should run next to start implementation.

Plan requirements:

- Keep the plan concrete and execution-ready, not high-level.
- Include a short header with goal, architecture summary, affected files or areas, acceptance criteria, and notable risks.
- Include the intended branch name or naming rule.
- Break the work into small, independently verifiable vertical slices.
- Make TDD explicit for each behavior change:
  - write the failing test first
  - run it and verify the expected failure
  - implement the minimum code to pass
  - rerun the targeted tests and verify they pass
  - refactor while keeping tests green
- Use the repository's native commands in the plan.
- Include the setup command the implementation workspace should run first when the repository defines one.
- Include a final delivery task covering the required checks, commit guidance, and PR or MR workflow when the repository defines them.
- Do not use placeholders such as `TODO`, `TBD`, `add tests`, `handle edge cases`, or `update docs` without exact instructions.

RTK handling:

- If shell commands are rewritten to `rtk` forms, treat them as the expected execution of the original command.
- Do not rerun a raw command only because the transcript shows an `rtk` prefix or compact output.
