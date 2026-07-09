# Stack De Programacion

Este repo documenta y versiona las piezas locales que uso alrededor de mi entorno de programacion diario.

## Herramientas

| Herramienta | Rol | Uso en este repo |
| --- | --- | --- |
| OpenCode | Entorno principal de programacion asistida por agentes. | Agents, commands, plugins y snippets de configuracion global. |
| Worktrunk (`wt`) | Gestion de ramas y worktrees. | Los comandos `/implement` y `/archer-implement` arrancan una implementacion en un worktree aislado. |
| Archer (`archer`) | Pipeline local de implementacion por agentes. | El comando `/archer-implement` abre una ejecucion limpia de Archer en el worktree nuevo. |
| Ghostty | Terminal principal. | Ejecuta las sesiones de OpenCode y muestra el estado con el plugin de titulo. |

## Flujo

1. Programo desde Ghostty usando OpenCode como cockpit principal.
2. Uso custom agents para separar investigacion, implementacion rapida y diseno UI.
3. Cuando una conversacion ya tiene un plan claro, `/implement` o `/archer-implement` usan Worktrunk para crear un worktree dedicado y arrancar la implementacion.
4. El helper abre una sesion nueva de OpenCode o una ejecucion de Archer en ese worktree con el plan como prompt inicial.
5. Para entrega, `/push` y `/ship` automatizan checks, commits, push y preparacion de PR.

## Limites Del Repo

- Este repo instala configuracion de OpenCode y helpers locales para Worktrunk.
- Worktrunk debe estar instalado aparte como `wt`.
- Archer debe estar instalado aparte como `archer` para usar `/archer-implement`.
- Ghostty forma parte del stack, pero su configuracion no esta versionada aqui por ahora.
