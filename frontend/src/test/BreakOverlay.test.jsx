import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BreakOverlay } from "../components/focus/BreakOverlay";

describe("BreakOverlay component", () => {
  const defaultProps = {
    isOpen: true,
    remainingSeconds: 300,
    totalSeconds: 300,
    onSkip: vi.fn(),
    onExtend: vi.fn(),
    onComplete: vi.fn(),
  };

  it("renders overlay when isOpen is true", () => {
    render(<BreakOverlay {...defaultProps} />);
    expect(screen.getByText(/Break Time/i)).toBeInTheDocument();
    expect(screen.getByText("05:00")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(<BreakOverlay {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("triggers onSkip when Skip Break is clicked", () => {
    render(<BreakOverlay {...defaultProps} />);
    const skipBtn = screen.getByRole("button", { name: /skip break/i });
    fireEvent.click(skipBtn);
    expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
  });

  it("triggers onExtend when Extend Break is clicked", () => {
    render(<BreakOverlay {...defaultProps} />);
    const extendBtn = screen.getByRole("button", { name: /\+5 min/i });
    fireEvent.click(extendBtn);
    expect(defaultProps.onExtend).toHaveBeenCalledTimes(1);
  });

  it("displays wellness and ergonomic tips", () => {
    render(<BreakOverlay {...defaultProps} />);
    expect(screen.getByText(/wellness tip/i)).toBeInTheDocument();
  });
});
