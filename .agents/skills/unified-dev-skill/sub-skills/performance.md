# Performance Engineering Sub-skill

> Source: `skills/performance-cheatsheet` + `agent-skills/performance-optimization`.
> Core philosophy: Measure before you optimize. Data drives every decision.

---

## Philosophy

> "Measure before you optimize. A guess is not a benchmark."

Performance work without measurement is guesswork.
Every optimization must be preceded by a baseline measurement and followed by
a verification that the optimization actually helped.

---

## `/webperf` — Web Performance Audit

### Core Web Vitals (Google's Ranking Signals)

| Metric | What it measures | Target |
|---|---|---|
| **LCP** (Largest Contentful Paint) | Loading speed | ≤ 2.5s |
| **INP** (Interaction to Next Paint) | Responsiveness | ≤ 200ms |
| **CLS** (Cumulative Layout Shift) | Visual stability | ≤ 0.1 |

**Supporting Metrics:**
| Metric | Target |
|---|---|
| TTFB (Time to First Byte) | ≤ 800ms |
| FCP (First Contentful Paint) | ≤ 1.8s |
| TBT (Total Blocking Time) | ≤ 200ms |

---

### Audit Workflow

1. **Establish baseline** — Run Lighthouse, PageSpeed Insights, or WebPageTest
2. **Identify the bottleneck** — Prioritize by impact (LCP → INP → CLS → others)
3. **Implement one fix at a time** — Never batch optimizations before measuring
4. **Measure again** — Verify the fix improved the metric
5. **Repeat** until all Core Web Vitals hit "Good" threshold

---

### LCP Optimization Checklist

**Common LCP elements:** Hero image, H1 heading, above-the-fold card

- [ ] Is the LCP element an image? Add `fetchpriority="high"` attribute:
  ```html
  <img src="hero.jpg" fetchpriority="high" alt="...">
  ```
- [ ] Preload the LCP resource:
  ```html
  <link rel="preload" as="image" href="hero.webp">
  ```
- [ ] Is the image optimized? Use WebP/AVIF, appropriate dimensions, no oversizing
- [ ] Is TTFB high (>800ms)? → Server/CDN issue, fix that first
- [ ] Is CSS render-blocking? Inline critical CSS, defer the rest
- [ ] Is there a redirect chain? → Remove redirect hops

---

### INP Optimization Checklist

**INP is p98 of all interactions — every slow click counts**

- [ ] Long tasks (>50ms) on main thread? Use `scheduler.yield()`:
  ```javascript
  async function processItems(items) {
    for (const item of items) {
      process(item);
      if (shouldYield()) await scheduler.yield(); // yield to browser
    }
  }
  ```
- [ ] Heavy event handlers? Debounce/throttle input events
- [ ] Synchronous localStorage/sessionStorage reads? Move to async
- [ ] Large DOM? (>1500 nodes) → Virtualize lists with `react-virtual`
- [ ] Hydration blocking interactivity? Use Islands Architecture or React 18 Suspense
- [ ] Third-party scripts blocking main thread? Defer with `async` / `type="module"`

---

### CLS Optimization Checklist

**CLS = unexpected layout shifts from dynamic content**

- [ ] Images without explicit `width` and `height`? Add them:
  ```html
  <img src="..." width="800" height="600" alt="...">
  ```
- [ ] Dynamic content (ads, embeds) inserted above existing content? Reserve space with `min-height`
- [ ] Web fonts causing FOUT? Add `font-display: optional` or preload fonts
- [ ] Animations that change layout properties (width, height, top)? Use transforms instead
- [ ] Content loaded after LCP that shifts it? Fix load order or use `aspect-ratio`

---

### Bundle Size Optimization

**Measure first:**
```bash
# Webpack
npx webpack-bundle-analyzer stats.json

# Vite
npx vite-bundle-visualizer

# Next.js
ANALYZE=true next build
```

**Reduce bundle size:**
- [ ] Tree-shaking enabled? Check for side-effect-full imports
- [ ] Large dependencies? Find alternatives:
  ```
  moment.js (67KB) → date-fns (tree-shakeable) or Temporal API
  lodash (71KB)    → native array methods or lodash-es (tree-shakeable)
  axios (48KB)     → native fetch
  ```
- [ ] Code split at route boundaries?
  ```javascript
  const Dashboard = lazy(() => import('./Dashboard'));
  ```
- [ ] Images in JS bundle? Use `public/` folder or CDN
- [ ] JSON data files in bundle? Lazy-load them

---

### Network Optimization

- [ ] HTTP/2 or HTTP/3 enabled on server?
- [ ] Brotli/gzip compression? (40-70% size reduction)
- [ ] Static assets on CDN with long cache headers?
  ```
  Cache-Control: public, max-age=31536000, immutable
  ```
- [ ] Critical resources preconnected?
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="dns-prefetch" href="https://api.example.com">
  ```
- [ ] API responses cached? (stale-while-revalidate pattern)

---

### Rendering Performance

**Identify paint/layout thrashing:**
```javascript
// Bad: forces layout on every iteration
for (const el of elements) {
  el.style.width = el.offsetWidth + 10 + 'px'; // read + write = thrash
}

// Good: batch reads, then writes
const widths = elements.map(el => el.offsetWidth); // batch reads
elements.forEach((el, i) => el.style.width = widths[i] + 10 + 'px'); // batch writes
```

- [ ] `will-change` on frequently animated elements (use sparingly):
  ```css
  .frequently-animated { will-change: transform; }
  ```
- [ ] Avoid `scroll` event listeners without passive flag:
  ```javascript
  window.addEventListener('scroll', handler, { passive: true });
  ```
- [ ] Virtualize long lists (>100 items):
  ```javascript
  import { useVirtualizer } from '@tanstack/react-virtual';
  ```

---

### Database & API Performance

- [ ] N+1 queries? (select N related records with N queries → use joins/eager loading)
- [ ] Missing indexes on frequently queried columns?
  ```sql
  EXPLAIN ANALYZE SELECT * FROM users WHERE email = $1;
  -- Look for "Seq Scan" on large tables → add index
  CREATE INDEX idx_users_email ON users(email);
  ```
- [ ] Pagination on all list endpoints? Never return unbounded lists
- [ ] Response payloads minimized? (select only needed fields)
- [ ] Connection pooling configured? (PgBouncer, connection pool size)

---

### Performance Budget

Define and enforce a performance budget in CI:

```json
// .lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["warn", {"minScore": 0.9}],
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "interactive": ["error", {"maxNumericValue": 3500}],
        "total-blocking-time": ["error", {"maxNumericValue": 300}]
      }
    }
  }
}
```

**Run in CI:**
```bash
npm install -g @lhci/cli
lhci autorun
```

---

## Integration with Engineering Lifecycle

- During `/spec`: Define performance budgets as non-functional requirements
- During `/build`: Run a quick Lighthouse check after each UI feature task
- During `/review`: Add performance axis — N+1 queries, bundle impacts, layout thrashing
- During `/ship`: Full Lighthouse audit must pass performance budget before deploy
- During `/webperf`: Full standalone performance audit workflow above
