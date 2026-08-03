#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="${OPENCODE_CONFIG_DIR:-${HOME}/.config/opencode}"

SERVER_PLUGIN_SOURCE="${ROOT_DIR}/plugins/server/session-notifications.js"
TUI_PLUGIN_SOURCE="${ROOT_DIR}/plugins/tui/status-title.js"
TUI_USAGE_PLUGIN_SOURCE="${ROOT_DIR}/plugins/tui/session-usage.js"
AGENTS_SOURCE_DIR="${ROOT_DIR}/agents"
COMMANDS_SOURCE_DIR="${ROOT_DIR}/commands"
BIN_SOURCE_DIR="${ROOT_DIR}/scripts/bin"

SERVER_PLUGIN_DIR="${CONFIG_DIR}/plugins"
TUI_PLUGIN_DIR="${CONFIG_DIR}/tui-plugins"
AGENTS_TARGET_DIR="${CONFIG_DIR}/agents"
COMMANDS_TARGET_DIR="${CONFIG_DIR}/commands"
BIN_TARGET_DIR="${CONFIG_DIR}/bin"

SERVER_PLUGIN_TARGET="${SERVER_PLUGIN_DIR}/session-notifications.js"
TUI_PLUGIN_TARGET="${TUI_PLUGIN_DIR}/status-title.js"
TUI_USAGE_PLUGIN_TARGET="${TUI_PLUGIN_DIR}/session-usage.js"
TUI_JSON="${CONFIG_DIR}/tui.json"
TUI_ENTRY="./tui-plugins/status-title.js"
TUI_USAGE_ENTRY="./tui-plugins/session-usage.js"
OPENCODE_JSON="${CONFIG_DIR}/opencode.json"
OPENCODE_PLUGIN_ENTRY="@warp-dot-dev/opencode-warp"
BUILD_AGENT_COLOR="#eab308"
STAMP="$(date +%Y%m%d%H%M%S)"

mkdir -p "${SERVER_PLUGIN_DIR}" "${TUI_PLUGIN_DIR}" "${AGENTS_TARGET_DIR}" "${COMMANDS_TARGET_DIR}" "${BIN_TARGET_DIR}"

copy_file() {
  local source="$1"
  local target="$2"

  if [ -f "${target}" ] && ! cmp -s "${source}" "${target}"; then
    cp "${target}" "${target}.bak.${STAMP}"
  fi

  cp "${source}" "${target}"
}

backup_legacy_command() {
  local name="$1"
  local target="${COMMANDS_TARGET_DIR}/${name}.md"

  if [ -f "${target}" ]; then
    mv "${target}" "${target}.bak.${STAMP}"
  fi
}

backup_legacy_bin() {
  local name="$1"
  local target="${BIN_TARGET_DIR}/${name}"

  if [ -f "${target}" ]; then
    mv "${target}" "${target}.bak.${STAMP}"
  fi
}

copy_file "${SERVER_PLUGIN_SOURCE}" "${SERVER_PLUGIN_TARGET}"
copy_file "${TUI_PLUGIN_SOURCE}" "${TUI_PLUGIN_TARGET}"
copy_file "${TUI_USAGE_PLUGIN_SOURCE}" "${TUI_USAGE_PLUGIN_TARGET}"

