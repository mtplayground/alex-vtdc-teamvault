import { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  detail: string;
  action?: ReactNode;
}

export function EmptyState({ title, detail, action }: EmptyStateProps) {
  return (
    <section className="state-panel">
      <Inbox size={28} />
      <h2>{title}</h2>
      <p>{detail}</p>
      {action}
    </section>
  );
}
