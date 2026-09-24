## 2025-05-14 - Controller Error Sanitization in IPC Handlers
**Vulnerability:** Controller catch blocks were stringifying errors with `String(err)`, which could expose full stack traces and internal path/database execution details to IPC callers.
**Learning:** `String(err)` on Error objects evaluates to `err.stack` or includes the stack trace string in certain runtime environments.
**Prevention:** Always log full error objects with `logger.error` server-side and return `err.message || 'An internal error occurred'` or standardized error objects across IPC response channels.
