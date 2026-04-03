# Creating a Monomer from Scratch

This wizard lets you create a custom monomer from a molecule described by a SMILES string.
Once saved, the monomer becomes available in your personal library and can be used in BILN peptide sequences just like built-in monomers.

The process transforms a complete molecule into a validated SDF monomer record compatible with PepEdit’s peptide assembly engine.

## What Does “Creating a Monomer” Mean?

In PepEdit, a monomer is a well-defined chemical fragment stored as an SDF record containing:

- A molecular core
- Explicit attachment points (R1–R4)
- Defined leaving groups (H or OH)
- Stereochemistry assignments
- Metadata required for BILN integration
- Consistent atom indexing for automated peptide assembly

The goal of the wizard is to generate this structured SDF record from a standard molecular input.

---

## Wizard Overview

The monomer creation workflow consists of five steps:
```
1. Choose a molecule
2. Define attachment points (bond cleavage & core selection)
3. Fill in monomer metadata
4. Review stereochemistry
5. Validate and complete
```

You can move back and forth between steps using the **Back** and **Next**
buttons at the bottom of the wizard.

---

## Step 1 — Choose a Molecule (SMILES Input)

Paste a valid SMILES string into the input field. A live 2D depiction appears as you type.
If the structure does not render correctly, verify that the SMILES string is valid before proceeding.
Click **Next** when the preview matches the molecule you intend to register.

<!-- screenshot: step1-smiles-input.png -->

---

## Step 2 — Define Attachment Points

> **What is an attachment point (R-group)?**
> An R-group is an open connection point — a position where the monomer will
> attach to its neighbours in a peptide chain. In chemical notation they are
> written as R1, R2, etc., and represented by a `*` symbol in SMILES.

In this step you define where the monomer will connect to other residues by selecting which bonds should be cleaved. You may define up to four attachment points (R1–R4).


### 2a — Select bonds to cut

Click directly on bonds in the 2D depiction:

- Clicking a bond selects it as a cleavage site.
- Clicking again deselects it.
- At least one bond must be selected.

<!-- screenshot: step2-bond-selection.png -->

**Typical examples:**

For an amino-acid-like monomer you will usually cut:

- The **N-terminal bond** (where the amino group connects to the rest of the
  peptide) → this becomes one R-group.
- The **C-terminal bond** (where the carboxyl group connects) → this becomes a
  second R-group.

