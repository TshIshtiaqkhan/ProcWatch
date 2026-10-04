import "@testing-library/jest-dom";

// Global mock for Electron IPC API exposed via preload
export function createMockElectronAPI(overrides = {}) {
  return {
    getToday: vi.fn().mockResolvedValue({
      success: true,
      data: {
        apps: [
          { app_name: "Code", seconds: 3600 },
          { app_name: "Google-chrome", seconds: 1800 },
        ],
        idleSeconds: 120,
        yesterdayActiveSeconds: 5000,
        yesterdayIdleSeconds: 300,
      },
    }),
    getProductivityScore: vi.fn().mockResolvedValue({
      success: true,
      data: {
        today: {
          date: "2026-10-04",
          score: 82,
          productiveSeconds: 7200,
          distractingSeconds: 1600,
          neutralSeconds: 800,
          totalSeconds: 9600,
        },
        yesterday: {
          date: "2026-10-03",
          score: 75,
          productiveSeconds: 6000,
          distractingSeconds: 2000,
          neutralSeconds: 500,
          totalSeconds: 8500,
        },
        scoreDiff: 7,
        goal: 70,
        currentStreak: 4,
        bestStreak: 7,
        goalMetToday: true,
      },
    }),
    getPauseSummary: vi.fn().mockResolvedValue({
      success: true,
      data: {
        totalSeconds: 5400,
        appCount: 2,
        pausedAt: "1:00 PM",
        dateFormatted: "Oct 4",
        apps: [],
      },
    }),
    getRange: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getAppDetail: vi.fn().mockResolvedValue({ success: true, data: { daily: [], titles: [] } }),
    pauseTracking: vi.fn().mockResolvedValue({ success: true, data: { isPaused: true } }),
    resumeTracking: vi.fn().mockResolvedValue({ success: true, data: { isPaused: false } }),
    getTrackingStatus: vi.fn().mockResolvedValue({ success: true, data: { isPaused: false } }),
    getSettings: vi.fn().mockResolvedValue({
      success: true,
      data: {
        polling_interval_seconds: "5",
        idle_threshold_seconds: "90",
        launch_on_login: "true",
        start_minimized: "true",
        close_to_tray: "true",
      },
    }),
    updateSettings: vi.fn().mockResolvedValue({ success: true }),
    getLimits: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          appName: "chrome",
          limitMinutes: 60,
          warnAtPercent: 80,
          isEnabled: true,
          todaySeconds: 1800,
          percentUsed: 50,
          isWarned: false,
          isExceeded: false,
        },
      ],
    }),
    upsertLimit: vi.fn().mockResolvedValue({ success: true }),
    deleteLimit: vi.fn().mockResolvedValue({ success: true }),
    toggleLimit: vi.fn().mockResolvedValue({ success: true }),
    onLimitsUpdated: vi.fn().mockReturnValue(() => {}),
    onLimitExceeded: vi.fn().mockReturnValue(() => {}),
    onLimitWarning: vi.fn().mockReturnValue(() => {}),
    startFocus: vi.fn().mockResolvedValue({ success: true, data: { sessionId: 1, endsAt: new Date().toISOString() } }),
    stopFocus: vi.fn().mockResolvedValue({ success: true, data: { completed: false, distractions: 0, durationSeconds: 0 } }),
    getFocusStatus: vi.fn().mockResolvedValue({
      success: true,
      data: { state: "idle", remainingSeconds: 0, distractions: 0, startedAt: null, durationMinutes: 25, sessionId: null },
    }),
    getFocusHistory: vi.fn().mockResolvedValue({ success: true, data: [] }),
    onFocusDistraction: vi.fn().mockReturnValue(() => {}),
    onFocusCompleted: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  };
}

beforeEach(() => {
  window.electronAPI = createMockElectronAPI();
});
