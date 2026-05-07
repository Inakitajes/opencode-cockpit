/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `add-prompt` command */
  export type AddPrompt = ExtensionPreferences & {}
  /** Preferences accessible in the `pop-prompt` command */
  export type PopPrompt = ExtensionPreferences & {}
  /** Preferences accessible in the `manage-prompts` command */
  export type ManagePrompts = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `add-prompt` command */
  export type AddPrompt = {}
  /** Arguments passed to the `pop-prompt` command */
  export type PopPrompt = {}
  /** Arguments passed to the `manage-prompts` command */
  export type ManagePrompts = {}
}

