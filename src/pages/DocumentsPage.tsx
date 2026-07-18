import { FileUp } from "lucide-react";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";

export function DocumentsPage() {
  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Documents</p>
          <h2>Document library</h2>
          <p>Upload and browsing flows will inherit this hierarchy and permission language.</p>
        </div>
        <Button>
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
