export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      <p className="text-sm text-slate-500 font-medium">Loading SmartEdu Cloud...</p>
    </div>
  );
}
