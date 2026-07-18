import { FormEvent, useState } from "react";
import { ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export function RequestPasswordResetPage() {
  const [email, setEmail] = useState("");
  const [handoffUrl, setHandoffUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await apiClient.requestPasswordReset(email);
      setHandoffUrl(result.loginUrl);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 429) {
        setError("Too many reset requests. Try again shortly.");
      } else {
        setError("Password recovery is unavailable right now.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-mark" aria-hidden="true">
          {handoffUrl ? <MailCheck size={24} /> : <KeyRound size={24} />}
        </div>
        <p className="eyebrow">Password recovery</p>
        <h1>{handoffUrl ? "Continue recovery" : "Reset your password"}</h1>
        {handoffUrl ? (
          <>
            <p>
              If the account can be recovered, continue through the secure identity service to finish password recovery.
            </p>
            <div className="auth-actions">
              <a className="button button--primary button--md" href={handoffUrl}>
                <KeyRound size={16} />
                Continue
              </a>
              <Link className="button button--secondary button--md" to="/login">
                <ArrowLeft size={16} />
                Back to sign in
              </Link>
            </div>
          </>
        ) : (
          <form className="auth-form" onSubmit={onSubmit}>
            <p>Enter your email and continue through the secure identity service.</p>
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            {error ? <p className="form-error">{error}</p> : null}
            <div className="auth-actions">
              <Button type="submit" disabled={submitting}>
                <MailCheck size={16} />
                {submitting ? "Submitting" : "Request reset"}
              </Button>
              <Link className="button button--secondary button--md" to="/login">
                <ArrowLeft size={16} />
                Back
              </Link>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
