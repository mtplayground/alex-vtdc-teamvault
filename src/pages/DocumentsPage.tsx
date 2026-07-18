import { FileUp } from "lucide-react";
import { useAppShellQuery } from "../api/queries";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";

export function DocumentsPage() {
  const { data } = useAppShellQuery();
  const canUpload = Boolean(data?.workspace?.permissions.includes("documents.upload"));

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Documents</p>
          <h2>Document library</h2>
          <p>Upload and browsing flows will inherit this hierarchy and permission language.</p>
        </div>
        <Button disabled={!canUpload} title={canUpload ? undefined : "Your role can view and download documents only."}>
          <FileUp size={16} />
          Upload
        </Button>
      </section>

      <EmptyState
        title="No project selected"
        detail="Choose a project to view its documents, upload files, and open secure previews."
      />
    </div>
  );
}
