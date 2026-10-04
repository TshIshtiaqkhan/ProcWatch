# Logo & Brand Generation Sub-skill

> Source: `logo-generator-skill` — Generate professional SVG logos and high-end
> showcase images for products and brands.

---

## Philosophy

Professional logos require more than aesthetics — they need to encode the product's
core concept into a scalable, adaptable mark. Start with information gathering,
generate variants, refine, then produce showcase-quality outputs.

---

## Workflow

### Phase 1: Information Gathering

Collect from the user (ask concisely, one or two questions at a time):

1. **Product/Brand Name** *(required)*
2. **Industry/Category** (e.g., AI, fintech, design tools, developer tools)
3. **Core Concept** (e.g., connection, flow, security, speed, simplicity)
4. **Design Preferences:**
   - Style: minimal ↔ complex, geometric ↔ organic
   - Color: monochrome / specific colors / open
   - Mood: cold/warm, professional/friendly, technical/human

---

### Phase 2: SVG Design Variants

Generate **at least 6 meaningfully different variants**:
- Match patterns to product characteristics
- Use different pattern types (geometric, dot matrix, line system, mixed)
- Vary complexity (simple primitive → layered composition)
- Each variant must feel distinctly different — not just parameter tweaks
- Explain the design rationale for each variant

**SVG Technical Requirements:**
```xml
<!-- Always use viewBox="0 0 100 100" for consistency -->
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g>
    <!-- Use currentColor for flexible color control -->
    <!-- Use <defs> for reusable elements -->
    <!-- Use <clipPath> for masking effects -->
    <!-- Prefer geometric primitives over complex paths -->
  </g>
</svg>
```

**Pattern Library (use as starting points):**

```xml
<!-- Concentric Circle Dots -->
<svg viewBox="0 0 100 100">
  <circle cx="50" cy="38" r="3" fill="currentColor"/>
  <!-- Add more in circular arrangement -->
</svg>

<!-- Geometric + Line Accent -->
<svg viewBox="0 0 100 100">
  <polygon points="50,30 70,60 30,60" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="50" cy="30" r="4" fill="currentColor"/>
</svg>

<!-- Node Network -->
<svg viewBox="0 0 100 100">
  <path d="M 30 70 Q 50 70, 50 50 T 70 30" stroke="currentColor" stroke-width="2" fill="none"/>
  <circle cx="30" cy="70" r="4" fill="currentColor"/>
  <circle cx="50" cy="50" r="5" fill="currentColor"/>
  <circle cx="70" cy="30" r="4" fill="currentColor"/>
</svg>
```

**Showcase Webpage:**
- Display all 6+ variants in a responsive grid
- Hover effects and smooth transitions
- Design rationale per variant
- Dark/light toggle to test both contexts
- Use semantic HTML + CSS custom properties

---

### Phase 3: Iteration & Refinement

After the user reviews:
- Narrow from 6+ to 2-3 favorites
- Adjust specific parameters (size, spacing, rotation, weight)
- Combine elements from different variants
- Add/change colors or gradients
- Modify animations or effects

Make **targeted adjustments** only. Don't regenerate everything unless requested.

---

### Phase 4: High-End Showcase Generation

Once the user selects a direction:

**Step 1 — Export SVG to PNG**
```bash
# Using scripts/svg_to_png.py from logo-generator-skill
python /home/ishtiaqkhan/Reuse/Skills/logo-generator-skill/scripts/svg_to_png.py \
  --input logo.svg --output logo.png --size 1024
```
Default: 1024×1024px, transparent background.

**Step 2 — Select Showcase Styles**

Choose 4 styles from the 12 available, based on product type and mood:

**Dark Styles:**
| Style | Vibe | Best for |
|---|---|---|
| `void` | Absolute minimalism | Hardcore tech, developer tools |
| `frosted` | Modern, breathing space | Premium SaaS, design tools |
| `fluid` | AI-native, dynamic | AI products, real-time systems |
| `spotlight` | Studio lighting, editorial | Agency, creative brands |
| `analog_liquid` | Metallic shimmer | Creative, experimental brands |
| `led_matrix` | Digital retro, cyberpunk | Gaming, hardware, security |

**Light Styles:**
| Style | Vibe | Best for |
|---|---|---|
| `editorial` | Specialty paper, humanistic | Publishing, education, writing tools |
| `iridescent` | Optical, tech hardware | Hardware products, IoT |
| `morning` | AI softness, approachable | Consumer apps, wellness |
| `clinical` | Spatial order, algorithmic | FinTech, analytics, B2B SaaS |
| `ui_container` | Digital product native | SaaS platforms, dashboards |
| `swiss_flat` | Absolute flatness, timeless | Enterprise, professional services |

**Step 3 — Generate Showcase Images**
```bash
# Setup
cp /home/ishtiaqkhan/Reuse/Skills/logo-generator-skill/.env.example .env
# Add GEMINI_API_KEY to .env

pip install -r /home/ishtiaqkhan/Reuse/Skills/logo-generator-skill/requirements.txt

# Generate all 12 styles
python /home/ishtiaqkhan/Reuse/Skills/logo-generator-skill/scripts/generate_showcase.py \
  --input logo.png --all-styles

# Or specific styles
python .../generate_showcase.py --input logo.png --styles void frosted fluid morning
```

---

### Phase 5: Delivery

Provide the user with:
- [ ] Interactive HTML showcase page (all variants)
- [ ] SVG files (editable, one per variant)
- [ ] PNG exports (1024×1024 minimum, other sizes on request)
- [ ] 4 professional showcase images
- [ ] Brief design rationale document

---

## Design Principles

1. **Variety over convergence** — 6+ distinct variants, not 6 color swaps
2. **Start simple** — Add complexity only when concept demands it
3. **Meaningful design** — Visual elements connect to product concept
4. **Scalability** — Works at 16×16px favicon AND billboard size
5. **Professional quality** — Match high-end brand identity standards
6. **Flexibility** — Multiple variants for different contexts (dark/light, icon/wordmark)

---

## Troubleshooting

| Issue | Fix |
|---|---|
| SVG not displaying | Check viewBox, ensure all paths are closed |
| PNG export fails | `pip install cairosvg` |
| Showcase gen fails | Check `.env` has valid `GEMINI_API_KEY`, verify PNG exists |
| Third-party API fails | Check `GEMINI_API_BASE_URL` format: `https://api.example.com/v1` |
| Rate limit hit | Add `--delay 2` flag to generate_showcase.py |

---

## Integration with Engineering Lifecycle

- During `/spec`: Define brand requirements (industry, competitors, mood)
- Logo generation happens independently of the build lifecycle
- Generated SVGs can be committed directly to `assets/` or `public/`
- Use `/break-ui` to test logo rendering at edge-case sizes
