# PEP-EDIT Documentation — Final Restructuring Plan (v2)

> **Updated** with all answers to behavior and content questions integrated.
> This document is the single source of truth for the documentation rewrite.
> For each section: Status, Action, Draft content, and Media needs.

---

## Table of contents

1. [Revised navigation structure (NAV_TREE)](#1-revised-navigation-structure)
2. [Section-by-section plan](#2-section-by-section-plan)
   - GETTING STARTED (§2.1–2.6)
   - HOW-TO GUIDES (§2.7–2.11)
   - EXAMPLES & USE CASES (§2.12–2.19)
   - REFERENCE (§2.20–2.23)
   - TROUBLESHOOTING & POLICIES (§2.24–2.29)
3. [Media assets list](#3-media-assets-list)
4. [Implementation phases](#4-implementation-phases)

---

## 1. Revised navigation structure

Changes from v1 of the plan are marked with `△` (moved/renamed) or `★` (new).

```
GETTING STARTED
├── Introduction                                  REVISE
├── Quick start: your first peptide               ★ NEW
├── Interface overview                            REVISE
│   ├── Panels & layout                           REVISE (annotated screenshot)
│   ├── BILN editor & chain track                 ★ NEW (split from old "Editing BILN")
│   ├── 2D viewer                                 ★ NEW
│   ├── 3D viewer                                 ★ NEW
│   ├── Right panel (Library / Output / Jobs)      minor edits
│   └── Sessions                                  minor edits
├── Key concepts                                  ★ NEW
│   ├── BILN notation                             △ moved here from top-level
│   ├── Monomers, R-groups & leaving groups       ★ NEW
│   └── PEP-EDIT vs pyPept                        △ moved here (demoted)
├── Protonation (pH)                              REVISE
└── Conformer generation                          REVISE (reorganized)
    ├── Automatic vs. manual generation           ★ NEW
    ├── Secondary structure constraints (2D)      REVISE
    └── 3D template constraints (scaffold)        REVISE

HOW-TO GUIDES
├── Building a peptide (BILN / FASTA / Library)   REVISE (merge of two old sections)
├── Linking monomers                              minor edits
├── Complex topologies                            REVISE (add topology screenshots)
├── Adding monomers to the library                KEEP (already excellent)
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
├── Changelog                                     ★ NEW (minimal)
└── Accessibility, cookies & contact              REVISE (add contact)
```

---

## 2. Section-by-section plan

---

### ═══ GETTING STARTED ═══

---

### 2.1 Introduction

**Status:** REVISE

#### Keep
- Opening paragraph ("PEP-EDIT is a web application for the easy and rapid…").
- The "Core workflow" info-box (Define → Refine → Generate & Export).

#### Remove
- The n.eko paragraph → move to §2.29 (Accessibility, cookies & contact).
- Technical bullet points about MongoDB, monomer naming conventions → these belong in §2.4.3 (PEP-EDIT vs pyPept).

#### Add
- **Positioning statement** (add after opening paragraph):

```
Unlike PEP-FOLD (which predicts peptide 3D structure from sequence alone),
PEP-EDIT focuses on building, editing and exporting peptide representations
— including non-standard monomers, cyclic and branched architectures —
and provides conformer generation as a preparation utility, not as a
structure prediction method.
```

- **How to cite call-out** (info box at bottom of Introduction):

```
**How to cite**
Chevrollier N, Dougha A, Ye C, Stratmann D, Moroy G, Rey J, Murail S
& Tufféry P. PEP-EDIT: an interactive web interface for the rapid
generation and editing of complex peptides. (manuscript in preparation).

URL: https://pep-edit.rpbs.univ-paris-diderot.fr

Please also cite the underlying tools:
• pyPept: Dougha A, et al. J Cheminform (2023).
  https://doi.org/10.1186/s13321-023-00748-2
• BILN: Dougha A, et al. J Chem Inf Model (2022).
  https://doi.org/10.1021/acs.jcim.2c00703
```

(This call-out is also repeated in §2.27, but having it here helps users who never scroll to the bottom.)

#### Revised capability list (tightened, user-facing only)

```
PEP-EDIT can:
• Build peptides from a BILN sequence, a FASTA upload, or interactively
  from the monomer library.
• Edit existing structures — substitute, add, remove, or reorder monomers
  (drag-and-drop) while preserving backbone topology.
• Handle standard and non-standard monomers: D-amino acids,
  N-methylated residues, peptidomimetics, capping groups, lipid moieties.
• Support linear, cyclic (head-to-tail, disulfide), branched, and
  multi-chain peptide architectures.
• Apply conformational constraints — secondary-structure presets (H/E/-)
  or a 3D template from PDB/mmCIF.
• Control protonation at a user-specified pH (default 7.4).
• Export to 12+ formats across 1D (BILN, HELM, SMILES, InChI),
  2D (SDF), and 3D (PDB, mmCIF, XYZ, SDF, MOL2, PDBQT) representations.
• Manage personal and public monomer libraries with collaborative
  moderation.
• Handle constructs of up to 40 monomers.
```

---

### 2.2 Quick start: your first peptide ★ NEW

**Status:** NEW — highest-impact addition.

#### Full draft

```
## Quick start — your first peptide in 2 minutes

This walkthrough builds a capped tetrapeptide, generates its 3D
conformer, and downloads the result. No prior knowledge required.

### Step 1 — Enter a sequence

In the BILN editor (top-left), type:

    ac-A-G-K-D-am

This defines: acetyl cap – Ala – Gly – Lys – Asp – amide cap.

The input is live — the 2D viewer updates as you type, as soon as
the BILN is syntactically complete. No need to press Enter.

  [MEDIA #1: GIF — typing ac-A-G-K-D-am character by character,
   2D viewer updating when the BILN becomes valid.
   Duration: ~6 seconds loop. Highlight: BILN input field + 2D area.]

### Step 2 — Generate 3D

For short peptides (< 8 monomers), **Auto sync** is ON by default:
a 3D conformer is generated automatically after each valid edit.
Check the 3D viewer — your conformer should already be there.

If Auto sync is off (or if you're working with ≥ 8 monomers),
click the **Generate 3D** button. A job appears in the **Jobs** tab
(right panel) and the 3D viewer loads the result on completion.

  [MEDIA #2: GIF — 3D viewer populating (either via auto-sync
   or via clicking Generate 3D). Show the Jobs tab briefly.
   Duration: ~5 seconds.]

### Step 3 — Export

Open the **Output** tab (right panel). Each format is presented
as a collapsible section with **Copy** and **Download** buttons.
Click **Download all** at the top to get every format at once.

  [MEDIA #3: Screenshot — Output tab with several sections
   expanded and the Download all button visible.]

### What's next?

• Try a real-world example → see Examples & use cases
• Build from the monomer library → see Building a peptide
• Apply secondary-structure constraints → see Conformer generation
• Add custom monomers → see Adding monomers to the library
```

---

### 2.3 Interface overview

---

#### 2.3.1 Panels & layout

**Status:** REVISE

#### Keep
- The existing figure (`PEP-EDIT-Interface-v2.png`).
- The numbered list of 4 areas.

#### Replace / Add
- **Replace the figure** (or overlay annotations) with numbered callouts:

```
Callout legend for the annotated interface screenshot:

 ① BILN input field (live — updates on every keystroke when valid)
 ② Chain track (colored monomer pills; drag-and-drop reordering)
 ③ Constraint track (H / E / - per residue)
 ④ Editor toolbar: Generate 3D / Auto sync toggle / Link mode /
    Cut mode / Undo / Redo / pH slider
 ⑤ 2D viewer (interactive SVG with panzoom — scroll to zoom,
    drag to pan, double-click to reset)
 ⑥ 3D viewer (Mol* — left-drag to rotate, scroll to zoom,
    right-drag to pan)
 ⑦ Right panel collapse/resize handle
 ⑧ Right panel tabs: Library / Output / Jobs
 ⑨ Session button (header) — click to manage sessions
```

- **Add a workflow-mapping paragraph** after the callout legend:

```
The left side is where you define and refine your peptide (input,
chains, constraints). The center is where you see it (2D chemical
structure, 3D conformer). The right side is where you access
resources (monomer catalog), outputs (export formats), and job
history.
```

**Media needed:** [MEDIA #4] Annotated screenshot with numbered callouts (①–⑨). You produce the image; the legend above defines what each number points to.

---

#### 2.3.2 BILN editor & chain track ★ NEW

**Status:** NEW

#### Full draft

```
## BILN editor & chain track

### BILN input

The BILN input field is a live text editor — there is no "Apply"
button or Enter-to-submit. Changes are applied on every keystroke.
The 2D viewer updates as soon as the input is syntactically complete
(no trailing hyphen, no unbalanced parentheses, no incomplete bond
annotations). Incomplete intermediate states are held silently until
the BILN becomes valid.

The editor also accepts HELM notation: paste a HELM string and
PEP-EDIT will convert it.

**Validation feedback:**
• If a monomer symbol is not recognized, a red error message appears
  below the 2D viewer.
• If the monomer count exceeds 40, the text field gets a red border
  with a caption ("Maximum length reached…") and a dialog appears.
• For incomplete syntax (mid-typing), no error is shown — the views
  simply remain at the last valid state.

  [MEDIA #5: GIF — typing a BILN string, 2D updating when valid,
   then typing an invalid symbol and seeing the red error below 2D.
   ~8 seconds loop.]

### Chain track

Below the BILN input, each chain is displayed as a row of colored
pills representing monomers:
• Green — natural amino acids
• Orange — non-natural / modified monomers
• Gray — capping groups
(See Monomer library & R-groups for the full color legend.)

**Hover** over a pill to reveal action icons:
• **Replace** — opens the library panel to pick a replacement monomer.
  The swap preserves existing connections where possible.
• **Delete** — removes this monomer from the chain.

**Drag-and-drop** — monomers can be reordered by dragging within or
across chains. The move is validated for R-group compatibility and
cap placement rules. If the move is invalid (e.g. R-group conflict
or cyclic bond issue), a dialog explains why and the move is reverted.

  [MEDIA #6: Screenshot — chain track with hover state showing
   Replace and Delete icons on a monomer pill.]

### Editor toolbar

The toolbar above the chain track provides:

| Control | Function |
|---------|----------|
| **Generate 3D** | Submit a 3D conformer generation job (manual trigger). |
| **Auto sync** | Toggle live 3D preview. ON by default for < 8 monomers; auto-disabled at ≥ 8 monomers and when a 3D template is active. |
| **Link mode** | Click two compatible R-groups in the 2D viewer to create a bond. |
| **Cut mode** | Click a non-backbone bond in the 2D viewer to remove it. |
| **Undo / Redo** | Up to 20 history entries. (Note: Ctrl+Z/Y only work inside the BILN text field, not for chain track actions.) |
| **pH slider** | Set the target pH for protonation (default: 7.4). |

### Chain actions (⋮ menu)

Each chain row has a context menu (⋮) with:
• **Cyclize** — form a head-to-tail bond (R1 of first residue ↔ R2 of last).
• **Mirror** — swap all L-amino acids to their D-forms and vice versa.
• **Constraint bulk-set** — assign H (helix), E (strand), or - (coil)
  to every residue in the chain at once.
• **Clear constraints** — remove all constraints from the chain.
• **Delete chain** — remove the entire chain.

  [MEDIA #7: Screenshot — ⋮ menu open on a chain row, showing
   Cyclize, Mirror, and constraint options.]

### Multi-chain editing

Click the **+ (Add chain)** button in the chains toolbar to create
a new chain. Chains are separated by `.` in the BILN string. Each
chain has its own constraint track. To link chains, use the Link
mode or write explicit BILN bond annotations (see §Linking monomers).
```

---

#### 2.3.3 2D viewer ★ NEW

**Status:** NEW

#### Full draft

```
## 2D viewer

The 2D viewer (center-left) displays an interactive SVG depiction
of the molecule, rendered by RDKit and post-processed for interactivity.

### Navigation (panzoom)

| Action | Gesture |
|--------|---------|
| **Zoom** | Scroll wheel (min 0.1×) |
| **Pan** | Click + drag |
| **Reset view** | Double-click, or use the toolbar reset button |

### Interactions

• **Hover** — mousing over a monomer highlights it in the 2D view,
  the chain track, and the 3D viewer simultaneously.
• **Normal mode** — clicking does nothing. Only hover is active.
• **Link mode** — click two compatible R-groups (shown as colored
  circles) to create a bond between them.
• **Cut mode** — click a non-backbone bond to remove it.

  [MEDIA #8: GIF — hovering over a monomer in the 2D viewer,
   showing synchronized highlighting in the chain track and
   3D viewer. ~4 seconds loop.]

### Error display

If a BILN symbol is not recognized, a red error message appears
at the bottom of the 2D viewer panel.
```

---

#### 2.3.4 3D viewer ★ NEW

**Status:** NEW

#### Full draft

```
## 3D viewer

The 3D viewer (center-right) displays conformers using Mol*.

### Navigation

| Action | Gesture |
|--------|---------|
| **Rotate** | Left-click + drag |
| **Zoom** | Scroll wheel |
| **Pan** | Right-click + drag (or middle-click + drag) |

### Toolbar

The 3D viewer toolbar provides controls for:
• **Representation** — ball-and-stick, cartoon, spacefill, etc.
• **Color scheme** — by chain, by element, by residue type, etc.
• **Labels** — toggle residue or atom labels.
• **Background** — white, black, or custom color.
• **Camera** — reset orientation, export snapshot.

### Mol* controls

Mol*'s built-in right-panel controls are available for advanced
operations (measurement, structure annotations, etc.).

### Hover synchronization

Hovering over a monomer in the 3D viewer highlights the
corresponding pill in the chain track and the corresponding
atoms in the 2D viewer.

  [MEDIA #9: Screenshot — 3D viewer with a peptide displayed,
   toolbar visible, ball-and-stick representation.]
```

---

#### 2.3.5 Right panel (Library / Output / Jobs)

**Status:** minor edits only.

#### Changes to existing content
- In the panel intro, add: *"The panel can be resized by dragging its left edge."*
- In the **Output** card, add: *"Formats reflect the current pH setting — adjusting the pH slider updates protonation in all exports."*
- In the **Jobs** card, add: *"A failed job typically means RDKit could not embed a valid conformer — see FAQ & common errors for troubleshooting."*

Everything else stays as-is.

---

#### 2.3.6 Sessions

**Status:** minor edits only.

#### Add
- After "Subsequent visits: the stored Session ID is reloaded…":

```
If your browser's localStorage is cleared (e.g. by clearing
browsing data), the Session ID is lost locally. Use the **Recover**
tab in the Session dialog to retrieve it by email.
```

- No other changes. The Share / Recover / Email cards are well-documented.

---

### 2.4 Key concepts ★ NEW

---

#### 2.4.1 BILN notation

**Status:** △ MOVE + light REVISE (currently top-level "About BILN notation")

#### Changes
- Move from top-level Getting Started into this "Key concepts" sub-tree.
- Add a definition box at the top:

```
**BILN** (Boehringer Ingelheim Line Notation) is a text format that
describes a peptide as a list of monomers connected through numbered
attachment points (R-groups). PEP-EDIT uses BILN as its primary
sequence representation.
```

- Keep all existing content (explicit form, shorthand, bracket disambiguation).
- Add a cross-reference at the bottom: *"See the BILN quick reference table for a complete syntax cheat sheet."*

---

#### 2.4.2 Monomers, R-groups & leaving groups ★ NEW

**Status:** NEW

#### Full draft

```
### Monomers, R-groups & leaving groups

#### Monomer

A monomer is the building block of a peptide in PEP-EDIT. It can be:
• A standard (proteinogenic) amino acid — Ala, Gly, Leu…
• A non-standard amino acid — D-forms (dAla), N-methylated (meV),
  halogenated (Phe_3Cl), sulfated (Tyr_SO3H)…
• A capping group — acetyl (ac), amide (am)…
• A peptidomimetic or custom chemical moiety.

Each monomer is identified by three labels:
• **Name** — human-readable (e.g. "Alanine").
• **Symbol** — BILN identifier used in sequences (e.g. "Ala").
  Must be unique within the library.
• **PDB code** — 3-letter residue code for PDB output (e.g. "ALA").

  [MEDIA: reuse existing Monomer6.png figure here.]

#### R-group (attachment point)

An R-group is a numbered site on a monomer where a chemical bond
can form with another monomer. By convention:

| R-group | Typical role |
|---------|-------------|
| **R1** | Backbone nitrogen (N-terminal side) |
| **R2** | Backbone carbonyl carbon (C-terminal side) |
| **R3, R4…** | Side chain, branching point, or specific modification |

A monomer with **one** R-group is a capping group.
A monomer with **two** R-groups is a standard backbone unit.
A monomer with **three or more** R-groups can participate in
branching, cyclization, or inter-chain cross-links.

#### Leaving group

When an R-group is not connected to another monomer, it must be
"capped" by a leaving group — the atom or fragment that replaces
the attachment site in the free (unconnected) monomer. In PEP-EDIT,
leaving groups are **H** (hydrogen) or **OH** (hydroxyl).

Example: an amino acid with R1 (leaving group: H) and R2
(leaving group: OH). When R1 is connected to the preceding residue's
R2, the H leaving group is removed and a peptide bond forms.
When R1 is not connected (N-terminus), the H remains.
```

---

#### 2.4.3 PEP-EDIT vs pyPept

**Status:** △ MOVE (from top-level Getting Started to sub-item of Key concepts)

**Content:** Keep exactly as-is — no changes. The list of differences is precise and this is the right place for it (background context for technical users).

---

### 2.5 Protonation (pH)

**Status:** REVISE

#### Keep
- Mention of Dimorphite-DL and its paper link.
- The pH slider description.

#### Replace the internal file reference

Current text mentions `site_substructures.smarts`. Replace with:

```
PEP-EDIT uses a modified Dimorphite-DL where selected pKa patterns
were adjusted to better match amino-acid behavior. In practice, at
physiological pH (7.4):

• Terminal amines and positively charged side chains (Lys, Arg, His)
  are protonated.
• Terminal carboxylates and acidic side chains (Asp, Glu) are
  deprotonated.
• Amide bonds, phenols (Tyr), and imides remain neutral.
```

#### Add

```
**When to adjust pH:** change the pH slider if your downstream
application requires a different protonation state — for example,
acidic stomach lumen (~pH 2), late endosome (~pH 5), or alkaline
conditions. The protonation state is applied to all export formats.

**Limitation:** Dimorphite-DL predicts protonation from SMILES-derived
pKa patterns. It does not account for microenvironment effects
(buried residues, salt bridges). For precise protonation modeling,
consider using dedicated tools like PROPKA on the exported PDB.
```

---

### 2.6 Conformer generation

**Status:** REVISE — reorganize around user actions.

---

#### 2.6.1 Automatic vs. manual generation ★ NEW

**Status:** NEW — replaces the old "RDKit-based embedding" + "Iterative process" subsections.

#### Full draft

```
### Automatic vs. manual generation

#### Auto sync (live preview)

By default, PEP-EDIT automatically generates a 3D conformer whenever
you make a valid edit. A toggle labeled **Auto sync** is available
next to the Generate 3D button.

Auto sync behavior:
• **ON by default** for peptides with fewer than 8 monomers.
  The button reads "Live Preview" and 3D regenerates on every
  committed edit.
• **Automatically disabled** (with a toast notification) when
  the peptide reaches 8 or more monomers — to avoid slow repeated
  computation on larger constructs.
• **Force-disabled** when a 3D template (scaffold) constraint is
  active. In this mode, you must click Generate 3D manually after
  setting up or modifying the template.
• The toggle state persists across page reloads (stored in your
  browser).

You can toggle Auto sync manually at any time.

#### Manual generation

Click the **Generate 3D** button to submit a conformer job explicitly.
This is required when:
• Auto sync is off (peptides ≥ 8 monomers, or manually toggled off).
• A 3D template constraint is active.
• You want to retry after a failed generation.

#### What happens when you generate

1. A job is created and appears in the **Jobs** tab (right panel).
2. The status progresses: queued → running → **success** or **failed**.
   (Jobs are polled at ~250 ms intervals.)
3. On **success**, the conformer loads automatically in the 3D viewer.
4. On **failure**, check the Jobs tab for the error message. See
   §FAQ & common errors for troubleshooting.

  [MEDIA #13: Screenshot — Jobs tab showing one successful and one
   failed job, with status indicators visible.]

#### Under the hood (technical detail)

Conformer generation uses RDKit's distance-geometry embedding
starting from the peptide SMILES. When constraints are active,
backbone coordinates from the constraint source (secondary-structure
dihedrals or template PDB) are used as a coordinate map to bias
embedding.

To handle difficult cases, constrained embedding is performed
iteratively: for each mapping ratio, a random subset of constrained
atoms is selected and multiple attempts are run with different seeds.

    mapping_ratios = [(1.0, 5), (0.9, 5), (0.8, 10), (0.5, 50)]
    # (fraction_of_mapped_atoms_to_keep, number_of_attempts)

Ratios as low as 0.5 can still preserve global backbone topology
while giving RDKit enough flexibility to find a valid embedding —
especially for complex or multi-fragment peptides.
```

**Note:** The technical detail block at the bottom is intended to be placed inside a collapsible/expandable panel (e.g. `<Collapse>` with a "Technical details" toggle). This keeps the section user-focused while preserving the algorithm information for power users.

---

#### 2.6.2 Secondary structure constraints (2D)

**Status:** REVISE (minor)

#### Keep
- Everything: the H/E/- table, the figure, the description.

#### Add (before the table)
```
Constraints appear as a dedicated row below the chain track.
Each cell corresponds to one residue and can be toggled individually
by clicking. The ⋮ menu on the constraint row provides bulk
operations: All alpha, All beta, All random, Clear.
```

#### Add (after the Ramachandran note)
```
**Note on D-amino acids:** for D-residues, the target dihedral
angles are automatically mirrored in Ramachandran space. No manual
adjustment is needed.
```

#### Move
- The `mapping_ratios` code block → moved to §2.6.1 (under the hood). Remove from here.

---

#### 2.6.3 3D template constraints (scaffold)

**Status:** REVISE (minor)

#### Keep
- Everything: the figure, the bullet list, the info alert.

#### Add — explicit step-by-step recipe

Insert before the existing bullet list:

```
**Typical workflow:**
1. In the chains toolbar, switch constraint mode to **3D template**.
2. Click **Upload Scaffold**.
3. Enter a **PDB ID** (e.g. 1Q71) or upload a local PDB/mmCIF file.
4. Select the template **chain** and **start/end residue** range.
5. Set the **offset** — the number of leading peptide positions
   to leave unconstrained (useful when your peptide has extra
   residues not present in the template).
6. Optionally **mask** individual residues you don't want constrained.
7. Click **Generate 3D** (auto-sync is force-disabled in this mode).
```

#### Add — decision guidance

```
**When to use which constraint type?**
• Use **secondary structure** when you want a generic fold
  (all-helix, all-strand, mixed) without a specific reference
  structure.
• Use a **3D template** when you have an experimental or modeled
  structure whose backbone topology must be preserved (e.g. lasso
  peptides, knotted peptides, or when building a variant of a
  known structure).
```

---

### ═══ HOW-TO GUIDES ═══

---

### 2.7 Building a peptide (BILN / FASTA / Library)

**Status:** REVISE — merge the current "Editing a BILN sequence" and "Editing from monomer library" into one comprehensive section.

#### Structure

```
## Building a peptide

There are three ways to define a peptide in PEP-EDIT.

### From a BILN string

Type or paste a BILN string directly in the BILN editor:

    P-E-P-T-I-D-E

The input is live — the 2D viewer updates as you type, as soon
as the sequence is syntactically valid. For multi-chain peptides,
separate chains with `.` in the BILN string:

    A-G-K.E-H-I

HELM notation is also accepted — paste a HELM string and PEP-EDIT
converts it automatically.

  [MEDIA #5: reuse the BILN typing GIF from §2.3.2]

### From a FASTA file

Click **Upload sequence** (in the editor toolbar or menu) and
select a .fasta file. The sequence is converted to BILN using the
20 standard amino acid mappings.

Limitation: FASTA upload supports only the 20 standard
proteinogenic amino acids. For sequences with non-standard residues,
use BILN input or build from the monomer library.

  [MEDIA #10: Screenshot — Upload sequence button / dialog.]

### From the monomer library

Open the **Monomer Library** tab in the right panel. The library
provides a searchable, filterable catalog of all available monomers
(public + personal).

[Keep all existing content from "Editing from monomer library":
 placement mode (Append / Prepend / New chain), linking mode
 (Peptide, R3→R1, etc.), monomer replacement. Keep the existing
 MonomerSelection.png figure.]

### Editing an existing sequence

Once a peptide is defined, you can modify it in several ways:

• **Replace a monomer** — hover over any pill in the chain track
  and click the Replace icon. The library panel opens for you to
  pick a replacement.
• **Delete a monomer** — hover and click the Delete icon.
• **Reorder monomers** — drag and drop pills within or across chains.
  Invalid moves (R-group conflicts, cap placement violations) are
  rejected with an explanatory dialog.
• **Undo / Redo** — use the toolbar buttons (up to 20 steps).
  Note: Ctrl+Z/Y only work inside the BILN text field.
• **Cyclize / Mirror** — use the ⋮ menu on a chain row.

Arbitrary insertion at a specific position is not currently
supported. Use Append or Prepend, then drag the monomer to the
desired position.
```

**Old sections to remove from NAV_TREE:**
- `editing-biln` (absorbed into this section)
- `editing-library` (absorbed into this section)

---

### 2.8 Linking monomers

**Status:** KEEP with minor additions.

#### Add at the top (before existing content)

```
**When to use linking:**
Linking creates bonds beyond the standard backbone — disulfide
bridges, side-chain-to-backbone cyclization, lipid attachments,
inter-chain cross-links, and other non-standard connectivities.
```

#### Add after the two methods (BILN / Link mode)

```
**What happens visually:**
When a link is created (either via BILN or the Link tool), the
2D viewer immediately shows the new bond. The BILN string in the
editor updates in real time to reflect the connection. If Auto sync
is on and the peptide is small enough, the 3D viewer also updates.
```

#### Keep
- Everything else (Link mode, Cut mode, the alert about chemical validation).
- The existing figure (`Linking-Unlinking.png`).

#### Media (optional)
[MEDIA #11: GIF — Link mode: activate → click R-group 1 → click R-group 2 → bond appears in 2D. ~5 seconds.]

---

### 2.9 Complex topologies

**Status:** REVISE — add per-topology illustrations.

#### Keep
- All BILN examples and descriptions for each topology type.
- The Mirror action description.

#### Add
Before each topology's BILN example, add: *"Here is what this looks like in PEP-EDIT:"* followed by a 2D viewer screenshot.

**Media needed:**
[MEDIA #12a–d: Four small screenshots of the 2D viewer showing:]
- (a) Head-to-tail cyclic peptide
- (b) Disulfide bridge
- (c) Branched peptide
- (d) Multi-chain design

These can be small (300–400px wide), arranged in a 2×2 grid.

---

### 2.10 Adding monomers to the library

**Status:** KEEP — this is the best-documented section in the entire documentation.

#### Minor clarifications

- **Step 3, Symbol field:** change "Must be unique" to "Must be unique across the active library scope (public + personal)."
- **Step 5:** add: "If validation fails, the wizard displays the specific checks that did not pass. You can go back to previous steps to fix issues."

No other changes.

---

### 2.11 Exporting results ★ NEW

**Status:** NEW

#### Full draft

```
## Exporting results

### Where to find outputs

All export formats are in the **Output** tab (right panel). Each
format is shown as a collapsible section with **Copy** (to clipboard)
and **Download** (save file) buttons. A **Download all** button at
the top exports every format at once.

### When do outputs update?

• **1D and 2D formats** (BILN, HELM, SMILES, InChI, SDF 2D) update
  immediately when the peptide sequence changes.
• **3D formats** (PDB, mmCIF, XYZ, SDF 3D, MOL2, PDBQT) update
  when a conformer generation job completes successfully.
• **All formats** reflect the current pH setting — adjusting the
  pH slider updates protonation across all exports.

### Choosing the right format

| I need to…                                    | Use this format     |
|-----------------------------------------------|---------------------|
| Feed into AlphaFold 3 / Chai / Boltz          | SMILES              |
| Run molecular dynamics (OpenMM, GROMACS)      | PDB + SMILES        |
| Run docking (AutoDock Vina / ADCP)            | PDBQT               |
| Run quantum chemistry (ORCA, Gaussian)        | XYZ                 |
| Register in a compound database               | InChI / InChIKey    |
| Visualize in PyMOL / ChimeraX                 | PDB or mmCIF        |
| Substructure search / fingerprints            | SDF 2D or SMILES    |
| Share the full peptide definition             | BILN or HELM        |

  [MEDIA #14: Screenshot — Output tab open, several accordion
   sections expanded, Copy/Download buttons visible.]
```

---

### ═══ EXAMPLES & USE CASES ═══

---

#### General pattern for all examples

Each example should follow this template (adding a step-by-step recipe to the existing showcase content):

```
### [Example name]

**Goal:** one sentence.

**Context:** 2–3 sentences of biological background (keep existing).

**Steps:**  ← THIS IS WHAT'S MISSING
1. [exact action in PEP-EDIT]
2. …
3. …

**Result:** [existing figure]

**Key takeaway:** one sentence.
```

---

### 2.12 Microcin J25 (lasso peptide)

**Status:** REVISE — add recipe steps.

#### Keep
- All existing content (context, BILN, rationale, figures).

#### Add — step-by-step recipe (insert before the figures)

```
**Steps to reproduce:**
1. Click **Upload sequence** and paste:
       GGAGHVPEYFVGIGTPISFYG
2. In the chain track, locate residue 19 (Phe). Click its pill →
   **Replace** → in the library search, type "Phe_3Cl" → click **+**.
3. Define the macrolactam ring: in the BILN editor, add explicit
   bond annotations connecting Glu8's R3 (side chain) to Gly1's R1
   (backbone N). The full annotated BILN is:
       G(1,1)-G-A-G-H-V-P-E(1,3)-Y-F-V-G-I-G-T-P-I-S-Phe_3Cl-Y-G
4. Switch constraint mode to **3D template** in the chains toolbar.
5. Click **Upload Scaffold** → enter PDB ID: **1Q71** → select chain A,
   residues 1–21.
6. Click **Generate 3D**.

  [MEDIA #15 (optional): GIF walking through steps 1–3.]
```

**Question for you:** Please verify the exact BILN with the macrolactam bond annotation — I inferred the connectivity but you should confirm the bond IDs.

---

### 2.13 Semaglutide

**Status:** REVISE — add recipe steps.

#### Keep
- All existing content.

#### Add — step-by-step recipe

```
**Steps to reproduce:**

*Without template (basic):*
1. In the BILN editor, type:
       H-Aib-E-G-T-F-T-S-D-V-S-S-Y-L-E-G-Q-A-A-K(1,3)-E-F-I-A-W-L-V-R-G-R-G.SemaB(1,2)
   (SemaB is available in the public monomer library.)
2. Click **Generate 3D**.

*With template (realistic backbone):*
1. Generate a backbone prediction for the 29-residue core (residues
   3–31) using PEP-FOLD4 or a similar tool. Download the PDB.
2. In PEP-EDIT, enter the full semaglutide BILN (as above).
3. Switch constraint mode to **3D template** → upload the PDB.
4. Set **offset = 2** (the first two residues, H and Aib, are not
   present in the template).
5. Click **Generate 3D**.
```

---

### 2.14–2.19 Other examples (Cyclic, ORCA, AF3, ST, Docking)

**Status:** KEEP — these are adequate as-is. No structural changes.

Minor improvements (apply to all):
- Ensure each has a one-line "**Goal:**" sentence at the top.
- Ensure GitHub links are present and correct.

---

### ═══ REFERENCE ═══

---

### 2.20 Output & export formats

**Status:** REVISE — expand with format details.

#### Keep
- The existing 1D/2D/3D table.
- The paragraph about the Output tab.

#### Add — "Format details" subsection

```
### Format details

**PDB**
• Residue names use the 3-letter PDB code from the monomer definition.
• All atoms are written as ATOM records (including non-standard
  monomers). Each monomer has a PDB code assigned during creation,
  which may be shared across different monomers (no uniqueness
  enforcement).
• CONECT records are included for non-standard bonds.
• Chain IDs are assigned alphabetically (A, B, C…).

**mmCIF**
• PDBx/mmCIF format, compatible with modern PDB tools (Mol*, GEMMI,
  BioPython).

**PDBQT**
• Standard AutoDock PDBQT format, generated via Open Babel.
• Gasteiger partial charges are assigned automatically.
• **Directly compatible** with AutoDock Vina and AutoDock 4 — no
  extra preparation needed.

**MOL2**
• Tripos Sybyl MOL2 format with Sybyl atom types (e.g. C.ar, N.am,
  O.2). Not GAFF.

**SDF 2D / SDF 3D**
• V2000 molfile format (RDKit default).
• V2000 has a 999-atom limit — unlikely to affect peptides ≤ 40
  monomers.

**XYZ**
• Plain Cartesian coordinates (element + x/y/z).
• No connectivity information — suitable for quantum chemistry
  (ORCA, Gaussian) or as a generic coordinate file.

**1D formats (BILN, HELM, SMILES, InChI, InChIKey)**
• SMILES includes protonation at the selected pH.
• InChI/InChIKey are computed from the protonated SMILES.
```

---

### 2.21 Monomer library & R-groups

**Status:** KEEP — no changes.

---

### 2.22 BILN quick reference

**Status:** KEEP — add one row.

#### Add to the table

```
| Multiple chains (separator)  | `A-G-K.E-H-I` |
```

---

### 2.23 Resources & external scripts ★ NEW

**Status:** NEW

#### Full draft

```
## Resources & external scripts

### Companion repositories

| Repository | Description | Related section |
|------------|-------------|-----------------|
| [goat-pep](https://github.com/alexisdougha/goat-pep) | ORCA GOAT input preparation from PEP-EDIT XYZ | Conformer search with ORCA |
| [smiles-fold-input-builder](https://github.com/alexisdougha/smiles-fold-input-builder) | AlphaFold 3 input from PEP-EDIT SMILES | Protein–peptide prediction |
| [Pep-Edit_ST](https://github.com/samuelmurail/Pep-Edit_ST) | Simulated tempering with OpenMM | Simulated tempering |

### Related tools and libraries

| Tool | Role in PEP-EDIT |
|------|------------------|
| [pyPept](https://doi.org/10.1186/s13321-023-00748-2) | Python toolkit PEP-EDIT is built upon |
| [BILN notation](https://doi.org/10.1021/acs.jcim.2c00703) | Peptide sequence representation |
| [PEP-FOLD4](https://bioserv.rpbs.univ-paris-diderot.fr/services/PEP-FOLD4/) | Peptide structure prediction — useful for generating 3D templates |
| [Dimorphite-DL](https://doi.org/10.1186/s13321-019-0336-9) | pH-dependent protonation model |
| [RDKit](https://www.rdkit.org/) | Cheminformatics engine (2D/3D, SMILES, SDF) |
| [Mol*](https://molstar.org/) | 3D molecular viewer |
| [Open Babel](http://openbabel.org/) | Format conversion (PDBQT, MOL2) |
```

---

### ═══ TROUBLESHOOTING & POLICIES ═══

---

### 2.24 FAQ & common errors ★ NEW

**Status:** NEW

#### Full draft

```
## FAQ & common errors

**Q: My BILN string shows a red error / the 2D viewer doesn't update.**
A: Common causes:
• A monomer symbol is not recognized — check spelling and ensure it
  exists in the library. Error text appears below the 2D viewer.
• Incomplete syntax (trailing hyphen, unbalanced parentheses) — the
  views freeze at the last valid state. Complete the expression.
• Bond IDs appear only once — each BondID must appear exactly twice.
• Missing brackets for monomer names containing hyphens:
  use `[2-Cl-Phe]`, not `2-Cl-Phe`.

**Q: "Maximum length reached" / red border on the input field.**
A: PEP-EDIT supports up to 40 monomers per construct (RDKit embedding
limit). Simplify the peptide or split into separate chains.

**Q: Conformer generation failed.**
A: RDKit could not find a valid 3D embedding. Typical causes:
• Construct too large or too strained.
• Conflicting constraints (template doesn't match sequence length,
  or too many constrained atoms in a rigid geometry).
• Bad luck with random seeds.
**What to try:**
• Click **Generate 3D** again — the iterative process uses random
  seeds and may succeed on a second attempt.
• Reduce constraints: mask some residues in the template, or switch
  from 3D template to secondary-structure mode.
• Simplify the topology (remove some extra bonds temporarily).

**Q: Auto sync turned off by itself.**
A: Auto sync is automatically disabled when the peptide reaches
8 or more monomers (a toast notification appears). This is by design
to avoid slow repeated computation. You can re-enable it manually
if desired, or use the Generate 3D button.

**Q: Auto sync won't turn on.**
A: Auto sync is force-disabled when a 3D template constraint is
active. Remove the template to re-enable auto sync.

**Q: I lost my session / my monomers are gone.**
A: If your browser's localStorage was cleared, the Session ID is
lost locally. Use the **Recover** tab in the Session dialog:
• Paste a saved Session ID → Load Session.
• Or enter your linked email → recover all associated Session IDs.
If you never saved the ID and didn't link an email, the session
cannot be recovered.

**Q: Can I use PEP-EDIT offline?**
A: No. PEP-EDIT requires a server connection for conformer generation,
monomer database access, and protonation computation.

**Q: The 3D viewer is blank or renders incorrectly.**
A: Mol* requires WebGL 2.0. Steps:
1. Check https://get.webgl.org/webgl2/ in your browser.
2. Disable browser extensions that may block WebGL.
3. Update your graphics drivers.
4. Try Chrome or Firefox if using another browser.

**Q: Ctrl+Z doesn't undo my last action.**
A: Ctrl+Z only works inside the BILN text input field (native browser
undo). For chain track operations (replace, delete, drag), use the
**Undo** button in the editor toolbar.

**Q: How do I cite PEP-EDIT?**
A: See §How to cite below.
```

---

### 2.25 Limitations & tips

**Status:** REVISE

#### Keep
- "40 monomers per construct" (but reference FAQ for more detail).
- "Extra bonds are not chemically validated" (keep).
- "Secondary-structure presets provide a controlled backbone bias…" (keep).

#### Remove (now covered elsewhere)
- "When using a 3D template, auto-sync is disabled" → covered in §2.6.1.
- "Constrained embedding may require multiple attempts" → covered in §2.6.1.

#### Add

```
• For large or branched peptides (> 20 monomers), conformer
  generation may take 10–30 seconds.
• When drag-and-drop reordering is rejected, read the dialog
  message carefully — it explains the specific R-group or cap
  conflict.
• To work around the lack of arbitrary insertion, use Append or
  Prepend and then drag the monomer to the desired position.
```

---

### 2.26 Browser compatibility ★ NEW

**Status:** NEW

#### Full draft

```
## Browser compatibility

PEP-EDIT has been tested on the following configurations:

| Browser | Platform | Status |
|---------|----------|--------|
| Chrome / Chromium (latest) | Linux, macOS, Windows | ✅ Fully supported |
| Firefox (latest) | Linux, macOS, Windows | ✅ Fully supported |
| Edge (latest) | Windows | ✅ Fully supported |
| Safari (latest) | macOS | ✅ Supported |
| Mobile browsers | — | ⚠️ Functional but not optimized (small screen layout) |

**Requirements:**
• JavaScript enabled.
• WebGL 2.0 (for the 3D Mol* viewer).
• Cookies enabled (for session persistence via localStorage).
• Recommended minimum screen width: 1024 px.
```

---

### 2.27 How to cite ★ NEW

**Status:** NEW

#### Full draft

```
## How to cite

If you use PEP-EDIT in your research, please cite:

> Chevrollier N, Dougha A, Ye C, Stratmann D, Moroy G, Rey J,
> Murail S & Tufféry P. PEP-EDIT: an interactive web interface
> for the rapid generation and editing of complex peptides.
> *(manuscript in preparation)*

URL: https://pep-edit.rpbs.univ-paris-diderot.fr

Please also cite the underlying tools where appropriate:

• **pyPept:** Dougha A, et al. *J Cheminform* (2023).
  https://doi.org/10.1186/s13321-023-00748-2
• **BILN:** Dougha A, et al. *J Chem Inf Model* (2022).
  https://doi.org/10.1021/acs.jcim.2c00703
```

---

### 2.28 Changelog ★ NEW

**Status:** NEW (minimal placeholder)

```
## Changelog

### v1.0 — [release date]
• Initial public release.
• Support for standard and non-standard monomers (BILN input, library).
• Conformer generation with secondary-structure and 3D template constraints.
• Export to BILN, HELM, SMILES, InChI, SDF, PDB, mmCIF, XYZ, MOL2, PDBQT.
• Session management with sharing and recovery.
• Collaborative n.eko instance.
```

---

### 2.29 Accessibility, cookies & contact

**Status:** REVISE

#### Keep
- "Free and open to all — no login required."
- "No tracking cookies. Strictly necessary cookies only."

#### Add

```
**Contact & feedback**
For bug reports, feature requests, or questions:
• Email: nicolas.chevrollier@u-paris.fr, pierre.tuffery@u-paris.fr,
  or julien.rey@u-paris.fr
• RPBS Discourse forum: https://discourse.rpbs.univ-paris-diderot.fr

**Collaborative instance (n.eko)**
A shared-screen instance of PEP-EDIT is available at:
https://neko.rpbs.univ-paris-diderot.fr?usr=guest&pwd=rpbs

This instance enables multi-user real-time peptide design sessions,
useful for collaborative research, workshops, and teaching. All
participants share the same screen and can interact with the editor
simultaneously.
```

(This is where the n.eko mention now lives — moved from the Introduction.)

---

## 3. Media assets list

| # | Section | Type | Description | Priority |
|---|---------|------|-------------|----------|
| 1 | §2.2 Quick start | GIF | Typing `ac-A-G-K-D-am`, 2D updating live (~6s) | Phase 1 |
| 2 | §2.2 Quick start | GIF | Auto-sync generating 3D (or manual Generate 3D → Jobs → 3D viewer) (~5s) | Phase 1 |
| 3 | §2.2 Quick start | Screenshot | Output tab with Download all button highlighted | Phase 1 |
| 4 | §2.3.1 Panels | Annotated screenshot | Interface with ①–⑨ numbered callouts | Phase 1 |
| 5 | §2.3.2 BILN editor | GIF | Type BILN → valid → 2D updates → invalid symbol → red error text (~8s) | Phase 2 |
| 6 | §2.3.2 Chain track | Screenshot | Chain track with hover state (Replace/Delete icons visible) | Phase 2 |
| 7 | §2.3.2 Chain actions | Screenshot | ⋮ menu open showing Cyclize, Mirror, constraint options | Phase 2 |
| 8 | §2.3.3 2D viewer | GIF | Hover sync between 2D, chain track, and 3D viewer (~4s) | Phase 2 |
| 9 | §2.3.4 3D viewer | Screenshot | 3D viewer with peptide, toolbar visible, ball-and-stick | Phase 2 |
| 10 | §2.7 Building | Screenshot | Upload sequence dialog/button | Phase 2 |
| 11 | §2.8 Linking | GIF (optional) | Link mode: click R-group → click R-group → bond appears (~5s) | Phase 2 |
| 12a–d | §2.9 Topologies | Screenshots ×4 | 2D view of: cyclic, disulfide, branched, multi-chain | Phase 4 |
| 13 | §2.6.1 Conformer | Screenshot | Jobs tab: one success + one failed job with status | Phase 1 |
| 14 | §2.11 Exporting | Screenshot | Output tab with accordions expanded, Copy/Download visible | Phase 3 |
| 15 | §2.12 Microcin | GIF (optional) | Recipe steps 1–3 (upload → replace → cyclize) | Phase 4 |

**Existing images to reuse (no action needed):**
- `PEP-EDIT-Interface-v2.png` → basis for #4 (add annotations on top)
- `SecondaryStructure.png`
- `3DTemplateProcess.png`
- `MonomerSelection.png`
- `Linking-Unlinking.png`
- `Monomer6.png` → reuse in §2.4.2
- All `create-monomer_step*.png` (5 images)
- All example figures (mccJ25, Semaglutide, OctaL, OctaD4L, cilengitide, 7P8X, ST, BAD)

---

## 4. Implementation phases

| Phase | Sections to implement | Media needed | Impact |
|-------|----------------------|--------------|--------|
| **Phase 1** | Quick start (§2.2), Annotated interface (§2.3.1), Auto/manual gen (§2.6.1), FAQ (§2.24), How to cite (§2.27), Jobs screenshot | #1, #2, #3, #4, #13 | **Unblocks new users, answers support questions** |
| **Phase 2** | BILN editor (§2.3.2), 2D viewer (§2.3.3), 3D viewer (§2.3.4), Building a peptide merge (§2.7), Key concepts (§2.4), Protonation revision (§2.5) | #5, #6, #7, #8, #9, #10, #11 | **Makes docs self-sufficient** |
| **Phase 3** | Exporting (§2.11), Output format details (§2.20), Resources table (§2.23), Browser compat (§2.26), Changelog (§2.28), Contact (§2.29) | #14 | **Completeness for power users** |
| **Phase 4** | Microcin recipe (§2.12), Semaglutide recipe (§2.13), Topology screenshots (§2.9), Limitations revision (§2.25) | #12a–d, #15 | **Makes examples reproducible** |
| **Phase 5** | NAV_TREE update, cross-references audit, final proofreading | — | **Professional finish** |

---

## 5. Updated NAV_TREE (for implementation)

This is the target JavaScript structure for the sidebar:

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
          { id: "viewer-2d", label: "2D viewer" },
          { id: "viewer-3d", label: "3D viewer" },
          { id: "right-panel", label: "Right panel (Library / Output / Jobs)" },
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
          { id: "auto-vs-manual", label: "Automatic vs. manual generation" },
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

*End of plan v2. All behavior and content answers are integrated.*
*Ready to proceed to implementation on your signal.*
