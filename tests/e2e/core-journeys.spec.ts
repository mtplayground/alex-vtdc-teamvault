import { expect, test, type Page } from "@playwright/test";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const documentId = "33333333-3333-4333-8333-333333333333";

type Role = "owner" | "member" | "guest";

interface TestState {
  authenticated: boolean;
  verified: boolean;
  role: Role;
  workspaces: Array<{
    id: string;
    name: string;
    role: Role;
    permissions: string[];
    memberCount: number;
    projectCount: number;
    documentCount: number;
  }>;
  projects: Array<{
    id: string;
    name: string;
    documentCount: number;
    updatedAt: string;
    visibility: "workspace" | "guest-scoped";
  }>;
  documents: Array<{
    id: string;
    projectId: string;
    originalFilename: string;
    contentType: string;
    kind: "image" | "pdf";
    sizeBytes: number;
    uploadedAt: string;
    uploaderName: string | null;
    uploaderEmail: string | null;
  }>;
  emailEvents: string[];
  activity: Array<{
    id: string;
    actor: string;
    action: string;
    target: string;
    role: Role;
    occurredAt: string;
  }>;
}

function permissionsFor(role: Role) {
  if (role === "owner") {
    return [
      "workspace.manage",
      "members.manage",
      "roles.manage",
      "projects.create",
      "projects.manage",
      "documents.upload",
      "documents.organize",
      "documents.view",
      "documents.download",
    ];
  }

  if (role === "member") {
    return ["projects.create", "projects.manage", "documents.upload", "documents.organize", "documents.view", "documents.download"];
  }

  return ["documents.view", "documents.download"];
}

function createState(overrides: Partial<TestState> = {}): TestState {
  const role = overrides.role ?? "owner";

  return {
    authenticated: true,
    verified: true,
    role,
    workspaces: [
      {
        id: workspaceId,
        name: "Acme Legal Review",
        role,
        permissions: permissionsFor(role),
        memberCount: 3,
        projectCount: 1,
        documentCount: 0,
      },
    ],
    projects: [
      {
        id: projectId,
        name: "Board approvals",
        documentCount: 0,
        updatedAt: new Date().toISOString(),
        visibility: role === "guest" ? "guest-scoped" : "workspace",
      },
    ],
    documents: [],
    emailEvents: [],
    activity: [],
    ...overrides,
  };
}

async function mockApi(page: Page, state: TestState) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = request.method();

    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    if (path === "/session") {
      if (!state.authenticated) {
        return json({ authenticated: false, loginUrl: "/api/auth/login?return_to=%2F" });
      }

      if (!state.verified) {
        return json({
          authenticated: true,
          verified: false,
          loginUrl: "/api/auth/login?return_to=%2F",
          user: { name: "Workspace Owner", email: "owner@example.com", pictureUrl: null },
        });
      }

      return json({
        authenticated: true,
        verified: true,
        registrationStatus: "returning",
        user: { name: "Workspace Owner", email: "owner@example.com", pictureUrl: null },
      });
    }

    if (path.startsWith("/auth/register")) {
      state.emailEvents.push("verification");
      return route.fulfill({ status: 302, headers: { location: "/" } });
    }

    if (path === "/auth/password-reset/request" && method === "POST") {
      state.emailEvents.push("reset");
      return json({ status: "delegated", loginUrl: "/api/auth/password-reset?return_to=%2Freset-password%2Fcomplete" });
    }

    if (path === "/app-shell") {
      const workspace = state.workspaces[0];
      return json({
        currentUser: { name: "Workspace Owner", email: "owner@example.com", pictureUrl: null },
        workspace,
        workspaces: state.workspaces,
        projects: state.projects,
        activity: state.activity.slice(0, 10),
      });
    }

    if (path === "/workspaces" && method === "GET") {
      return json({ workspaces: state.workspaces });
    }

    if (path === "/workspaces" && method === "POST") {
      const body = request.postDataJSON() as { name: string };
      state.workspaces[0] = {
        ...state.workspaces[0],
        name: body.name,
      };
      return json({ workspaceId: state.workspaces[0].id, workspaces: state.workspaces }, 201);
    }

    if (path === `/workspaces/${workspaceId}/roster`) {
      return json({
        members: [
          { sub: "owner-sub", name: "Workspace Owner", email: "owner@example.com", pictureUrl: null, role: "owner", joinedAt: new Date().toISOString() },
          { sub: "guest-sub", name: "Guest Reviewer", email: "guest@example.com", pictureUrl: null, role: "guest", joinedAt: new Date().toISOString() },
        ],
        pendingInvitations: [],
      });
    }

    if (path === `/workspaces/${workspaceId}/invitations` && method === "POST") {
      const body = request.postDataJSON() as { email: string };
      state.emailEvents.push(`invitation:${body.email}`);
      return json({ invitationId: "55555555-5555-4555-8555-555555555555", expiresAt: new Date().toISOString(), emailStatus: "sent" }, 201);
    }

    if (path === "/invitations/accept" && method === "POST") {
      return json({ workspaceId, role: "guest" });
    }

    if (path === `/workspaces/${workspaceId}/projects` && method === "GET") {
      return json({ projects: state.projects });
    }

    if (path === `/workspaces/${workspaceId}/projects` && method === "POST") {
      const body = request.postDataJSON() as { name: string };
      state.projects.unshift({ id: projectId, name: body.name, documentCount: 0, updatedAt: new Date().toISOString(), visibility: "workspace" });
      return json({ project: state.projects[0] }, 201);
    }

    if (path === `/workspaces/${workspaceId}/projects/${projectId}`) {
      return json({ project: state.projects.find((project) => project.id === projectId) ?? state.projects[0] });
    }

    if (path === `/workspaces/${workspaceId}/projects/${projectId}/documents` && method === "GET") {
      return json({ documents: state.documents.filter((document) => document.projectId === projectId) });
    }

    if (path === `/workspaces/${workspaceId}/projects/${projectId}/documents` && method === "POST") {
      const document = {
        id: documentId,
        projectId,
        originalFilename: "board-packet.pdf",
        contentType: "application/pdf",
        kind: "pdf" as const,
        sizeBytes: 1024,
        uploadedAt: new Date().toISOString(),
        uploaderName: "Workspace Owner",
        uploaderEmail: "owner@example.com",
      };
      state.documents = [document];
      state.projects[0] = { ...state.projects[0], documentCount: 1 };
      return json({ document }, 201);
    }

    if (path === `/workspaces/${workspaceId}/projects/${projectId}/documents/${documentId}`) {
      return json({ document: state.documents[0] });
    }

    if (path === `/workspaces/${workspaceId}/projects/${projectId}/documents/${documentId}/preview-url`) {
      return json({ url: "about:blank", expiresAt: new Date(Date.now() + 300_000).toISOString(), disposition: "inline" });
    }

    if (path === `/workspaces/${workspaceId}/projects/${projectId}/documents/${documentId}/download-url` && method === "POST") {
      state.activity.unshift({ id: "download-activity", actor: "Workspace Owner", action: "downloaded", target: "board-packet.pdf", role: state.role, occurredAt: new Date().toISOString() });
      return json({ url: "about:blank", expiresAt: new Date(Date.now() + 300_000).toISOString(), disposition: "attachment" });
    }

    if (path === `/workspaces/${workspaceId}/projects/${projectId}/documents/${documentId}/share` && method === "POST") {
      const body = request.postDataJSON() as { email: string };
      state.emailEvents.push(`document-shared:${body.email}`);
      return json({ recipientEmail: body.email, projectAccessGranted: true, emailStatus: "sent" }, 201);
    }

    if (path === `/workspaces/${workspaceId}/activity`) {
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? 25);
      const rows = state.activity.slice(offset, offset + limit);
      const nextOffset = state.activity.length > offset + limit ? offset + limit : null;
      return json({ activity: rows, nextOffset });
    }

    return json({ error: { code: "not_mocked", message: `${method} ${path}` } }, 404);
  });
}

