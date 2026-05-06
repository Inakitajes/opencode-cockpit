#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="${OPENCODE_CONFIG_DIR:-${HOME}/.config/opencode}"

SERVER_PLUGIN_SOURCE="${ROOT_DIR}/plugins/server/session-notifications.js"
TUI_PLUGIN_SOURCE="${ROOT_DIR}/plugins/tui/status-title.js"
AGENTS_SOURCE_DIR="${ROOT_DIR}/agents"

SERVER_PLUGIN_DIR="${CONFIG_DIR}/plugins"
TUI_PLUGIN_DIR="${CONFIG_DIR}/tui-plugins"
AGENTS_TARGET_DIR="${CONFIG_DIR}/agents"

SERVER_PLUGIN_TARGET="${SERVER_PLUGIN_DIR}/session-notifications.js"
TUI_PLUGIN_TARGET="${TUI_PLUGIN_DIR}/status-title.js"
TUI_JSON="${CONFIG_DIR}/tui.json"
TUI_ENTRY="./tui-plugins/status-title.js"
STAMP="$(date +%Y%m%d%H%M%S)"

mkdir -p "${SERVER_PLUGIN_DIR}" "${TUI_PLUGIN_DIR}" "${AGENTS_TARGET_DIR}"

copy_file() {
  local source="$1"
  local target="$2"

  if [ -f "${target}" ] && ! cmp -s "${source}" "${target}"; then
    cp "${target}" "${target}.bak.${STAMP}"
  fi

  cp "${source}" "${target}"
}

copy_file "${SERVER_PLUGIN_SOURCE}" "${SERVER_PLUGIN_TARGET}"
copy_file "${TUI_PLUGIN_SOURCE}" "${TUI_PLUGIN_TARGET}"

for agent in "${AGENTS_SOURCE_DIR}"/*.md; do
  copy_file "${agent}" "${AGENTS_TARGET_DIR}/$(basename "${agent}")"
done

if command -v node >/dev/null 2>&1; then
  node - "${TUI_JSON}" "${TUI_ENTRY}" <<'NODE'
const fs = require("fs")

const file = process.argv[2]
const entry = process.argv[3]
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
    console.error(`Add ${JSON.stringify(entry)} to the plugin array manually.`)
    process.exit(2)
  }
}

if (!config || typeof config !== "object" || Array.isArray(config)) {
  config = { $schema: schema }
}

if (!config.$schema) config.$schema = schema
if (!Array.isArray(config.plugin)) config.plugin = []

const exists = config.plugin.some((item) => item === entry || (Array.isArray(item) && item[0] === entry))
if (!exists) config.plugin.push(entry)

if (exists && existed) process.exit(0)

if (existed) {
  const backup = `${file}.bak.${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`
  fs.copyFileSync(file, backup)
}

fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`)
NODE
else
  if [ ! -f "${TUI_JSON}" ]; then
    printf '{\n  "$schema": "https://opencode.ai/tui.json",\n  "plugin": ["./tui-plugins/status-title.js"]\n}\n' > "${TUI_JSON}"
  else
    printf 'Node.js is not available. Add "%s" to the plugin array in %s manually.\n' "${TUI_ENTRY}" "${TUI_JSON}" >&2
  fi
fi

printf 'Installed OpenCode cockpit files into %s\n' "${CONFIG_DIR}"
printf 'Restart OpenCode tabs to load plugins and agents.\n'
