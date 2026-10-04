# Universal Quality Gates

> This checklist applies to ALL code changes, regardless of domain.
> Every phase gate must be checked before proceeding to the next phase.

---

## Phase Gate: Spec → Plan

- [ ] Capability map created (module table + build order)
- [ ] All modules have stable kebab-case ids
- [ ] Dependency direction is acyclic (no circular deps)
- [ ] Each module has a single clear responsibility
- [ ] Threat model defined (for security-sensitive work)
- [ ] Performance budget defined (for user-facing work)
- [ ] Non-functional requirements listed (latency, availability, scale)

## Phase Gate: Plan → Build

- [ ] Tasks are atomic and independently committable
- [ ] Each task has a testable "Done when" criterion
- [ ] L-sized tasks have been broken down further
- [ ] Security tasks are first-class tasks (not afterthoughts)
- [ ] Dependency order verified — no blocked tasks in first sprint

## Phase Gate: Build → Review (per task)

- [ ] Test written FIRST (TDD: red → green → refactor)
- [ ] YAGNI ladder applied — no speculative code written
- [ ] All inputs validated and sanitized
- [ ] No secrets hardcoded
- [ ] Auth/authz check on every protected operation
- [ ] Errors caught and logged without leaking sensitive data
- [ ] New dependency? → ran `npm audit` / `pip-audit` / `grype`
- [ ] Single commit per task, descriptive commit message

## Phase Gate: Review → Ship

- [ ] Five-axis review completed (correctness, readability, arch, security, perf)
- [ ] All review blockers resolved
- [ ] No new lint errors or type errors
- [ ] All tests passing (unit + integration + E2E)
- [ ] Performance budget met (Lighthouse, bundle size)
- [ ] Security scan passing (no critical/high CVEs)

## Phase Gate: Ship → Live

- [ ] Feature flags in place for risky changes
- [ ] Rollback plan documented
- [ ] Monitoring/alerts configured for new code paths
- [ ] Documentation updated (API docs, ADRs, README)
- [ ] Secrets rotation complete if needed
- [ ] Load tested if traffic-sensitive
- [ ] All stakeholders notified of breaking changes

---

## Red Flags (Stop Everything)

These issues must be resolved before ANY further work:

🔴 **Correctness** — Code does not match the spec
🔴 **Security** — Critical/high severity vulnerability found
🔴 **Tests failing** — Build is broken
🔴 **Secrets in code** — Hardcoded credentials, API keys, tokens
🔴 **Circular dependency** — Architecture violation
🔴 **Undefined behavior** — Race condition, null dereference, integer overflow
🔴 **Missing auth check** — Protected resource is accessible without authentication

---

## Yellow Flags (Document and Track)

These issues must be documented even if not immediately fixed:

🟡 **Performance degradation** — Measurable regression vs baseline
🟡 **Code complexity spike** — Cyclomatic complexity > 10 in a single function
🟡 **Test coverage drop** — Below defined threshold
🟡 **Technical debt** — Mark with `ponytail:` comment, add to debt inventory
🟡 **Missing observability** — No logs/metrics on new code paths (fix in next PR)
🟡 **Accessibility gap** — Missing ARIA, keyboard navigation not working

---

## The Approval Standard

> Approve a change when it **definitely improves overall code health**, even if imperfect.
> Perfect code doesn't exist — the goal is continuous improvement.
> Don't block because it's not exactly how YOU would have written it.
> If it improves the codebase, follows conventions, and passes all gates → **approve**.
