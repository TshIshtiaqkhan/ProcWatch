import { useEffect, useRef } from "react";

export function InteractiveGridPattern({
  width = 24,
  height = 24,
  className = "",
  hoverColor = "rgba(59, 130, 246, 0.45)", // Blue fill
  dotColor = "#60a5fa", // Bright blue center dot
}) {
  const canvasRef = useRef(null);
  const activeCellsRef = useRef(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const col = Math.floor(x / width);
      const row = Math.floor(y / height);
      const key = `${col},${row}`;

      activeCellsRef.current.set(key, { col, row, time: Date.now() });
    };

    window.addEventListener("mousemove", handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cols = Math.ceil(canvas.width / width);
      const rows = Math.ceil(canvas.height / height);

      // Draw subtle background grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.055)";
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let c = 0; c <= cols; c++) {
        const x = c * width;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      for (let r = 0; r <= rows; r++) {
        const y = r * height;
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();

      // Render active hovered cells with blue glow and center blue dot matching MagicUI
      const now = Date.now();
      const fadeDuration = 800; // ms

      activeCellsRef.current.forEach((cell, key) => {
        const elapsed = now - cell.time;
        if (elapsed > fadeDuration) {
          activeCellsRef.current.delete(key);
        } else {
          const alpha = 1 - elapsed / fadeDuration;
          const cellX = cell.col * width;
          const cellY = cell.row * height;

          // Fill cell with original MagicUI blue hover glow
          ctx.fillStyle = `rgba(59, 130, 246, ${0.35 * alpha})`;
          ctx.fillRect(cellX + 1, cellY + 1, width - 2, height - 2);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
    />
  );
}
