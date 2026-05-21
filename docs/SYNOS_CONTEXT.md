# SynOS Context

## What is SynOS?
* SynOS is a modern DLMS (Diagnostic Laboratory Management System) / LIMS (Laboratory Information Management System).
* It is laser-focused on operational simplicity, speed, and premium UX.
* It replaces legacy, clunky, ERP-style laboratory software with a sleek, intuitive, modern web experience.

## Core Philosophy
* **Operator-First Workflows**: The system is designed for the people doing the work (technicians, pathologists, front-desk staff, administrators).
* **Hide Technical Complexity**: Complexity must exist internally (in code and architecture) but NEVER visually in the UI. 
* **Operational Simplicity**: Workflows should feel natural, requiring minimal clicks and cognitive load.
* **Premium UX**: High-fidelity design, smooth transitions, readable typography, and clean layouts are mandatory.

## What NOT to Build
* **NO ERP-Style Clutter**: Do not cram every possible setting onto a single screen.
* **NO Developer-Facing UI**: Do not expose database schemas, internal IDs, or engineering concepts to the operator.
* **NO Generic Admin Panels**: Do not build CRUD screens that look like database viewers. Every screen must be an operational workspace tailored to a specific laboratory task.

## Naming Conventions & Vocabulary
* Use **Operational Naming Conventions** only. Speak the language of the laboratory.
* **AVOID** developer-centric terms in the UI such as:
  * Governance engine
  * Rendering DSL
  * Schema editor
  * AST (Abstract Syntax Tree)
  * Payload
* **USE** operational terms such as:
  * Test Master
  * Catalog
  * Parameters
  * Rules & Overrides
  * Report Layout

## AI Agent Guardrails
* When building new features, prioritize the user's mental model over the database schema.
* If a feature requires complex configuration, abstract it behind a simple toggle or progressive disclosure mechanism.
* Always maintain the established visual canon (e.g., specific tailwind color palettes, Lucide icons, glassmorphism where appropriate).
* **Strict Signature Role Enforcements**: Only allow `Default Pathologist (Lab Owner)`, `Additional Pathologist`, and `Radiologist` slots. Do not introduce any text inputs for freeform signature roles. Enforce programmatically that `Default Pathologist (Lab Owner)` is required, pre-selected, and disabled from edit or delete operations.
* **Base64 Image Management**: Never allow raw text input fields for local logos or branding images. Ensure all image picker selections leverage React/JavaScript FileReader interfaces to convert files (e.g., PNGs) to Base64 data URLs.
* **Preprinted vs. Digital PDF Printing Modes**: Programmatically hide branding elements, header text, and footers when in Preprinted mode to prevent overlaying colors on physical letterhead. Preserve configurable top and bottom margins (margins must not be overridden/ignored during physical print). Render full graphics, logo, and metadata only when `usePreprinted` is false.
* **High Contrast and Accessibility**: Maintain readable typography colors. Standard operational labels, metadata descriptions, and disabled or inactive controls must follow the polished high-contrast theme (using `text-zinc-600 dark:text-zinc-400` or higher contrast, rather than low-contrast muted colors) to maintain premium accessibility standards.


