import { readFileSync, readdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const MODELS_CACHE = join(homedir(), ".cache", "opencode", "models.json")
const CONVOY_RUNS = join(homedir(), ".convoy", "runs")
const CATALOG_TTL_MS = 60_000
const LARGE_CONTEXT = 200_000

const EMPTY_TOKENS = { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 }

function clean(value, fallback) {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text || fallback
}

function compact(value, max = 60) {
  const text = String(value ?? "")
  if (text.length <= max) return text
  return text.slice(0, max - 3) + "..."
}

function number(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function thousands(value) {
  return number(value).toLocaleString("en-US")
}

function short(value) {
  const amount = number(value)
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return String(Math.round(amount))
}

function money(value) {
  const amount = number(value)
  if (amount > 0 && amount < 0.01) return `$${amount.toFixed(4)}`
  return `$${amount.toFixed(2)}`
}

function duration(ms) {
  const total = Math.max(0, Math.round(number(ms) / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function plural(count, singular) {
  return `${number(count)} ${number(count) === 1 ? singular : `${singular}s`}`
}

function percent(part, whole) {
  if (!whole) return "0%"
  return `${((number(part) / number(whole)) * 100).toFixed(1)}%`
}

function readJSON(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"))
  } catch {
    return
  }
}

function emptyTokens() {
  return { ...EMPTY_TOKENS }
}

function addTokens(target, tokens) {
  target.input += number(tokens?.input)
  target.output += number(tokens?.output)
  target.reasoning += number(tokens?.reasoning)
  target.cacheRead += number(tokens?.cache?.read ?? tokens?.cacheRead)
  target.cacheWrite += number(tokens?.cache?.write ?? tokens?.cacheWrite)
  return target
}

function totalTokens(tokens) {
  return tokens.input + tokens.output + tokens.reasoning + tokens.cacheRead + tokens.cacheWrite
}

/**
 * OpenCode's own accounting: reasoning tokens bill at the output rate and are tracked apart from
 * `output`, so they have to be added, not assumed to be included.
 */
function costOf(tokens, price) {
  if (!price) return
  return (
    (tokens.input * number(price.input) +
      (tokens.output + tokens.reasoning) * number(price.output) +
      tokens.cacheRead * number(price.cacheRead) +
      tokens.cacheWrite * number(price.cacheWrite)) /
    1_000_000
  )
}

function normalizePrice(cost) {
  if (!cost || typeof cost !== "object") return
  const price = {
    input: number(cost.input),
    output: number(cost.output),
    // The SDK catalog nests cache rates, the models.dev payload flattens them.
    cacheRead: number(cost.cache?.read ?? cost.cache_read),
    cacheWrite: number(cost.cache?.write ?? cost.cache_write),
  }
  if (!price.input && !price.output && !price.cacheRead && !price.cacheWrite) return
  return price
}

function largeContextPrice(cost) {
  if (!cost || typeof cost !== "object") return
  return normalizePrice(cost.experimentalOver200K ?? cost.context_over_200k)
}

const tui = async (api) => {
  const catalog = { value: undefined, expires: 0 }

  function modelsCatalog() {
    const now = Date.now()
    if (catalog.value && now < catalog.expires) return catalog.value
    catalog.value = readJSON(MODELS_CACHE) ?? {}
    catalog.expires = now + CATALOG_TTL_MS
    return catalog.value
  }

  function providerCost(providerID, modelID) {
    try {
      for (const provider of api.state.provider ?? []) {
        if (provider.id !== providerID) continue
        for (const model of provider.models ?? []) {
          if (model.id === modelID) return model.cost
        }
      }
    } catch {
      // The provider catalog is not ready yet; models.dev covers it below.
    }
  }

  function catalogCost(providerID, modelID) {
    const providers = modelsCatalog()
    const direct = providers?.[providerID]?.models?.[modelID]?.cost
    if (direct) return { cost: direct, source: "models.dev" }

    // Gateways republish upstream models under a namespaced id
    // (openrouter/openai/gpt-5.6-sol), so the prefix names the provider that actually
    // publishes the price. Resolving it that way beats scanning every provider for the
    // bare id, which would happily return some reseller's unrelated rate.
    const id = clean(modelID, "")
    const slash = id.indexOf("/")
    if (slash <= 0) return

    const upstream = id.slice(0, slash)
    const cost = providers?.[upstream]?.models?.[id.slice(slash + 1)]?.cost
    if (cost) return { cost, source: `models.dev (${upstream})` }
  }

  /**
   * Prices come from the running provider catalog first. Subscription providers (OAuth) report
   * zero, so a zeroed entry is treated as "unpriced" and resolved against models.dev instead.
   */
  function priceFor(providerID, modelID) {
    const live = normalizePrice(providerCost(providerID, modelID))
    if (live) {
      return {
        base: live,
        large: largeContextPrice(providerCost(providerID, modelID)) ?? live,
        source: "opencode",
      }
    }

    const fallback = catalogCost(providerID, modelID)
    const base = normalizePrice(fallback?.cost)
    if (!base) return
    return { base, large: largeContextPrice(fallback?.cost) ?? base, source: fallback.source }
  }

  async function loadMessages(sessionID) {
    try {
      const result = await api.client.session.messages({ sessionID })
      const messages = result?.data
      if (Array.isArray(messages) && messages.length) return messages
    } catch {
      // Fall through to whatever the TUI already holds in memory.
    }

    try {
      const messages = api.state.session.messages(sessionID) ?? []
      return messages.map((info) => ({ info, parts: api.state.part(info.id) ?? [] }))
    } catch {
      return []
    }
  }

  async function loadSession(sessionID) {
    try {
      const result = await api.client.session.get({ sessionID })
      return result?.data
    } catch {
      return
    }
  }

  /**
   * Convoy calls the advisor outside the OpenCode session, so those tokens exist only in the run
   * log. Without this the advised pipelines under-report by the whole advisor leg.
   */
  function advisorModel(runID, phase) {
    const metadata = readJSON(join(CONVOY_RUNS, runID, "metadata.json"))
    const step = (metadata?.pipeline?.steps ?? []).find((entry) => entry?.stepName === phase || entry?.name === phase)
    const resolved = step?.resolvedAdvisor
    if (!resolved?.modelID) return

    const variant = clean(resolved.variant, "")
    return {
      providerID: clean(resolved.providerID, "unknown"),
      modelID: clean(resolved.modelID, "unknown"),
      label: `${clean(resolved.providerID, "unknown")}/${clean(resolved.modelID, "unknown")}${variant ? `#${variant}` : ""}`,
    }
  }

  function advisorUsage(session) {
    const runID = clean(session?.metadata?.convoyRunID, "")
    const phase = clean(session?.metadata?.convoyPhase, "")
    if (!runID || !phase) return

    const logsDir = join(CONVOY_RUNS, runID, "logs")
    let files = []
    try {
      files = readdirSync(logsDir).filter((name) => name.startsWith(`${phase}.`) && name.endsWith(".json"))
    } catch {
      return
    }
    if (!files.length) return

    const tokens = emptyTokens()
    let calls = 0
    for (const file of files.sort()) {
      const advisor = readJSON(join(logsDir, file))?.advisor
      if (!advisor) continue
      addTokens(tokens, advisor.tokens)
      calls += number(advisor.calls ?? advisor.succeeded)
    }
    if (!calls && !totalTokens(tokens)) return
    return { tokens, calls, model: advisorModel(runID, phase) }
  }

  function collect(messages) {
    const models = new Map()
    const tools = new Map()
    let reported = 0
    let assistants = 0
    let first = 0
    let last = 0

    for (const message of messages) {
      const info = message?.info ?? message
      const parts = message?.parts ?? []

      const created = number(info?.time?.created)
      if (created) {
        if (!first || created < first) first = created
        if (created > last) last = created
      }
      const completed = number(info?.time?.completed)
      if (completed > last) last = completed

      for (const part of parts) {
        if (part?.type !== "tool") continue
        const name = clean(part.tool, "unknown")
        const entry = tools.get(name) ?? { name, calls: 0, errors: 0, output: 0, ms: 0 }
        entry.calls += 1
        if (part.state?.status === "error") entry.errors += 1
        const output = part.state?.output
        if (typeof output === "string") entry.output += output.length
        const start = number(part.state?.time?.start)
        const end = number(part.state?.time?.end)
        if (start && end > start) entry.ms += end - start
        tools.set(name, entry)
      }

      if (info?.role !== "assistant") continue
      assistants += 1
      reported += number(info.cost)

      const providerID = clean(info.providerID, "unknown")
      const modelID = clean(info.modelID, "unknown")
      const variant = clean(info.variant, "")
      const key = `${providerID}/${modelID}${variant ? `#${variant}` : ""}`
      const entry = models.get(key) ?? {
        key,
        providerID,
        modelID,
        messages: 0,
        tokens: emptyTokens(),
        large: emptyTokens(),
      }
      entry.messages += 1
      // The over-200K tier is per request, so each message is bucketed by its own context size.
      const context = number(info.tokens?.input) + number(info.tokens?.cache?.read)
      addTokens(context > LARGE_CONTEXT ? entry.large : entry.tokens, info.tokens)
      models.set(key, entry)
    }

    return {
      models: [...models.values()],
      tools: [...tools.values()].sort((a, b) => b.calls - a.calls),
      reported,
      assistants,
      elapsed: last > first ? last - first : 0,
    }
  }

  function priceModels(entries) {
    const sources = new Set()
    const rows = entries
      .map((entry) => {
        const price = priceFor(entry.providerID, entry.modelID)
        const tokens = addTokens(addTokens(emptyTokens(), entry.tokens), entry.large)
        const estimate = price
          ? number(costOf(entry.tokens, price.base)) + number(costOf(entry.large, price.large))
          : undefined
        if (price?.source) sources.add(price.source)
        return { ...entry, tokens, estimate, priced: Boolean(price) }
      })
      // Aborted turns record a model but no usage, and a variant-less duplicate of a model
      // already listed is pure noise in the breakdown.
      .filter((entry) => totalTokens(entry.tokens) > 0)
    rows.sort((a, b) => totalTokens(b.tokens) - totalTokens(a.tokens))
    return { rows, sources: [...sources] }
  }

  function buildRows(session, usage) {
    const advisor = advisorUsage(session)
    const priced = priceModels(usage.models)
    const rows = [...priced.rows]
    let sources = priced.sources

    if (advisor) {
      const model = advisor.model
      const price = model ? priceFor(model.providerID, model.modelID) : undefined
      if (price?.source) sources = [...new Set([...sources, price.source])]
      rows.push({
        key: `advisor · ${model?.label ?? "modelo desconocido"}`,
        messages: advisor.calls,
        tokens: advisor.tokens,
        estimate: price ? number(costOf(advisor.tokens, price.base)) : undefined,
        priced: Boolean(price),
        advisor: true,
      })
    }

    const totals = emptyTokens()
    let estimate = 0
    let complete = true
    for (const row of rows) {
      addTokens(totals, {
        input: row.tokens.input,
        output: row.tokens.output,
        reasoning: row.tokens.reasoning,
        cacheRead: row.tokens.cacheRead,
        cacheWrite: row.tokens.cacheWrite,
      })
      if (row.priced) estimate += number(row.estimate)
      else complete = false
    }

    return { rows, totals, estimate, complete, sources, advisor }
  }

  function options(session, usage) {
    const { rows, totals, estimate, complete, sources, advisor } = buildRows(session, usage)
    const grand = totalTokens(totals)
    const calls = usage.tools.reduce((sum, tool) => sum + tool.calls, 0)
    const out = []

    out.push({
      title: `Total · ${short(grand)} tokens · ${complete ? "" : "≥ "}${money(estimate)} est.`,
      value: "total",
      description:
        `in ${thousands(totals.input)} · out ${thousands(totals.output)} · ` +
        `reasoning ${thousands(totals.reasoning)} · cache read ${thousands(totals.cacheRead)}` +
        (totals.cacheWrite ? ` · cache write ${thousands(totals.cacheWrite)}` : ""),
      category: "Resumen",
    })

    out.push({
      title: `OpenCode reporta ${money(usage.reported)}`,
      value: "reported",
      description:
        usage.reported > 0
          ? "Coste facturado que registra OpenCode para esta sesión."
          : "Cero: el provider va por suscripción (OAuth) y no factura por token. El estimado usa precio de lista.",
      category: "Resumen",
    })

    for (const row of rows) {
      const share = percent(totalTokens(row.tokens), grand)
      out.push({
        title: `${compact(row.key, 46)} · ${short(totalTokens(row.tokens))} · ${row.priced ? money(row.estimate) : "—"}`,
        value: `model:${row.key}`,
        description:
          `${plural(row.messages, row.advisor ? "llamada" : "mensaje")} · ${share} de los tokens · ` +
          `in ${thousands(row.tokens.input)} · out ${thousands(row.tokens.output)} · ` +
          `reasoning ${thousands(row.tokens.reasoning)} · cache read ${thousands(row.tokens.cacheRead)}` +
          (row.priced ? "" : " · sin precio en el catálogo"),
        category: advisor ? "Modelos (ejecutor + advisor)" : "Modelos",
      })
    }

    for (const tool of usage.tools) {
      out.push({
        title: `${compact(tool.name, 24).padEnd(24)} ${String(tool.calls).padStart(4)} · ${percent(tool.calls, calls)}`,
        value: `tool:${tool.name}`,
        description:
          `${thousands(tool.output)} chars de salida (~${short(Math.round(tool.output / 4))} tokens) · ` +
          `${duration(tool.ms)}` +
          (tool.errors ? ` · ${tool.errors} con error` : ""),
        category: `Tools (${plural(calls, "llamada")})`,
      })
    }

    if (!usage.tools.length) {
      out.push({
        title: "Sin llamadas a tools",
        value: "tools:none",
        description: "Esta sesión no ha ejecutado ninguna herramienta todavía.",
        category: "Tools",
      })
    }

    out.push({
      title: `Precios: ${sources.length ? sources.join(", ") : "no disponibles"}`,
      value: "source",
      description: `${plural(usage.assistants, "respuesta")} · ${duration(usage.elapsed)} de sesión · fórmula: input + (output + reasoning) + cache`,
      category: "Origen",
    })

    return out
  }

  async function show() {
    const route = api.route.current
    if (route?.name !== "session" || !route.params?.sessionID) {
      api.ui.toast({ variant: "warning", message: "Abre una sesión para ver su uso." })
      return
    }

    const sessionID = route.params.sessionID
    const [session, messages] = await Promise.all([loadSession(sessionID), loadMessages(sessionID)])
    if (!messages.length) {
      api.ui.toast({ variant: "warning", message: "Esta sesión todavía no tiene mensajes." })
      return
    }

    const usage = collect(messages)
    const title = clean(session?.title, sessionID.slice(0, 12))
    const agent = clean(session?.agent, "")

    try {
      api.ui.dialog.setSize("large")
      api.ui.dialog.replace(() =>
        api.ui.DialogSelect({
          title: compact(agent ? `${title} · ${agent}` : title, 72),
          placeholder: "Filtrar por modelo o tool",
          options: options(session, usage),
          onSelect: () => api.ui.dialog.clear(),
        }),
      )
    } catch {
      const { totals, estimate, complete } = buildRows(session, usage)
      api.ui.toast({
        variant: "info",
        title: compact(title, 40),
        message: `${short(totalTokens(totals))} tokens · ${complete ? "" : "≥ "}${money(estimate)} est.`,
        duration: 8000,
      })
    }
  }

  const dispose = api.command.register(() => [
    {
      title: "Session usage",
      value: "session-usage",
      description: "Tokens y coste estimado de la sesión actual, por modelo y por tool",
      category: "Session",
      slash: { name: "usage", aliases: ["tokens"] },
      onSelect: () => {
        void show()
      },
    },
  ])

  api.lifecycle.onDispose(() => {
    if (typeof dispose === "function") dispose()
  })
}

export default {
  id: "local.session-usage",
  tui,
}
