import { Clipboard, Toast, showHUD, showToast } from "@raycast/api";
import { popPrompt } from "./storage";
import { preview } from "./format";

export default async function Command() {
  const item = await popPrompt();
  if (!item) {
    await showToast({ style: Toast.Style.Failure, title: "Prompt stash is empty" });
    return;
  }

  await Clipboard.paste(item.text);
  await showHUD(`Pasted prompt: ${preview(item.text, 54)}`);
}
