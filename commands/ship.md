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
5. If a commit was created, verify it succeeded before pushing by checking `git rev-parse --short HEAD` and `git status --short --branch`.
6. Push the current branch only after any required commit verification succeeds. If no upstream is configured, use `git push -u origin <current-branch>` when `origin` exists. Never force push.
7. Verify the push succeeded with `git status --short --branch`. If the branch is still ahead of its upstream, report that the commit exists locally but the push did not complete, and stop before creating or updating a PR.
8. Use `gh` to inspect whether a PR already exists for the current branch.
9. If no PR exists, create one with a conventional, concise title and a useful body.
10. The PR body must include:
    - Summary bullets focused on why the change exists.
    - Tests/checks run, with exact commands and result.
    - Review notes or risks, if any.
    - A checklist for tests, self-review, docs/config updates when relevant, and no secrets.
11. After creating or finding the PR, capture its URL explicitly with `gh pr view --json url --jq .url`, then check CI status with `gh pr checks`. If checks are still pending, wait for them when practical. If checks fail, report the failing checks and likely next action.
12. Return a concise summary that always includes the pull request URL, final check status, tests run locally, and any unresolved risks.

Execution ordering:

- Commands that mutate Git state must run sequentially, never in parallel.
- Run `git add`, then wait for it to finish successfully before running `git commit`.
- Run `git commit`, then wait for it to finish successfully before running any `git push`.
- Run `git push`, then wait for it to finish successfully before running `gh pr create`, `gh pr edit`, or reporting success.
- Do not run `git push` in the same parallel tool batch as `git add`, `git commit`, formatting, tests, or any other command that may create or modify commits.
- Only independent read-only inspection commands may be parallelized.

RTK handling:

- If a verification command such as `pnpm lint`, `npm test`, or `git status` is rewritten to an `rtk` form, count it as the same workflow step.
- Do not rerun the raw command only because the transcript shows an `rtk` prefix or compressed output.
- Use `RTK_DISABLED=1 <command>` only if the command failed, RTK itself reported an error, or raw uncompressed output is needed for debugging.

Safety rules:

- Do not use destructive Git commands.
- Do not force push.
- Do not amend commits.
- Do not bypass hooks with `--no-verify`.
- Do not create duplicate PRs.
- Do not commit or push likely secrets.
- If authentication for `gh` or Git is missing, stop and report the exact blocker.
