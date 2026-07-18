import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export function VerifiedPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-mark" aria-hidden="true">
          <CheckCircle2 size={24} />
        </div>
        <p className="eyebrow">Verification complete</p>
        <h1>Your account is verified</h1>
        <p>You can now open the workspace and continue with full access.</p>
        <Link className="button button--primary button--md" to="/">
          Open workspace
        </Link>
      </section>
    </main>
  );
}
