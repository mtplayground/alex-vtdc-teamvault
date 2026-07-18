import { CheckCircle2, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export function SetNewPasswordPage() {
  const { loginUrl } = useAuth();

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-mark" aria-hidden="true">
          <CheckCircle2 size={24} />
        </div>
        <p className="eyebrow">Password recovery</p>
        <h1>Recovery is handled securely</h1>
        <p>
          Password updates are completed by the secure identity service. Return to sign in after the recovery step is
          complete.
        </p>
        <div className="auth-actions">
          <a className="button button--primary button--md" href={loginUrl}>
            <KeyRound size={16} />
            Sign in
          </a>
          <Link className="button button--secondary button--md" to="/reset-password">
            Request another reset
          </Link>
        </div>
      </section>
    </main>
  );
}
