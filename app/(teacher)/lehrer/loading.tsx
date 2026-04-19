export default function Loading() {
  return (
    <div className="p-8 lg:p-12 max-w-5xl animate-pulse">
      <div className="h-9 w-64 bg-slate-200 rounded-lg mb-3" />
      <div className="h-5 w-80 bg-slate-100 rounded mb-10" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        <div className="h-32 rounded-2xl bg-slate-100" />
        <div className="h-32 rounded-2xl bg-slate-100" />
        <div className="h-32 rounded-2xl bg-slate-100" />
      </div>
      <div className="h-40 rounded-2xl bg-slate-100" />
    </div>
  );
}
