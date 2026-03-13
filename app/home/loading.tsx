export default function Loading() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="w-14 h-full bg-muted/30 animate-pulse" />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-5xl aspect-video rounded-2xl bg-muted/30 animate-pulse" />
      </div>
    </div>
  );
}
