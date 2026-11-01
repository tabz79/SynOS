# SynOS iOS-Inspired Design System & Content Depth Specification

> **Architectural Standard for AI Coding Agents & Frontend Engineers**  
> **Source Benchmarks**: `Discount Master` (`DiscountMasterScreen.jsx`) & `Reception Intent Panel` (`v3-iOS-Inspired-intent-panel.png`)

---

## 🏛️ The 4-Layer Depth Philosophy (Why "Simple White Cards" Fail)

A flat white card placed on a flat white or light-grey background results in zero perceived depth. In the SynOS iOS-inspired design language, every screen is composed of **4 distinct optical layers** that create physical elevation and tactile weight without noisy 3D effects:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 0: Atmospheric Cool Sky Canvas                                   │
│  [radial-gradient(ellipse_at_top,_#EAF2F9_0%,_#DCE7F2_50%,_#CEDCE8)]   │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Layer 1: Elevated Squircle Island Card                         │   │
│   │  bg-white border-slate-200/90 shadow-[0_14px_40px_rgba(15,35, │   │
│   │  60,0.08),inset_0_1px_0_#FFFFFF] rounded-[28px]                │   │
│   │                                                                │   │
│   │   ┌────────────────────────────────────────────────────────┐   │   │
│   │   │ Layer 2: Recessed Slab / Pod                           │   │   │
│   │   │  bg-[#EEF4FA] border-[#DCE7F2] rounded-2xl             │   │   │
│   │   │  shadow-[inset_0_1px_3px_rgba(15,35,60,0.05)]          │   │   │
│   │   │                                                        │   │   │
│   │   │   ┌───────────────┐  ┌───────────────┐  ┌──────────┐   │   │   │
│   │   │   │ Layer 3: Pill │  │ Layer 3: Pill │  │ Layer 3  │   │   │   │
│   │   │   │ bg-white      │  │ bg-white      │  │ Avatar   │   │   │   │
│   │   │   │ shadow-[0_1px_│  │ shadow-[0_1px_│  │ gradient │   │   │   │
│   │   │   │ 2px_rgba(...)]│  │ 2px_rgba(...)]│  │ rim light│   │   │   │
│   │   │   └───────────────┘  └───────────────┘  └──────────┘   │   │   │
│   │   └────────────────────────────────────────────────────────┘   │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📐 The 4 Physical Elevation Tokens

### Layer 0: The Atmospheric Cool Canvas
- **Purpose**: Creates the soft blue-sky mist that separates white cards from the page.
- **Light Mode**:
  ```jsx
  className="bg-[radial-gradient(ellipse_at_top,_#EAF2F9_0%,_#DCE7F2_50%,_#CEDCE8_100%)] dark:bg-zinc-950"
  ```
- **Rule**: NEVER use flat `bg-[#F4F8FA]` or `bg-white` for modal or screen canvas.

---

### Layer 1: Elevated Squircle Island Cards (Subtle Greyish Fade Gradient)
- **Purpose**: Island cards with an authentic iOS cool-slate / icy-grey subtle vertical gradient fade, crisp white rim highlight (`inset_0_1px_0_#FFFFFF`), and soft elevation shadow.
- **CRITICAL DIRECTIVE**: Cards MUST NEVER be pure flat `#FFFFFF`! In high-fidelity inspection, the card surfaces feature a subtle icy-slate gradient fading down from `#F2F7FA` through `#EEF5F9` to `#E5EFF5`.
- **Primary Island Card Token (Step 1 Container)**:
  ```jsx
  className="rounded-[28px] bg-gradient-to-b from-[#F2F7FA] via-[#EEF5F9] to-[#E5EFF5] dark:from-zinc-900 dark:to-zinc-950 border border-white/90 dark:border-zinc-800 shadow-[0_14px_40px_rgba(15,35,60,0.08),0_2px_6px_rgba(15,35,60,0.03),inset_0_1px_0_#FFFFFF] p-6 sm:p-7 space-y-5"
  ```
- **Sub-Cards (Visit Details & Billing Summary)**:
  ```jsx
  className="rounded-[24px] bg-gradient-to-b from-[#F2F7FA] via-[#EEF5F9] to-[#E5EFF5] dark:from-zinc-900 dark:to-zinc-950 border border-white/90 dark:border-zinc-800 shadow-[0_12px_36px_rgba(15,35,60,0.07),0_2px_6px_rgba(15,35,60,0.03),inset_0_1px_0_#FFFFFF] p-5 sm:p-6 space-y-4"
  ```
  ```

---

### Layer 2: Recessed Slabs & Pods (Inner Containers)
- **Purpose**: Sinks inward into the card surface, giving nested content a dedicated home.
- **Class Token**:
  ```jsx
  className="rounded-2xl border border-[#DCE7F2] dark:border-zinc-800 bg-[#EEF4FA] dark:bg-zinc-950/80 p-5 shadow-[inset_0_1px_3px_rgba(15,35,60,0.05)]"
  ```
- **Inputs inside Cards**:
  ```jsx
  className="h-11 px-3.5 rounded-xl bg-slate-50/80 dark:bg-zinc-950/70 border border-slate-200/80 dark:border-zinc-800 shadow-[inset_0_1px_2px_rgba(15,35,60,0.04)] text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
  ```

---

### Layer 3: Floating Micro-Pills & Badges (Content Depth)
- **Purpose**: Instead of flat grey text or transparent chips, metadata badges float on top of the recessed pod.
- **Class Token (Age, Gender, Mobile, MRN)**:
  ```jsx
  className="bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700/80 shadow-[0_1px_2px_rgba(15,35,60,0.06)] px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-zinc-200"
  ```
- **Avatar Pod**:
  ```jsx
  className="w-14 h-14 rounded-full bg-gradient-to-b from-[#E0F2FE] to-[#BAE6FD] text-[#0284C7] border-2 border-white shadow-[0_3px_10px_rgba(2,132,199,0.2)] flex items-center justify-center shrink-0"
  ```

---

## 🎛️ Interactive Controls & Mode Selectors

### 1. Payer Mode Pods (The 3 Options)
- **Selected Pod**:
  ```jsx
  className="relative flex items-center justify-between p-4 rounded-2xl border-2 border-[#3B82F6] bg-gradient-to-b from-[#EDF5FF] to-[#DFEEFD] text-[#1E3A8A] shadow-[0_6px_20px_rgba(37,99,235,0.18),inset_0_1px_0_#FFFFFF]"
  ```
  - **Icon**: `w-11 h-11 rounded-xl bg-gradient-to-b from-[#3B82F6] to-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)] flex items-center justify-center`
  - **Radio Indicator**: `w-6 h-6 rounded-full border-[2.5px] border-[#2563EB] bg-white shadow-xs flex items-center justify-center` with `w-2.5 h-2.5 rounded-full bg-[#2563EB]`.
- **Unselected Pod**:
  ```jsx
  className="relative flex items-center justify-between p-4 rounded-2xl border border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:shadow-[0_6px_20px_rgba(15,35,60,0.08)] shadow-[0_4px_14px_rgba(15,35,60,0.05),0_1px_2px_rgba(15,35,60,0.03)] transition-all"
  ```
  - **Icon**: `w-11 h-11 rounded-xl bg-slate-100 text-slate-500 border border-slate-200/60 shadow-2xs flex items-center justify-center`
  - **Radio Indicator**: `w-6 h-6 rounded-full border-2 border-slate-300 bg-white shadow-2xs`

---

### 2. Amount to Collect Hero Banner
- **Light Mode**:
  ```jsx
  className="rounded-2xl bg-[#E8F2FA] dark:bg-sky-950/30 border border-[#C5DCF0] dark:border-sky-800/60 p-4 flex items-center justify-between shadow-[inset_0_1px_0_#FFFFFF]"
  ```

---

### 3. iOS Segmented Pill Toggle (`% Off` | `₹ Flat`)
- **Container**: `inline-flex p-1 rounded-xl bg-[#DFEAF3] dark:bg-zinc-800 border border-slate-200/60`
- **Active Pill**: `bg-[#506A85] text-white rounded-lg px-3 py-1.5 text-xs font-bold shadow-xs`
- **Inactive Pill**: `text-slate-600 dark:text-zinc-400 px-3 py-1.5 text-xs font-bold`

---

## 🚫 Critical Anti-Patterns (NEVER Repeat)

1. **NEVER render white-on-white**: If an outer card is `bg-white`, inner pods must be recessed (`bg-[#EEF4FA]`) or canvas must be atmospheric (`#EAF2F9`).
2. **NEVER drop ambient shadows**: A flat `border border-slate-200` without `shadow-[0_10px_30px_rgba(...)]` looks like paper, not an iOS card.
3. **NEVER use flat grey chips for metadata**: Demographics (`Age`, `Gender`, `MRN`) must be elevated white pills with subtle borders and shadows so they pop off the recessed pod.
4. **NEVER alter financial calculation rules**: Concessions default to flat ₹ per AGENTS.md invariant rules.


---

## 🔤 Section V: Unified Typography Hierarchy Canon (The Single Governing Authority)

To eliminate compressed, warped, or squished text:

1. **Root Font Stack**:
   - macOS Native: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text"`
   - Cross-Platform Fallback: `"Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
   - **PROHIBITION**: NEVER inject `font-feature-settings: "cv11", "ss01"` or narrow fonts (e.g. Geist) onto body.

2. **Tracking Standard**:
   - `letter-spacing: normal` everywhere.
   - **NEVER** apply `tracking-tight` or `tracking-tighter` to headings, labels, or names. It collapses character spacing and squishes optical glyph proportions.

3. **Standard Scale Tokens**:
   - **Card Titles (Island Containers)**: `.type-card-title` (`text-base sm:text-lg font-bold tracking-normal text-slate-900 dark:text-white`)
   - **Section Headers & Block Labels**: `.type-section-header` (`text-sm font-bold tracking-normal text-slate-800 dark:text-zinc-200`)
   - **Form Field Labels**: `.type-label` (`text-xs sm:text-sm font-semibold tracking-normal text-slate-700 dark:text-zinc-300`)
   - **Primary Values / Names**: `.type-value` (`text-sm sm:text-base font-semibold tracking-normal text-slate-900 dark:text-white`)
   - **Code & Test Keys**: `.type-code` (`font-mono text-xs font-semibold tracking-normal`)
