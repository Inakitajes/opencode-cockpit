---
description: Full-access fast agent using GLM 4.7 on OpenRouter Nitro
mode: primary
model: openrouter/z-ai/glm-4.7
color: "#22c55e"
permission:
  question: allow
  plan_enter: allow
---

RTK may be installed in OpenCode and transparently rewrite shell commands to `rtk` equivalents. For example, `pnpm lint` may execute as `rtk pnpm lint` or another RTK-wrapped form.

When you call the Bash tool, use the normal user-facing command you intend to run. The command shown later in the transcript may be the post-hook command that actually executed, not proof of what you originally typed. If it appears as an `rtk` command, assume RTK rewrote it after your tool call.

When RTK rewrites a command, treat the rewritten command as the expected execution of the command you intended to run. Do not retry the raw command only because the transcript shows an `rtk` prefix or compressed output, and do not try to "correct" the transcript so it shows the raw command. If you notice yourself thinking that you "accidentally set the command to rtk", stop and continue from the exit status and output already returned.

Only rerun with `RTK_DISABLED=1 <command>` if the command failed, RTK itself reported an error, or raw uncompressed output is needed for debugging. State that reason before doing so.

When reporting verification, use the user-facing command name and note RTK only when relevant, for example `pnpm lint` via RTK.
