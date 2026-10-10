export function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="relative mx-auto mt-10 max-w-lg overflow-hidden rounded-3xl border border-line bg-elev px-8 py-14 text-center">
      <div aria-hidden className="absolute inset-0 bg-grid opacity-50 mask-fade-b" />
      <div className="relative">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-line bg-sunken text-accent">{icon}</div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-7 text-muted">{text}</p>
        {action && <div className="mt-7 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
