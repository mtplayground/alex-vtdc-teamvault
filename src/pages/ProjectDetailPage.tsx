import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Archive, ArrowLeft, FileImage, FileText, FileUp, FolderOpen, Lock } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  useAppShellQuery,
  useArchiveProjectMutation,
  useDocumentsQuery,
  useProjectQuery,
  useUploadDocumentMutation,
} from "../api/queries";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";
import { useToast } from "../components/ui/Toast";
import type { DocumentSummary } from "../types/domain";

const maxUploadBytes = 10 * 1024 * 1024;
const allowedTypes = new Set(["application/pdf", "image/gif", "image/jpeg", "image/png", "image/webp"]);

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function uploadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "Document could not be uploaded.";
  }

  if (error.code === "unsupported_document_type") {
    return "Only PDF and image files can be uploaded.";
  }

  if (error.code === "document_too_large") {
    return "Uploaded files must be 10 MB or smaller.";
  }

  if (error.code === "empty_document") {
    return "Uploaded file is empty.";
  }

  if (error.code === "document_name_required") {
    return "Uploaded file needs a filename.";
  }

  if (error.status === 403) {
    return "Your role cannot upload documents.";
  }

  return error.message || "Document could not be uploaded.";
}

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data } = useAppShellQuery();
  const workspaceId = data?.workspace?.id;
  const project = useProjectQuery(workspaceId, projectId);
  const documents = useDocumentsQuery(workspaceId, projectId);
  const uploadDocument = useUploadDocumentMutation(workspaceId, projectId);
  const archiveProject = useArchiveProjectMutation(workspaceId);
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!data?.workspace || project.isLoading) {
    return <LoadingState title="Loading project" detail="Preparing project details." />;
  }

  if (!project.data) {
    return (
      <EmptyState
        title="Project unavailable"
        detail="This project may have been archived or your role may not include access to it."
        action={
          <Link className="button button--secondary button--md" to="/projects">
            <ArrowLeft size={16} />
            Back to projects
          </Link>
        }
      />
    );
  }

  const canManageProjects = data.workspace.permissions.includes("projects.manage");
  const canUploadDocuments = data.workspace.permissions.includes("documents.upload");
  const currentProject = project.data.project;

  async function onArchive() {
    if (!workspaceId || !projectId) {
      return;
    }

    try {
      await archiveProject.mutateAsync({ workspaceId, projectId });
      notify("Project archived.", "success");
      navigate("/projects");
    } catch {
      notify("Project could not be archived.", "error");
    }
  }

  async function uploadFile(file: File) {
    if (!workspaceId || !projectId) {
      return;
    }

    if (!allowedTypes.has(file.type)) {
      notify("Only PDF and image files can be uploaded.", "error");
      return;
    }

    if (file.size > maxUploadBytes) {
      notify("Uploaded files must be 10 MB or smaller.", "error");
      return;
    }

    try {
      await uploadDocument.mutateAsync({ workspaceId, projectId, file });
      notify("Document uploaded.", "success");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error) {
      notify(uploadErrorMessage(error), "error");
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void uploadFile(file);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (!canUploadDocuments) {
      return;
    }

    const file = event.dataTransfer.files[0];
    if (file) {
      void uploadFile(file);
    }
  }

  function DocumentIcon({ document }: { document: DocumentSummary }) {
    return document.kind === "pdf" ? <FileText size={18} /> : <FileImage size={18} />;
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Project</p>
          <h2>{currentProject.name}</h2>
          <p>
            {currentProject.documentCount} documents · Updated {formatDate(currentProject.updatedAt)}
          </p>
        </div>
        <div className="row-actions">
          <Link className="button button--secondary button--md" to="/projects">
            <ArrowLeft size={16} />
            Projects
          </Link>
          {canManageProjects ? (
            <Button variant="danger" onClick={() => void onArchive()} disabled={archiveProject.isPending}>
              <Archive size={16} />
              Archive
            </Button>
          ) : null}
        </div>
      </section>

      <section className="state-panel state-panel--compact">
        <FolderOpen size={20} />
        <h2>Project access</h2>
        <p>
          <span className="visibility-chip">
            <Lock size={14} />
            {currentProject.visibility === "guest-scoped" ? "Guest scoped" : "Workspace"}
          </span>
        </p>
      </section>

      <EmptyState
        title={canUploadDocuments ? "Upload project documents" : "Project documents"}
        detail={
          canUploadDocuments
            ? "Add one PDF or image at a time. Files must be 10 MB or smaller."
            : "Guests can view documents made available in this project."
        }
        action={
          canUploadDocuments ? (
            <Button onClick={() => inputRef.current?.click()} disabled={uploadDocument.isPending}>
              <FileUp size={16} />
              {uploadDocument.isPending ? "Uploading" : "Choose file"}
            </Button>
          ) : null
        }
      />

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/gif,image/webp"
        onChange={onFileChange}
      />

      <div
        className={`upload-zone${isDragging ? " upload-zone--active" : ""}${!canUploadDocuments ? " upload-zone--disabled" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <FileUp size={22} />
        <div>
          <strong>{canUploadDocuments ? "Drop a PDF or image here" : "Upload disabled for your role"}</strong>
          <p>{canUploadDocuments ? "PDF, PNG, JPG, GIF, or WebP up to 10 MB." : "Guests can view and download only."}</p>
        </div>
      </div>

      <section className="list-panel" aria-label="Project documents">
        {documents.isLoading ? (
          <article className="list-row">
            <div>
              <h3>Loading documents</h3>
              <p>Preparing project files.</p>
            </div>
          </article>
        ) : documents.data?.documents.length ? (
          documents.data.documents.map((document) => (
            <article className="list-row" key={document.id}>
              <Link className="document-link" to={`/projects/${projectId}/documents/${document.id}`}>
                <DocumentIcon document={document} />
                <div>
                  <h3>{document.originalFilename}</h3>
                  <p>
                    {formatBytes(document.sizeBytes)} · Uploaded {formatDate(document.uploadedAt)}
                  </p>
                </div>
              </Link>
              <span className="permission-note">
                {document.uploaderName ?? document.uploaderEmail ?? "Unknown uploader"}
              </span>
            </article>
          ))
        ) : (
          <article className="list-row">
            <div>
              <h3>No documents in this project</h3>
              <p>Uploaded PDFs and images will appear here.</p>
            </div>
          </article>
        )}
      </section>
    </div>
  );
}
