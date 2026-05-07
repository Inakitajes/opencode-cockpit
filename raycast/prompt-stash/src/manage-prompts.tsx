import { useEffect, useState } from "react";
import { Action, ActionPanel, Clipboard, Color, Icon, List, Toast, showHUD, showToast } from "@raycast/api";
import {
  PromptItem,
  clearArchive,
  clearQueue,
  deleteArchivedPrompt,
  deleteQueuedPrompt,
  getArchive,
  getQueue,
  popPromptById,
  restoreArchivedPrompt,
} from "./storage";
import { detailMarkdown, formatDate, preview } from "./format";

type State = {
  isLoading: boolean;
  queue: PromptItem[];
  archive: PromptItem[];
};

export default function Command() {
  const [state, setState] = useState<State>({ isLoading: true, queue: [], archive: [] });

  async function reload() {
    const [queue, archive] = await Promise.all([getQueue(), getArchive()]);
    setState({ isLoading: false, queue, archive });
  }

  useEffect(() => {
    void reload();
  }, []);

  async function pasteQueued(id: string) {
    const item = await popPromptById(id);
    if (!item) return;
    await Clipboard.paste(item.text);
    await showHUD(`Pasted prompt: ${preview(item.text, 54)}`);
    await reload();
  }

  async function removeQueued(id: string) {
    await deleteQueuedPrompt(id);
    await showToast({ style: Toast.Style.Success, title: "Prompt deleted" });
    await reload();
  }

  async function restore(id: string) {
    await restoreArchivedPrompt(id);
    await showToast({ style: Toast.Style.Success, title: "Prompt restored" });
    await reload();
  }

  async function removeArchived(id: string) {
    await deleteArchivedPrompt(id);
    await showToast({ style: Toast.Style.Success, title: "Archived prompt deleted" });
    await reload();
  }

  async function clearQueuedPrompts() {
    await clearQueue();
    await showToast({ style: Toast.Style.Success, title: "Queue cleared" });
    await reload();
  }

  async function clearArchivedPrompts() {
    await clearArchive();
    await showToast({ style: Toast.Style.Success, title: "Archive cleared" });
    await reload();
  }

  return (
    <List
      isLoading={state.isLoading}
      isShowingDetail
      navigationTitle="Prompt Stash"
      searchBarPlaceholder="Search queued and archived prompts"
    >
      {state.queue.length === 0 && state.archive.length === 0 ? (
        <List.EmptyView title="No prompts stashed" description="Use Add Prompt to save one for later." />
      ) : null}

      <List.Section title="Queue" subtitle={`${state.queue.length} pending`}>
        {state.queue.map((item, index) => (
          <List.Item
            key={item.id}
            id={item.id}
            icon={{ source: Icon.Clock, tintColor: index === 0 ? Color.Green : Color.SecondaryText }}
            title={preview(item.text)}
            subtitle={index === 0 ? "Next" : `#${index + 1}`}
            accessories={[{ text: formatDate(item.createdAt) }]}
            detail={<List.Item.Detail markdown={detailMarkdown(item)} />}
            actions={
              <ActionPanel>
                <Action title="Paste and Archive" icon={Icon.ArrowRight} onAction={() => pasteQueued(item.id)} />
                <Action.CopyToClipboard title="Copy Without Archiving" content={item.text} />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => removeQueued(item.id)}
                />
                <Action
                  title="Clear Queue"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={clearQueuedPrompts}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Archive" subtitle={`${state.archive.length} recent`}>
        {state.archive.map((item) => (
          <List.Item
            key={item.id}
            id={item.id}
            icon={{ source: Icon.Archive, tintColor: Color.SecondaryText }}
            title={preview(item.text)}
            subtitle="Archived"
            accessories={[{ text: item.poppedAt ? formatDate(item.poppedAt) : formatDate(item.createdAt) }]}
            detail={<List.Item.Detail markdown={detailMarkdown(item)} />}
            actions={
              <ActionPanel>
                <Action title="Restore to Queue" icon={Icon.ArrowCounterClockwise} onAction={() => restore(item.id)} />
                <Action.Paste title="Paste Without Restoring" content={item.text} />
                <Action.CopyToClipboard title="Copy" content={item.text} />
                <Action
                  title="Delete from Archive"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => removeArchived(item.id)}
                />
                <Action
                  title="Clear Archive"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={clearArchivedPrompts}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
