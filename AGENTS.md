# AGENTS.md

This repository is a **Claude Code job-application framework** (an "AI Job Search" template).
Its "application" is not a long-running server — it is a set of local tools that a developer
runs on demand:

- **Python tools** — `salary_lookup.py` and `tools/*.py` (salary conversion, skill/command
  linting, security guards). Unit tests live in `tests/`.
- **Bun/TypeScript job-search CLIs** — six portal search tools under `.agents/skills/*/cli`
  (`jobbank-search`, `jobdanmark-search`, `jobindex-search`, `jobnet-search`,
  `linkedin-search`, `freehire-search`).
- **LaTeX documents** — the example CV (`cv/main_example.tex`, compiled with `lualatex`)
  and cover letter (`cover_letters/cover_example.tex`, compiled with `xelatex`).

The canonical setup/run/test commands are already documented in `README.md`, `SETUP.md`,
`CONTRIBUTING.md`, and `.github/workflows/ci.yml`. Prefer those sources; the notes below only
capture non-obvious, environment-specific gotchas for future agents.

## Cursor Cloud specific instructions

The update script keeps Bun CLI dependencies fresh (`bun install` in each
`.agents/skills/*/cli`). The heavier toolchain (Bun itself, TeX Live, poppler, and the
CTAN LaTeX packages below) is baked into the VM snapshot during environment setup, so it is
present without re-installing.

- **Bun** is installed as a standalone binary at `~/.bun/bin/bun` and symlinked to
  `/usr/local/bin/bun` so it is on `PATH` for non-interactive shells (the update script and
  `bun run` scripts). Do not rely on `npm`/`node` for the CLIs — `node` on `PATH` is a
  bundled runtime and `npm` lives under `~/.nvm/...`, which is not on the sudo/`PATH` used by
  scripts. Just call `bun`.
- **LaTeX version drift is the main gotcha.** Ubuntu's TeX Live 2023 ships `moderncv` v2.3.1,
  which is too old for `cv/main_example.tex` (it errors with `Command \firstnamestyle
  undefined`). CI uses `texlive/texlive:latest`, so the current `moderncv` (v2.6.x) is
  installed into `TEXMFHOME` (`~/texmf`) to override the system copy. Current `moderncv`
  additionally requires `fontawesome6`, which TeX Live 2023 also lacks, so `fontawesome6`
  (`.sty` + fonts) is likewise installed into `~/texmf`. If a fresh snapshot ever loses these,
  re-fetch the current packages from CTAN into `~/texmf` and run `mktexlsr ~/texmf`; do **not**
  edit the `.tex` templates to match the older system packages.
- **Compile from inside the document directory** (the templates use relative paths, e.g. the
  cover letter's bundled `OpenFonts/`): `cd cv && lualatex -interaction=nonstopmode
  main_example.tex` and `cd cover_letters && xelatex -interaction=nonstopmode
  cover_example.tex`. CI asserts exact page counts (CV = 2 pages, cover letter = 1 page).
- All build outputs (`*.pdf`, `*.aux`, `*.log`, `*.out`) and generated `cv/main_*.tex` /
  `cover_letters/cover_*.tex` are gitignored — safe to leave in the working tree.
- **Job-portal CLIs make live network requests.** `linkedin-search` and `freehire-search`
  work for any market out of the box (zero runtime deps). LinkedIn scraping is personal-use
  only per its ToS — keep query volume low. The Danish portals may be behind Cloudflare bot
  protection and can fail from a datacenter IP; that is expected, not a setup bug.
- `salary_lookup.py` requires a personal `salary_data.json` (gitignored). Without it the tool
  exits with a clear "not found" message by design — this is expected, not a failure.