Capping groups (caps) need only **one** bond cut, since they terminate a chain
end rather than bridging two residues. See the
[type rules](#automatic-type-rules) section below for details.

### 2b — Choose the monomer core fragment

After bond selection, the molecule is split into fragments displayed in a carousel.

<!-- screenshot: step2-fragment-carousel.png -->

- Click a fragment card to select it (a coloured border highlights the active
  choice).
- Use the left / right arrows if there are more fragments than fit on screen.


> **Note:** For most amino acids, you want the fragment that contains the
> backbone (the α-carbon linking the amino and carboxyl groups). The
> remaining fragments are the "leaving groups" that were removed during the cut.

When you proceed, PepEdit automatically analyses the selected fragment and pre-fills metadata fields where possible.

Click **Next** to continue.

---

## Step 3 — Fill in Monomer Metadata

This is the most detailed step. A form appears alongside a depiction of your
selected fragment. Each field describes a property of the monomer that PepEdit
needs to integrate it into the library and use it in peptide sequences.

<!-- screenshot: step3-metadata-form.png -->

### Field reference

| Field | What to enter | Constraints |
|---|---|---|
| **Name** | A human-readable name (e.g. _Alanine_) | Free text. Optional but strongly recommended. |
| **Symbol** | A short, unique identifier used in BILN notation (e.g. _Ala_, _Pra_) | Must be **unique** across all monomers (public + personal). Uniqueness is checked server-side before saving. Although the field is not strictly marked "required" in the form, a monomer without a symbol will not be usable in BILN sequences. |
| **Natural analog** | The single-letter code of the closest natural amino acid | Required. Choose from the 20 standard amino acids (A, C, D, E, F, G, H, I, K, L, M, N, P, Q, R, S, T, V, W, Y). Use **X** if no natural analog exists. |
| **PDB** | The 3-letter PDB residue code (e.g. _ALA_) | Required. Exactly **3 uppercase letters**. The field auto-converts to uppercase and strips non-letter characters. |
| **Type** | The monomer category | Required. Choose **Amino acid**, **Cap**, or **Other**. Often pre-filled automatically (see below). |
| **Subtype** | A refinement of the type | Required. Possible values depend on the type — see the rules below. |
| **R-group label** _(one per attachment point)_ | Which R-group number (R1, R2, R3, or R4) to assign to that attachment point | Required. **Labels must be unique** — you cannot assign R1 to two different attachment points. |
| **Leaving group** _(one per attachment point)_ | The atom or group that occupies the attachment point when it is not bonded to a neighbour | Required. Only two values are allowed: **H** (hydrogen) or **OH** (hydroxyl). |

> **What is BILN?**
> BILN (_Biochemical Intuitive Line Notation_) is the text notation PepEdit uses
> to represent peptide sequences. Each residue is referenced by its **Symbol**
> (e.g. `A.D.meA`), and connections between residues map to R-groups.

### Automatic type rules

The wizard enforces a set of consistency rules so every monomer stays usable in
peptide design:

| Condition | Automatic effect |
|---|---|
| Fragment has exactly **1** R-group | Type is forced to **Cap**; subtype to **Cap**; natural analog to **X**. The _Amino acid_ option is also disabled. |
| Fragment has **2 or more** R-groups | **Cap** type is disabled (cannot be selected) |
| Type = **Cap** | Subtype forced to **Cap**; natural analog forced to **X** |
| Type = **Other** | Subtype defaults to **Non-natural** (can be changed to **Natural**) |
| Type = **Amino acid** | Subtype defaults to **Non-natural** (can be changed to **Natural**) |

The wizard calls a classification service that analyses the fragment structure
and pre-fills the type, subtype, R-group labels, and leaving groups for you.
You may override any of these suggestions if needed.

### R-group labels — why they matter

Each attachment point needs a unique label (R1–R4). These labels determine how
the monomer connects to its neighbours in a peptide sequence:

- **R1** and **R2** typically represent the backbone connections
  (N-terminal and C-terminal).
- **R3** and **R4** are available for side-chain or branching connections
  (e.g. lysine side-chain attachment, cyclic peptide cross-links).

> **Leaving groups in brief:**
> These represent the atoms displaced during bond formation.
> For example, in amide bond formation:
> - The amino side usually carries **H**.
> - The carboxyl side usually carries **OH**.

Click **Next** when all fields are filled and the form shows no errors.

---

## Step 4 — Review Stereochemistry

If the fragment contains **stereocenters**, this step allows you to review and modify their configuration (R/S).

<!-- screenshot: step4-stereochemistry.png -->


- Stereocenters are highlighted in the 2D depiction.
- A table lists each center and its assigned configuration.
- You may override assignments if necessary.

If no stereocenters are detected, you can proceed directly.

When you continue, the molblock is regenerated with your chosen stereochemistry.

---

## Step 5 — Validate and Complete

In the final step, the wizard generates the complete **SDF monomer record**. The molblock is displayed in an editable text area — you may correct it manually before saving.

<!-- screenshot: step5-validate-complete.png -->

This record includes:
- Atom coordinates
- Bond definitions
- Attachment point definitions
- Metadata fields
- R-group annotations

When you click **Complete**, the server performs strict validation:
- Structural integrity check
- Field consistency check
- Functional monomer validation

If all checks pass, the monomer is saved to your personal library.

---

## What's Next?

Your monomer is now part of your personal library. Here are a few things you
can do:

- **Use it in a design** — open the Design page, search for your monomer by
  symbol or name, and double-click to insert it into a BILN sequence.
- **Edit it later** — from the My monomers table, click the edit icon to
  modify metadata or leaving groups.
- **Share it** — share your Session ID with a collaborator (via the Session
  dialog's Share tab) so they can load your library and use your monomers.
- **Propose it for the public library** — use the _Submit to public library_
  page to send your monomers for review, making them available to all PepEdit
  users.

---

## Quick Reference — Field Rules Cheat Sheet

| Field | Required | Format / allowed values | Example |
|---|---|---|---|
| Name | No | Free text | `Alanine` |
| Symbol | Recommended (unique) | Text; uniqueness checked server-side | `Ala` |
| Natural analog | Yes | A C D E F G H I K L M N P Q R S T V W Y **X** | `A` |
| PDB | Yes | Exactly 3 uppercase letters | `ALA` |
| Type | Yes | `Amino acid` · `Cap` · `Other` | `Amino acid` |
| Subtype | Yes | `Natural` · `Non-natural` · `Cap` | `Non-natural` |
| R-group label | Yes (unique per monomer) | R1 · R2 · R3 · R4 | `R1` |
| Leaving group | Yes (per R-group) | `H` · `OH` | `OH` |
