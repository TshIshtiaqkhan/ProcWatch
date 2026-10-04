#!/usr/bin/env bash
# validate-skill.sh
# Validates the unified-dev-skill structure is complete and well-formed.
# Run from the workspace root: bash .antigravity/skills/unified-dev-skill/scripts/validate-skill.sh

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASS=0
FAIL=0

green() { echo -e "\033[32m✓ $1\033[0m"; }
red()   { echo -e "\033[31m✗ $1\033[0m"; }

check() {
  local desc="$1"
  local file="$2"
  if [ -f "$file" ]; then
    green "$desc"
    ((PASS++))
  else
    red "$desc — missing: $file"
    ((FAIL++))
  fi
}

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Unified Dev Skill — Structure Validation"
echo "═══════════════════════════════════════════════════"
echo ""

echo "── Core Files ──"
check "Master SKILL.md exists"                     "$SKILL_DIR/SKILL.md"

echo ""
echo "── Sub-skills ──"
check "engineering-lifecycle.md"                   "$SKILL_DIR/sub-skills/engineering-lifecycle.md"
check "code-quality.md"                            "$SKILL_DIR/sub-skills/code-quality.md"
check "cybersecurity.md"                           "$SKILL_DIR/sub-skills/cybersecurity.md"
check "ui-design.md"                               "$SKILL_DIR/sub-skills/ui-design.md"
check "logo-brand.md"                              "$SKILL_DIR/sub-skills/logo-brand.md"
check "performance.md"                             "$SKILL_DIR/sub-skills/performance.md"

echo ""
echo "── References ──"
check "quality-gates.md"                           "$SKILL_DIR/references/quality-gates.md"

echo ""
echo "── Source Skill Directories ──"
check "agent-skills source"                        "/home/ishtiaqkhan/Reuse/Skills/agent-skills/CLAUDE.md"
check "Cybersecurity source"                       "/home/ishtiaqkhan/Reuse/Skills/Anthropic-Cybersecurity-Skills/AGENTS.md"
check "logo-generator source"                      "/home/ishtiaqkhan/Reuse/Skills/logo-generator-skill/SKILL.md"
check "ponytail source"                            "/home/ishtiaqkhan/Reuse/Skills/ponytail/.openclaw/skills/ponytail/SKILL.md"
check "UI skills source"                           "/home/ishtiaqkhan/Reuse/Skills/skills/skills/emil-design-eng/SKILL.md"

echo ""
echo "── YAML Frontmatter Check ──"
if command -v python3 &>/dev/null; then
  python3 - <<'EOF'
import sys, re

skill_md = open("/home/ishtiaqkhan/.superset/worktrees/Workflow/bald-reindeer-226ccba4/.antigravity/skills/unified-dev-skill/SKILL.md").read()
if skill_md.startswith("---"):
    # Extract frontmatter
    end = skill_md.index("---", 3)
    fm = skill_md[3:end]
    required = ["name:", "description:"]
    missing = [r for r in required if r not in fm]
    if missing:
        print(f"\033[31m✗ SKILL.md frontmatter missing: {missing}\033[0m")
        sys.exit(1)
    else:
        print("\033[32m✓ SKILL.md frontmatter valid (name + description present)\033[0m")
else:
    print("\033[31m✗ SKILL.md missing YAML frontmatter\033[0m")
    sys.exit(1)
EOF
else
  echo "  (python3 not available, skipping frontmatter check)"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Results: ${PASS} passed, ${FAIL} failed"
echo "═══════════════════════════════════════════════════"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "  ❌ Skill validation FAILED — fix missing files above"
  exit 1
else
  echo "  ✅ Skill validation PASSED — all files present"
  exit 0
fi
