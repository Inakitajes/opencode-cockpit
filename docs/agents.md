# Custom Agents

This repo keeps a versioned copy of the global OpenCode agents stored in `~/.config/opencode/agents`.

## Agents

| Agent | Model | Mode | Purpose |
| --- | --- | --- | --- |
| `plan` | Current/default model | `primary` | Read-only planning, analysis, and audit reports. |
| `ask` | `fireworks-ai/accounts/fireworks/routers/kimi-k2p5-turbo` | `all` | Read-only investigation, explanation, codebase exploration, and web research. |
| `fast` | `openrouter/z-ai/glm-4.7` with throughput routing | `primary` | Full-access fast implementation agent for day-to-day work, not available for subagent delegation. |
| `design` | `anthropic/claude-opus-4-7` | `primary` | UI/UX specialist for design-system-aware frontend work. |

## Permission Model

| Agent | Permissions |
| --- | --- |
| `plan` | Denies edits, asks before bash, allows questions. |
| `ask` | Denies edits and bash, allows webfetch, denies task delegation. |
| `fast` | Allows questions and plan entry. Other permissions follow OpenCode defaults/config. Primary-only mode prevents subagent invocation. |
| `design` | Uses OpenCode defaults/config. Its prompt constrains design workflow and implementation quality. |

## Agent Details

### `plan`

Use this when you want analysis, planning, security audits, or review reports without file modifications. It can inspect the repository with reads/searches and asks before shell commands.

### `ask`

Use this when you want safe research without filesystem edits or shell execution. It is designed to inspect code with read/search tools, use web documentation when helpful, and refuse tasks that require writes or command execution.

### `fast`

Use this for general-purpose implementation where speed matters. It uses GLM 4.7 through OpenRouter with throughput routing, equivalent to OpenRouter's `:nitro` variant. It keeps a permissive workflow for asking clarifying questions or entering plan mode, and is primary-only so agents cannot delegate work to it as a subagent.

### `design`

Use this for frontend and product UI tasks. It is stack-agnostic, requires project inspection before design decisions, and emphasizes reuse of the existing design system, accessibility, responsive behavior, and explicit UI states.

## Install

Run the main installer from the repo root:

```sh
bash scripts/install.sh
```

Or copy agents manually:

```sh
mkdir -p ~/.config/opencode/agents
cp agents/*.md ~/.config/opencode/agents/
```

Restart OpenCode after installing or updating agents.
