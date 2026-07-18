import { config } from "../config";
import { z } from "zod";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

export type EmailSendResult =
  | { status: "sent"; messageId: string | null }
  | { status: "skipped"; reason: "not_configured" }
  | { status: "rate_limited"; retryable: true }
  | { status: "failed"; retryable: boolean; error: string };

export interface EmailSender {
  send(input: SendEmailInput): Promise<EmailSendResult>;
}

const emailInputSchema = z
  .object({
    to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
    subject: z.string().trim().min(1),
    html: z.string().trim().min(1).optional(),
    text: z.string().trim().min(1).optional(),
    replyTo: z.string().email().optional(),
  })
  .refine((input) => Boolean(input.html || input.text), {
    message: "Either html or text content is required.",
    path: ["html"],
  });

function logEmail(level: "info" | "warn" | "error", message: string, details: Record<string, unknown>) {
  console[level](JSON.stringify({ service: "email", message, ...details }));
}

function recipientCount(to: string | string[]) {
  return Array.isArray(to) ? to.length : 1;
}

export function createEmailSender(): EmailSender {
  return {
    send: sendEmail,
  };
}

export async function sendEmail(input: SendEmailInput): Promise<EmailSendResult> {
  const parsedInput = emailInputSchema.safeParse(input);

  if (!parsedInput.success) {
    logEmail("warn", "Invalid email payload.", {
      issues: parsedInput.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
    });

    return {
      status: "failed",
      retryable: false,
      error: "Invalid email payload.",
    };
  }

  if (!config.email.enabled) {
    logEmail("warn", "Email service is not configured; skipping send.", {
      subject: parsedInput.data.subject,
      recipientCount: recipientCount(parsedInput.data.to),
    });

    return { status: "skipped", reason: "not_configured" };
  }

  try {
    const response = await fetch(config.email.url!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.email.appToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: parsedInput.data.to,
        subject: parsedInput.data.subject,
        ...(parsedInput.data.html ? { html: parsedInput.data.html } : {}),
        ...(parsedInput.data.text ? { text: parsedInput.data.text } : {}),
        ...(parsedInput.data.replyTo ? { reply_to: parsedInput.data.replyTo } : {}),
      }),
    });

    if (response.status === 429) {
      logEmail("warn", "Email service rate limited send.", {
        subject: parsedInput.data.subject,
        recipientCount: recipientCount(parsedInput.data.to),
      });

      return { status: "rate_limited", retryable: true };
    }

    if (!response.ok) {
      const errorText = await response.text();
      logEmail("error", "Email service rejected send.", {
        status: response.status,
        subject: parsedInput.data.subject,
        recipientCount: recipientCount(parsedInput.data.to),
        error: errorText,
      });

      return {
        status: "failed",
        retryable: response.status >= 500,
        error: `Email send failed with status ${response.status}.`,
      };
    }

    const result = (await response.json()) as { id?: string };
    logEmail("info", "Email sent.", {
      messageId: result.id ?? null,
      subject: parsedInput.data.subject,
      recipientCount: recipientCount(parsedInput.data.to),
      configuredFromAddress: config.email.fromAddress ?? null,
    });

    return { status: "sent", messageId: result.id ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email send failure.";
    logEmail("error", "Email send failed before provider response.", {
      subject: parsedInput.data.subject,
      recipientCount: recipientCount(parsedInput.data.to),
      error: message,
    });

    return {
      status: "failed",
      retryable: true,
      error: message,
    };
  }
}

export const emailSender = createEmailSender();
