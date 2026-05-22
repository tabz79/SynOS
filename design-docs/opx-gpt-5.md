This implementation plan is actually the first time the architecture is moving in the correct direction.

Before this, you were accidentally building:

```text
a table configurator
```

Now you’re building:

```text
a real-world lab report rendering system
```

Huge difference.

But there are still 3 very important corrections before you let Gemini burn more tokens.

---

# What’s GOOD in this plan

These are correct:

* Static master + overlay architecture
* Background upload
* Physical vs digital mode
* Coordinate-based rendering
* WYSIWYG preview
* Shared renderer between TestMaster + ReportTemplates
* Preprinted suppression logic

This is finally enterprise-grade thinking.

---

# What’s WRONG / dangerous

## 1. Base64 in localStorage = bad idea

This line:

```text
Base64 background uploads stored in localStorage
```

No.

This becomes a disaster later.

Why?

Because:

* 1200 templates
* high resolution images
* browser storage limits
* memory bloat
* slow rendering
* corrupted storage

This is prototype thinking.

---

# Correct approach

Store:

```text
/assets/report-masters/
```

Then save only:

```json
{
  "backgroundPath": "/assets/report-masters/hema-v2.png"
}
```

inside DB/state.

NOT Base64 blobs.

Very important.

---

# 2. Pixels are WRONG for medical stationery

This:

```text
top: 220px
```

will become a nightmare across:

* printers
* zoom levels
* browsers
* PDF engines
* DPI scaling

Medical printing should NEVER rely on browser pixels.

---

# Correct approach

Use:

```text
millimeters (mm)
```

Internally too.

Because the lab owner literally measures:

```text
"table starts 52mm from top"
```

with a ruler.

That’s how real labs work.

NOT:

```text
starts at 243px
```

---

# Your renderer should become:

```css
top: 52mm;
left: 14mm;
```

NOT pixels.

---

# 3. You still don’t have a true MASTER SYSTEM

Right now templates are still acting like:

```text
individual report configurations
```

You need:

```text
department-level master templates
```

BIG difference.

---

# Correct architecture

## Hematology Master

controls:

* paper design
* spacing
* typography
* default signatures
* column structure

Then CBC only says:

```json
{
  "template": "hematology-master",
  "showInterpretation": false,
  "showMethod": true
}
```

That’s it.

---

# THIS solves your earlier 1200 template problem

You DO NOT want:

```text
1200 report templates
```

That becomes hell.

Instead:

* 8-15 department masters
* individual tests inherit from them

THIS is scalable.

---

# Your Sri Divya sheet example

This is EXACTLY:

```text
a department master template
```

Not a per-test design.

---

# So what should the final architecture become?

# LEVEL 1 — Department Master Template

Example:

```text
Hematology Master
Biochemistry Master
Radiology Master
Histopathology Master
```

Controls:

* background
* branding
* coordinates
* signatures
* typography
* spacing
* digital/physical behavior

---

# LEVEL 2 — Test-Level Overrides

Inside TestMaster:

```text
CBC
LFT
TSH
HbA1c
```

only override:

* show/hide ranges
* show/hide method
* commentary
* narrative
* special table mode

NOT entire visual design.

---

# THIS is the correct enterprise architecture

And this is probably the most important architectural decision you’ve made in SynOS so far.

Seriously.

Because if you don’t separate:

```text
visual master
vs
test behavior
```

you’ll eventually drown in template duplication.

---

# So before continuing, tell Gemini ONE correction prompt only

Send this:

```text
Important architecture correction before implementation:

1. Do NOT store backdrop images as Base64 in localStorage.
Instead use asset/file-based storage and only persist the file path/reference in state.

2. Do NOT use px coordinates for report overlays.
Use millimeter-based positioning (mm) everywhere internally and visually.

3. Report Templates must become Department-Level Master Templates.
Examples:
- Hematology Master
- Biochemistry Master
- Radiology Master

These masters control:
- stationery artwork
- digital PDF visuals
- typography
- spacing
- overlay coordinates
- signature zones
- default table layout

Inside Test Master:
each test should only SELECT a department master template and optionally override small behavior flags like:
- show methodology
- show interpretation
- commentary
- narrative mode

We must avoid creating 1200 individual report templates.
The system architecture should support inheritance:
Department Master Template -> Individual Test Overrides.

Update the implementation plan accordingly before coding further.
```

That single correction will save you months later.
