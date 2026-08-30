import { useEffect, useRef } from "react";

export function InteractiveGridPattern({
  width = 24,
  height = 24,
  className = "",
  hoverColor = "rgba(0, 79, 255, 0.25)",
}) {
  const canvasRef = useRef(null);
  const activeCellsRef = useRef(new Map());
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId = null;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawStaticGrid();
    };

    const drawStaticGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cols = Math.ceil(canvas.width / width);
      const rows = Math.ceil(canvas.height / height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
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
    };

    const startAnimationLoop = () => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;

      const render = () => {
        drawStaticGrid();

        const now = Date.now();
        const fadeDuration = 600; // ms

        activeCellsRef.current.forEach((cell, key) => {
          const elapsed = now - cell.time;
          if (elapsed > fadeDuration) {
            activeCellsRef.current.delete(key);
          } else {
            const alpha = 1 - elapsed / fadeDuration;
            const cellX = cell.col * width;
            const cellY = cell.row * height;

            // Subtle cell highlight without any dots
            ctx.fillStyle = `rgba(0, 79, 255, ${0.2 * alpha})`;
            ctx.fillRect(cellX + 1, cellY + 1, width - 2, height - 2);
          }
        });

        if (activeCellsRef.current.size > 0) {
          animationFrameId = requestAnimationFrame(render);
        } else {
          isAnimatingRef.current = false;
          drawStaticGrid();
        }
      };

      animationFrameId = requestAnimationFrame(render);
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const col = Math.floor(x / width);
      const row = Math.floor(y / height);
      const key = `${col},${row}`;

      activeCellsRef.current.set(key, { col, row, time: Date.now() });
      startAnimationLoop();
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [width, height, hoverColor]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
    />
  );
}
