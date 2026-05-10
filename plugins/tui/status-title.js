import { readFileSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

const SYMBOL = {
  idle: "🟢",
  busy: "🟡",
  attention: "🔴",
}

const DEFAULT_TITLE = /^(New session - |Child session - )\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const CONTEXT_TTL_MS = 5000

function clean(value, fallback) {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text || fallback
}

function compact(value, max = 48) {
  if (value.length <= max) return value
  return value.slice(0, max - 3) + "..."
}

function basename(input) {
  const path = clean(input, "OpenCode").replace(/\/+$/, "")
  return path.split("/").filter(Boolean).at(-1) || "OpenCode"
}

function stat(path) {
  try {
    return statSync(path)
  } catch {
    return
  }
}

function readText(path, max = 4096) {
  try {
    return readFileSync(path, "utf8").slice(0, max)
  } catch {
    return ""
  }
}

function findGitEntry(directory) {
  const start = clean(directory, "")
  if (!start) return

  let current = resolve(start)
  while (true) {
    const gitPath = join(current, ".git")
    const gitStat = stat(gitPath)
    if (gitStat) return { path: gitPath, root: current, stat: gitStat }

    const parent = dirname(current)
    if (parent === current) return
    current = parent
  }
}

function gitDirectory(entry) {
  if (!entry) return
  if (entry.stat.isDirectory()) return entry.path
  if (!entry.stat.isFile()) return

  const match = readText(entry.path, 1024).match(/^gitdir:\s*(.+)$/m)
  if (!match) return

  const gitdir = clean(match[1], "")
  if (!gitdir) return
  return resolve(entry.root, gitdir)
}

function branchName(directory) {
  const gitDir = gitDirectory(findGitEntry(directory))
  if (!gitDir) return

  const head = clean(readText(join(gitDir, "HEAD"), 1024), "")
  if (!head) return

  const ref = head.match(/^ref:\s*refs\/heads\/(.+)$/)
  if (ref) return compact(ref[1], 40)

  const sha = head.match(/^[0-9a-f]{40}$/i)
  if (sha) return `detached:${head.slice(0, 8)}`
}

function titleFromInfo(info) {
  if (!info || typeof info !== "object") return
  const title = clean(info.title, "")
  if (!title) return
  return title
}

function eventSessionID(event) {
  return event?.properties?.sessionID ?? event?.properties?.info?.id
}

function requestKey(prefix, properties) {
  const id = properties?.id ?? properties?.requestID ?? properties?.permissionID
  if (!id) return
  return `${prefix}:${id}`
}

function addAttention(map, sessionID, key) {
  if (!sessionID || !key) return
  const current = map.get(sessionID) ?? new Set()
  current.add(key)
  map.set(sessionID, current)
}

function addChild(map, parentID, childID) {
  if (!parentID || !childID) return
  const current = map.get(parentID) ?? new Set()
  current.add(childID)
  map.set(parentID, current)
}

function removeChild(map, parentID, childID) {
  if (!parentID || !childID) return
  const current = map.get(parentID)
  if (!current) return
  current.delete(childID)
  if (current.size === 0) map.delete(parentID)
}

function removeAttention(map, sessionID, key) {
  if (!sessionID || !key) return
  const current = map.get(sessionID)
  if (!current) return
  current.delete(key)
  if (current.size === 0) map.delete(sessionID)
}

function pendingCount(api, sessionID) {
  try {
    return api.state.session.permission(sessionID).length + api.state.session.question(sessionID).length
  } catch {
    return 0
  }
}

const tui = async (api) => {
  const titles = new Map()
  const parents = new Map()
  const children = new Map()
  const knownStatus = new Map()
  const loadingTitles = new Set()
  const attention = new Map()
  const errored = new Set()
  const context = { directory: "", value: "", expires: 0 }
  let disposed = false
  let scheduled = false
  let lastTitle = ""

  function rememberTitle(info, fallbackID) {
    const id = info?.id ?? fallbackID
    const title = titleFromInfo(info)
    if (!id) return
    if (title) titles.set(id, title)
    if (info && "parentID" in info) {
      const previousParent = parents.get(id)
      if (previousParent && previousParent !== info.parentID) removeChild(children, previousParent, id)
      if (info.parentID) {
        parents.set(id, info.parentID)
        addChild(children, info.parentID, id)
      } else {
        parents.delete(id)
      }
    }
  }

  async function loadTitle(sessionID) {
    if (!sessionID || loadingTitles.has(sessionID) || titles.has(sessionID)) return
    loadingTitles.add(sessionID)
    try {
      const result = await api.client.session.get({ sessionID })
      rememberTitle(result.data, sessionID)
    } catch {
      // The next session update event will fill the cache if the fetch failed.
    } finally {
      loadingTitles.delete(sessionID)
      scheduleTitleUpdate()
    }
  }

  function displayTitle(sessionID) {
    const cached = titles.get(sessionID)
    if (!cached) void loadTitle(sessionID)

    if (cached && !DEFAULT_TITLE.test(cached)) return compact(clean(cached, sessionID.slice(0, 8)))

    const project = basename(api.state.path?.directory)
    return compact(`${project} ${sessionID.slice(0, 8)}`)
  }

  function currentContext() {
    const directory = clean(api.state.path?.directory, "")
    const now = Date.now()
    if (context.directory === directory && now < context.expires) return context.value

    context.directory = directory
    context.value = branchName(directory) ?? ""
    context.expires = now + CONTEXT_TTL_MS
    return context.value
  }

  function titleWithContext(title) {
    const gitContext = currentContext()
    if (!gitContext) return title
    return compact(`${title} · ${gitContext}`, 88)
  }

  function stateFor(sessionID) {
    const status = api.state.session.status(sessionID)
    if (hasAttention(sessionID)) {
      return "attention"
    }
    if (status?.type === "retry" || hasChildState(sessionID, "retry")) return "attention"
    if (status?.type === "busy" || hasChildState(sessionID, "busy")) return "busy"
    return "idle"
  }

  function hasAttention(sessionID, seen = new Set()) {
    if (!sessionID || seen.has(sessionID)) return false
    seen.add(sessionID)

    if (errored.has(sessionID) || (attention.get(sessionID)?.size ?? 0) > 0 || pendingCount(api, sessionID) > 0) {
      return true
    }

    for (const childID of children.get(sessionID) ?? []) {
      if (hasAttention(childID, seen)) return true
    }
    return false
  }

  function hasChildState(sessionID, type, seen = new Set()) {
    if (!sessionID || seen.has(sessionID)) return false
    seen.add(sessionID)

    for (const childID of children.get(sessionID) ?? []) {
      const childStatus = api.state.session.status(childID)?.type ?? knownStatus.get(childID)
      if (childStatus === type) return true
      if (hasChildState(childID, type, seen)) return true
    }
    return false
  }

  function setTitle() {
    if (disposed) return
    if (process.env.OPENCODE_DISABLE_TERMINAL_TITLE) return
    if (api.kv.get("terminal_title_enabled", true) === false) return

    const current = api.route.current
    let next = `${SYMBOL.idle} | OpenCode`

    if (current.name === "session") {
      const sessionID = current.params.sessionID
      const state = stateFor(sessionID)
      next = `${SYMBOL[state]} | ${titleWithContext(displayTitle(sessionID))}`
    } else if (current.name !== "home") {
      next = `${SYMBOL.idle} | ${titleWithContext(compact(clean(current.name, "OpenCode")))}`
    }

    if (next === lastTitle) return
    api.renderer.setTerminalTitle(next)
    lastTitle = next
  }

  function scheduleTitleUpdate() {
    if (scheduled || disposed) return
    scheduled = true
    setTimeout(() => {
      scheduled = false
      setTitle()
    }, 25)
  }

  api.event.on("session.created", (event) => {
    rememberTitle(event.properties.info, event.properties.sessionID)
    scheduleTitleUpdate()
  })

  api.event.on("session.updated", (event) => {
    rememberTitle(event.properties.info, event.properties.sessionID)
    scheduleTitleUpdate()
  })

  api.event.on("session.deleted", (event) => {
    const sessionID = eventSessionID(event)
    if (sessionID) {
      titles.delete(sessionID)
      const parentID = parents.get(sessionID)
      removeChild(children, parentID, sessionID)
      parents.delete(sessionID)
      children.delete(sessionID)
      knownStatus.delete(sessionID)
      attention.delete(sessionID)
      errored.delete(sessionID)
    }
    scheduleTitleUpdate()
  })

  api.event.on("session.status", (event) => {
    const sessionID = event.properties.sessionID
    const status = event.properties.status.type
    knownStatus.set(sessionID, status)
    if (status === "busy") errored.delete(sessionID)
    scheduleTitleUpdate()
  })

  api.event.on("session.idle", (event) => {
    knownStatus.set(event.properties.sessionID, "idle")
    scheduleTitleUpdate()
  })

  api.event.on("session.error", (event) => {
    const sessionID = event.properties.sessionID
    const error = event.properties.error
    if (error?.name === "MessageAbortedError") return
    if (sessionID) errored.add(sessionID)
    scheduleTitleUpdate()
  })

  api.event.on("permission.asked", (event) => {
    addAttention(attention, event.properties.sessionID, requestKey("permission", event.properties))
    scheduleTitleUpdate()
  })

  api.event.on("permission.updated", (event) => {
    addAttention(attention, event.properties.sessionID, requestKey("permission", event.properties))
    scheduleTitleUpdate()
  })

  api.event.on("permission.replied", (event) => {
    removeAttention(attention, event.properties.sessionID, requestKey("permission", event.properties))
    scheduleTitleUpdate()
  })

  api.event.on("question.asked", (event) => {
    addAttention(attention, event.properties.sessionID, requestKey("question", event.properties))
    scheduleTitleUpdate()
  })

  api.event.on("question.replied", (event) => {
    removeAttention(attention, event.properties.sessionID, requestKey("question", event.properties))
    scheduleTitleUpdate()
  })

  api.event.on("question.rejected", (event) => {
    removeAttention(attention, event.properties.sessionID, requestKey("question", event.properties))
    scheduleTitleUpdate()
  })

  const interval = setInterval(setTitle, 1000)
  api.lifecycle.onDispose(() => {
    disposed = true
    clearInterval(interval)
  })

  setTitle()
}

export default {
  id: "local.status-title",
  tui,
}
