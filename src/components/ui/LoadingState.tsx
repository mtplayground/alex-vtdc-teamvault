interface LoadingStateProps {
  title: string;
  detail?: string;
}

export function LoadingState({ title, detail }: LoadingStateProps) {
  return (
    <section className="loading-screen" aria-busy="true">
      <div className="loading-spinner" />
      <h1>{title}</h1>
      {detail ? <p>{detail}</p> : null}
    </section>
  );
}
