# Prompt Stash

Raycast extension that manages a Prompt Stash: a FIFO queue for future OpenCode prompts that should stay outside the agentic loop until you explicitly paste them.

## Commands

- `Add Prompt`: stores a prompt in the stash.
- `Pop Prompt`: FIFO pop; pastes the oldest prompt into the active app and archives it.
- `Manage Prompts`: shows pending and archived prompts. It lets you paste/archive a specific prompt, copy without archiving, restore archived prompts, delete items, or clear sections.

## Behavior

- The queue is FIFO: the oldest pending prompt is popped first.
- Used prompts are archived automatically.
- The archive keeps at most the 30 most recent used prompts.
- Persistence uses Raycast `LocalStorage`, shared by the extension commands.
- The extension is intentionally out-of-band: adding a prompt never sends a message to OpenCode. A prompt only reaches OpenCode when you focus its input and run `Pop Prompt` or paste a specific item from `Manage Prompts`.

## Local Install

From this folder:

```sh
npm install
npm run dev
```

`npm run dev` registers the extension locally in Raycast. Once the commands show up, you can stop the process with `Ctrl+C`; the extension remains available in Raycast. Run `npm run dev` again after changing the code.

Then assign Raycast hotkeys to `Add Prompt`, `Pop Prompt`, and optionally `Manage Prompts`.

Recommended flow for OpenCode:

1. Run `Add Prompt` to save a future prompt without sending it to OpenCode.
2. When OpenCode is ready, focus its input and run `Pop Prompt`.
3. If paste fails or you popped too early, open `Manage Prompts` and restore the prompt from the archive.