for agent in "${AGENTS_SOURCE_DIR}"/*.md; do
  copy_file "${agent}" "${AGENTS_TARGET_DIR}/$(basename "${agent}")"
done

for command in "${COMMANDS_SOURCE_DIR}"/*.md; do
  copy_file "${command}" "${COMMANDS_TARGET_DIR}/$(basename "${command}")"
done

backup_legacy_command "safe-commit"
backup_legacy_command "ready-pr"
backup_legacy_command "branch"
backup_legacy_command "archer-implement"

copy_file "${BIN_SOURCE_DIR}/opencode-implement.sh" "${BIN_TARGET_DIR}/opencode-implement"
copy_file "${BIN_SOURCE_DIR}/opencode-implement-open.sh" "${BIN_TARGET_DIR}/opencode-implement-open"
copy_file "${BIN_SOURCE_DIR}/opencode-convoy.sh" "${BIN_TARGET_DIR}/opencode-convoy"
copy_file "${BIN_SOURCE_DIR}/opencode-external-review.sh" "${BIN_TARGET_DIR}/opencode-external-review"
chmod +x \
  "${BIN_TARGET_DIR}/opencode-implement" \
  "${BIN_TARGET_DIR}/opencode-implement-open" \
  "${BIN_TARGET_DIR}/opencode-convoy" \
  "${BIN_TARGET_DIR}/opencode-external-review"
backup_legacy_bin "opencode-branch"
backup_legacy_bin "opencode-branch-open"
backup_legacy_bin "opencode-archer-implement"
backup_legacy_bin "opencode-archer-implement-open"

if command -v node >/dev/null 2>&1; then
  node - "${TUI_JSON}" "${TUI_ENTRY}" "${TUI_USAGE_ENTRY}" <<'NODE'
const fs = require("fs")

const file = process.argv[2]
const entries = process.argv.slice(3)
const schema = "https://opencode.ai/tui.json"

let config = { $schema: schema }
let existed = false

if (fs.existsSync(file)) {
  existed = true
  const raw = fs.readFileSync(file, "utf8")
  try {
    config = raw.trim() ? JSON.parse(raw) : { $schema: schema }
  } catch (error) {
    console.error(`Could not update ${file}: it is not plain JSON.`)
    console.error(`Add ${entries.map((item) => JSON.stringify(item)).join(", ")} to the plugin array manually.`)
    process.exit(2)
  }
}

if (!config || typeof config !== "object" || Array.isArray(config)) {
  config = { $schema: schema }
}

if (!config.$schema) config.$schema = schema
if (!Array.isArray(config.plugin)) config.plugin = []

let added = false
for (const entry of entries) {
  const exists = config.plugin.some((item) => item === entry || (Array.isArray(item) && item[0] === entry))
  if (exists) continue
  config.plugin.push(entry)
  added = true
}

if (!added && existed) process.exit(0)

if (existed) {
  const backup = `${file}.bak.${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`
  fs.copyFileSync(file, backup)
}

fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`)
NODE
else
  if [ ! -f "${TUI_JSON}" ]; then
    printf '{\n  "$schema": "https://opencode.ai/tui.json",\n  "plugin": ["%s", "%s"]\n}\n' "${TUI_ENTRY}" "${TUI_USAGE_ENTRY}" > "${TUI_JSON}"
  else
    printf 'Node.js is not available. Add "%s" and "%s" to the plugin array in %s manually.\n' "${TUI_ENTRY}" "${TUI_USAGE_ENTRY}" "${TUI_JSON}" >&2
  fi
fi

if command -v node >/dev/null 2>&1; then
  node - "${OPENCODE_JSON}" "${OPENCODE_PLUGIN_ENTRY}" "${BUILD_AGENT_COLOR}" <<'NODE'
const fs = require("fs")

const file = process.argv[2]
const pluginEntry = process.argv[3]
const buildAgentColor = process.argv[4]
const schema = "https://opencode.ai/config.json"

let config = { $schema: schema }
let existed = false

if (fs.existsSync(file)) {
  existed = true
  const raw = fs.readFileSync(file, "utf8")
  try {
    config = raw.trim() ? JSON.parse(raw) : { $schema: schema }
  } catch (error) {
    console.error(`Could not update ${file}: it is not plain JSON.`)
    console.error('Add provider.openrouter.models["z-ai/glm-5.2"].options.provider.sort = "throughput" and agent.build.color manually.')
    process.exit(2)
  }
}

if (!config || typeof config !== "object" || Array.isArray(config)) config = { $schema: schema }
if (!config.$schema) config.$schema = schema
if (!Array.isArray(config.plugin)) config.plugin = []
config.agent ??= {}
config.agent.build ??= {}
config.provider ??= {}
config.provider.openrouter ??= {}
config.provider.openrouter.models ??= {}
config.provider.openrouter.models["z-ai/glm-4.7"] ??= {}
config.provider.openrouter.models["z-ai/glm-4.7"].options ??= {}
config.provider.openrouter.models["z-ai/glm-4.7"].options.provider ??= {}
config.provider.openrouter.models["z-ai/glm-5.2"] ??= {}
config.provider.openrouter.models["z-ai/glm-5.2"].options ??= {}
config.provider.openrouter.models["z-ai/glm-5.2"].options.provider ??= {}

const glm47Provider = config.provider.openrouter.models["z-ai/glm-4.7"].options.provider
const glm52Provider = config.provider.openrouter.models["z-ai/glm-5.2"].options.provider
const pluginExists = config.plugin.some((item) => item === pluginEntry || (Array.isArray(item) && item[0] === pluginEntry))
const changed = glm47Provider.sort !== "throughput" || glm52Provider.sort !== "throughput" || config.agent.build.color !== buildAgentColor || !pluginExists
glm47Provider.sort = "throughput"
glm52Provider.sort = "throughput"
config.agent.build.color = buildAgentColor
if (!pluginExists) config.plugin.push(pluginEntry)

if (!changed && existed) process.exit(0)

if (existed) {
  const backup = `${file}.bak.${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`
  fs.copyFileSync(file, backup)
}

fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`)
NODE
else
  printf 'Node.js is not available. Add OpenRouter throughput routing for z-ai/glm-4.7 and z-ai/glm-5.2, build agent color "%s", and plugin "%s" to %s manually.\n' "${BUILD_AGENT_COLOR}" "${OPENCODE_PLUGIN_ENTRY}" "${OPENCODE_JSON}" >&2
fi

printf 'Installed OpenCode cockpit files into %s\n' "${CONFIG_DIR}"
printf 'Restart OpenCode tabs to load plugins, agents, and commands.\n'
