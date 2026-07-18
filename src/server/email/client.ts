import { config } from "../config";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<string | null> {
  if (!config.email.enabled) {
    console.warn("Email service is not configured; skipping send.");
    return null;
  }

  const response = await fetch(config.email.url!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.email.appToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: input.to,
      subject: input.subject,
      ...(input.html ? { html: input.html } : {}),
      ...(input.text ? { text: input.text } : {}),
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  });

  if (response.status === 429) {
    throw new Error("Email service is rate limited; try again shortly.");
  }

  if (!response.ok) {
    throw new Error(`Email send failed: ${response.status} ${await response.text()}`);
  }

  const result = (await response.json()) as { id?: string };
  return result.id ?? null;
}
