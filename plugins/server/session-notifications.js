const DEFAULT_TITLE = /^(New session - |Child session - )\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const DONE_THROTTLE_MS = 3000
const ATTENTION_THROTTLE_MS = 10000
const GHOSTTY_APP_ID = "com.mitchellh.ghostty"
const OSC = "\u001b]"
const ST = "\u001b\\"

function clean(value, fallback) {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text || fallback
}

function compact(value, max = 72) {
  if (value.length <= max) return value
  return value.slice(0, max - 3) + "..."
}

function basename(input) {
  const path = clean(input, "OpenCode").replace(/\/+$/, "")
  return path.split("/").filter(Boolean).at(-1) || "OpenCode"
}

function appleString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}

function terminalText(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function isGhosttyTerminal() {
  return (
    process.env.TERM_PROGRAM === "ghostty" ||
    process.env.TERM === "xterm-ghostty" ||
    Boolean(process.env.GHOSTTY_RESOURCES_DIR)
  )
}

function notifyGhostty(title, message) {
  if (!isGhosttyTerminal()) return false
  if (!process.stdout?.isTTY || typeof process.stdout.write !== "function") return false
  if (process.env.OPENCODE_DISABLE_GHOSTTY_NOTIFICATIONS) return false

  try {
    const text = compact(terminalText(`${title}: ${message}`), 180)
    if (!text) return false
    process.stdout.write(`${OSC}9;${text}${ST}`)
    return true
  } catch {
    return false
  }
}

async function runAppleScript(lines) {
  if (process.platform !== "darwin") return
  if (typeof Bun === "undefined" || typeof Bun.spawn !== "function") return

  const args = []
  for (const line of lines) args.push("-e", line)

  try {
    const proc = Bun.spawn(["osascript", ...args], {
      stdout: "ignore",
      stderr: "ignore",
    })
    return (await proc.exited) === 0
  } catch {
    return false
  }
}

async function notify(title, message) {
  if (process.platform !== "darwin") return

  if (notifyGhostty(title, message)) return

  const sentByGhostty = await runAppleScript([
    `tell application id ${appleString(GHOSTTY_APP_ID)}`,
    `display notification ${appleString(message)} with title ${appleString(title)}`,
    "end tell",
  ])
  if (sentByGhostty) return

  try {
    await runAppleScript([`display notification ${appleString(message)} with title ${appleString(title)}`])
  } catch {
    // Notifications are best effort. OpenCode should not fail if macOS denies them.
  }
}

function eventSessionID(event) {
  return event?.properties?.sessionID ?? event?.properties?.info?.id
}

function eventInfo(event) {
  return event?.properties?.info
}

function titleFromInfo(info) {
  if (!info || typeof info !== "object") return
  const title = clean(info.title, "")
  if (!title) return
  return title
}

function errorMessage(error) {
  if (!error) return "Error desconocido"
  if (typeof error === "string") return error
  if (typeof error !== "object") return String(error)
  if (typeof error.message === "string") return error.message
  if (error.data && typeof error.data === "object" && typeof error.data.message === "string") return error.data.message
  if (typeof error.name === "string") return error.name
  return "Error desconocido"
}

export const SessionNotifications = async ({ client, directory }) => {
  const titles = new Map()
  const parents = new Map()
  const status = new Map()
  const lastDone = new Map()
  const lastAttention = new Map()

  function remember(info, fallbackID) {
    const id = info?.id ?? fallbackID
    const title = titleFromInfo(info)
    if (!id) return
    if (title) titles.set(id, title)
    if (info && "parentID" in info) {
      if (info.parentID) parents.set(id, info.parentID)
      else parents.delete(id)
    }
  }

  async function fetchSessionInfo(sessionID) {
    if (!sessionID) return

    const attempts = [
      () => client.session.get({ path: { id: sessionID } }),
      () => client.session.get({ sessionID }),
    ]

    for (const attempt of attempts) {
      try {
        const result = await attempt()
        remember(result?.data, sessionID)
        if (titles.has(sessionID) || parents.has(sessionID)) return result?.data
      } catch {
        // Try the next SDK call shape.
      }
    }
  }

  async function fetchTitle(sessionID) {
    if (!sessionID || titles.has(sessionID)) return titles.get(sessionID)
    await fetchSessionInfo(sessionID)
    return titles.get(sessionID)
  }

  async function sessionLabel(sessionID) {
    const title = titles.get(sessionID) ?? (await fetchTitle(sessionID))
    if (title && !DEFAULT_TITLE.test(title)) return compact(clean(title, sessionID.slice(0, 8)))
    return compact(`${basename(directory)} ${sessionID.slice(0, 8)}`)
  }

  async function shouldNotifyDone(sessionID, previous, next) {
    if (!parents.has(sessionID)) await fetchSessionInfo(sessionID)
    if (parents.has(sessionID)) return false
    if (next !== "idle") return false
    if (previous !== "busy" && previous !== "retry") return false

    const now = Date.now()
    if (now - (lastDone.get(sessionID) ?? 0) < DONE_THROTTLE_MS) return false
    lastDone.set(sessionID, now)
    return true
  }

  async function notifyDone(sessionID) {
    const label = await sessionLabel(sessionID)
    await notify("OpenCode 🟢", `${label} ha terminado`)
  }

  async function notifyAttention(sessionID, key) {
    if (!sessionID) return
    const now = Date.now()
    if (now - (lastAttention.get(key) ?? 0) < ATTENTION_THROTTLE_MS) return
    lastAttention.set(key, now)

    const label = await sessionLabel(sessionID)
    await notify("OpenCode 🔴", `${label} requiere tu atención`)
  }

  async function notifyError(sessionID, error) {
    const label = sessionID ? await sessionLabel(sessionID) : "OpenCode"
    await notify("OpenCode 🔴", `${label} tuvo un error: ${compact(errorMessage(error), 110)}`)
  }

  return {
    event: async ({ event }) => {
      switch (event.type) {
        case "session.created":
        case "session.updated": {
          remember(eventInfo(event), eventSessionID(event))
          break
        }

        case "session.deleted": {
          const sessionID = eventSessionID(event)
          if (sessionID) {
            titles.delete(sessionID)
            parents.delete(sessionID)
            status.delete(sessionID)
            lastDone.delete(sessionID)
          }
          break
        }

        case "session.status": {
          const sessionID = event.properties.sessionID
          const next = event.properties.status.type
          const previous = status.get(sessionID)
          status.set(sessionID, next)

          if (await shouldNotifyDone(sessionID, previous, next)) await notifyDone(sessionID)
          break
        }

        case "session.idle": {
          const sessionID = event.properties.sessionID
          const previous = status.get(sessionID)
          status.set(sessionID, "idle")

          if (await shouldNotifyDone(sessionID, previous, "idle")) await notifyDone(sessionID)
          break
        }

        case "session.error": {
          const error = event.properties.error
          if (error?.name === "MessageAbortedError") break
          await notifyError(event.properties.sessionID, error)
          break
        }

        case "permission.asked":
        case "permission.updated": {
          const props = event.properties
          const key = `permission:${props.id ?? props.requestID ?? props.permissionID ?? props.sessionID}`
          await notifyAttention(props.sessionID, key)
          break
        }

        case "question.asked": {
          const props = event.properties
          const key = `question:${props.id ?? props.requestID ?? props.sessionID}`
          await notifyAttention(props.sessionID, key)
          break
        }
      }
    },
  }
}
