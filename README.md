# OpenCode Cockpit

Customizaciones locales para OpenCode: plugins, agents, commands, scripts y snippets de configuración para mejorar el flujo diario.

## Qué Incluye

- `plugins/tui/status-title.js`: plugin TUI que cambia el título de la pestaña/ventana del terminal.
- `plugins/server/session-notifications.js`: plugin server que envía notificaciones locales de macOS.
- `agents/*.md`: custom agents globales versionados.
- `commands/*.md`: custom slash commands globales versionados.
- `scripts/bin/*`: helpers locales para integraciones como Worktrunk.
- `docs/agents.md`: documentación de los agents incluidos.
- `docs/commands.md`: documentación de los commands incluidos.
- `docs/stack.md`: documentación del stack local de programación.
- `scripts/install.sh`: instalador local que copia plugins, agents y commands a `~/.config/opencode`, y registra el plugin TUI.
- `config/tui.json`: ejemplo mínimo de configuración TUI.

## Agents

Este repo incluye una copia versionada de tus custom agents globales:

- `ask`: agente read-only para investigación, exploración de código y web research.
- `fast`: agente full-access rápido usando Kimi K2.6 en OpenRouter.
- `design`: especialista UI/UX usando Claude Opus 4.7 en Anthropic.

Ver `docs/agents.md` para detalles de modelos, permisos y uso recomendado.

## Stack

Mi stack local de programación se apoya en OpenCode, Worktrunk (`wt`) y Ghostty:

- OpenCode como cockpit de agentes, commands y plugins.
- Worktrunk para crear ramas/worktrees aislados desde planes con `/branch`.
- Ghostty como terminal principal para ejecutar las sesiones de OpenCode.

Ver `docs/stack.md` para detalles del flujo y los límites de este repo.

## Commands

Este repo incluye custom commands globales:

- `/clean-code`: auditoría read-only de arquitectura, mantenibilidad, SRP, SOLID y code smells.
- `/branch`: crea un worktree con Worktrunk desde el plan actual y abre una sesión limpia de OpenCode allí.
- `/push`: ejecuta tests/checks relevantes, crea un commit convencional y hace push.
- `/ship`: prepara la rama, hace push, abre o reutiliza una PR y verifica checks.

Ver `docs/commands.md` para detalles de uso y argumentos.

## Estados

- `🟡 | sesión`: OpenCode está trabajando.
- `🟢 | sesión`: la sesión está idle o ha terminado.
- `🔴 | sesión`: la sesión requiere atención, está reintentando o tuvo un error.

## Notificaciones

En macOS el plugin server usa `osascript` para mostrar notificaciones locales. Primero intenta emitirlas desde Ghostty para que el click vuelva al terminal; si falla, usa el contexto genérico de AppleScript:

- `OpenCode 🟢`: la sesión ha terminado.
- `OpenCode 🔴`: la sesión requiere atención.
- `OpenCode 🔴`: la sesión tuvo un error.

Las notificaciones son best effort. Si macOS las bloquea, OpenCode seguirá funcionando.

## Instalación Rápida

Desde la raíz de este repositorio:

```sh
bash scripts/install.sh
```

Después reinicia las pestañas de OpenCode. Los plugins, agents y commands se cargan al arrancar.

El comando `/branch` requiere Worktrunk (`wt`). Instalación recomendada:

```sh
brew install worktrunk && wt config shell install
```

## Instalación Manual

1. Crea las carpetas globales.

```sh
mkdir -p ~/.config/opencode/plugins ~/.config/opencode/tui-plugins ~/.config/opencode/agents ~/.config/opencode/commands
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

5. Copia los commands.

```sh
cp commands/*.md ~/.config/opencode/commands/
rm -f ~/.config/opencode/commands/safe-commit.md ~/.config/opencode/commands/ready-pr.md
```

6. Registra el plugin TUI en `~/.config/opencode/tui.json`.

Si no tienes `tui.json`, puedes usar:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./tui-plugins/status-title.js"]
}
```

Si ya tienes un `tui.json`, añade `"./tui-plugins/status-title.js"` al array `plugin` existente.

7. Reinicia OpenCode.

## Seguridad

- No usa paquetes npm de terceros.
- No ejecuta código remoto.
- El plugin server ejecuta `osascript` con `Bun.spawn([...])`, pasando los argumentos como array y escapando el texto de la notificación.
- En macOS intenta enviar notificaciones desde Ghostty (`com.mitchellh.ghostty`) antes de usar AppleScript genérico.
- El plugin TUI solo usa la API local de OpenCode para leer estado de sesiones y actualizar el título del terminal.
- Los agents son archivos Markdown de configuración local de OpenCode.
- Los commands son archivos Markdown de configuración local de OpenCode.
- Los helpers se instalan en `~/.config/opencode/bin` y no ejecutan código remoto.

## Compatibilidad

- Probado con OpenCode `1.14.39`.
- El cambio de título depende de que tu terminal respete `OSC 0`/`setTerminalTitle`.
- Las notificaciones incluidas son para macOS. En otros sistemas el plugin simplemente no envía notificaciones.

## Desarrollo

Comprobar que los módulos importan correctamente:

```sh
bun run check
```

Instalar plugins, agents y commands localmente desde el repo:

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
rm ~/.config/opencode/commands/clean-code.md
rm ~/.config/opencode/commands/push.md
rm ~/.config/opencode/commands/ship.md
rm ~/.config/opencode/commands/branch.md
rm ~/.config/opencode/bin/opencode-branch
rm ~/.config/opencode/bin/opencode-branch-open
```

Después quita `"./tui-plugins/status-title.js"` de `~/.config/opencode/tui.json` y reinicia OpenCode.
