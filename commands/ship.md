---
description: Verify tests, push all committed work, open a PR, and wait for green checks
agent: fast
model: "openrouter/z-ai/glm-4.7"
---

Prepare this branch for review and open a pull request.

Treat `$ARGUMENTS` as optional guidance for PR title, target branch, or context.

Follow this workflow:

1. Inspect repository state with `git status --short --branch`.
2. Identify the current branch, upstream tracking branch, and default base branch from the remote. Do not open a PR from `main` or `master` unless explicitly requested.
3. If there are uncommitted changes, run the same safe workflow as `/push`: inspect changes, run relevant tests/checks, create a conventional commit, and avoid unrelated files.
4. If the working tree is clean, still run relevant tests/checks when available before opening the PR.
5. Push the current branch. If no upstream is configured, use `git push -u origin <current-branch>` when `origin` exists. Never force push.
6. Use `gh` to inspect whether a PR already exists for the current branch.
7. If no PR exists, create one with a conventional, concise title and a useful body.
8. The PR body must include:
   - Summary bullets focused on why the change exists.
   - Tests/checks run, with exact commands and result.
   - Review notes or risks, if any.
   - A checklist for tests, self-review, docs/config updates when relevant, and no secrets.
9. After creating or finding the PR, check CI status with `gh pr checks`. If checks are still pending, wait for them when practical. If checks fail, report the failing checks and likely next action.
10. Return the PR URL, final check status, tests run locally, and any unresolved risks.

Safety rules:

- Do not use destructive Git commands.
- Do not force push.
- Do not amend commits.
- Do not bypass hooks with `--no-verify`.
- Do not create duplicate PRs.
- Do not commit or push likely secrets.
- If authentication for `gh` or Git is missing, stop and report the exact blocker.
