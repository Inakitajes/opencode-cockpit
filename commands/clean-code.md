---
description: Audit architecture, maintainability, and clean-code risks without editing files
---

Run a read-only architecture and maintainability audit for this project or for the scope in `$ARGUMENTS` if provided.

Use the currently selected session agent and model. Stay in audit/plan mode: produce a report only.

Do not modify files. Do not run shell commands. Do not commit anything.

Inspect the relevant codebase before reporting. Prioritize concrete, evidence-backed findings over generic advice.

Review for:

- SRP violations: modules, classes, components, functions, or services doing too many unrelated things.
- SOLID and dependency-direction issues where applicable.
- Code smells: duplication, over-abstraction, primitive obsession, long functions, feature envy, hidden temporal coupling, global state, unclear ownership, and brittle conditionals.
- Architecture consistency: whether new code follows existing project patterns, boundaries, naming conventions, layering, state management, error handling, and testing style.
- Maintainability risks: unclear APIs, leaky abstractions, unbounded complexity, weak encapsulation, poor separation between domain/application/infrastructure/UI concerns, and hard-to-test code.
- Project-specific best practices: conventions already present in this repository should take precedence over generic rules.

Return a report in this format:

## Findings

List findings ordered by severity. For each finding include:

- Severity: `high`, `medium`, or `low`.
- Location: file path and line reference when possible.
- Issue: concise description of the risk.
- Why it matters: concrete maintainability or architecture impact.
- Recommendation: minimal corrective direction, not a full rewrite.

## Positive Signals

Briefly note patterns that are working well and should be preserved.

## Suggested Next Steps

Provide a short prioritized list of improvements. Keep it practical and incremental.

If there are no material findings, say so explicitly and mention residual risks or areas not inspected.
