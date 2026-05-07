import { LocalStorage } from "@raycast/api";

export type PromptItem = {
  id: string;
  text: string;
  createdAt: string;
  poppedAt?: string;
};

const QUEUE_KEY = "prompt-stash.queue";
const ARCHIVE_KEY = "prompt-stash.archive";
const ARCHIVE_LIMIT = 30;

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readItems(key: string): Promise<PromptItem[]> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPromptItem);
  } catch {
    return [];
  }
}

function isPromptItem(value: unknown): value is PromptItem {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as PromptItem).id === "string" &&
    typeof (value as PromptItem).text === "string" &&
    typeof (value as PromptItem).createdAt === "string"
  );
}

async function writeItems(key: string, items: PromptItem[]) {
  await LocalStorage.setItem(key, JSON.stringify(items));
}

export async function getQueue() {
  return readItems(QUEUE_KEY);
}

export async function getArchive() {
  return readItems(ARCHIVE_KEY);
}

export async function addPrompt(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const queue = await getQueue();
  queue.push({ id: id(), text: trimmed, createdAt: new Date().toISOString() });
  await writeItems(QUEUE_KEY, queue);
}

export async function popPrompt() {
  const queue = await getQueue();
  const item = queue.shift();
  if (!item) return;

  await writeItems(QUEUE_KEY, queue);
  await archivePrompt(item);
  return item;
}

export async function popPromptById(id: string) {
  const queue = await getQueue();
  const index = queue.findIndex((item) => item.id === id);
  if (index === -1) return;

  const [item] = queue.splice(index, 1);
  await writeItems(QUEUE_KEY, queue);
  await archivePrompt(item);
  return item;
}

export async function deleteQueuedPrompt(id: string) {
  const queue = await getQueue();
  await writeItems(
    QUEUE_KEY,
    queue.filter((item) => item.id !== id),
  );
}

export async function deleteArchivedPrompt(id: string) {
  const archive = await getArchive();
  await writeItems(
    ARCHIVE_KEY,
    archive.filter((item) => item.id !== id),
  );
}

export async function restoreArchivedPrompt(id: string) {
  const archive = await getArchive();
  const index = archive.findIndex((item) => item.id === id);
  if (index === -1) return;

  const [item] = archive.splice(index, 1);
  const queue = await getQueue();
  queue.push({ id: item.id, text: item.text, createdAt: item.createdAt });

  await writeItems(ARCHIVE_KEY, archive);
  await writeItems(QUEUE_KEY, queue);
  return item;
}

export async function clearQueue() {
  await writeItems(QUEUE_KEY, []);
}

export async function clearArchive() {
  await writeItems(ARCHIVE_KEY, []);
}

async function archivePrompt(item: PromptItem) {
  const archive = await getArchive();
  archive.unshift({ ...item, poppedAt: new Date().toISOString() });
  await writeItems(ARCHIVE_KEY, archive.slice(0, ARCHIVE_LIMIT));
}
