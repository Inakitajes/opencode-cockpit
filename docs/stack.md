# Stack De Programacion

Este repo documenta y versiona las piezas locales que uso alrededor de mi entorno de programacion diario.

## Herramientas

| Herramienta | Rol | Uso en este repo |
| --- | --- | --- |
| OpenCode | Entorno principal de programacion asistida por agentes. | Agents, commands, plugins y snippets de configuracion global. |
| Worktrunk (`wt`) | Gestion de ramas y worktrees. | Los comandos `/implement` y `/convoy` arrancan una implementacion en un worktree aislado. |
| Convoy (`convoy`) | Pipeline local multi-agente: implementa y despues audita, testea y revisa, con un commit por fase. | El comando `/convoy` abre una ejecucion limpia de Convoy en el worktree nuevo. |
| Ghostty | Terminal principal. | Ejecuta las sesiones de OpenCode y muestra el estado con el plugin de titulo. |

## Flujo

1. Programo desde Ghostty usando OpenCode como cockpit principal.
2. Uso custom agents para separar investigacion, implementacion rapida y diseno UI.
3. Cuando una conversacion ya tiene un plan claro, `/implement` o `/convoy` usan Worktrunk para crear un worktree dedicado y arrancar la implementacion.
4. El helper abre una sesion nueva de OpenCode con el plan como prompt inicial, o una ejecucion de Convoy con el plan convertido en PRD.
5. Para entrega, `/push` y `/ship` automatizan checks, commits, push y preparacion de PR.

## Limites Del Repo

- Este repo instala configuracion de OpenCode y helpers locales para Worktrunk.
- Worktrunk debe estar instalado aparte como `wt`.
- Convoy debe estar instalado aparte como `convoy` para usar `/convoy`.
- Ghostty forma parte del stack, pero su configuracion no esta versionada aqui por ahora.
