# Custom Agents

This repo keeps a versioned copy of the global OpenCode agents stored in `~/.config/opencode/agents`.

## Agents

| Agent | Model | Mode | Purpose |
| --- | --- | --- | --- |
| `build` | Current/default model | `primary` | Default implementation agent. |
| `plan` | Current/default model | `primary` | Read-only planning, analysis, and audit reports. |
| `ask` | `openrouter/z-ai/glm-4.7` with throughput routing | `all` | Read-only investigation, explanation, codebase exploration, and web research. |
| `fast` | `openrouter/z-ai/glm-5.2` with throughput routing | `primary` | Full-access fast implementation agent for day-to-day work, not available for subagent delegation. |
| `design` | `openrouter/moonshotai/kimi-k3` | `primary` | UI/UX specialist for design-system-aware frontend work. |

## Colors

| Agent | Color | Hex |
| --- | --- | --- |
| `plan` | blue | `#38bdf8` |
| `build` | gold | `#eab308` |
| `design` | orange | `#f97316` |
| `fast` | green | `#22c55e` |
| `ask` | violet | `#a78bfa` |

## Permission Model

| Agent | Permissions |
| --- | --- |
| `build` | Uses OpenCode defaults/config. |
| `plan` | Denies edits, asks before bash, allows questions. |
| `ask` | Denies edits and bash, allows webfetch, denies task delegation. |
| `fast` | Allows questions and plan entry. Other permissions follow OpenCode defaults/config. Primary-only mode prevents subagent invocation. |
| `design` | Uses OpenCode defaults/config. Its prompt constrains design workflow and implementation quality. |

## Agent Details

### `build`

Use this for the default full-access implementation flow. This repo overrides the built-in `build` agent with a local prompt that keeps OpenCode's normal permissions and standard shell-command reporting.

### `plan`

Use this when you want analysis, planning, security audits, or review reports without file modifications. It can inspect the repository with reads/searches and asks before shell commands.

### `ask`

Use this when you want safe research without filesystem edits or shell execution. It is designed to inspect code with read/search tools, use web documentation when helpful, and refuse tasks that require writes or command execution.

### `fast`

Use this for general-purpose implementation where speed matters. It uses GLM 5.2 through OpenRouter with throughput routing, which selects the fastest available provider. It keeps a permissive workflow for asking clarifying questions or entering plan mode, and is primary-only so agents cannot delegate work to it as a subagent.

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
