import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductivityScoreCard } from "../components/dashboard/ProductivityScoreCard";

describe("ProductivityScoreCard component", () => {
  const sampleProps = {
    score: 82,
    scoreDiff: 7,
    productiveSeconds: 7200,
    distractingSeconds: 1600,
    neutralSeconds: 800,
    totalSeconds: 9600,
    goal: 70,
    currentStreak: 4,
    bestStreak: 7,
    goalMetToday: true,
    loading: false,
  };

  it("renders score, streak badge, and goal status accurately", () => {
    render(<ProductivityScoreCard {...sampleProps} />);

    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getByText("Productivity Score")).toBeInTheDocument();
    expect(screen.getByText(/4-day streak/i)).toBeInTheDocument();
    expect(screen.getByText(/Goal: 70%/i)).toBeInTheDocument();
    expect(screen.getByText(/Goal reached today/i)).toBeInTheDocument();
    expect(screen.getByText(/▲ \+7% vs yesterday/i)).toBeInTheDocument();
  });

  it("displays time breakdowns correctly", () => {
    render(<ProductivityScoreCard {...sampleProps} />);

    expect(screen.getByText(/^Productive:$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Distracting:$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Neutral:$/i)).toBeInTheDocument();
  });

  it("renders skeleton or loading indicator when loading is true", () => {
    render(<ProductivityScoreCard {...sampleProps} loading={true} />);
    expect(screen.getByTestId("productivity-card-loading")).toBeInTheDocument();
  });
});
