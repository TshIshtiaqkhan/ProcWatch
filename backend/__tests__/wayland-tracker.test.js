/**
 * Unit tests for the Wayland active window tracker.
 *
 * Tests cover the pure parsing and tree-walking logic which can run
 * anywhere without a real Wayland session or D-Bus.
 */

// Mock the logger so tests don't produce noise
jest.mock("../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const {
  parseGnomeWindows,
  findFocusedNode,
  detectCompositor,
  resetWaylandTracker,
} = require("../src/models/wayland.tracker");

// ─── GNOME GVariant Parsing ──────────────────────────────────────────────────

describe("parseGnomeWindows", () => {
  it("extracts focused window from multi-window GNOME Introspect output", () => {
    const gvariant =
      "({uint64 2348810752: {'app-id': <'org.gnome.Terminal'>, " +
      "'client-type': <uint32 1>, 'is-hidden': <false>, 'has-focus': <false>, " +
      "'width': <uint32 652>, 'height': <uint32 478>, " +
      "'title': <'Terminal'>, 'wm-class': <'gnome-terminal-server'>, " +
      "'wm-class-instance': <'gnome-terminal-server'>, 'pid': <uint32 23456>}, " +
      "uint64 2348810753: {'app-id': <'google-chrome'>, " +
      "'client-type': <uint32 0>, 'is-hidden': <false>, 'has-focus': <true>, " +
      "'width': <uint32 1920>, 'height': <uint32 1048>, " +
      "'title': <'GitHub - Google Chrome'>, 'wm-class': <'google-chrome'>, " +
      "'wm-class-instance': <'google-chrome'>, 'pid': <uint32 12345>}},)";

    const result = parseGnomeWindows(gvariant);
    expect(result).not.toBeNull();
    expect(result.title).toBe("GitHub - Google Chrome");
    expect(result.owner.name).toBe("google-chrome");
    expect(result.owner.processId).toBe(12345);
  });

  it("returns null when no window has focus", () => {
    const gvariant =
      "({uint64 1: {'app-id': <'terminal'>, 'has-focus': <false>, " +
      "'title': <'term'>, 'wm-class': <'term'>, 'pid': <uint32 100>}},)";
    expect(parseGnomeWindows(gvariant)).toBeNull();
  });

  it("falls back to app-id last segment when wm-class is empty", () => {
    const gvariant =
      "({uint64 1: {'app-id': <'org.gnome.Nautilus'>, 'has-focus': <true>, " +
      "'title': <'Files'>, 'wm-class': <''>, 'pid': <uint32 999>}},)";
    const result = parseGnomeWindows(gvariant);
    expect(result).not.toBeNull();
    expect(result.title).toBe("Files");
    expect(result.owner.name).toBe("Nautilus");
    expect(result.owner.processId).toBe(999);
  });

  it("uses wm-class when both wm-class and app-id are present", () => {
    const gvariant =
      "({uint64 1: {'app-id': <'org.mozilla.firefox'>, 'has-focus': <true>, " +
      "'title': <'Reddit'>, 'wm-class': <'firefox'>, 'pid': <uint32 555>}},)";
    const result = parseGnomeWindows(gvariant);
    expect(result.owner.name).toBe("firefox");
  });

  it("handles single-window output", () => {
    const gvariant =
      "({uint64 42: {'title': <'Code - OSS'>, 'wm-class': <'code-oss'>, " +
      "'app-id': <'code-oss'>, 'has-focus': <true>, 'pid': <uint32 7890>}},)";
    const result = parseGnomeWindows(gvariant);
    expect(result).not.toBeNull();
    expect(result.title).toBe("Code - OSS");
    expect(result.owner.name).toBe("code-oss");
    expect(result.owner.processId).toBe(7890);
  });

  it("handles window title with special characters", () => {
    const gvariant =
      "({uint64 1: {'title': <'Build #42 — CI/CD Pipeline [PASSED]'>, " +
      "'wm-class': <'chrome'>, 'has-focus': <true>, " +
      "'app-id': <'chrome'>, 'pid': <uint32 300>}},)";
    const result = parseGnomeWindows(gvariant);
    expect(result).not.toBeNull();
    expect(result.title).toBe("Build #42 — CI/CD Pipeline [PASSED]");
  });

  it("handles empty output gracefully", () => {
    expect(parseGnomeWindows("")).toBeNull();
    expect(parseGnomeWindows("({},)")).toBeNull();
  });

  it("handles malformed GVariant gracefully", () => {
    expect(parseGnomeWindows("not-a-gvariant")).toBeNull();
    expect(parseGnomeWindows("({broken stuff")).toBeNull();
  });
});

// ─── Sway Tree Walking ───────────────────────────────────────────────────────

