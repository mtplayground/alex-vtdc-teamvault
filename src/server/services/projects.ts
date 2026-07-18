import type { Pool } from "pg";
import type { ProjectSummary } from "../../types/domain";
import {
  archiveProject,
  createProject,
  getProjectForWorkspace,
  listProjectsForWorkspace,
  renameProject,
} from "../db/repositories";
import type { WorkspaceMembershipRecord } from "../db/types";
import { ApiError } from "../errors";
import { logActivity } from "./activity";

function toProjectSummary(project: Awaited<ReturnType<typeof listProjectsForWorkspace>>[number]): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    documentCount: project.documentCount,
    updatedAt: project.updatedAt.toISOString(),
    visibility: project.visibility,
  };
}

export async function listWorkspaceProjects(dbPool: Pool, membership: WorkspaceMembershipRecord): Promise<ProjectSummary[]> {
  const projects = await listProjectsForWorkspace(dbPool, {
    workspaceId: membership.workspaceId,
    userSub: membership.userSub,
    role: membership.role,
  });

  return projects.map(toProjectSummary);
}

export async function getWorkspaceProject(dbPool: Pool, membership: WorkspaceMembershipRecord, projectId: string) {
  const project = await getProjectForWorkspace(dbPool, {
    workspaceId: membership.workspaceId,
    projectId,
    userSub: membership.userSub,
    role: membership.role,
  });

  if (!project) {
    throw new ApiError(404, "project_not_found", "Project was not found.");
  }

  return toProjectSummary(project);
}

export async function createWorkspaceProject(
  dbPool: Pool,
  input: { workspaceId: string; actorSub: string; name: string },
): Promise<ProjectSummary> {
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");
    const project = await createProject(client, {
      workspaceId: input.workspaceId,
      createdBySub: input.actorSub,
      name: input.name,
    });

    await logActivity(client, {
      workspaceId: input.workspaceId,
      actorSub: input.actorSub,
      action: "project_created",
      targetType: "project",
      targetId: project.id,
      metadata: { projectName: project.name },
    });

    await client.query("COMMIT");

    return {
      id: project.id,
      name: project.name,
      documentCount: 0,
      updatedAt: project.updatedAt.toISOString(),
      visibility: "workspace",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function renameWorkspaceProject(
  dbPool: Pool,
  input: { workspaceId: string; projectId: string; actorSub: string; name: string },
) {
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");
    const project = await renameProject(client, {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      name: input.name,
    });

    if (!project) {
      throw new ApiError(404, "project_not_found", "Project was not found.");
    }

    await logActivity(client, {
      workspaceId: input.workspaceId,
      actorSub: input.actorSub,
      action: "project_updated",
      targetType: "project",
      targetId: project.id,
      metadata: { projectName: project.name },
    });

    await client.query("COMMIT");
    return project;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function archiveWorkspaceProject(
  dbPool: Pool,
  input: { workspaceId: string; projectId: string; actorSub: string },
) {
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");
    const project = await archiveProject(client, {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
    });

    if (!project) {
      throw new ApiError(404, "project_not_found", "Project was not found.");
    }

    await logActivity(client, {
      workspaceId: input.workspaceId,
      actorSub: input.actorSub,
      action: "project_archived",
      targetType: "project",
      targetId: project.id,
      metadata: { projectName: project.name },
    });

    await client.query("COMMIT");
    return project;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
