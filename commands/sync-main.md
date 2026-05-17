---
description: Fetch origin/main, merge it into the current branch, and resolve conflicts
agent: build
---

Bring the current branch up to date by merging the latest remote `main` into it.

Treat `$ARGUMENTS` as optional guidance for a different remote, base branch, conflict area, or verification scope. Default to `origin/main`.

Follow this workflow:

1. Inspect repository state with `git status --short --branch`.
2. If a merge is already in progress, do not start a new merge. Continue resolving the existing merge and follow the conflict-resolution and verification steps below.
3. Identify the current branch. If it is `main`, `master`, the remote default branch, or detached HEAD, stop and explain that this command is for updating a feature branch from `main`.
4. If there are uncommitted changes, inspect them with `git diff` and `git diff --cached`. Do not stash, discard, or commit them automatically. Stop and ask whether to continue before starting the merge.
5. Fetch the latest remote base with `git fetch origin main`, unless `$ARGUMENTS` explicitly names a different remote or base branch.
6. Verify the fetched remote ref exists. Merge the remote-tracking ref, not a potentially stale local `main` branch.
7. Inspect local and incoming changes when useful with commands such as `git log --oneline --left-right --cherry-pick HEAD...origin/main` and focused diffs.
8. Merge with `git merge --no-edit origin/main`. Do not rebase.
9. If conflicts occur, resolve them by preserving both the behavior implemented on the current branch and the behavior coming from `main`.
10. For each conflict, inspect the real intent on both sides using tools such as `git diff`, `git diff --ours`, `git diff --theirs`, `git show :1:<path>`, `git show :2:<path>`, `git show :3:<path>`, surrounding source, and relevant tests. Never resolve by blindly choosing ours or theirs.
11. Remove all conflict markers, stage only the resolved merge files, and complete the merge commit. Use Git's default merge commit message unless a concise clarification is needed.
12. After the merge is clean, inspect the combined result for semantic conflicts or regressions caused by integrating both lines of work. Change only what is needed to preserve both behaviors.
13. Run the smallest relevant tests or checks for the merged areas. If no obvious verification command exists, state that clearly.
14. If tests fail because of the merge, fix the issue and rerun the relevant checks. If failures are unrelated or blocked, report the exact state and leave the branch understandable.
15. Return a concise summary with the merged base commit, whether conflicts were resolved, tests run, final git status, and any remaining caveats.

Execution ordering:

- Commands that mutate Git state must run sequentially, never in parallel.
- Fetch before merging.
- Do not run verification commands while the repository has unresolved merge conflicts.
- Do not push unless explicitly requested.
- Do not create unrelated commits. The only allowed commit is the merge commit and any necessary conflict or semantic-resolution changes that belong to that merge.

Safety rules:

- Do not rebase.
- Do not force push.
- Do not amend commits.
- Do not bypass hooks with `--no-verify`.
- Do not use destructive Git commands such as `git reset --hard` or `git checkout --`.
- Do not discard, overwrite, stash, or commit unrelated user changes without explicit confirmation.
- If preserving both branch behavior and `main` behavior is ambiguous, stop and ask for guidance with the specific conflicting behavior described.

RTK handling:

- If a verification command such as `pnpm lint`, `npm test`, or `git status` is rewritten to an `rtk` form, count it as the same workflow step.
- Do not rerun the raw command only because the transcript shows an `rtk` prefix or compressed output.
- Use `RTK_DISABLED=1 <command>` only if the command failed, RTK itself reported an error, or raw uncompressed output is needed for debugging.
