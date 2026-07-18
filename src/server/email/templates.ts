import type { SendEmailInput } from "./client";
import type { WorkspaceRole } from "../db/types";

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface AccountVerificationTemplateInput {
  verificationUrl: string;
  recipientName?: string | null;
}

export interface PasswordResetTemplateInput {
  resetUrl: string;
  recipientName?: string | null;
}

export interface WorkspaceInvitationTemplateInput {
  acceptUrl: string;
  inviterName: string;
  workspaceName: string;
  role: WorkspaceRole;
}

export interface DocumentSharedTemplateInput {
  documentUrl: string;
  sharedByName: string;
  workspaceName: string;
  projectName: string;
  documentName: string;
}

const baseStyles = `
  body { margin: 0; padding: 0; background: #f6f7f9; color: #17202a; font-family: Arial, sans-serif; }
  .wrap { width: 100%; padding: 32px 16px; box-sizing: border-box; }
  .panel { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #dfe4ea; border-radius: 8px; overflow: hidden; }
  .content { padding: 32px; }
  h1 { margin: 0 0 16px; font-size: 22px; line-height: 1.3; color: #101820; }
  p { margin: 0 0 16px; font-size: 15px; line-height: 1.55; color: #344054; }
  .meta { margin: 20px 0; padding: 16px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; }
  .meta p { margin: 0 0 8px; }
  .meta p:last-child { margin-bottom: 0; }
  .button { display: inline-block; margin: 8px 0 20px; padding: 12px 16px; background: #1f4f46; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 700; }
  .fallback { word-break: break-all; color: #475467; font-size: 13px; }
  .footer { padding: 18px 32px; border-top: 1px solid #e5e7eb; background: #fbfcfd; }
  .footer p { margin: 0; color: #667085; font-size: 12px; }
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function greeting(name?: string | null): string {
  const trimmedName = name?.trim();
  return trimmedName ? `Hi ${trimmedName},` : "Hi,";
}

function roleLabel(role: WorkspaceRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function renderText(lines: string[]): string {
  return lines.join("\n");
}

function safeSubjectValue(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function renderLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>${baseStyles}</style>
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <div class="wrap">
      <div class="panel">
        <div class="content">
          ${bodyHtml}
        </div>
        <div class="footer">
          <p>If you were not expecting this message, you can ignore it.</p>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function actionButton(label: string, href: string): string {
  return `<a class="button" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

function fallbackLink(url: string): string {
  return `<p class="fallback">If the button does not work, copy and paste this link into your browser: ${escapeHtml(url)}</p>`;
}

export function buildAccountVerificationEmail(input: AccountVerificationTemplateInput): EmailTemplate {
  const subject = "Verify your account";
  const body = `
    <h1>Verify your account</h1>
    <p>${escapeHtml(greeting(input.recipientName))}</p>
    <p>Please confirm this email address to finish setting up your account.</p>
    ${actionButton("Verify account", input.verificationUrl)}
    ${fallbackLink(input.verificationUrl)}
  `;

  return {
    subject,
    html: renderLayout(subject, body),
    text: renderText([
      subject,
      "",
      greeting(input.recipientName),
      "Please confirm this email address to finish setting up your account.",
      "",
      `Verify account: ${input.verificationUrl}`,
      "",
      "If you were not expecting this message, you can ignore it.",
    ]),
  };
}

export function buildPasswordResetEmail(input: PasswordResetTemplateInput): EmailTemplate {
  const subject = "Reset your password";
  const body = `
    <h1>Reset your password</h1>
    <p>${escapeHtml(greeting(input.recipientName))}</p>
    <p>Use the link below to choose a new password. For your security, this link should only be used by you.</p>
    ${actionButton("Reset password", input.resetUrl)}
    ${fallbackLink(input.resetUrl)}
  `;

  return {
    subject,
    html: renderLayout(subject, body),
    text: renderText([
      subject,
      "",
      greeting(input.recipientName),
      "Use the link below to choose a new password. For your security, this link should only be used by you.",
      "",
      `Reset password: ${input.resetUrl}`,
      "",
      "If you were not expecting this message, you can ignore it.",
    ]),
  };
}

export function buildWorkspaceInvitationEmail(input: WorkspaceInvitationTemplateInput): EmailTemplate {
  const role = roleLabel(input.role);
  const workspaceName = safeSubjectValue(input.workspaceName);
  const subject = `Invitation to ${workspaceName}`;
  const body = `
    <h1>You have been invited to a workspace</h1>
    <p>${escapeHtml(input.inviterName)} invited you to collaborate.</p>
    <div class="meta">
      <p><strong>Workspace:</strong> ${escapeHtml(input.workspaceName)}</p>
      <p><strong>Role:</strong> ${escapeHtml(role)}</p>
    </div>
    ${actionButton("Accept invitation", input.acceptUrl)}
    ${fallbackLink(input.acceptUrl)}
  `;

  return {
    subject,
    html: renderLayout(subject, body),
    text: renderText([
      subject,
      "",
      `${input.inviterName} invited you to collaborate.`,
      `Workspace: ${input.workspaceName}`,
      `Role: ${role}`,
      "",
      `Accept invitation: ${input.acceptUrl}`,
      "",
      "If you were not expecting this message, you can ignore it.",
    ]),
  };
}

export function buildDocumentSharedEmail(input: DocumentSharedTemplateInput): EmailTemplate {
  const documentName = safeSubjectValue(input.documentName);
  const subject = `${documentName} was shared with you`;
  const body = `
    <h1>A document was shared with you</h1>
    <p>${escapeHtml(input.sharedByName)} shared a document with you.</p>
    <div class="meta">
      <p><strong>Workspace:</strong> ${escapeHtml(input.workspaceName)}</p>
      <p><strong>Project:</strong> ${escapeHtml(input.projectName)}</p>
      <p><strong>Document:</strong> ${escapeHtml(input.documentName)}</p>
    </div>
    ${actionButton("Open document", input.documentUrl)}
    ${fallbackLink(input.documentUrl)}
  `;

  return {
    subject,
    html: renderLayout(subject, body),
    text: renderText([
      subject,
      "",
      `${input.sharedByName} shared a document with you.`,
      `Workspace: ${input.workspaceName}`,
      `Project: ${input.projectName}`,
      `Document: ${input.documentName}`,
      "",
      `Open document: ${input.documentUrl}`,
      "",
      "If you were not expecting this message, you can ignore it.",
    ]),
  };
}

export function toSendEmailInput(to: SendEmailInput["to"], template: EmailTemplate): SendEmailInput {
  return {
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  };
}
