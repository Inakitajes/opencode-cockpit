import type { PromptItem } from "./storage";

export function preview(text: string, max = 96) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 3)}...`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function detailMarkdown(item: PromptItem) {
  return `## Prompt\n\n${codeBlock(item.text)}\n\n---\n\nCreated: ${formatDate(item.createdAt)}${
    item.poppedAt ? `\n\nPopped: ${formatDate(item.poppedAt)}` : ""
  }`;
}

function codeBlock(text: string) {
  return `\`\`\`text\n${text.replace(/```/g, "`\u200b``")}\n\`\`\``;
}
