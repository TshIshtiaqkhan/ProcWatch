/**
 * InteractiveGridPattern — High-performance, zero-CPU CSS grid backdrop.
 * Replaces heavy canvas requestAnimationFrame loops with hardware-accelerated CSS.
 */
export function InteractiveGridPattern({
  width = 24,
  height = 24,
  className = "",
}) {
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px)
        `,
        backgroundSize: `${width}px ${height}px`,
      }}
    />
  );
}
