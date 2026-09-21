/**
 * Unit tests for main process navigation security handlers and helpers.
 */

const { isAllowedNavigationUrl } = require("../src/utils/security");

describe("Electron Main Navigation Security Helper (isAllowedNavigationUrl)", () => {
  it("allows file:// protocol navigation", () => {
    expect(isAllowedNavigationUrl("file:///app/dist/index.html")).toBe(true);
  });

  it("allows exact dev server origin in development mode", () => {
    expect(isAllowedNavigationUrl("http://localhost:5173/dashboard", true, "http://localhost:5173")).toBe(true);
  });

  it("blocks domain prefix bypass attempts on dev server URL", () => {
    expect(isAllowedNavigationUrl("http://localhost:5173.evil.com", true, "http://localhost:5173")).toBe(false);
    expect(isAllowedNavigationUrl("http://localhost:5173.attacker.org/path", true, "http://localhost:5173")).toBe(false);
  });

  it("prevents dev server URL when not in development mode", () => {
    expect(isAllowedNavigationUrl("http://localhost:5173", false, "http://localhost:5173")).toBe(false);
  });

  it("prevents navigation to external web URLs", () => {
    expect(isAllowedNavigationUrl("https://malicious-site.com")).toBe(false);
    expect(isAllowedNavigationUrl("http://example.com")).toBe(false);
  });

  it("handles malformed URLs safely without throwing", () => {
    expect(isAllowedNavigationUrl("not-a-valid-url")).toBe(false);
    expect(isAllowedNavigationUrl(null)).toBe(false);
    expect(isAllowedNavigationUrl(undefined)).toBe(false);
  });
});
