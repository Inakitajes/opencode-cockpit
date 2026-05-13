# OpenCode Cockpit

Local OpenCode customizations: plugins, agents, commands, scripts, and config snippets to improve the daily workflow.

## What's Included

- `plugins/tui/status-title.js`: TUI plugin that updates the terminal tab/window title.
- `plugins/server/session-notifications.js`: server plugin that sends local macOS notifications.
- `agents/*.md`: versioned global custom agents.
- `commands/*.md`: versioned global custom slash commands.
- `scripts/bin/*`: local helpers for integrations like Worktrunk.
- `raycast/prompt-stash`: Raycast extension that manages a Prompt Stash: a FIFO queue for future prompts that should stay outside the OpenCode agent loop until you explicitly paste them.
- `docs/agents.md`: documentation for the included agents.
- `docs/commands.md`: documentation for the included commands.
- `docs/stack.md`: documentation for the local programming stack.
- `scripts/install.sh`: local installer that copies plugins, agents, commands, and helpers to `~/.config/opencode`, and registers the TUI plugin.
- `config/tui.json`: minimal TUI config example.
- `config/opencode.json`: minimal OpenCode config example with OpenRouter throughput routing, Warp plugin registration, build agent color, and a read-only RTK tee log exception.

## Agents

This repo includes a versioned copy of your global custom agents:

- `ask`: read-only agent for research, codebase exploration, and web research.
- `plan`: primary read-only agent for planning, analysis, and audits.
- `fast`: fast full-access primary agent using GLM 4.7 on OpenRouter Nitro; not available as a subagent.
- `design`: UI/UX specialist using Claude Opus 4.7 on Anthropic.

Agent colors are pinned for stable TUI identification: `plan` blue, `build` amber, `design` orange, `fast` green, and `ask` violet.

See `docs/agents.md` for model, permission, and usage details.

## Stack

The local programming stack is built around OpenCode, Worktrunk (`wt`), and Ghostty:

- OpenCode as the cockpit for agents, commands, and plugins.
- Worktrunk for starting implementations in isolated worktrees from plans with `/write-plan` and `/implement`.
- Ghostty as the main terminal for running OpenCode sessions.
- Raycast Prompt Stash as an out-of-band prompt queue for capturing follow-up prompts while OpenCode is still working. It avoids sending those prompts into the current agentic loop until you intentionally pop one into the focused input.

See `docs/stack.md` for workflow details and repository boundaries.

## Commands

This repo includes global custom commands:

- `/clean-code`: read-only audit for architecture, maintainability, SRP, SOLID, and code smells.
- `/audit`: read-only security audit for the current PR or full repository using the `plan` agent.
- `/write-plan`: writes a repository-aware implementation plan to the preferred plan path.
- `/implement`: starts implementation from the current plan in a repo-aware Worktrunk worktree and opens a clean OpenCode session there.
- `/push`: runs relevant tests/checks, creates a conventional commit, and pushes.
- `/ship`: prepares the branch, pushes, opens or reuses a PR, and verifies checks.

See `docs/commands.md` for usage and argument details.

## Status

- `🟡 | session · branch`: OpenCode is working.
- `🟢 | session · branch`: the session is idle or finished.
- `🔴 | session · branch`: the session needs attention, is retrying, or hit an error.

When OpenCode runs inside a Git repository, the TUI plugin appends the current branch to the terminal title. This also works in Git worktrees, including Worktrunk worktrees, because the plugin resolves `.git` files that point at the real Git directory.

## Notifications

On macOS, the server plugin shows local notifications. When running inside Ghostty, it first attempts Ghostty's native OSC 9 desktop notification sequence (`ESC ] 9 ; text ESC \`). This only works if the plugin output reaches the real Ghostty PTY; if OpenCode captures that output or the sequence is unavailable, it falls back to `osascript`:

- `OpenCode 🟢`: the session has finished.
- `OpenCode 🔴`: the session needs attention.
- `OpenCode 🔴`: the session hit an error.

Notifications are best effort. If macOS blocks them, OpenCode will keep working.

## Quick Install

From the repository root:

```sh
bash scripts/install.sh
```

Then restart your OpenCode tabs. Plugins, agents, commands, and config updates are loaded on startup.

The installer also merges a focused RTK log permission into `~/.config/opencode/opencode.json`: reads under `~/Library/Application Support/rtk/tee/**` are allowed as an external directory, while edits there are denied.

The `/implement` command requires Worktrunk (`wt`). Recommended installation:

```sh
brew install worktrunk && wt config shell install
```

## Recommended

I recommend using RTK to save tokens when working with these tools. It is optional, but useful for reducing token usage in larger workflows.

Install RTK from <https://github.com/rtk-ai/rtk>.

For OpenCode, initialize RTK with its OpenCode plugin so command rewrites happen through OpenCode's tool hook:

```sh
rtk init --global --opencode
```

