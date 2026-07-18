import { MailCheck } from "lucide-react";
import { apiClient } from "../api/client";

export function CheckEmailPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-mark" aria-hidden="true">
          <MailCheck size={24} />
        </div>
        <p className="eyebrow">Email verification</p>
        <h1>Check your email</h1>
        <p>
          Finish verification through the secure identity service. After your email is verified, return here to continue.
        </p>
        <a className="button button--primary button--md" href={apiClient.getAuthRedirectUrl("login", "/")}>
          Continue after verification
        </a>
      </section>
    </main>
  );
}
