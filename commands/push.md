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
9. Push the current branch. If no upstream is configured, use `git push -u origin <current-branch>` when `origin` exists. If no suitable remote exists, stop and report what is missing.
10. Return a concise summary with commit hash, tests run, push destination, and any caveats.

Safety rules:

- Do not use destructive Git commands.
- Do not force push.
- Do not amend commits.
- Do not bypass hooks with `--no-verify`.
- Do not commit likely secrets such as `.env`, credentials, tokens, private keys, or local machine files.
- If there are unrelated changes, leave them untouched and mention them.
