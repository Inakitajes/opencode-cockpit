---
description: Run a read-only security audit for the current PR branch or full repository
agent: plan
---

Run a read-only security audit and produce a concise report with risks found and an action plan.

Use `$ARGUMENTS` as optional scope, base branch, PR context, or areas of concern. If arguments conflict with repository state, explain the assumption you used.

Stay in plan/audit mode. Do not modify files, apply patches, commit, push, install dependencies, or run destructive commands.

Scope selection:

- First inspect Git state with safe read-only commands such as `git status --short --branch`, `git branch --show-current`, and remote/default-branch discovery when needed.
- If the current branch is not the default branch and not `main` or `master`, audit what is implemented in the pull request branch.
- For a branch audit, compare against the most likely base branch. Prefer an explicit base from `$ARGUMENTS`; otherwise use the upstream PR base when discoverable with `gh pr view`, then the remote default branch, then `main` or `master` if present.
- Include both committed changes and local uncommitted changes in the audit scope when present. Mention that local changes are included.
- If the current branch is the default branch, `main`, `master`, detached, or no concrete branch/PR scope can be established, audit the full repository.

Audit process:

1. Identify the audit scope and state it at the top of the report.
2. Inspect the relevant diff for branch audits with safe read-only Git commands. Inspect the whole repository for full-repo audits.
3. Review security-sensitive areas first: authentication, authorization, session handling, input validation, output encoding, secrets, cryptography, dependency/config changes, file/network access, logging, error handling, data exposure, injection vectors, SSRF/path traversal/deserialization, CORS/CSP, and infrastructure or CI changes.
4. Prioritize concrete, exploitable risks introduced or affected by the scoped changes. Avoid generic checklist items unless tied to evidence.
5. If tooling such as dependency audit commands is obvious and safe, ask before running it unless the current permission model already allows it.

Return the report in this format:

## Scope

State whether this audited the PR branch diff or the full repository, including base branch/commit when available and whether uncommitted changes were included.

## Risks Found

List findings ordered by severity. For each finding include:

- Severity: `critical`, `high`, `medium`, or `low`.
- Location: file path and line reference when possible.
- Risk: concise description of the vulnerability or security weakness.
- Impact: concrete attacker or data impact.
- Evidence: what code/config/diff supports the finding.
- Recommendation: minimal corrective action.

If there are no material findings, say so explicitly and list residual risks or areas not deeply inspected.

## Action Plan

Provide a short prioritized plan with practical next steps. Mark any item that should block merge.

## Notes

Mention assumptions, commands/tools used, and any limitations.