test("register, verify handoff, sign in, and password reset email triggers", async ({ page }) => {
  const state = createState({ authenticated: false });
  await mockApi(page, state);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByRole("link", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

  await page.getByRole("link", { name: "Register" }).click();
  expect(state.emailEvents).toContain("verification");

  state.authenticated = true;
  state.verified = true;
  await page.goto("/");
  await expect(page.getByText("Workspace document center")).toBeVisible();

  state.authenticated = false;
  await page.goto("/reset-password");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByRole("button", { name: "Request reset" }).click();
  await expect(page.getByRole("heading", { name: "Continue recovery" })).toBeVisible();
  expect(state.emailEvents).toContain("reset");
});

test("creates a workspace, invites people, and accepts an invitation", async ({ page }) => {
  const state = createState();
  await mockApi(page, state);

  await page.goto("/");
  await page.getByRole("button", { name: "Workspace" }).click();
  await page.getByLabel("Workspace name").fill("Litigation Room");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByRole("heading", { name: "Litigation Room" })).toBeVisible();

  await page.getByRole("link", { name: "Members" }).click();
  await page.getByRole("button", { name: "Invite" }).click();
  await page.getByLabel("Email address").fill("member@example.com");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await page.getByRole("button", { name: "Invite" }).click();
  await page.getByLabel("Email address").fill("guest@example.com");
  await page.locator("#invitation-role").selectOption("guest");
  await page.getByRole("button", { name: "Send invitation" }).click();

  expect(state.emailEvents).toContain("invitation:member@example.com");
  expect(state.emailEvents).toContain("invitation:guest@example.com");

  await page.goto("/invite/accept?token=guest-token");
  await expect(page.getByRole("heading", { name: "Invitation accepted" })).toBeVisible();
});

test("creates a project, uploads, previews, downloads, shares, and shows guest visibility", async ({ page }) => {
  const state = createState({ projects: [], documents: [] });
  await mockApi(page, state);

  await page.goto("/projects");
  await page.getByRole("button", { name: "New project" }).first().click();
  await page.getByLabel("Project name").fill("Board approvals");
  await page.getByRole("button", { name: "Create project" }).click();
  await page.getByRole("link", { name: /Board approvals/ }).click();

  await page.locator('input[type="file"]').setInputFiles({
    name: "board-packet.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n"),
  });
  await expect(page.getByText("board-packet.pdf")).toBeVisible();

  await page.getByRole("link", { name: /board-packet.pdf/ }).click();
  await expect(page.getByRole("heading", { name: "board-packet.pdf" })).toBeVisible();
  await expect(page.getByText("PDF preview")).toBeVisible();
  await page.getByRole("button", { name: "Download" }).click();
  await expect(page.getByText("Download link created.")).toBeVisible();

  await page.getByRole("button", { name: "Share" }).click();
  await page.getByLabel("Recipient email").fill("guest@example.com");
  await page.getByRole("button", { name: "Share document" }).click();
  expect(state.emailEvents).toContain("document-shared:guest@example.com");

  state.role = "guest";
  state.workspaces[0] = { ...state.workspaces[0], role: "guest", permissions: permissionsFor("guest") };
  state.projects[0] = { ...state.projects[0], visibility: "guest-scoped" };
  await page.goto("/documents");
  await expect(page.getByText("Guest scoped")).toBeVisible();
  await expect(page.getByText("Guests can open shared projects in view-only mode.")).toBeVisible();
});
