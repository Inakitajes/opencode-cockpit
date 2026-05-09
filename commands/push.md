---
description: Run relevant tests, create a conventional commit, and push the current branch
agent: fast
model: "openrouter/z-ai/glm-4.7"
---

Prepare the current work for delivery: run relevant tests when available, create a conventional commit, and push the current branch.

Treat `$ARGUMENTS` as optional guidance for the intended commit scope or message.

Follow this workflow:

1. Inspect the working tree with `git status --short --branch`.
2. Review unstaged and staged changes with `git diff` and `git diff --cached`.
3. Review recent commit style with `git log --oneline -10`.
4. Identify the project package manager and available verification commands from repo files such as `package.json`, `Makefile`, CI config, language manifests, or test directories.
5. Run the smallest relevant test/check command that gives confidence for the changed files. If the project has no obvious tests/checks, state that clearly and continue.
6. If tests/checks fail, stop before committing. Report the failure and the likely fix direction.
7. Stage only relevant files for the intended change. Do not stage unrelated local work unless it is clearly part of the requested commit. If unsure, ask before staging.
8. Create one conventional commit using the repository's style. Prefer `fix:`, `feat:`, `refactor:`, `test:`, `docs:`, `chore:`, or `ci:` as appropriate.
9. Verify the commit succeeded before pushing by checking `git rev-parse --short HEAD` and `git status --short --branch`.
10. Push the current branch only after the commit verification succeeds. If no upstream is configured, use `git push -u origin <current-branch>` when `origin` exists. If no suitable remote exists, stop and report what is missing.
11. Verify the push succeeded with `git status --short --branch`. If the branch is still ahead of its upstream, report that the commit was created locally but the push did not complete.
12. Return a concise summary with commit hash, tests run, push destination, post-push status, and any caveats.

Execution ordering:

- Commands that mutate Git state must run sequentially, never in parallel.
- Run `git add`, then wait for it to finish successfully before running `git commit`.
- Run `git commit`, then wait for it to finish successfully before running any `git push`.
- Run `git push`, then wait for it to finish before reporting success.
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
- Do not commit likely secrets such as `.env`, credentials, tokens, private keys, or local machine files.
- If there are unrelated changes, leave them untouched and mention them.
