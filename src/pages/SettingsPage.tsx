import { useState } from "react";
import { Save } from "lucide-react";
import { useAppShellQuery } from "../api/queries";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { Input } from "../components/ui/Input";
import { useToast } from "../components/ui/Toast";

export function SettingsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { notify } = useToast();
  const { data } = useAppShellQuery();
  const canManageWorkspace = Boolean(data?.workspace?.permissions.includes("workspace.manage"));

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Workspace settings</h2>
          <p>Reusable controls for forms, dialogs, and notifications are available to later issues.</p>
        </div>
        <Button
          variant="secondary"
          disabled={!canManageWorkspace}
          title={canManageWorkspace ? undefined : "Only owners can edit workspace settings."}
          onClick={() => setDialogOpen(true)}
        >
          Edit details
        </Button>
      </section>

      <section className="form-panel">
        <Input label="Workspace name" defaultValue={data?.workspace?.name ?? ""} disabled={!canManageWorkspace} />
        <Input label="Default document retention" defaultValue="Unlimited" hint="A policy field for future workflows." />
        <Button disabled={!canManageWorkspace} onClick={() => notify("Settings saved for this session.", "success")}>
          <Save size={16} />
          Save
        </Button>
      </section>

      <Dialog
        open={dialogOpen}
        title="Edit workspace details"
        description="This modal establishes the shared dialog pattern."
        onClose={() => setDialogOpen(false)}
      >
        <div className="dialog-actions">
          <Input label="Display name" defaultValue="Acme Legal Review" />
          <Button
            onClick={() => {
              setDialogOpen(false);
              notify("Workspace details updated.", "success");
            }}
          >
            Save changes
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
