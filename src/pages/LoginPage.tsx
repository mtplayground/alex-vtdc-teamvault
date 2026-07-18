import { LogIn, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export function LoginPage() {
  const { loginUrl } = useAuth();

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-mark" aria-hidden="true">
          <LogIn size={24} />
        </div>
        <p className="eyebrow">Secure session</p>
        <h1>Sign in</h1>
        <p>Use the secure identity service to continue. Your session is verified on every protected request.</p>
        <div className="auth-actions">
          <a className="button button--primary button--md" href={loginUrl}>
            <LogIn size={16} />
            Sign in
          </a>
          <Link className="button button--secondary button--md" to="/register">
            <UserPlus size={16} />
            Create account
          </Link>
        </div>
        <Link className="auth-link" to="/reset-password">
          Forgot password?
        </Link>
      </section>
    </main>
  );
}
