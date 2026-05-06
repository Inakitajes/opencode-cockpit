# OpenCode Cockpit

Customizaciones locales para OpenCode: plugins, agents, scripts y snippets de configuración para mejorar el flujo diario.

## Qué Incluye

- `plugins/tui/status-title.js`: plugin TUI que cambia el título de la pestaña/ventana del terminal.
- `plugins/server/session-notifications.js`: plugin server que envía notificaciones locales de macOS.
- `agents/*.md`: custom agents globales versionados.
- `docs/agents.md`: documentación de los agents incluidos.
- `scripts/install.sh`: instalador local que copia plugins y agents a `~/.config/opencode`, y registra el plugin TUI.
- `config/tui.json`: ejemplo mínimo de configuración TUI.

## Agents

Este repo incluye una copia versionada de tus custom agents globales:

- `ask`: agente read-only para investigación, exploración de código y web research.
- `fast`: agente full-access rápido usando Kimi K2.6 en OpenRouter.
- `design`: especialista UI/UX usando Claude Opus 4.7 en Anthropic.

Ver `docs/agents.md` para detalles de modelos, permisos y uso recomendado.

## Estados

- `🟡 | sesión`: OpenCode está trabajando.
- `🟢 | sesión`: la sesión está idle o ha terminado.
- `🔴 | sesión`: la sesión requiere atención, está reintentando o tuvo un error.

## Notificaciones

En macOS el plugin server usa `osascript` para mostrar notificaciones locales:

- `OpenCode 🟢`: la sesión ha terminado.
- `OpenCode 🔴`: la sesión requiere atención.
- `OpenCode 🔴`: la sesión tuvo un error.

Las notificaciones son best effort. Si macOS las bloquea, OpenCode seguirá funcionando.

## Instalación Rápida

Desde la raíz de este repositorio:

```sh
bash scripts/install.sh
```

Después reinicia las pestañas de OpenCode. Los plugins y agents se cargan al arrancar.

## Instalación Manual

1. Crea las carpetas globales.

```sh
mkdir -p ~/.config/opencode/plugins ~/.config/opencode/tui-plugins ~/.config/opencode/agents
```

2. Copia el plugin server.

```sh
cp plugins/server/session-notifications.js ~/.config/opencode/plugins/session-notifications.js
```

3. Copia el plugin TUI.

```sh
cp plugins/tui/status-title.js ~/.config/opencode/tui-plugins/status-title.js
```

4. Copia los agents.

```sh
cp agents/*.md ~/.config/opencode/agents/
```

5. Registra el plugin TUI en `~/.config/opencode/tui.json`.

Si no tienes `tui.json`, puedes usar:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./tui-plugins/status-title.js"]
}
```

Si ya tienes un `tui.json`, añade `"./tui-plugins/status-title.js"` al array `plugin` existente.

6. Reinicia OpenCode.

## Seguridad

- No usa paquetes npm de terceros.
- No ejecuta código remoto.
- El plugin server ejecuta `osascript` con `Bun.spawn([...])`, pasando los argumentos como array y escapando el texto de la notificación.
- El plugin TUI solo usa la API local de OpenCode para leer estado de sesiones y actualizar el título del terminal.
- Los agents son archivos Markdown de configuración local de OpenCode.

## Compatibilidad

- Probado con OpenCode `1.14.39`.
- El cambio de título depende de que tu terminal respete `OSC 0`/`setTerminalTitle`.
- Las notificaciones incluidas son para macOS. En otros sistemas el plugin simplemente no envía notificaciones.

## Desarrollo

Comprobar que los módulos importan correctamente:

```sh
bun run check
```

Instalar plugins y agents localmente desde el repo:

```sh
bun run install:local
```

## Desinstalación

Elimina estos archivos:

```sh
rm ~/.config/opencode/plugins/session-notifications.js
rm ~/.config/opencode/tui-plugins/status-title.js
rm ~/.config/opencode/agents/ask.md
rm ~/.config/opencode/agents/fast.md
rm ~/.config/opencode/agents/design.md
```

Después quita `"./tui-plugins/status-title.js"` de `~/.config/opencode/tui.json` y reinicia OpenCode.
