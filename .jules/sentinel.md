## 2026-03-30 - Setting Value Bounds Validation to Prevent CPU DoS
**Vulnerability:** Unvalidated setting values (e.g. `polling_interval_seconds: "0"` or `"-1"`) passed via Electron IPC allowed setting a 0ms recursive polling timer loop, causing 100% CPU utilization and application hang (Denial of Service).
**Learning:** Checking setting keys against `DEFAULT_SETTINGS` is insufficient if setting values are unvalidated before being stored in SQLite and updated in runtime settings.
**Prevention:** Implement strict type and bounds validation (`isValidSettingValue`) for all setting payloads in IPC controllers before updating runtime caches or persisting to DB.
