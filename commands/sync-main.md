---
description: Fetch the remote default branch, merge it into the current branch, and resolve conflicts
agent: build
---

Bring the current branch up to date by merging the latest remote default/base branch into it.

Treat `$ARGUMENTS` as optional guidance for a specific remote, explicit base branch, conflict area, or verification scope. By default, detect the project's remote default branch automatically instead of assuming `main`.

Follow this workflow:

1. Inspect repository state with `git status --short --branch`.
2. If a merge is already in progress, do not start a new merge. Continue resolving the existing merge and follow the conflict-resolution and verification steps below.
3. Identify the current branch. If it is detached HEAD, stop and explain that this command is for updating a feature branch from the project's default branch.
4. Choose the remote and base branch before merging:
   - If `$ARGUMENTS` explicitly names a remote and/or base branch, honor that override.
   - Otherwise choose `origin` when it exists; if it does not, use the current branch's upstream remote; if there is exactly one configured remote, use it; if the remote is still ambiguous, stop and ask.
   - Fetch remote refs and metadata with `git fetch <remote>` before detecting the default branch, unless a merge is already in progress.
   - Detect the base branch from the selected remote, preferring `git symbolic-ref --quiet --short refs/remotes/<remote>/HEAD`, then the `HEAD branch` reported by `git remote show <remote>`, then `git ls-remote --symref <remote> HEAD`.
   - Only if remote default detection is unavailable, fall back to common branch names by checking which of `main`, `master`, or `default` exists on that remote. Use the fallback only when exactly one candidate exists; otherwise stop and ask.
   - Store the chosen remote-tracking ref as `<remote>/<base-branch>`.
5. If the current branch is the chosen base branch, stop and explain that this command is for updating a feature branch from `<remote>/<base-branch>`.
6. If there are uncommitted changes, inspect them with `git diff` and `git diff --cached`. Do not stash, discard, or commit them automatically. Stop and ask whether to continue before starting the merge.
7. Fetch the latest remote base with `git fetch <remote> <base-branch>` or an equivalent refspec that updates `refs/remotes/<remote>/<base-branch>`, unless `$ARGUMENTS` explicitly requested a different fetch strategy.
8. Verify the fetched remote-tracking ref exists. Merge the remote-tracking ref, not a potentially stale local base branch.
9. Inspect local and incoming changes when useful with commands such as `git log --oneline --left-right --cherry-pick HEAD...<remote>/<base-branch>` and focused diffs.
10. Merge with `git merge --no-edit <remote>/<base-branch>`. Do not rebase.
11. If conflicts occur, resolve them by preserving both the behavior implemented on the current branch and the behavior coming from the base branch.
12. For each conflict, inspect the real intent on both sides using tools such as `git diff`, `git diff --ours`, `git diff --theirs`, `git show :1:<path>`, `git show :2:<path>`, `git show :3:<path>`, surrounding source, and relevant tests. Never resolve by blindly choosing ours or theirs.
13. Remove all conflict markers, stage only the resolved merge files, and complete the merge commit. Use Git's default merge commit message unless a concise clarification is needed.
14. After the merge is clean, inspect the combined result for semantic conflicts or regressions caused by integrating both lines of work. Change only what is needed to preserve both behaviors.
15. Run the smallest relevant tests or checks for the merged areas. If no obvious verification command exists, state that clearly.
16. If tests fail because of the merge, fix the issue and rerun the relevant checks. If failures are unrelated or blocked, report the exact state and leave the branch understandable.
17. Return a concise summary with the chosen base ref and merged base commit, whether conflicts were resolved, tests run, final git status, and any remaining caveats.

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
- If preserving both branch behavior and base-branch behavior is ambiguous, stop and ask for guidance with the specific conflicting behavior described.
