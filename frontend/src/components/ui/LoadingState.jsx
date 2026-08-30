export function LoadingState({ message = "Loading..." }) {
  return (
    <div className="flex items-center justify-center min-h-[360px] animate-fadeIn">
      <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#141416]/90 border border-[#27272a] text-[#f4f4f5] text-xs font-medium backdrop-blur-md shadow-glass">
        <div className="w-4 h-4 border-2 border-[#31afd4] border-t-transparent rounded-full animate-spin shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}
