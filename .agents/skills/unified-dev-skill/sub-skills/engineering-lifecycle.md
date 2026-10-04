# Engineering Lifecycle Sub-skill

> Source: `agent-skills` by Addy Osmani — 25 production-grade engineering skills.
> Covers the full development lifecycle from idea to production.

---

## Philosophy

**Spec before code. Tests are proof. Small atomic tasks. Review before merge. Ship fast.**

```
  DEFINE     →    PLAN    →    BUILD    →    VERIFY    →    REVIEW    →    SHIP
  /spec           /plan        /build        /test          /review        /ship
```

Every phase has a quality gate. No phase is skipped. Agents run phases autonomously
after a single approval when using `/build auto`.

---

## Commands & Activation

| Command | Skill Activated | Core Principle |
|---|---|---|
| `/spec` | `spec-driven-development` | Spec before code |
| `/plan` | `planning-and-task-breakdown` | Small, atomic tasks |
| `/build` | `incremental-implementation` | One slice at a time |
| `/build auto` | All build skills | Autonomous full pass after plan approval |
| `/test` | `test-driven-development` | Tests are proof |
| `/constraints` | `constraint-driven-development` | Decide once, enforce everywhere |
| `/review` | `code-review-and-quality` | Five-axis review |
| `/webperf` | `performance-optimization` | Measure before optimizing |
| `/code-simplify` | `code-simplification` | Clarity over cleverness |
| `/ship` | `shipping-and-launch` | Faster is safer |

Skills also **auto-activate** based on context:
- Designing an API → `api-and-interface-design`
- Building UI → `frontend-ui-engineering`
- Writing tests → `test-driven-development`
- Debugging → `debugging-and-error-recovery`
- Git operations → `git-workflow-and-versioning`
- CI/CD changes → `ci-cd-and-automation`
- Adding observability → `observability-and-instrumentation`
- Security review → `security-and-hardening`
- Migration/deprecation → `deprecation-and-migration`
- Writing docs/ADRs → `documentation-and-adrs`

---

## `/spec` — Spec-Driven Development

**Before writing any code**, create a spec. Always.

### Capability Map (Required for multi-module work)

```markdown
# Capability Map: [Initiative Name]

| Module id       | Responsibility              | Depends on  |
|-----------------|-----------------------------|-------------|
| identity        | Accounts, sessions, SSO     | —           |
| billing         | Plans, invoices, payments   | identity    |
| notifications   | Email and webhook fan-out   | identity    |
| reporting       | Usage dashboards            | billing, notifications |

Build order: identity → billing, notifications → reporting
```

**Rules:**
- Stable module ids: kebab-case, chosen once, never renamed mid-initiative
- Dependency arrows point one way — no cycles
- Each module has a single clear responsibility
- A module that needs another is downstream; if two need each other, they're one module
- Each module spec answers: What does it do? What are its inputs/outputs? What are its boundaries?

### Spec Quality Gates
- [ ] One responsible module per concern
- [ ] Each module's boundary is clear enough that it could be built by a different team
- [ ] Dependencies flow in one direction
- [ ] Could one module be replaced without rewriting the others?
- [ ] Does this spec answer: what, why, and what NOT to build?

---

## `/plan` — Planning & Task Breakdown

Break specs into atomic, testable, committable tasks.

### Task Format
```markdown
## Task [M-N]: [Verb] [Object]
**Module:** identity
**Depends on:** none
**Estimated size:** S / M / L
**Test:** [what proves this task is done]

### Steps
1. ...
2. ...

### Done when
- [ ] Unit tests pass
- [ ] No new lint errors
- [ ] Reviewed by /review
```

**Rules:**
- Each task is independently committable
- Each task has a clear, testable "Done when"
- Tasks within the same module are ordered by dependency
- Cross-module tasks reference their upstream by module id
- L tasks get broken down further — nothing is "just L"

---

## `/build` — Incremental Implementation

Build one task at a time. Never implement multiple tasks in one commit.

**The build loop:**
1. Read the task spec completely
2. Write the test first (red)
3. Write the minimum implementation to pass (green)
4. Refactor (keep tests green)
5. Commit: `git commit -m "feat(module): [task description]"`
6. Run `/review` before moving to next task

**Auto mode (`/build auto`):**
- Agent generates full plan and executes every task in one approved pass
- Human approves the plan ONCE, then the agent runs
- Agent pauses on: test failure, ambiguous requirement, risky step
- Every task is still individually committed and test-verified

---

## `/test` — Test-Driven Development

