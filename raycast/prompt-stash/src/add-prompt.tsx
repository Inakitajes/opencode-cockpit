import { Action, ActionPanel, Form, Toast, popToRoot, showToast } from "@raycast/api";
import { addPrompt } from "./storage";

type Values = {
  prompt: string;
};

export default function Command() {
  async function submit(values: Values) {
    if (!values.prompt.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Prompt is empty" });
      return;
    }

    await addPrompt(values.prompt);
    await showToast({ style: Toast.Style.Success, title: "Prompt stashed" });
    await popToRoot();
  }

  return (
    <Form
      enableDrafts
      navigationTitle="Add Prompt"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add to Stash" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="prompt" title="Prompt" placeholder="Write the prompt you want to run later..." autoFocus />
    </Form>
  );
}
