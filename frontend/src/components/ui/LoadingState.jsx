export function LoadingState({ message = "Loading..." }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#141416]/90 border border-white/10 text-purple-300 font-medium backdrop-blur-md">
        <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        <span>{message}</span>
      </div>
    </div>
  );
}
