import { ArrowLeft, Download, FileImage, FileText } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  useAppShellQuery,
  useDocumentDownloadMutation,
  useDocumentPreviewUrlQuery,
  useDocumentQuery,
} from "../api/queries";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";
import { useToast } from "../components/ui/Toast";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentViewerPage() {
  const { projectId, documentId } = useParams();
  const { data } = useAppShellQuery();
  const workspaceId = data?.workspace?.id;
  const document = useDocumentQuery(workspaceId, projectId, documentId);
  const preview = useDocumentPreviewUrlQuery(workspaceId, projectId, documentId);
  const download = useDocumentDownloadMutation();
  const { notify } = useToast();

  if (!data?.workspace || document.isLoading) {
    return <LoadingState title="Loading document" detail="Checking secure access." />;
  }

  if (!document.data || !projectId || !documentId) {
    return (
      <EmptyState
        title="Document unavailable"
        detail="This document may have been removed or your role may not include access to it."
        action={
          <Link className="button button--secondary button--md" to={`/projects/${projectId ?? ""}`}>
            <ArrowLeft size={16} />
            Back to project
          </Link>
        }
      />
    );
  }

  const currentDocument = document.data.document;
  const canDownload = data.workspace.permissions.includes("documents.download");

  async function onDownload() {
    if (!workspaceId || !projectId || !documentId) {
      return;
    }

    try {
      const access = await download.mutateAsync({ workspaceId, projectId, documentId });
      const link = window.document.createElement("a");
      link.href = access.url;
      link.rel = "noopener noreferrer";
      link.target = "_blank";
      link.click();
      notify("Download link created.", "success");
    } catch {
      notify("Download link could not be created.", "error");
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Document</p>
          <h2>{currentDocument.originalFilename}</h2>
          <p>
            {formatBytes(currentDocument.sizeBytes)} · Uploaded {formatDate(currentDocument.uploadedAt)}
          </p>
        </div>
        <div className="row-actions">
          <Link className="button button--secondary button--md" to={`/projects/${projectId}`}>
            <ArrowLeft size={16} />
            Project
          </Link>
          <Button
            disabled={!canDownload || download.isPending}
            title={canDownload ? undefined : "Your role cannot download documents."}
            onClick={() => void onDownload()}
          >
            <Download size={16} />
            {download.isPending ? "Preparing" : "Download"}
          </Button>
        </div>
      </section>

      <section className="state-panel state-panel--compact">
        {currentDocument.kind === "pdf" ? <FileText size={20} /> : <FileImage size={20} />}
        <h2>{currentDocument.kind === "pdf" ? "PDF preview" : "Image preview"}</h2>
        <p>Preview links expire at {preview.data ? formatDate(preview.data.expiresAt) : "the end of this session"}.</p>
      </section>

      <section className="document-viewer" aria-label="Document preview">
        {preview.isLoading ? (
          <div className="document-viewer__empty">Preparing preview.</div>
        ) : preview.data && currentDocument.kind === "image" ? (
          <img src={preview.data.url} alt={currentDocument.originalFilename} />
        ) : preview.data ? (
          <iframe src={preview.data.url} title={currentDocument.originalFilename} />
        ) : (
          <div className="document-viewer__empty">Preview could not be loaded.</div>
        )}
      </section>
    </div>
  );
}
