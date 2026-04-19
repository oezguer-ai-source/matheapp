export default function Loading() {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-8 w-48 bg-white/60 rounded-xl mb-4" />
      <div className="grid gap-4">
        <div className="h-28 rounded-3xl bg-white/60" />
        <div className="h-28 rounded-3xl bg-white/60" />
        <div className="h-28 rounded-3xl bg-white/60" />
      </div>
    </div>
  );
}
