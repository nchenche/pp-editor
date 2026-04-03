# PEP-EDIT Documentation — Master Plan (v3 — FINAL)

> This document supersedes plan-v2.md and plan-addendum.md.
> It is the single source of truth for the documentation rewrite.
> All behavior answers, UI screenshots, and toolbar details are integrated.

---

## Table of contents

1. [Final navigation structure](#1-final-navigation-structure)
2. [Section-by-section plan](#2-section-by-section-plan)
3. [Media assets list](#3-media-assets-list)
4. [Implementation phases](#4-implementation-phases)
5. [Final NAV_TREE JavaScript](#5-final-nav_tree-javascript)

---

## 1. Final navigation structure

```
GETTING STARTED
├── Introduction                                  REVISE
├── Quick start: your first peptide               ★ NEW
├── Interface overview                            REVISE
│   ├── Panels & layout                           REVISE (annotated screenshot)
│   ├── BILN editor & chain track                 ★ NEW
│   ├── 2D viewer (2D Sketch)                     ★ NEW
│   ├── 3D viewer                                 ★ NEW
│   ├── Right panel (Library / Output / Jobs)      REVISE
│   └── Sessions                                  minor edits
├── Key concepts                                  ★ NEW
│   ├── BILN notation                             △ moved here
│   ├── Monomers, R-groups & leaving groups       ★ NEW
│   └── PEP-EDIT vs pyPept                        △ moved here
├── Protonation (pH)                              REVISE
└── Conformer generation                          REVISE
    ├── Automatic vs. manual generation           ★ NEW
    ├── Secondary structure constraints (2D)      REVISE
    └── 3D template constraints (scaffold)        REVISE

HOW-TO GUIDES
├── Building a peptide                            REVISE (merge of two old sections)
├── Linking monomers                              REVISE
├── Complex topologies                            REVISE (add screenshots)
├── Adding monomers to the library                KEEP (+ My monomers page details)
└── Exporting results                             ★ NEW

EXAMPLES & USE CASES
├── Microcin J25 (lasso peptide)                  REVISE (add recipe)
├── Semaglutide                                   REVISE (add recipe)
├── Cyclic peptides (L/D)                         KEEP
├── Conformer search with ORCA                    KEEP
├── Protein–peptide prediction (AF3)              KEEP
├── Simulated tempering                           KEEP
└── Peptide docking                               KEEP

REFERENCE
├── Output & export formats                       REVISE (expand)
├── Monomer library & R-groups                    KEEP
├── BILN quick reference                          KEEP (+1 row)
└── Resources & external scripts                  ★ NEW

TROUBLESHOOTING & POLICIES
├── FAQ & common errors                           ★ NEW
├── Limitations & tips                            REVISE
├── Browser compatibility                         ★ NEW
├── How to cite                                   ★ NEW
├── Changelog                                     ★ NEW
└── Accessibility, cookies & contact              REVISE
```

---

## 2. Section-by-section plan

---

### ═══ GETTING STARTED ═══

---

### 2.1 Introduction

**Status:** REVISE

**Keep:**
- Opening paragraph ("PEP-EDIT is a web application…").
- The "Core workflow" info-box (Define → Refine → Generate & Export).

**Remove:**
- n.eko paragraph → move to §2.29.
- Technical details (MongoDB, monomer naming) → belong in §2.4.3.

**Add:**

Positioning statement (after opening paragraph):
```
Unlike PEP-FOLD (which predicts peptide 3D structure from sequence
alone), PEP-EDIT focuses on building, editing and exporting peptide
representations — including non-standard monomers, cyclic and
branched architectures — and provides conformer generation as a
preparation utility, not as a structure prediction method.
```

How to cite info-box (at bottom):
```
**How to cite**
Chevrollier N, Dougha A, Ye C, Stratmann D, Moroy G, Rey J,
Murail S & Tufféry P. PEP-EDIT: an interactive web interface for
the rapid generation and editing of complex peptides.
(manuscript in preparation).

URL: https://pep-edit.rpbs.univ-paris-diderot.fr

Please also cite:
• pyPept — https://doi.org/10.1186/s13321-023-00748-2
• BILN — https://doi.org/10.1021/acs.jcim.2c00703
```

Revised capability list (user-facing only):
```
PEP-EDIT can:
• Build peptides from a BILN sequence, a FASTA upload, or
  interactively from the monomer library.
• Edit existing structures — substitute, delete, or reorder monomers
  (drag-and-drop) while preserving backbone topology.
• Handle standard and non-standard monomers: D-amino acids,
  N-methylated residues, peptidomimetics, capping groups, lipid
  moieties.
• Support linear, cyclic (head-to-tail, disulfide), branched, and
  multi-chain peptide architectures.
• Apply conformational constraints — secondary-structure presets
  (H/E/-) or a 3D template from PDB/mmCIF.
• Control protonation at a user-specified pH (default 7.4).
• Export to 12+ formats across 1D (BILN, HELM, SMILES, InChI),
  2D (SDF), and 3D (PDB, mmCIF, XYZ, SDF, MOL2, PDBQT).
• Manage personal and public monomer libraries with moderated
  contribution.
• Handle constructs of up to 40 monomers.
```

---

### 2.2 Quick start: your first peptide ★ NEW

**Full draft:**

```
## Quick start — your first peptide in 2 minutes

### Step 1 — Enter a sequence

In the BILN editor (top-left), type:

    ac-A-G-K-D-am

This defines: acetyl cap – Ala – Gly – Lys – Asp – amide cap.
The input is live — the 2D Sketch updates as you type, as soon as
the BILN is syntactically valid. No need to press Enter.

  [MEDIA #1: GIF — typing ac-A-G-K-D-am, 2D updating. ~6s]

Alternatively, click **Examples…** in the editor toolbar and pick
a pre-built example to load instantly. There are 15 examples across
6 categories (linear, cyclic, capped, non-natural, secondary
structure constraints, and 3D template constraints).

### Step 2 — Generate 3D

For short peptides (< 8 monomers), **Auto sync** is on by default —
the 3D conformer generates automatically. Check the 3D viewer
(bottom-right).

For longer peptides, or if Auto sync is off, click the
**▶ Generate 3D** button (in the 3D viewer toolbar). A job appears
in the **Jobs** tab (right panel) and the result loads on completion.

  [MEDIA #2: GIF — auto-sync or Generate 3D → 3D appears. ~5s]

### Step 3 — Export

Open the **OUTPUTS** tab (right panel). Formats are grouped into
1D (BILN, HELM, SMILES…), 2D (SDF), and 3D (PDB, mmCIF, XYZ…).
Click the download icon (⬇) on any format, or use the blue
**Download all** button at the top.

  [MEDIA #3: Screenshot — Output tab with sections visible]

### What's next?
• Load a pre-built example → click **Examples…**
• Build from the monomer library → see Building a peptide
• Apply constraints → see Conformer generation
• Add custom monomers → see Adding monomers to the library
```

---

### 2.3 Interface overview

---

#### 2.3.1 Panels & layout

**Action:** Provide annotated screenshot with numbered callouts.

Callout legend:
```
 ① Header navigation: PEP-EDIT logo, Design peptide, My monomers,
    Documentation tabs. Right side: theme toggle, Demo session,
    Session ID chip, + (new session), email, ⚙ Session button.
 ② Editor toolbar: Examples… dropdown, Link mode (hub icon),
    Cut mode (broken chain icon), pH slider (default 7.4),
    Undo/Redo arrows, Upload icon.
 ③ Manual edition: BILN input field (live, updates on every valid
    keystroke). Shows "5/40 monomers" counter.
 ④ Chains section: Structural constraints… dropdown
    (None / Secondary structure / 3D template), + (add chain) button.
    Chain track rows: Sequence row (colored monomer pills with position
    numbers) and constraint row (H/E/- or template mapping).
 ⑤ 2D Sketch: interactive SVG viewer with its own toolbar
    (Link, Unlink, Reset View, Download SVG). Hover tooltip shows
    monomer info (e.g. "A LYS 5 / K / Lysine").
 ⑥ 3D viewer: Mol* canvas with toolbar —
    ▶ Generate 3D, Auto sync toggle, then 8 icons: Representation,
    Color by, Labels, Background, View, Template, Snapshot, Log.
 ⑦ Right panel (collapsible/resizable): three vertical tabs —
    MONOMER LIBRARY, OUTPUTS, JOBS.
```

Workflow-mapping paragraph:
```
The top-left is where you define your peptide (BILN input, chain
track, constraints). The bottom half is where you see it (2D Sketch
on the left, 3D conformer on the right). The right panel provides
resources (monomer library), outputs (export formats), and job history.
```

**Media:** [MEDIA #4] Annotated screenshot with callouts ①–⑦.

---

#### 2.3.2 BILN editor & chain track ★ NEW

**Full draft:**

```
## BILN editor & chain track

### BILN input (Manual edition)

The BILN input is a live text field — changes apply on every
keystroke. The 2D Sketch updates as soon as the input is
syntactically complete (no trailing hyphen, unbalanced parentheses,
or incomplete bond annotations). Incomplete intermediate states
are held silently until the BILN becomes valid.

The field shows a **monomer counter** (e.g. "5/40 monomers").
The editor also accepts HELM notation.

**Validation feedback:**
• Unrecognized monomer symbol → red error text below the 2D Sketch.
• Monomer count exceeds 40 → red border on the input field, red
  caption ("Maximum length reached…"), and a dialog.
• Incomplete syntax (mid-typing) → no error; views stay at the
  last valid state.

### Chain track

Below the BILN input, each chain is displayed as a row of colored
pills. Each pill shows the monomer **symbol** and **position number**.

Color coding:
• Green — natural amino acids
• Orange — non-natural / modified monomers
• Gray — capping groups

**Hover** over a pill → reveals Replace and Delete icons.
**Drag-and-drop** — reorder monomers within or across chains.
Invalid moves (R-group conflicts, cap placement violations) are
rejected with an explanatory dialog.

### Structural constraints dropdown

Click **Structural constraints…** to choose:
• **None** — no constraints.
• **Secondary structure** — per-residue H (helix) / E (strand) /
  - (coil) assignments. A constraint row appears below the chain.
• **3D template** — scaffold from PDB/mmCIF. A template mapping
  row appears showing the template residues.

### Chain row ⋮ menu

Each chain's Sequence row has a ⋮ menu with:
• **Cyclize** — head-to-tail bond (R1 first ↔ R2 last).
• **Mirror** — swap L ↔ D amino acids.
• **Delete chain**

The constraint row has its own ⋮ menu with:
• **All alpha / All beta / All random / Clear**

### Editor toolbar

| Control | Icon | Function |
|---------|------|----------|
| **Examples…** | ▶ | Opens a dialog with 15 pre-built examples across 6 categories. Click **▶ Load** to populate the editor. |
| **Link mode** | Hub/network | Toggle: click two monomers in the chain track to create a bond. BILN input auto-collapses while active. |
| **Cut mode** | Broken chain | Toggle: click a bond to remove it. BILN input auto-collapses. |
| **pH slider** | pH + slider | Set target pH for protonation (default 7.4). |
| **Undo** | ↩ | Undo last action (up to 20 steps). |
| **Redo** | ↪ | Redo undone action. |
| **Upload** | ⬆ | Upload a FASTA file or paste HELM. |

Only one of Link/Cut mode can be active at a time.
Ctrl+Z/Y only work inside the BILN text field (native browser undo),
not for chain track operations — use the toolbar Undo/Redo buttons.

### Multi-chain editing

Click **+** (next to Structural constraints) to add a new chain.
Chains are separated by `.` in the BILN string. Each chain has its
own Sequence and constraint rows.
```

**Media:**
- [MEDIA #5] GIF: type BILN → valid → 2D updates → invalid symbol → red error (~8s)
- [MEDIA #6] Screenshot: chain track with hover state (Replace/Delete icons)
- [MEDIA #7] Screenshot: ⋮ menu on Sequence row

---

#### 2.3.3 2D viewer (2D Sketch) ★ NEW

**Full draft:**

```
## 2D viewer (2D Sketch)

The 2D Sketch (bottom-left) displays an interactive SVG depiction
of the molecule, rendered by RDKit and post-processed for
interactivity.

### Navigation (panzoom)

| Action | Gesture |
|--------|---------|
| Zoom | Scroll wheel (min 0.1×) |
| Pan | Click + drag |
| Reset view | Double-click, or click Reset View (↻) in toolbar |

### 2D Sketch toolbar

| Icon | Tooltip | Function |
|------|---------|----------|
| Hub/network | "Link" | Toggle link mode — click R-groups on monomers to create a bond. |
| Broken chain | "Unlink" | Toggle cut mode — double-click a bond to remove it. |
| Circular arrow | "Reset View" | Reset zoom/pan to the default fitted view. |
| Download | "Download SVG" | Download the 2D depiction as `pep-edit_2d.svg`. |

### Interactions

• **Hover** — mousing over a monomer highlights it simultaneously
  in the 2D Sketch, the chain track, and the 3D viewer. A tooltip
  in the corner shows monomer details (e.g. "A LYS 5 / K / Lysine").
• **Normal mode** — clicking does nothing. Only hover is active.
• **Link mode** — click two compatible R-groups (shown as dashed
  circles) to create a bond.
• **Cut mode** — double-click a non-backbone bond to remove it.

### Link mode banner

When Link mode is activated (from either the editor toolbar or the
2D Sketch toolbar), a banner appears between the chain track and the
2D Sketch: "Link monomers — Select a second R-group to create the
link. You can keep linking." with CLEAR and EXIT buttons.

  [MEDIA #8] GIF: hover sync across 2D, chain track, and 3D (~4s)
```

---

#### 2.3.4 3D viewer ★ NEW

**Full draft:**

```
## 3D viewer

The 3D viewer (bottom-right) displays conformers using Mol*.

### Navigation

| Action | Gesture |
|--------|---------|
| Rotate | Left-click + drag |
| Zoom | Scroll wheel |
| Pan | Right-click + drag (or middle-click + drag) |

### 3D viewer toolbar

The toolbar is located above the Mol* canvas.

**Main controls:**

| Control | Description |
|---------|-------------|
| **▶ Generate 3D** | Submit a conformer generation job manually. |
| **Auto sync** | Toggle live 3D regeneration. ON by default for < 8 monomers; auto-disabled at ≥ 8 monomers (with toast); force-disabled when a 3D template is active. |

**Icon toolbar (left to right):**

| # | Icon | Tooltip | Function |
|---|------|---------|----------|
| 1 | Category | Representation | Opens side panel: Cartoon, Ball & Stick, Spacefill, Backbone, Licorice, Ribbon, Line (with opacity slider), Molecular Surface, Gaussian Surface, Gaussian Volume, Putty. Multiple can be active simultaneously. |
| 2 | Palette | Color by | Opens side panel to choose color scheme (by chain, element, residue type, etc.). |
| 3 | Label | Labels | Opens side panel to toggle atom or residue labels. |
| 4 | Light/Dark | Background | Toggles the Mol* canvas between dark and light background. |
| 5 | Circular arrow | View | Opens side panel with camera controls (reset, lock, etc.). |
| 6 | Layers | Template | Opens scaffold template management panel. Tinted when a template is loaded. |
| 7 | Camera | Snapshot | Downloads a PNG screenshot of the current 3D viewport. |
| 8 | Subject | Log | Opens side panel showing the generation/conformer job log. |

### Mol* controls

Mol*'s built-in panel is accessible via the **"Show panels"** tab
on the right edge of the 3D viewer. This provides advanced
operations (structure annotations, measurements, etc.).

### Representation panel detail

The Representation panel lists all available visual styles as
toggles. Multiple representations can be active at the same time
(e.g. Line + Ball & Stick). The Line representation includes an
**Opacity** slider (default: 80%).

  [MEDIA #9] Screenshot: 3D viewer with Representation panel open
  (use provided screenshot pepedit_3d-viewer_representation-panel.png)
```

---

#### 2.3.5 Right panel (Library / Output / Jobs)

**Status:** REVISE

**Library tab** — keep existing description. Add:
- "Linking process mode" section with Mode dropdown (Append / Prepend / New chain) and Chain selector.
- Small / Large card toggle for monomer card size.
- Monomer cards show: + button (add to sequence), ⓘ (info), structure image, symbol, PDB code, and type label (NATURAL / NON-NATURAL).

**Output tab** — update to match screenshot 2:
```
Header: "Output formats" — "12/12 available"
Controls: Wrap toggle, Expand toggle, Download all (blue icon)

Sections:
• 1D - SEQUENCES & NOTATIONS [5]: BILN, HELM, SMILES, InChI, InChIKey
• 2D - DEPICTION & COORDINATES [1]: SDF 2D
  + Export depiction: SVG, PNG
• 3D - STRUCTURES [6]: PDB, MMCIF, XYZ, SDF 3D, MOL2 Tripos, PDBQT
  + Export snapshot: PNG

Each format row: copy (📋), download (⬇), expand (▼) icons.
```

**Jobs tab** — update to match screenshot 3:
```
Header: "[Session name] jobs ([count])" with REFRESH button.

Table columns: Name | BILN | State | Action

• Name: default "Untitled job" — editable via ⋮ menu → Edit details.
• BILN: the sequence used for this job ("—" for failed jobs).
• State: green "success" chip or red "failed" chip.
• Action: **RESUME** button + ⋮ menu.

**RESUME** loads the job's result back into the editor:
restores the BILN, chain track, constraints, and 3D conformer.
Auto-sync is suppressed to prevent re-triggering a new job.
Disabled for failed jobs.

**⋮ menu** per job:
• Edit details — dialog with editable Name (200 chars) and
  Description (2000 chars), plus read-only Job ID and timestamps.
• Copy BILN — copies the job's BILN to clipboard.
```

---

#### 2.3.6 Sessions

**Status:** minor edits — keep as-is plus:

```
If your browser's localStorage is cleared, the Session ID is lost
locally. Use the Recover tab in the Session dialog to retrieve it
by email.
```

---

### 2.4 Key concepts ★ NEW

---

#### 2.4.1 BILN notation

Move from top-level. Add definition box:
```
BILN (Boehringer Ingelheim Line Notation) is a text format that
describes a peptide as a list of monomers connected through numbered
attachment points (R-groups). PEP-EDIT uses BILN as its primary
sequence representation.
```
Keep all existing content. Add cross-reference to BILN quick reference.

---

#### 2.4.2 Monomers, R-groups & leaving groups ★ NEW

```
**Monomer** — building block of a peptide. Identified by:
• Name (human-readable, e.g. "Alanine")
• Symbol (BILN identifier, e.g. "Ala") — must be unique
• PDB code (3-letter, e.g. "ALA")

**R-group** — numbered attachment point:
• R1 = backbone nitrogen (N-terminal)
• R2 = backbone carbonyl carbon (C-terminal)
• R3+ = side chain, branching, modifications

One R-group → cap. Two → standard backbone unit. Three+ → branching/
cyclization site.

**Leaving group** — atom that caps an unconnected R-group: H or OH.
```

Reuse existing `Monomer6.png` figure.

---

#### 2.4.3 PEP-EDIT vs pyPept

Move from top-level. Keep as-is — no changes.

---

### 2.5 Protonation (pH)

**Status:** REVISE

Replace the `site_substructures.smarts` reference with:
```
At physiological pH (7.4):
• Terminal amines and charged side chains (Lys, Arg, His) → protonated
• Terminal carboxylates and acidic side chains (Asp, Glu) → deprotonated
• Amide bonds, phenols (Tyr), imides → neutral
```

Add guidance on when to adjust pH and limitation note (Dimorphite-DL
doesn't account for microenvironment effects).

---

### 2.6 Conformer generation

---

#### 2.6.1 Automatic vs. manual generation ★ NEW

**Full draft:**

```
### Auto sync (live preview)

A toggle labeled **Auto sync** is in the 3D viewer toolbar.

• **ON by default** for < 8 monomers — 3D regenerates automatically.
• **Auto-disabled** at ≥ 8 monomers (toast notification).
• **Force-disabled** when a 3D template is active.
• Toggle state persists across reloads (localStorage).

### Manual generation

Click **▶ Generate 3D** when:
• Auto sync is off (≥ 8 monomers or manually toggled)
• A 3D template is active
• You want to retry after failure

### What happens

1. Job created → appears in **Jobs** tab.
2. Status: queued → running → **success** or **failed**.
   (Polled at ~250ms intervals.)
3. Success → conformer loads in 3D viewer.
4. Failure → red "failed" chip in Jobs tab. See FAQ.

### Under the hood (collapsible)

[Technical detail about RDKit distance-geometry embedding,
coordinate maps, and iterative mapping ratios. Place inside
a collapsible panel for power users.]
```

---

#### 2.6.2 Secondary structure constraints (2D)

Keep existing content. Add:
- "Constraints appear as a row below the chain track."
- "Use the ⋮ menu on the Secondary Structure row for bulk operations."
- "D-amino acids: angles are automatically mirrored in Ramachandran space."
- Move `mapping_ratios` code block to §2.6.1 (under the hood).

---

#### 2.6.3 3D template constraints (scaffold)

Keep existing content. Add step-by-step recipe:
```
1. Click **Structural constraints…** → select **3D template**.
2. Click **Upload Scaffold** (or use the Template icon in the 3D
   viewer toolbar).
3. Enter PDB ID or upload PDB/mmCIF file.
4. Select chain and residue range.
5. Set offset (leading unconstrained positions).
6. Optionally mask individual residues.
7. Click **▶ Generate 3D** (auto-sync is force-disabled).
```

Add decision guidance:
```
• Secondary structure → generic fold without a reference structure.
• 3D template → preserve topology from an experimental/modeled structure.
```

---

### ═══ HOW-TO GUIDES ═══

---

### 2.7 Building a peptide

Merge "Editing a BILN sequence" + "Editing from monomer library":

```
## Building a peptide

### From a BILN string
Type/paste in the BILN editor. Input is live. Multi-chain: `.`

### From a FASTA file
Click Upload icon (editor toolbar). Standard 20 AAs only.

### From an example
Click **Examples…** → browse 6 categories (15 examples) → **▶ Load**.
The BILN and any associated constraints are loaded automatically.

  [MEDIA: use provided pepedit_examples.png screenshot]

### From the monomer library
Open MONOMER LIBRARY tab. Use Search and class filters (ALL / CAPS /
NATURAL / NON-NATURAL). Linking process mode:
• Mode: Append / Prepend / New chain
• Chain selector
Click + on a monomer card to add it.

### Editing an existing sequence
• Replace — hover pill → Replace icon → pick from library.
• Delete — hover pill → Delete icon.
• Reorder — drag and drop (validated for R-group compatibility).
• Undo/Redo — toolbar buttons (up to 20 steps).
• Cyclize/Mirror — ⋮ menu on Sequence row.

No arbitrary mid-chain insertion — use Append/Prepend then drag.
```

---

### 2.8 Linking monomers

Keep existing. Add intro ("When to use: disulfides, side-chain links,
lipidation, inter-chain bonds"). Add:

```
### Link mode

Link mode can be activated from **two places**:
• The **editor toolbar** (hub icon) — click two monomers in the
  chain track.
• The **2D Sketch toolbar** (hub icon) — click two R-groups in
  the 2D depiction.

When active, a banner appears: "Link monomers — Select a second
R-group to create the link. You can keep linking."
Click **CLEAR** to reset the selection, **EXIT** to leave Link mode.

### Cut mode

Similarly activated from editor toolbar or 2D Sketch toolbar
(broken chain icon). Double-click a non-backbone bond in the 2D
Sketch to remove it.
```

Use provided `pepedit_link-active.png` screenshot.

---

### 2.9 Complex topologies

Keep all BILN examples. Add a 2D Sketch screenshot for each topology:
[MEDIA #12a–d: cyclic, disulfide, branched, multi-chain]

---

### 2.10 Adding monomers to the library

Keep the excellent 5-step wizard walkthrough. Add note about the
**My monomers page**:

```
### My monomers page

The full monomer management interface is on the dedicated
**My monomers** page (header navigation). From there you can:

• **+ CREATE** — launch the 5-step wizard
• **IMPORT SDF** — bulk-import from file
• **EXPORT SDF** — back up your collection
• **SUBMIT FOR REVIEW** — propose monomers for the public library
  (reviewed by maintainers)
• **COLUMNS** — customize visible table columns
• Per-row actions: edit (✏), download (⬇), delete (🗑), more (⋮)

The table shows: Image, Symbol, Name, PDB, Type, Subtype,
Canonical SMILES, R groups.
```

Use provided `pepedit_my-monomers.png` screenshot.

---

### 2.11 Exporting results ★ NEW

```
## Exporting results

### Output tab
Open the **OUTPUTS** tab (right panel). Header shows the number
of available formats (e.g. "12/12 available").

**Panel controls:**
• **Wrap** — wraps long text (SMILES, InChI) for readability.
• **Expand** — opens all accordion sections at once.
• **Download all** (blue icon) — downloads every format.

### Format sections
• **1D - SEQUENCES & NOTATIONS** [5]: BILN, HELM, SMILES, InChI,
  InChIKey
• **2D - DEPICTION & COORDINATES** [1]: SDF 2D + Export depiction
  (SVG, PNG of the 2D Sketch)
• **3D - STRUCTURES** [6]: PDB, MMCIF, XYZ, SDF 3D, MOL2 Tripos,
  PDBQT + Export snapshot (PNG of the 3D viewer)

Each row has copy (📋) and download (⬇) buttons.

### When do outputs update?
• 1D/2D: immediately on sequence change.
• 3D: after a successful conformer job.
• All: when pH is adjusted.

### Choosing the right format
| I need to…                               | Format          |
|------------------------------------------|-----------------|
| AlphaFold 3 / Chai / Boltz input         | SMILES          |
| Molecular dynamics (OpenMM, GROMACS)     | PDB + SMILES    |
| Docking (AutoDock Vina / ADCP)           | PDBQT           |
| Quantum chemistry (ORCA, Gaussian)       | XYZ             |
| Compound database registration           | InChI / InChIKey|
| Visualization (PyMOL, ChimeraX)          | PDB or MMCIF    |
| Substructure search / fingerprints       | SDF 2D / SMILES |
| Share peptide definition                 | BILN or HELM    |
```

---

### ═══ EXAMPLES & USE CASES ═══

---

### 2.12 Microcin J25 — add step-by-step recipe

```
Steps to reproduce:
1. Click Upload (editor toolbar) and paste the FASTA sequence.
2. Replace residue 19 (Phe) → search "Phe_3Cl" in library → +.
3. Define macrolactam ring in BILN (Glu8 R3 → Gly1 R1).
4. Structural constraints… → 3D template.
5. Upload Scaffold → PDB ID: 1Q71 → chain A.
6. ▶ Generate 3D.
```

(Author to verify exact BILN bond annotations.)

### 2.13 Semaglutide — add step-by-step recipe

Note: SemaB is in the public library. Add two sub-recipes:
without template, and with template (PEP-FOLD4 → upload → offset 2).

### 2.14–2.19 — KEEP as-is, add one-line "Goal:" to each.

---

### ═══ REFERENCE ═══

---

### 2.20 Output & export formats

Keep the 1D/2D/3D table. Add "Format details" subsection:

```
**PDB** — ATOM records for all monomers (including non-standard).
3-letter PDB codes from monomer definitions (may not be unique).
CONECT records for non-standard bonds. Chain IDs: A, B, C…

**PDBQT** — Standard AutoDock format via Open Babel. Gasteiger
charges assigned automatically. Directly compatible with
AutoDock Vina and AutoDock 4.

**MOL2 Tripos** — Sybyl atom types (C.ar, N.am, O.2). Not GAFF.

**SDF 2D / SDF 3D** — V2000 format (999-atom limit, unlikely to
matter for ≤ 40 monomers).

**XYZ** — Element + Cartesian coordinates. No connectivity.

**MMCIF** — PDBx/mmCIF format.

**1D formats** — SMILES reflects protonation at selected pH.
InChI/InChIKey computed from protonated SMILES.
```

---

### 2.21 Monomer library & R-groups — KEEP

### 2.22 BILN quick reference — KEEP, add row:
```
| Multiple chains (separator) | `A-G-K.E-H-I` |
```

### 2.23 Resources & external scripts ★ NEW

Table of companion repos (goat-pep, smiles-fold-input-builder,
Pep-Edit_ST) and related tools (pyPept, BILN, PEP-FOLD4,
Dimorphite-DL, RDKit, Mol*, Open Babel). Full draft in plan v2.

---

### ═══ TROUBLESHOOTING & POLICIES ═══

---

### 2.24 FAQ & common errors ★ NEW

Full FAQ covering:
- Invalid BILN / red error
- Maximum length reached
- Conformer generation failed (+ retry advice)
- Auto sync turned off by itself / won't turn on
- Lost session / recovery
- Offline usage (not supported)
- 3D viewer blank (WebGL)
- Ctrl+Z doesn't undo (use toolbar buttons)
- RESUME button behavior
- How to cite (cross-reference)

(Full draft in plan v2.)

---

### 2.25 Limitations & tips — REVISE

Keep: 40 monomer limit, no chemical bond validation, SS presets
provide bias not prediction.
Remove: items now in FAQ or §2.6.1.
Add: performance note for >20 monomers, drag-and-drop workaround.

---

### 2.26 Browser compatibility ★ NEW

```
Chrome, Firefox, Edge: ✅ (Linux, macOS, Windows)
Safari: ✅
Mobile: ⚠️ functional, not optimized

Requirements: JS, WebGL 2.0, cookies, ≥1024px recommended.
```

---

### 2.27 How to cite ★ NEW

```
Chevrollier N, Dougha A, Ye C, Stratmann D, Moroy G, Rey J,
Murail S & Tufféry P. PEP-EDIT: an interactive web interface for
the rapid generation and editing of complex peptides.
(manuscript in preparation).

URL: https://pep-edit.rpbs.univ-paris-diderot.fr
Also cite: pyPept (doi), BILN (doi).
```

---

### 2.28 Changelog ★ NEW

```
### v1.0.0 — [release date]
• Initial public release.
• Standard + non-standard monomers (BILN, library, FASTA).
• Conformer generation with SS and 3D template constraints.
• 12 export formats (1D/2D/3D).
• Session management, sharing, recovery.
• 15 built-in examples.
• Collaborative n.eko instance.
```

---

### 2.29 Accessibility, cookies & contact — REVISE

Keep: free, no tracking cookies.
Add:
```
**Contact:** nicolas.chevrollier@u-paris.fr,
pierre.tuffery@u-paris.fr, julien.rey@u-paris.fr
RPBS Discourse: https://discourse.rpbs.univ-paris-diderot.fr

**Collaborative instance (n.eko):**
https://neko.rpbs.univ-paris-diderot.fr?usr=guest&pwd=rpbs
Multi-user shared-screen sessions for collaboration and teaching.
```

---

## 3. Media assets list

### New media to produce

| # | Section | Type | Description | Phase |
|---|---------|------|-------------|-------|
| 1 | §2.2 Quick start | GIF | Typing `ac-A-G-K-D-am`, 2D updating live (~6s) | P1 |
| 2 | §2.2 Quick start | GIF | Generate 3D → 3D viewer populates (~5s) | P1 |
| 3 | §2.2 Quick start | Screenshot | Output tab with Download all visible | P1 |
| 4 | §2.3.1 Panels | Annotated screenshot | Interface with ①–⑦ callouts | P1 |
| 5 | §2.3.2 BILN editor | GIF | Type BILN → valid → 2D → invalid → red error (~8s) | P2 |
| 6 | §2.3.2 Chain track | Screenshot | Hover state with Replace/Delete icons | P2 |
| 7 | §2.3.2 Chain ⋮ | Screenshot | ⋮ menu open on Sequence row | P2 |
| 8 | §2.3.3 2D viewer | GIF | Hover sync 2D ↔ chain track ↔ 3D (~4s) | P2 |
| 10 | §2.7 Building | Screenshot | Upload dialog/button | P2 |
| 11 | §2.8 Linking | GIF (opt) | Link mode: R-group → R-group → bond (~5s) | P2 |
| 12a–d | §2.9 Topologies | Screenshots ×4 | 2D: cyclic, disulfide, branched, multi-chain | P4 |
| 13 | §2.6.1 Conformer | Screenshot | Jobs tab: success + failed | P1 |
| 14 | §2.11 Exporting | Screenshot | Output tab with accordions expanded | P3 |
| 15 | §2.12 Microcin | GIF (opt) | Recipe steps 1–3 | P4 |

### Provided screenshots (to use directly or as basis for annotations)

| File | Use in | Notes |
|------|--------|-------|
| `pepedit_design-page_library.png` | §2.3.1 (annotate), §2.7 | Main interface with Library panel |
| `pepedit_design-page_outputs.png` | §2.11, §2.3.5 | Output panel detail |
| `pepedit_design-page_jobs.png` | §2.3.5, §2.6.1 | Jobs panel with success/failed |
| `pepedit_my-monomers.png` | §2.10 | My monomers full page |
| `pepedit_link-active.png` | §2.8, §2.3.3 | Link mode with banner + R-groups |
| `pepedit_3d-viewer_representation-panel.png` | §2.3.4 | 3D viewer with Representation panel open |
| `pepedit_jobs_edit-details.png` | §2.3.5 | Edit Job Details dialog |
| `pepedit_examples.png` | §2.2, §2.7 | Examples dialog with categories |

### Existing images to keep (already in `/assets/documentation/`)

All current images remain: PEP-EDIT-Interface-v2.png, SecondaryStructure.png,
3DTemplateProcess.png, MonomerSelection.png, Linking-Unlinking.png,
Monomer6.png, create-monomer steps 1–5, mccJ25, Semaglutide (×2),
OctaL, OctaD4L, cilengitide, 7P8X, ST-cilengitide, BAD docking (×2).

---

## 4. Implementation phases

| Phase | Sections | Media needed | Impact |
|-------|----------|--------------|--------|
| **P1** | Quick start (§2.2), Annotated interface (§2.3.1), Auto/manual gen (§2.6.1), FAQ (§2.24), How to cite (§2.27) | #1, #2, #3, #4, #13 + provided screenshots | **Unblocks new users** |
| **P2** | BILN editor (§2.3.2), 2D viewer (§2.3.3), 3D viewer (§2.3.4), Right panel update (§2.3.5), Building a peptide (§2.7), Linking update (§2.8), Key concepts (§2.4), Protonation (§2.5) | #5–#8, #10, #11 + provided screenshots | **Self-sufficient docs** |
| **P3** | Exporting (§2.11), Output formats (§2.20), Resources (§2.23), Browser compat (§2.26), Changelog (§2.28), Contact (§2.29), Sessions edit (§2.3.6), My monomers page (§2.10) | #14 | **Complete reference** |
| **P4** | Microcin recipe (§2.12), Semaglutide recipe (§2.13), Topology screenshots (§2.9), Limitations (§2.25), Constraint sections (§2.6.2, §2.6.3) | #12a–d, #15 | **Reproducible examples** |
| **P5** | NAV_TREE update, cross-reference audit, proofreading | — | **Polish** |

---

## 5. Final NAV_TREE JavaScript

```javascript
const NAV_TREE = [
  {
    group: "Getting started",
    children: [
      { id: "introduction", label: "Introduction" },
      { id: "quick-start", label: "Quick start" },
      {
        id: "interface-overview", label: "Interface overview",
        children: [
          { id: "panels", label: "Panels & layout" },
          { id: "biln-editor", label: "BILN editor & chain track" },
          { id: "viewer-2d", label: "2D viewer (2D Sketch)" },
          { id: "viewer-3d", label: "3D viewer" },
          { id: "right-panel", label: "Right panel" },
          { id: "sessions", label: "Sessions" },
        ],
      },
      {
        id: "key-concepts", label: "Key concepts",
        children: [
          { id: "biln-notation", label: "BILN notation" },
          { id: "monomers-rgroups", label: "Monomers, R-groups & leaving groups" },
          { id: "pepedit-vs-pypept", label: "PEP-EDIT vs pyPept" },
        ],
      },
      { id: "protonation", label: "Protonation (pH)" },
      {
        id: "conformer-generation", label: "Conformer generation",
        children: [
          { id: "auto-vs-manual", label: "Automatic vs. manual" },
          { id: "constraints-2d", label: "Secondary structure (2D)" },
          { id: "constraints-3d", label: "3D template (scaffold)" },
        ],
      },
    ],
  },
  {
    group: "How-to guides",
    children: [
      { id: "building-peptide", label: "Building a peptide" },
      { id: "linking", label: "Linking monomers" },
      { id: "complex-topologies", label: "Complex topologies" },
      { id: "adding-monomers", label: "Adding monomers to the library" },
      { id: "exporting", label: "Exporting results" },
    ],
  },
  {
    group: "Examples & use cases",
    children: [
      { id: "example-microcin", label: "Microcin J25 (lasso peptide)" },
      { id: "example-semaglutide", label: "Semaglutide" },
      { id: "example-cyclic", label: "Cyclic peptides (L/D)" },
      { id: "example-orca", label: "Conformer search with ORCA" },
      { id: "example-alphafold", label: "Protein–peptide prediction" },
      { id: "example-st", label: "Simulated tempering" },
      { id: "example-docking", label: "Peptide docking" },
    ],
  },
  {
    group: "Reference",
    children: [
      { id: "output-formats", label: "Output & export formats" },
      { id: "monomer-library-ref", label: "Monomer library & R-groups" },
      { id: "biln-quick-ref", label: "BILN quick reference" },
      { id: "resources", label: "Resources & external scripts" },
    ],
  },
  {
    group: "Troubleshooting & policies",
    children: [
      { id: "faq", label: "FAQ & common errors" },
      { id: "limitations", label: "Limitations & tips" },
      { id: "browser-compat", label: "Browser compatibility" },
      { id: "how-to-cite", label: "How to cite" },
      { id: "changelog", label: "Changelog" },
      { id: "policies", label: "Accessibility, cookies & contact" },
    ],
  },
];
```

---

*End of master plan v3. All UI details, toolbar descriptions,
behavior answers, and screenshots are integrated. No open questions remain.
Ready for implementation.*
