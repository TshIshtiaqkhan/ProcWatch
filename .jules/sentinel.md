## 2026-03-30 - Setting Input Validation & Rate/Interval Boundary Checks
**Vulnerability:** Unvalidated setting values in `updateSettings` allowed setting negative or zero polling intervals, creating an infinite synchronous loop in `setTimeout` that leads to Denial of Service (CPU freeze).
**Learning:** In Electron desktop apps, IPC setting updates must validate numerical boundaries before updating runtime timers.
**Prevention:** Always validate setting value boundaries with `isValidSettingValue` before applying configuration changes.
