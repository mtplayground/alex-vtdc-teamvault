import { LogIn, MailCheck, ShieldCheck } from "lucide-react";
import { apiClient } from "../api/client";

export function RegisterPage() {
  const registerUrl = apiClient.getAuthRedirectUrl("register", "/");
  const loginUrl = apiClient.getAuthRedirectUrl("login", "/");

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-mark" aria-hidden="true">
          <ShieldCheck size={24} />
        </div>
        <p className="eyebrow">Secure document workspace</p>
        <h1>Create your account</h1>
        <p>
          Register with the secure identity service, verify your email there, then return here to access your
          workspace.
        </p>
        <div className="auth-actions">
          <a className="button button--primary button--md" href={registerUrl}>
            <MailCheck size={16} />
            Register
          </a>
          <a className="button button--secondary button--md" href={loginUrl}>
            <LogIn size={16} />
            Sign in
          </a>
        </div>
      </section>
    </main>
  );
}