The installed agents are RTK-aware: if `pnpm lint` appears in the transcript as `rtk pnpm lint` or another RTK-wrapped form, they treat it as the expected execution of `pnpm lint` and do not retry the raw command unless the command failed, RTK reported an error, or raw output is explicitly needed. Use `RTK_DISABLED=1 <command>` for that one-off raw rerun.

## Manual Install

1. Create the global folders.

```sh
mkdir -p ~/.config/opencode/plugins ~/.config/opencode/tui-plugins ~/.config/opencode/agents ~/.config/opencode/commands ~/.config/opencode/bin
```

2. Copy the server plugin.

```sh
cp plugins/server/session-notifications.js ~/.config/opencode/plugins/session-notifications.js
```

3. Copy the TUI plugin.

```sh
cp plugins/tui/status-title.js ~/.config/opencode/tui-plugins/status-title.js
```

4. Copy the agents.

```sh
cp agents/*.md ~/.config/opencode/agents/
```

5. Copy the commands.

```sh
cp commands/*.md ~/.config/opencode/commands/
rm -f ~/.config/opencode/commands/safe-commit.md ~/.config/opencode/commands/ready-pr.md ~/.config/opencode/commands/branch.md
```

6. Copy the Worktrunk helpers.

```sh
cp scripts/bin/opencode-implement.sh ~/.config/opencode/bin/opencode-implement
cp scripts/bin/opencode-implement-open.sh ~/.config/opencode/bin/opencode-implement-open
chmod +x ~/.config/opencode/bin/opencode-implement ~/.config/opencode/bin/opencode-implement-open
rm -f ~/.config/opencode/bin/opencode-branch ~/.config/opencode/bin/opencode-branch-open
```

7. Register the TUI plugin in `~/.config/opencode/tui.json`.

If you do not have a `tui.json`, you can use:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./tui-plugins/status-title.js"]
}
```

If you already have a `tui.json`, add `"./tui-plugins/status-title.js"` to the existing `plugin` array.

8. Register the build agent color and optional RTK tee log permission in `~/.config/opencode/opencode.json`.

```json
{
  "agent": {
    "build": {
      "color": "#eab308"
    }
  },
  "permission": {
    "external_directory": {
      "~/Library/Application Support/rtk/tee/**": "allow"
    },
    "edit": {
      "~/Library/Application Support/rtk/tee/**": "deny"
    }
  }
}
```

9. Restart OpenCode.

## Security

- Does not use third-party npm packages.
- Does not execute remote code.
- The server plugin runs `osascript` with `Bun.spawn([...])`, passing arguments as an array and escaping notification text.
- On macOS, it tries Ghostty OSC 9 desktop notifications before falling back to `osascript`. If the OSC sequence cannot reach Ghostty's PTY, macOS may show the fallback notification as AppleScript.
- The TUI plugin only uses the local OpenCode API to read session state and update the terminal title.
- Agents are local OpenCode Markdown configuration files.
- Commands are local OpenCode Markdown configuration files.
- Helpers are installed into `~/.config/opencode/bin` and do not execute remote code.

## Compatibility

- Tested with OpenCode `1.14.39`.
- Title updates depend on your terminal supporting `OSC 0`/`setTerminalTitle`.
- The included notifications are for macOS. On other systems, the plugin simply does not send notifications.

## Development

Check that modules import correctly:

```sh
bun run check
```

Develop the Raycast Prompt Stash extension:

```sh
cd raycast/prompt-stash
npm install
npm run dev
```

`npm run dev` registers the extension locally in Raycast. Once the `Add Prompt`, `Pop Prompt`, and `Manage Prompts` commands appear, you can stop the process with `Ctrl+C`; the extension will remain available in Raycast. Run `npm run dev` again after changing the code.

Then assign hotkeys from Raycast Preferences > Extensions > Prompt Stash. Recommended usage:

- `Add Prompt`: opens a form to save a future prompt.
- `Pop Prompt`: pastes the oldest prompt into the active app and archives it.
- `Manage Prompts`: lets you view the queue and history, paste a specific prompt, restore archived prompts, or delete items.

Install plugins, agents, commands, and helpers locally from the repo:

```sh
bun run install:local
```

## Uninstall

Remove these files:

```sh
rm -f ~/.config/opencode/plugins/session-notifications.js
rm -f ~/.config/opencode/tui-plugins/status-title.js
rm -f ~/.config/opencode/agents/ask.md
rm -f ~/.config/opencode/agents/fast.md
rm -f ~/.config/opencode/agents/design.md
rm -f ~/.config/opencode/commands/clean-code.md
rm -f ~/.config/opencode/commands/push.md
rm -f ~/.config/opencode/commands/ship.md
rm -f ~/.config/opencode/commands/implement.md
rm -f ~/.config/opencode/commands/branch.md
rm -f ~/.config/opencode/bin/opencode-implement
rm -f ~/.config/opencode/bin/opencode-implement-open
rm -f ~/.config/opencode/bin/opencode-branch
rm -f ~/.config/opencode/bin/opencode-branch-open
```

Then remove `"./tui-plugins/status-title.js"` from `~/.config/opencode/tui.json` and restart OpenCode.
