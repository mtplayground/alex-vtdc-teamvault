import { FormEvent, useState } from "react";
import { ArrowLeft, Download, FileImage, FileText, Share2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  useAppShellQuery,
  useDocumentDownloadMutation,
  useDocumentPreviewUrlQuery,
  useDocumentQuery,
  useShareDocumentMutation,
} from "../api/queries";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
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

function shareErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "Document could not be shared. Try again shortly.";
  }

  if (error.code === "recipient_not_found") {
    return "Share with an existing workspace member or guest.";
  }

  if (error.code === "validation_error") {
    return "Enter a valid recipient email address.";
  }

  if (error.status === 403) {
    return "Your role cannot share this document.";
  }

  return error.message || "Document could not be shared. Try again shortly.";
}

export function DocumentViewerPage() {
  const { projectId, documentId } = useParams();
  const { data } = useAppShellQuery();
  const workspaceId = data?.workspace?.id;
  const document = useDocumentQuery(workspaceId, projectId, documentId);
  const preview = useDocumentPreviewUrlQuery(workspaceId, projectId, documentId);
  const download = useDocumentDownloadMutation();
  const share = useShareDocumentMutation();
  const { notify } = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);

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
  const canShare = data.workspace.permissions.includes("documents.organize");

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

  async function onShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspaceId || !projectId || !documentId) {
      return;
    }

    setShareError(null);

    try {
      const result = await share.mutateAsync({
        workspaceId,
        projectId,
        documentId,
        email: shareEmail,
      });
      setShareEmail("");
      setShareOpen(false);
      notify(
        result.emailStatus === "sent"
          ? "Document shared."
          : "Share recorded; email delivery is pending.",
        "success",
      );
    } catch (error) {
      setShareError(shareErrorMessage(error));
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
            variant="secondary"
            disabled={!canShare}
            title={canShare ? undefined : "Your role cannot share documents."}
            onClick={() => {
              setShareError(null);
              setShareOpen(true);
            }}
          >
            <Share2 size={16} />
            Share
          </Button>
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

      <Dialog
        open={shareOpen}
        title="Share document"
        description="Send access to an existing workspace member or guest."
        onClose={() => setShareOpen(false)}
      >
        <form className="dialog-actions" onSubmit={onShare}>
          <Input
            label="Recipient email"
            type="email"
            value={shareEmail}
            onChange={(event) => setShareEmail(event.target.value)}
            required
          />
          {shareError ? <p className="form-error">{shareError}</p> : null}
          <Button type="submit" disabled={share.isPending || !shareEmail.trim()}>
            <Share2 size={16} />
            {share.isPending ? "Sharing" : "Share document"}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
