# SynOS UX Rules

## 1. Progressive Disclosure
* Never overwhelm the user with all settings at once.
* Basic operational tasks must be front-and-center.
* Advanced configurations must be hidden by default and accessible only when intentionally invoked.

## 2. Interaction Patterns
* **Spreadsheet-Style Operational Editing**: For data-dense screens (like the Parameters grid in Test Master), use inline editing and keyboard-friendly interactions. Operators should be able to tab through and edit cells rapidly just like in a spreadsheet.
* **Contextual Drawers**: Advanced settings (e.g., calculations, age/gender overrides, analyzer channel mappings) must open in side-sliding contextual drawers. They should **not** navigate the user away from their workspace, and should **not** permanently occupy screen real estate.
* **Live Previews**: Visual settings (like Report Layouts) must provide immediate feedback. Use side-by-side split views or toggles to render WYSIWYG previews on the fly as settings change.

## 3. Test Master Mental Model
* The Test Master is an **Operational Workspace**, not a developer's rendering engine editor.
* **Report Setup Belongs Inside Test Master**: Configuring how a test looks on a printed report is a core part of setting up a test. Do not separate it into a disconnected "Report Configuration" module.
* Complex rendering logic (like formulas or interpretations) is handled internally. The UI should only expose simple expression inputs or textareas.

## 4. UI Cleanliness & Clarity
* **No ERP-Style Clutter**: Avoid dense walls of checkboxes, tiny fonts, and nested accordions. 
* Use spacing, generous padding, and typography scaling (e.g., `font-medium`, `font-bold`) to create hierarchy.
* Do not use heavy fonts (`font-black`) for subtext or standard data.
* Use recognizable, modern iconography (Lucide React) instead of text-heavy buttons where appropriate (e.g., a single Settings cog for advanced configurations).
