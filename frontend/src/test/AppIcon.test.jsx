import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { AppIcon } from "../components/ui/AppIcon";

describe("AppIcon Component", () => {
  it("renders brand SVG for recognized apps (chrome, slack, vscode)", () => {
    const { container: chromeContainer } = render(<AppIcon name="google-chrome" size={24} />);
    expect(chromeContainer.querySelector("svg")).toBeInTheDocument();

    const { container: slackContainer } = render(<AppIcon name="Slack" size={20} />);
    expect(slackContainer.querySelector("svg")).toBeInTheDocument();

    const { container: vsCodeContainer } = render(<AppIcon name="code" size={18} />);
    expect(vsCodeContainer.querySelector("svg")).toBeInTheDocument();
  });

  it("renders terminal icon for terminal emulators", () => {
    const { container } = render(<AppIcon name="gnome-terminal" size={18} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders fallback initial letter when app is unrecognized", () => {
    const { getByText } = render(<AppIcon name="CustomTool" size={20} />);
    expect(getByText("C")).toBeInTheDocument();
  });

  it("handles empty or null app name gracefully with '?'", () => {
    const { getByText } = render(<AppIcon name="" size={20} />);
    expect(getByText("?")).toBeInTheDocument();
  });
});
