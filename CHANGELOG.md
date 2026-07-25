# Changelog - create-pphlx

All notable changes to the `create-pphlx` scaffolding CLI package will be documented in this file.

## [1.0.6] - 2026-07-25

### Fixed
- **Dynamic Remote Template Manifest URL**: Fixed `TEMPLATE_MANIFEST_URL` endpoint to point to `templates/template.json` for live dynamic template fetching from the main GitHub repository.

---

## [1.0.5] - 2026-07-25

### ✨ Gradient Progress Bar & UI Wording Refinements
- **Multi-Color Gradient Progress Bar**: Enhanced real-time task spinner with a smooth multi-color ANSI gradient bar sequence (magenta, blue, cyan).
- **Consistent Brand Styling**: Unified `pphlx` magenta badge and `next` cyan badge styling across initial intro and outro banners.
- **Improved Wording**: Refined project initialization headers and next-steps exploration messages.

---

## [1.0.4] - 2026-07-25

### ✨ Dynamic Progress Animations & UI Polish
- **Real-Time Task Runner**: Added real-time single-line task progress animation for template extraction, dependency installation, and git repository initialization.
- **Enhanced Badge & Step Formatting**:
  - Uniform 7-character step badges (`dir`, `tmpl`, `deps`, `git`).
  - Improved step checkmarks (`✔`), sub-task indicators (`■`), and status banners (`pphlx`, `next`).
- **Clear Guidance & Next Steps**: Updated scaffolding completion summary with direct project navigation and development server startup instructions.

---

## [1.0.3] - 2026-07-25

### ✨ Interactive CLI Prompts & Scaffolding Flow
- **Clack-Powered Interactive UI**: Upgraded `create-pphlx` CLI to use `@clack/prompts` for interactive project scaffolding.
- **Guided Prompts**:
  - Interactive target directory selection with random generated project names (e.g. `./swift-beacon`).
  - Template selection prompt with remote GitHub manifest integration (`github:pphlx/pphlx/templates/minimal`).
  - Automated dependency installation (`npm install`) prompt.
  - Automatic `git init` repository initialization prompt.
- **Animated Progress Indicator**: Real-time progress bar animation and completion summary badges.

---

## [1.0.2] - 2026-07-24

### 🐛 Bug Fixes
- **Scaffold Template Styling**: Fixed missing `<style>` block in scaffolded `src/index.pphx` template so `app.css` compiles with full styling and layout rules.

---

## [1.0.1] - 2026-07-24

### 🚀 Enhancements
- **Clean Aesthetic Starter Design**: Updated scaffolding template to generate `src/index.pphx`, `src/layouts/Layout.pphx`, and `src/assets/pphlx.svg`.
- **Favicon Support**: Automatically writes `public/favicon.ico` (base64 binary) and `public/favicon.svg` into new projects.
- **Documentation**: Automatically generates project `README.md` with folder structure diagram.

---

## [1.0.0] - 2026-07-24

### 🎉 Initial Release
- **1-Line Scaffolder CLI**: Initial release of `create-pphlx` (`npm create pphlx@latest`), enabling zero-dependency project scaffolding.
