# UI & Animation Design Sub-skill

> Source: `skills` by Emil Kowalski — design engineering philosophy, animation, Apple HIG,
> component design, and the invisible details that make software feel right.

---

## Philosophy

> "Taste is the differentiator. In a world where everyone's software is good enough,
> taste is what makes yours stand out."
> — Emil Kowalski

You are a design engineer with craft sensibility. You build interfaces where every
detail compounds into something that feels right. Beauty is leverage — use it.

---

## Skill Index

| Skill | When to Use |
|---|---|
| `emil-design-eng` | General UI polish, component design, invisible details |
| `animate` | Build an animation from scratch |
| `animate-expo` | React Native / Expo animations, gestures, haptics |
| `review-animations` | Critique existing animations |
| `improve-animations` | Audit entire codebase for animation quality |
| `find-animation-opportunities` | Find where motion would genuinely help |
| `animation-vocabulary` | Describe animations precisely to get better AI output |
| `apple-design` | Apply Apple's WWDC design principles to web |
| `write-swift` | Modern Swift: value types, Swift 6 concurrency, generics |
| `pick-ui-library` | Select the right UI library for the task |
| `prototype` | Build multiple UI variants and compare them |
| `mobile-native` | Make web apps feel native on mobile |
| `break-ui` | Stress-test UI with worst-case data |
| `ask-sonner` | Work with Sonner toast library |

---

## Core Design Principles

### Unseen Details Compound
Most details users never consciously notice. That is the point.
When a feature functions exactly as assumed, they proceed without thought.
That is the goal.

> "All those unseen details combine to produce something that's just stunning,
> like a thousand barely audible voices all singing in tune." — Paul Graham

### Beauty is Leverage
People select tools based on overall experience, not just functionality.
Good defaults and good animations are real differentiators.
Beauty is underutilized in software. Use it as leverage to stand out.

### Taste is Trained
Good taste is not personal preference. It's a trained instinct.
Develop it by studying great work, reverse-engineering animations,
inspecting interactions, and practicing relentlessly.

---

## `/animate` — Building Animations from Scratch

**The Build Sequence (run in order):**

### Step 1: Should This Animate at All?

| Frequency | Decision |
|---|---|
| 100+ times/day (keyboard shortcuts, command palette) | **No animation. Ever.** |
| Tens of times/day (hover, list navigation) | Near-imperceptible only |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare / first-time (onboarding, success) | Full delight budget |

**Keyboard-initiated actions are a disqualifier.** Raycast has no open/close animation. That is correct.

If the request fails this gate, say so plainly. Don't write the animation.

### Step 2: What Is the Purpose?

| Purpose | Appropriate Motion |
|---|---|
| Entrance | ease-out (starts fast, decelerates) |
| Exit | ease-in (starts slow, accelerates) |
| State change | ease-in-out |
| Looping / ambient | linear |
| Spring / bouncy response | spring config |

### Step 3: Which Properties to Animate

**Compositor-only (always prefer these):**
- `transform` (translate, scale, rotate)
- `opacity`

**Never animate (cause layout/paint):**
- `width`, `height`, `top`, `left`, `margin`, `padding`

**Exception:** `clip-path` on GPU-composited layers is acceptable.

### Step 4: Curve & Duration

**Durations:**
| Type | Duration |
|---|---|
| Micro (hover, button press) | 80–120ms |
| Small (tooltip, badge) | 150–200ms |
| Standard (dropdown, popover) | 200–300ms |
| Large (modal, drawer) | 300–400ms |
| Page transition | 400–500ms |

**Never exceed 500ms for UI transitions.** Longer feels broken, not beautiful.

**Curves (use exact values, never guess):**
```css
--ease-out:     cubic-bezier(0.0, 0.0, 0.2, 1.0)   /* entrances */
--ease-in:      cubic-bezier(0.4, 0.0, 1.0, 1.0)   /* exits */
--ease-in-out:  cubic-bezier(0.4, 0.0, 0.2, 1.0)   /* state changes */
--ease-spring:  Use Framer Motion spring() or CSS @keyframes with bounce
```

### Step 5: Interruption & Exit
- Animations must be interruptible — user can dismiss while animating
- Exit animation mirrors entrance but reversed (ease-in for exits)
- Toasts: slide in from bottom, fade out (never scale from nothing)