describe("findFocusedNode (Sway tree)", () => {
  it("finds deeply nested focused node", () => {
    const tree = {
      type: "root",
      nodes: [
        {
          type: "output",
          name: "__i3",
          nodes: [
            {
              type: "workspace",
              name: "1",
              nodes: [
                {
                  type: "con",
                  focused: true,
                  pid: 1234,
                  name: "vim ~/code/main.js",
                  app_id: "foot",
                },
              ],
            },
          ],
        },
      ],
    };
    const result = findFocusedNode(tree);
    expect(result).not.toBeNull();
    expect(result.pid).toBe(1234);
    expect(result.app_id).toBe("foot");
    expect(result.name).toBe("vim ~/code/main.js");
  });

  it("finds focused node in floating_nodes", () => {
    const tree = {
      type: "root",
      nodes: [
        {
          type: "workspace",
          nodes: [],
          floating_nodes: [
            {
              type: "floating_con",
              focused: true,
              pid: 5678,
              name: "Calculator",
              app_id: "gnome-calculator",
            },
          ],
        },
      ],
    };
    const result = findFocusedNode(tree);
    expect(result).not.toBeNull();
    expect(result.pid).toBe(5678);
    expect(result.app_id).toBe("gnome-calculator");
  });

  it("returns null for empty tree", () => {
    expect(findFocusedNode(null)).toBeNull();
    expect(findFocusedNode({})).toBeNull();
    expect(findFocusedNode({ type: "root", nodes: [] })).toBeNull();
  });

  it("returns null when no node is focused", () => {
    const tree = {
      type: "root",
      nodes: [
        { type: "con", focused: false, pid: 100, name: "A", app_id: "a" },
        { type: "con", focused: false, pid: 200, name: "B", app_id: "b" },
      ],
    };
    expect(findFocusedNode(tree)).toBeNull();
  });

  it("ignores focused containers without a PID (workspaces, outputs)", () => {
    const tree = {
      type: "root",
      focused: false,
      nodes: [
        {
          type: "workspace",
          focused: true, // workspace itself is focused, but no PID
          nodes: [
            {
              type: "con",
              focused: false,
              pid: 111,
              name: "App",
              app_id: "app",
            },
          ],
        },
      ],
    };
    // workspace has no PID → should not be returned
    expect(findFocusedNode(tree)).toBeNull();
  });

  it("handles XWayland windows with window_properties.class", () => {
    const tree = {
      type: "root",
      nodes: [
        {
          type: "con",
          focused: true,
          pid: 3456,
          name: "Google Chrome",
          window_properties: { class: "Google-chrome", instance: "google-chrome" },
        },
      ],
    };
    const result = findFocusedNode(tree);
    expect(result).not.toBeNull();
    expect(result.window_properties.class).toBe("Google-chrome");
  });

  it("prefers first focused node in depth-first order", () => {
    const tree = {
      type: "root",
      nodes: [
        {
          type: "con",
          focused: true,
          pid: 1,
          name: "First",
          app_id: "first",
        },
        {
          type: "con",
          focused: true,
          pid: 2,
          name: "Second",
          app_id: "second",
        },
      ],
    };
    const result = findFocusedNode(tree);
    expect(result.pid).toBe(1);
  });
});

// ─── Compositor Detection ────────────────────────────────────────────────────

describe("detectCompositor", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetWaylandTracker();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
    resetWaylandTracker();
  });

  it("detects GNOME from XDG_CURRENT_DESKTOP", () => {
    process.env.XDG_CURRENT_DESKTOP = "GNOME";
    process.env.DESKTOP_SESSION = "";
    expect(detectCompositor()).toBe("gnome");
  });

  it("detects GNOME from ubuntu desktop", () => {
    process.env.XDG_CURRENT_DESKTOP = "ubuntu:GNOME";
    process.env.DESKTOP_SESSION = "";
    expect(detectCompositor()).toBe("gnome");
  });

  it("detects KDE Plasma", () => {
    process.env.XDG_CURRENT_DESKTOP = "KDE";
    process.env.DESKTOP_SESSION = "plasma";
    resetWaylandTracker();
    expect(detectCompositor()).toBe("kde");
  });

  it("detects Hyprland from env var", () => {
    process.env.XDG_CURRENT_DESKTOP = "Hyprland";
    process.env.HYPRLAND_INSTANCE_SIGNATURE = "abc123";
    resetWaylandTracker();
    expect(detectCompositor()).toBe("hyprland");
  });

  it("detects Sway from SWAYSOCK", () => {
    process.env.XDG_CURRENT_DESKTOP = "sway";
    process.env.SWAYSOCK = "/run/user/1000/sway-ipc.sock";
    resetWaylandTracker();
    expect(detectCompositor()).toBe("sway");
  });

  it("returns unknown for unrecognized compositor", () => {
    process.env.XDG_CURRENT_DESKTOP = "cosmic";
    process.env.DESKTOP_SESSION = "";
    delete process.env.HYPRLAND_INSTANCE_SIGNATURE;
    delete process.env.SWAYSOCK;
    resetWaylandTracker();
    expect(detectCompositor()).toBe("unknown");
  });

  it("caches the result after first call", () => {
    process.env.XDG_CURRENT_DESKTOP = "GNOME";
    const first = detectCompositor();
    process.env.XDG_CURRENT_DESKTOP = "KDE"; // change env
    const second = detectCompositor(); // should still be cached
    expect(first).toBe("gnome");
    expect(second).toBe("gnome"); // cached value
  });
});

// ─── Hyprland JSON Parsing ───────────────────────────────────────────────────

describe("Hyprland JSON parsing", () => {
  it("parses typical hyprctl activewindow output", () => {
    const json = JSON.stringify({
      address: "0x1234",
      mapped: true,
      hidden: false,
      at: [0, 0],
      size: [1920, 1080],
      workspace: { id: 1, name: "1" },
      floating: false,
      monitor: 0,
      class: "kitty",
      title: "nvim — ~/projects",
      initialClass: "kitty",
      initialTitle: "kitty",
      pid: 4567,
      xwayland: false,
      pinned: false,
      fullscreen: 0,
      grouped: [],
      tags: [],
      focusHistoryID: 0,
    });

    const data = JSON.parse(json);
    expect(data.class).toBe("kitty");
    expect(data.title).toBe("nvim — ~/projects");
    expect(data.pid).toBe(4567);
  });
});
