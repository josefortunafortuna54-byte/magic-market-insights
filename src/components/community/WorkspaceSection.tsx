export function WorkspaceSection({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </h2>
        {right}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}