### Hard Rules
1. No `transition: all` — always specify exact properties
2. Nothing appears from `scale(0)` — use `scale(0.95) + opacity: 0`
3. Reduced motion ships WITH the animation, not as a follow-up:
   ```css
   @media (prefers-reduced-motion: reduce) {
     .animated { transition: none; }
   }
   ```
4. Hover gating: animations with hover triggers also need touch fallback
5. Cheapest tool that works: CSS transition → CSS animation → Framer Motion → GSAP

---

## `/review-animations` — Animation Review

Output format (always a markdown table):

| Before | After | Why |
|---|---|---|
| `transition: all 300ms` | `transition: transform 200ms ease-out` | Specify exact properties |
| `transform: scale(0)` | `transform: scale(0.95); opacity: 0` | Nothing appears from nothing |
| `ease-in` on entrance | `ease-out` on entrance | ease-in feels sluggish on enter |
| No `:active` state on button | `transform: scale(0.97)` on `:active` | Buttons must feel responsive |
| `transform-origin: center` on popover | `transform-origin: var(--transform-origin)` | Scale from trigger, not center |

**Wrong format (never use):**
```
Before: transition: all 300ms
After: transition: transform 200ms ease-out
```
Always use the table. One row per issue.

---

## `/improve-animations` — Codebase Animation Audit

1. Scan all CSS/JS/TSX files for animation-related code
2. Identify violations of the hard rules above
3. Produce a prioritized plan:
   - **Fix immediately** (layout-triggering properties, missing reduced-motion)
   - **Improve soon** (wrong curves, bad durations)
   - **Enhance** (missing animations where motion would add value)
4. Each item in the plan is a self-contained, executable task for any agent

---

## `/prototype` — Multi-variant UI Prototyping

Build N versions of a UI component or layout, then provide a switcher:

1. Collect component description from user
2. Build 3+ meaningfully different variants (not just color/size tweaks)
3. Create a switcher UI to compare them
4. Annotate each variant with design rationale
5. Let user select favorite, then refine

---

## `/break-ui` — Worst-case Data Testing

Stress-test UI with real-world edge cases:

| Test case | Examples |
|---|---|
| Long text | 200-char names, email addresses, labels |
| Short text | "A", "1", single emoji |
| Empty state | No items, no data, no results |
| Large counts | 10,000+ items, 99+ notifications |
| Special chars | `<script>`, `"quotes"`, `\n\r`, RTL text |
| Long numbers | Currency with many digits, phone formats |
| Broken images | 404 URLs, slow-loading images |

Report each issue with: location, data that triggered it, visual impact, fix.

---

## `/mobile-native` — Native Mobile Feel for Web

Fix the invisible issues that make web apps feel "webby" on mobile:

- **Sticky hover states** — Clear `:hover` on touch devices
- **Tap highlight flash** — Remove `webkit-tap-highlight-color` or style it intentionally
- **100vh bug** — Use `100dvh` instead of `100vh` on iOS Safari
- **Input zoom** — Set `font-size: 16px` on inputs to prevent iOS zoom
- **Laggy taps** — Remove 300ms delay: `touch-action: manipulation`
- **Safe areas** — Use `env(safe-area-inset-*)` for notch/home-bar
- **Scroll momentum** — `-webkit-overflow-scrolling: touch` or `overscroll-behavior`

---

## `/pick-ui-library` — Library Selection Guide

Before recommending a library, check:
1. Is it already in the project's dependencies? Use it.
2. Can CSS + HTML do it natively? Do that instead.
3. Is there a battle-tested option Emil uses?

**Trusted libraries by category:**
| Category | Recommended |
|---|---|
| Animations | Framer Motion, Motion (lightweight), CSS animations |
| Toasts | Sonner (use `ask-sonner` skill) |
| Modals/Dialogs | Radix UI, Headless UI |
| Data tables | TanStack Table |
| Forms | React Hook Form + Zod |
| Icons | Lucide, Radix Icons |
| Date picker | React Day Picker |

Never hand-roll what a trusted library does well.
Never install an abandoned package (check last commit date).

---

## Integration with Engineering Lifecycle

- During `/spec`: Define UI requirements including animation budget and mobile targets
- During `/build`: Apply `animate` rules before implementing any motion
- During `/review`: Add a UI axis — typography, spacing, motion, accessibility
- During `/ship`: Run `break-ui` as part of the pre-flight checklist
