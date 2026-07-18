import { MailCheck } from "lucide-react";
import { useAuth } from "../state/AuthContext";

export function CheckEmailPage() {
  const { loginUrl } = useAuth();

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
        <a className="button button--primary button--md" href={loginUrl}>
          Continue after verification
        </a>
      </section>
    </main>
  );
}
