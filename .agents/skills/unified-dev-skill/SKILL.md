---
name: unified-dev-skill
description: >
  Production-grade unified development skill hub. Routes to 6 specialized domains:
  (1) Engineering Lifecycle — spec, plan, build, test, review, ship with quality gates;
  (2) Code Quality & Simplicity — lazy-senior-dev YAGNI-first refactoring, ponytail mode;
  (3) Cybersecurity — 817 security skills covering pentesting, DFIR, cloud security, AppSec;
  (4) UI/Animation Design — Emil Kowalski design-engineering philosophy, animations, Apple HIG;
  (5) Logo & Brand Generation — SVG logos + professional showcase images;
  (6) Performance Engineering — web performance audits, optimization checklists.
  Use when: building software end-to-end, reviewing code, fixing security issues, designing UI,
  generating brand assets, or optimizing performance.
  Keywords: spec, plan, build, test, review, ship, security, pentest, animation, logo, performance,
  refactor, YAGNI, design, cybersecurity, SVG, web vitals.
  Do not use for: non-technical tasks, content writing unrelated to software.
---

# Unified Dev Skill — Production Hub

> **Hub-and-spoke architecture.** This master skill loads first, identifies the active domain
> from the user's request, and delegates to the appropriate sub-skill. Sub-skills are
> self-contained and can also be loaded directly.

---

## 🧭 Domain Router

Read the user's request and route to the correct sub-skill:

| If the request is about… | Load sub-skill |
|---|---|
| Spec, PRD, requirements, plan, build, test, debug, review, ship, CI/CD, git | [`engineering-lifecycle`](sub-skills/engineering-lifecycle.md) |
| Refactor, simplify, code quality, YAGNI, over-engineering, cleanup, lazy | [`code-quality`](sub-skills/code-quality.md) |
| Security, pentest, CVE, malware, forensics, SIEM, vulnerability, exploit | [`cybersecurity`](sub-skills/cybersecurity.md) |
| UI, animation, design, CSS, motion, React, component, Apple HIG, Framer | [`ui-design`](sub-skills/ui-design.md) |
| Logo, brand, SVG, icon, showcase, visual identity | [`logo-brand`](sub-skills/logo-brand.md) |
| Performance, web vitals, LCP, FCP, bundle size, lighthouse, optimization | [`performance`](sub-skills/performance.md) |

When a request spans multiple domains (e.g. "build a secure, fast, well-animated feature"),
load ALL relevant sub-skills and synthesize their guidance. Always be explicit about which
domain(s) are active.

---

## 📐 Universal Principles (Apply in ALL Domains)

These rules are non-negotiable across every sub-skill:

### 1. Understand Before Acting
Read the existing code / context fully before suggesting changes. Never make changes blindly.

### 2. Spec Before Code
Every non-trivial task needs a clear spec or requirement statement before implementation begins.
If it doesn't exist, surface the capability-map format from the engineering-lifecycle sub-skill.

### 3. Root Cause Over Symptom
Bugs and security issues: find the source, don't patch call-sites one by one.

### 4. Smallest Correct Change
Prefer the diff that fixes the problem in fewest lines — but only once the problem is fully understood.
The smallest change in the wrong place isn't minimal, it's a second bug.

### 5. Verify Everything
Tests are proof. Security scans are proof. Performance benchmarks are proof.
"It should work" is not proof.

### 6. No Unrequested Scope Creep
Build what was asked. Flag what else you noticed. Never silently expand scope.

---

## 🗂️ Sub-skill Index

| Sub-skill | Source Skills | Key Commands |
|---|---|---|
| `engineering-lifecycle` | agent-skills (25 skills) | `/spec` `/plan` `/build` `/test` `/review` `/ship` |
| `code-quality` | ponytail, code-review-and-quality | `/ponytail` `/ponytail-review` `/ponytail-audit` |
| `cybersecurity` | Anthropic-Cybersecurity-Skills (817) | Domain auto-detected from request |
| `ui-design` | skills/emil-design-eng, animate, apple-design | `/animate` `/review-animations` `/prototype` |
| `logo-brand` | logo-generator-skill | Conversational workflow |
| `performance` | skills/performance-cheatsheet | `/webperf` |

---

## ⚡ Quick-Start Commands

```
/spec       → Define what to build (requirements + capability map)
/plan       → Break into atomic tasks with dependencies
/build      → Implement one slice at a time, test-first
/test       → Write and verify tests (TDD: red → green → refactor)
/review     → Five-axis review: correctness, readability, arch, security, perf
/ship       → Pre-flight checklist before production deploy
/ponytail   → Activate lazy-senior-dev YAGNI mode
/animate    → Build an animation from scratch (Emil Kowalski rules)
/webperf    → Web performance audit (Core Web Vitals focused)
```

---

## 🔄 Multi-Domain Workflow Example

**Scenario:** "Build a secure user authentication feature with a polished login UI"

1. **Load:** `engineering-lifecycle` + `cybersecurity` + `ui-design`
2. `/spec` → Define auth requirements, threat model, UI flows
3. `/plan` → Break into: identity module → session module → UI components
4. **Cybersecurity gate:** Check OWASP auth controls, session fixation, timing attacks
5. `/build` → Implement incrementally, one module at a time
6. **UI gate:** Apply Emil Kowalski animation rules to login form transitions
7. `/test` → Unit + integration + security tests
8. `/review` → Five-axis review with security sub-axis from cybersecurity sub-skill
9. `/ship` → Pre-flight checklist

---

## 📁 File Structure

```
.antigravity/skills/unified-dev-skill/
├── SKILL.md                    ← You are here (master router)
├── sub-skills/
│   ├── engineering-lifecycle.md
│   ├── code-quality.md
│   ├── cybersecurity.md
│   ├── ui-design.md
│   ├── logo-brand.md
│   └── performance.md
├── references/
│   ├── voice-rules.md          ← Communication style
│   ├── security-checklist.md   ← Quick security gates
│   └── quality-gates.md        ← Universal quality checklist
└── scripts/
    └── validate-skill.sh       ← Validate the skill structure
```

---

## 🔧 Activation

This skill is always active in this workspace. To explicitly invoke a domain:

```
"activate engineering-lifecycle" or just describe your task naturally
"activate cybersecurity" or ask a security question
"activate ui-design" or ask about UI/animations
"activate ponytail" or say "YAGNI mode" / "lazy mode"
```
