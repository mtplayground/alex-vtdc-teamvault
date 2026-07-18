CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  CREATE TYPE workspace_role AS ENUM ('owner', 'member', 'guest');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE document_kind AS ENUM ('image', 'pdf');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE activity_action AS ENUM (
    'workspace_created',
    'invitation_created',
    'invitation_accepted',
    'member_role_changed',
    'member_removed',
    'project_created',
    'project_updated',
    'project_archived',
    'document_uploaded',
    'document_downloaded',
    'document_shared'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
  sub TEXT PRIMARY KEY,
  email CITEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  name TEXT,
  picture_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_sub_not_blank CHECK (length(trim(sub)) > 0),
  CONSTRAINT users_email_not_blank CHECK (length(trim(email::TEXT)) > 0)
);

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by_sub TEXT NOT NULL REFERENCES users(sub) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workspaces_name_not_blank CHECK (length(trim(name)) > 0)
);

DROP TRIGGER IF EXISTS set_workspaces_updated_at ON workspaces;

CREATE TRIGGER set_workspaces_updated_at
BEFORE UPDATE ON workspaces
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS workspace_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_sub TEXT NOT NULL REFERENCES users(sub) ON DELETE CASCADE,
  role workspace_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_sub)
);

DROP TRIGGER IF EXISTS set_workspace_memberships_updated_at ON workspace_memberships;

CREATE TRIGGER set_workspace_memberships_updated_at
BEFORE UPDATE ON workspace_memberships
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_user_sub
  ON workspace_memberships (user_sub);

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_workspace_role
  ON workspace_memberships (workspace_id, role);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by_sub TEXT REFERENCES users(sub) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT projects_name_not_blank CHECK (length(trim(name)) > 0),
  UNIQUE (workspace_id, id)
);

DROP TRIGGER IF EXISTS set_projects_updated_at ON projects;

CREATE TRIGGER set_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_active_name_per_workspace
  ON projects (workspace_id, lower(name))
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_workspace_updated_at
  ON projects (workspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS project_guest_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  user_sub TEXT NOT NULL REFERENCES users(sub) ON DELETE CASCADE,
  granted_by_sub TEXT REFERENCES users(sub) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (workspace_id, project_id) REFERENCES projects(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, user_sub) REFERENCES workspace_memberships(workspace_id, user_sub) ON DELETE CASCADE,
  UNIQUE (project_id, user_sub)
);

CREATE INDEX IF NOT EXISTS idx_project_guest_access_user
  ON project_guest_access (user_sub, workspace_id);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  project_id UUID NOT NULL,
  uploader_sub TEXT REFERENCES users(sub) ON DELETE SET NULL,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  kind document_kind NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (workspace_id, project_id) REFERENCES projects(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT documents_filename_not_blank CHECK (length(trim(original_filename)) > 0),
  CONSTRAINT documents_content_type_not_blank CHECK (length(trim(content_type)) > 0),
  CONSTRAINT documents_size_positive CHECK (size_bytes > 0),
  CONSTRAINT documents_storage_key_not_blank CHECK (length(trim(storage_key)) > 0)
);

DROP TRIGGER IF EXISTS set_documents_updated_at ON documents;

CREATE TRIGGER set_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_documents_project_created_at
  ON documents (project_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_workspace_created_at
  ON documents (workspace_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invited_by_sub TEXT NOT NULL REFERENCES users(sub) ON DELETE RESTRICT,
  accepted_user_sub TEXT REFERENCES users(sub) ON DELETE SET NULL,
  email CITEXT NOT NULL,
  role workspace_role NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invitations_email_not_blank CHECK (length(trim(email::TEXT)) > 0),
  CONSTRAINT invitations_token_hash_not_blank CHECK (length(trim(token_hash)) > 0),
  CONSTRAINT invitations_expiry_after_creation CHECK (expires_at > created_at),
  CONSTRAINT invitations_acceptance_matches_status CHECK (
    (status = 'accepted' AND accepted_at IS NOT NULL AND accepted_user_sub IS NOT NULL)
    OR (status <> 'accepted' AND accepted_at IS NULL)
  )
);

DROP TRIGGER IF EXISTS set_invitations_updated_at ON invitations;

CREATE TRIGGER set_invitations_updated_at
BEFORE UPDATE ON invitations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_invitations_workspace_status
  ON invitations (workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invitations_email_status
  ON invitations (email, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_one_pending_per_workspace_email
  ON invitations (workspace_id, email)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS activity_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_sub TEXT REFERENCES users(sub) ON DELETE SET NULL,
  action activity_action NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT activity_entries_target_type_not_blank CHECK (length(trim(target_type)) > 0),
  CONSTRAINT activity_entries_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_activity_entries_workspace_created_at
  ON activity_entries (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_entries_actor_created_at
  ON activity_entries (actor_sub, created_at DESC);
