const SYMBOL = {
  idle: "🟢",
  busy: "🟡",
  attention: "🔴",
}

const DEFAULT_TITLE = /^(New session - |Child session - )\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

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
  const loadingTitles = new Set()
  const attention = new Map()
  const errored = new Set()
  let disposed = false
  let scheduled = false
  let lastTitle = ""

  function rememberTitle(info, fallbackID) {
    const id = info?.id ?? fallbackID
    const title = titleFromInfo(info)
    if (!id || !title) return
    titles.set(id, title)
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

  function stateFor(sessionID) {
    const status = api.state.session.status(sessionID)
    if (errored.has(sessionID) || (attention.get(sessionID)?.size ?? 0) > 0 || pendingCount(api, sessionID) > 0) {
      return "attention"
    }
    if (status?.type === "busy") return "busy"
    if (status?.type === "retry") return "attention"
    return "idle"
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
      next = `${SYMBOL[state]} | ${displayTitle(sessionID)}`
    } else if (current.name !== "home") {
      next = `${SYMBOL.idle} | ${compact(clean(current.name, "OpenCode"))}`
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
      attention.delete(sessionID)
      errored.delete(sessionID)
    }
    scheduleTitleUpdate()
  })

  api.event.on("session.status", (event) => {
    const sessionID = event.properties.sessionID
    if (event.properties.status.type === "busy") errored.delete(sessionID)
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