**Tests are the only proof that code works.** "It should work" is not a test.

### TDD Cycle
```
RED   → Write a failing test for the behavior you want
GREEN → Write the minimum code to make it pass
REFACTOR → Clean up while keeping tests green
```

### Test Hierarchy
1. **Unit tests** — Test one function/module in isolation
2. **Integration tests** — Test interactions between modules
3. **E2E tests** — Test the full user-facing flow
4. **Contract tests** — Test API boundaries between services

### Quality Gates
- [ ] Every public function has at least one test
- [ ] Edge cases are tested (null, empty, boundaries)
- [ ] Error paths are tested (not just happy path)
- [ ] Tests are independent (no shared state between tests)
- [ ] Test names describe behavior: `it('returns null when user is not found')`
- [ ] Mocks are minimal — test real integrations where possible

---

## `/review` — Code Review & Quality

Five-axis review. Apply to every change before merge.

### Axis 1: Correctness
- Does it match the spec?
- Are edge cases handled (null, empty, boundary values)?
- Are error paths handled?
- Off-by-one errors? Race conditions? State inconsistencies?

### Axis 2: Readability & Simplicity
- Descriptive names? No `temp`, `data`, `result` without context
- Straightforward control flow? No nested ternaries, deep callbacks
- Could this be done in fewer lines?
- Are abstractions earning their complexity? (Don't generalize until 3rd use case)
- Dead code? No-op variables? Backwards-compat shims?
- New conditional bolted onto unrelated flow = design smell

### Axis 3: Architecture
- Follows existing patterns or justifies a new one?
- Clean module boundaries? No circular dependencies?
- Code duplication that should be shared?
- Does this refactor reduce complexity or just relocate it?

### Axis 4: Security
- Input validation? Sanitization?
- Secrets in code or logs?
- Auth checks on every protected route?
- SQL injection? XSS? SSRF possible?
- Dependency vulnerabilities introduced?
- See `cybersecurity` sub-skill for full security review

### Axis 5: Performance
- N+1 queries?
- Missing indexes?
- Unbounded loops on large datasets?
- Synchronous operations blocking event loop?
- See `performance` sub-skill for full perf review

### Approval Standard
> Approve when the change **definitely improves overall code health**, even if imperfect.
> Don't block because it's not how YOU would have written it.
> Block for: correctness bugs, security issues, architecture violations, unreadable code.

---

## `/ship` — Shipping & Launch

Pre-flight checklist before production.

### Pre-flight Checklist
- [ ] All tests passing (unit, integration, E2E)
- [ ] `/review` completed, no open blockers
- [ ] Security hardening verified (see cybersecurity sub-skill)
- [ ] Performance benchmarked (see performance sub-skill)
- [ ] Feature flags in place for risky changes
- [ ] Rollback plan documented
- [ ] Monitoring/alerts configured for new code paths
- [ ] Documentation updated (API docs, ADRs, README)
- [ ] Dependencies audited for vulnerabilities
- [ ] Environment variables / secrets rotated as needed
- [ ] Load tested if traffic-sensitive

**Principle:** Faster is safer. Small, frequent deploys are safer than big-bang releases.
Ship the smallest unit that delivers value. Use feature flags to decouple deploy from release.

---

## Auto-Activated Skills Reference

| Trigger | Skill | What It Does |
|---|---|---|
| API design | `api-and-interface-design` | REST/GraphQL design patterns, versioning, backward compat |
| Frontend | `frontend-ui-engineering` | Component architecture, state management, accessibility |
| Debugging | `debugging-and-error-recovery` | Systematic root-cause analysis, error taxonomy |
| Git | `git-workflow-and-versioning` | Branching strategy, commit hygiene, PR hygiene |
| CI/CD | `ci-cd-and-automation` | Pipeline design, deployment strategies, rollbacks |
| Observability | `observability-and-instrumentation` | Logging, metrics, tracing, alerting |
| Security | `security-and-hardening` | OWASP, secrets, auth, dependency scanning |
| Context | `context-engineering` | Managing LLM context windows efficiently |
| Doubt | `doubt-driven-development` | Surface and resolve assumptions before building |
| Source | `source-driven-development` | Build from existing code patterns, not from scratch |
| Interview | `interview-me` | Requirements interrogation, one question at a time |
| Idea | `idea-refine` | Sharpen vague ideas into buildable specs |
| Deprecation | `deprecation-and-migration` | Safe migration paths, backward compat |
| Docs/ADRs | `documentation-and-adrs` | Architecture Decision Records, living docs |
