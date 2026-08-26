"""Contract checks for the companion application skills."""

from __future__ import annotations

import re
import subprocess
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

COMPANION_SKILLS = {
    "web-job-brief": (
        "# Web Job Brief",
        "## Invocation",
        "## Constraints",
        "### Step 4: Output the brief",
        "## Application handoff",
        "job-application-assistant",
    ),
    "freelance-outreach": (
        "# Freelance Outreach",
        "## Invocation",
        "## 5-line pitch (send-ready)",
        "## Rate suggestion",
        "Claude Code",
    ),
    "productized-offer": (
        "# Productized Offer",
        "## Invocation",
        "## 1-week package",
        "## Pricing suggestion",
        "Claude Code",
    ),
}


def frontmatter_name(text: str) -> str:
    if not text.startswith("---\n"):
        raise AssertionError("missing YAML frontmatter")
    end = text.find("\n---", 4)
    if end == -1:
        raise AssertionError("unterminated YAML frontmatter")
    block = text[4:end]
    match = re.search(r"^name:\s*(.+)\s*$", block, re.MULTILINE)
    if not match:
        raise AssertionError("frontmatter missing name")
    return match.group(1).strip()


class CompanionSkillContractTests(unittest.TestCase):
    def test_skill_files_exist_with_matching_name_and_required_sections(self):
        for slug, needles in COMPANION_SKILLS.items():
            path = REPO_ROOT / ".claude" / "skills" / slug / "SKILL.md"
            with self.subTest(skill=slug):
                self.assertTrue(path.is_file(), f"missing {path}")
                text = path.read_text(encoding="utf-8")
                self.assertEqual(frontmatter_name(text), slug)
                for needle in needles:
                    self.assertIn(needle, text, f"{slug} missing {needle!r}")

    def test_ai_automation_hunter_subagent_exists(self):
        path = REPO_ROOT / ".cursor" / "agents" / "ai-automation-hunter.md"
        self.assertTrue(path.is_file(), f"missing {path}")
        text = path.read_text(encoding="utf-8")
        self.assertEqual(frontmatter_name(text), "ai-automation-hunter")
        self.assertIn("Use proactively", text)
        for needle in (
            "web-job-brief",
            "freelance-outreach",
            "productized-offer",
            "job-application-assistant",
            "Claude Code",
        ):
            self.assertIn(needle, text)

    def test_saved_briefs_are_gitignored(self):
        gitignore = (REPO_ROOT / ".gitignore").read_text(encoding="utf-8")
        self.assertIn("job_briefs/*.md", gitignore)

    def test_lint_skills_passes_when_pyyaml_is_available(self):
        try:
            import yaml  # noqa: F401
        except ImportError:
            self.skipTest("PyYAML is not installed in this environment")
        result = subprocess.run(
            [sys.executable, str(REPO_ROOT / "tools" / "lint_skills.py")],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("lint_skills: OK", result.stdout)


if __name__ == "__main__":
    unittest.main()
