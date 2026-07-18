import { useEffect, useRef } from "react";
import { CheckCircle2, LogIn, MailCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAcceptInvitationMutation } from "../api/queries";
import { LoadingState } from "../components/ui/LoadingState";
import { useAuth } from "../state/AuthContext";

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { session, isLoading } = useAuth();
  const acceptInvitation = useAcceptInvitationMutation();
  const started = useRef(false);

  useEffect(() => {
    if (!token || !session?.authenticated || !session.verified || started.current) {
      return;
    }

    started.current = true;
    acceptInvitation.mutate(token);
  }, [acceptInvitation, session, token]);

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <div className="auth-mark" aria-hidden="true">
            <MailCheck size={24} />
          </div>
          <p className="eyebrow">Invitation</p>
          <h1>Invitation link missing</h1>
          <p>Use the full invitation link from your email.</p>
          <Link className="button button--primary button--md" to="/">
            Go home
          </Link>
        </section>
      </main>
    );
  }

  if (isLoading || !session) {
    return <LoadingState title="Checking invitation" detail="Confirming your account before accepting." />;
  }

  if (!session.authenticated) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <div className="auth-mark" aria-hidden="true">
            <LogIn size={24} />
          </div>
          <p className="eyebrow">Invitation</p>
          <h1>Sign in to accept</h1>
          <p>Use the invited email address so the workspace membership can be linked to your account.</p>
          <a className="button button--primary button--md" href={apiClient.getAuthRedirectUrl("login", `/invite/accept?token=${token}`)}>
            <LogIn size={16} />
            Sign in
          </a>
        </section>
      </main>
    );
  }

  if (!session.verified) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <div className="auth-mark" aria-hidden="true">
            <MailCheck size={24} />
          </div>
          <p className="eyebrow">Invitation</p>
          <h1>Verify your email first</h1>
          <p>Finish email verification, then reopen this invitation link.</p>
        </section>
      </main>
    );
  }

  if (acceptInvitation.isPending) {
    return <LoadingState title="Accepting invitation" detail="Adding your account to the workspace." />;
  }

  if (acceptInvitation.isError) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <div className="auth-mark" aria-hidden="true">
            <MailCheck size={24} />
          </div>
          <p className="eyebrow">Invitation</p>
          <h1>Invitation could not be accepted</h1>
          <p>The invitation may be expired, already used, or tied to a different email address.</p>
          <Link className="button button--primary button--md" to="/">
            Go home
          </Link>
        </section>
      </main>
    );
  }

  if (acceptInvitation.isSuccess) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <div className="auth-mark" aria-hidden="true">
            <CheckCircle2 size={24} />
          </div>
          <p className="eyebrow">Invitation</p>
          <h1>Invitation accepted</h1>
          <p>Your account has been added to the workspace.</p>
          <Link className="button button--primary button--md" to="/">
            Open workspace
          </Link>
        </section>
      </main>
    );
  }

  return <LoadingState title="Preparing invitation" detail="Starting acceptance." />;
}
