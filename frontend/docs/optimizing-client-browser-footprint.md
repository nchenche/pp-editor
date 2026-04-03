# Memory Footprint Analysis & Optimization Guidelines

## Current State Summary

The application keeps several large data structures in the browser JS heap. Below are the hotspots, ordered by estimated impact, along with concrete guidelines to reduce footprint while preserving real-time interactivity.

---

## 1. Monomer Library Images — Highest Impact

**Finding:** `useLibraryFetching.js:82` requests `include_images=true`, causing the server to embed a base64 PNG per monomer in every library response. For a library of hundreds of monomers, this can add **tens of MB** to the JS heap — and the data is held in four+ places simultaneously:

| Copy | Location |
|------|----------|
| Module-level `CACHE` Map | `useLibraryFetching.js:8` — survives unmount, 5-min TTL |
| `data` state | Inside the hook instance |
| `prevDataRef` | Flicker-prevention ref |
| `allMonomers` / `filteredResult` / `deferredMonomers` | `MonomerLibraryContainer.jsx:77-84` |

### Guidelines

- **Remove `include_images=true`** from the library fetch. The card view truly needs only: `symbol`/`m_abbr`, `m_type`, `m_subtype`, `pdbName`, and an `_id`/monomer identifier.
- **Serve thumbnails as URLs, not inline base64.** Add a lightweight endpoint like `GET /api/db/monomers/:id/thumbnail` that returns a small image (e.g. 64×64 PNG). Let the browser cache handle it via standard HTTP caching (`Cache-Control`). The `<img src=…>` tag natively lazy-loads when used with `loading="lazy"`.
- **Fetch full monomer detail on demand** for the `MonomerDetailsDialog` — a single `GET /api/db/monomers/:id` when the user clicks "info". This is where the full-size image, SMILES, R-group data, and other metadata belong.
- **Slim down the library response schema:** The library endpoint should return only the fields needed for filtering and display:
  ```json
  { "_id", "symbol", "m_name", "m_type", "m_subtype", "pdbName", "natAnalog", "thumbnail_url" }
  ```
  Exclude `sdf`, `smiles`, `image_binary`, `m_Rgroups`, `m_RgroupIdx`, `m_attachmentPointIdx`, and any other heavy fields.

---

## 2. Monomer Objects Duplicated in Sequence Rows — High Impact

**Finding:** The `monomers` array from `depictionData` (returned by the depiction endpoint) is sliced into `rowMonomerLists` via `bilnUtils.js:102-113`. Each monomer in these rows carries the full server-returned object including R-group arrays, attachment points, SDF, and potentially image data. These objects are then:

- Passed to every `<MonomerItem>` in every chain
- Read by `useBilnHandlers` for bond validation (`m_RgroupIdx`, `m_subtype`)
- Used by `replacementCompatibility` for `availableRgroupsForMonomer`

### Guidelines

- **Keep only the structurally necessary fields** on sequence monomer objects: `res-idx`, `symbol`, `m_subtype`, `m_RgroupIdx` (needed for cap detection and bond validation), and `pdbName`/`m_name` (needed for display labels). Strip everything else.
- **Alternatively, delegate bond-validation logic to the server.** Create an endpoint like `POST /api/core/validate-bond` that accepts `{ biln, sourceIdx, targetIdx, rgroup }` and returns whether the operation is valid. This removes the need to carry R-group metadata on every residue locally. However, this trades latency for memory, so it should be weighed against the real-time interactivity requirement — a hybrid approach (keep `m_RgroupIdx` locally but drop everything else) may be best.
- **Ask the depiction endpoint to return a leaner monomer list.** The server already computes monomer metadata for depiction; it could return a minimal projection instead of the full DB record.

---

## 3. Conformer / 3D Structure Data Duplication — Medium–High Impact

**Finding:** When a 3D conformer job completes, the PDB/SDF strings (which can be **100 KB – 1 MB+**) exist in four copies:

| Copy | Location |
|------|----------|
| `resultRef` | `useConformerJob.js` |
| `result` (mapped to legacy format with dual-cased keys) | `useGenerate3D.js:21-33` |
| `structureOutput` | `PeptideEditorMain.jsx:107` state |
| Mol\* internal state tree | After `loadFromRawData()` |

Additionally, `useGenerate3D.js:21-33` creates an object with both `pdb`+`PDB`, `sdf`+`SDF`, etc. — **6 redundant string references** per result.

### Guidelines

- **Single source of truth for structure data.** `useConformerJob` should own the canonical result. Downstream consumers should derive from it rather than copying. Once the PDB string is loaded into Mol\*, it can be released from React state (Mol\* owns it).
- **Eliminate the dual-cased mapping.** Standardize on one casing (`pdb`, `sdf`, `smiles`, `biln`) and update all consumers. This is a simple refactor that halves the reference count.
- **Drop raw structure strings after loading into Mol\*.** Keep only a job ID reference so the PDB can be re-fetched from the server if needed (e.g., for download or re-load).

---

## 4. Module-Level Global Caches Never Pruned — Medium Impact

**Finding:**

- `GLOBAL_STATUS_IN_FLIGHT` Map in `useConformerJob` accumulates `{ lastResult }` entries (full JSON payloads with PDB strings) per job ID and is **never pruned**.
- The library fetch `CACHE` Map holds up to 50 entries (each containing the full monomer list with images) for 5 minutes.

### Guidelines

- **Prune `GLOBAL_STATUS_IN_FLIGHT`** when jobs reach terminal states (`completed`, `failed`, `canceled`). Delete the entry entirely or at minimum clear `lastResult`.
- **Reduce `CACHE_MAX_ENTRIES`** for the library cache, or better, drop the module-level cache entirely once images are no longer inlined (the browser's HTTP cache replaces it).

---

## 5. localStorage Accumulation — Low–Medium Impact

**Finding:** `conformerJobInputsStorage` writes two keys per job (v1 + v2 format) and never prunes old entries. Over many sessions this grows unbounded. The `getConformerJobInputsFromStorage` fallback iterates `localStorage.length`, which degrades with many keys.

### Guidelines

- **Add a cleanup routine** that evicts entries older than N days (e.g., 7). Run it on app init.
- **Stop writing the v1 format** if it's purely legacy — write only v2.
- **Cap the total number** of stored job inputs (e.g., keep only the 20 most recent).

---

## 6. Global Debug Leak — Low Impact, Easy Fix

**Finding:** `useMolstarPlugin` assigns `window.plugin = plugin`, preventing garbage collection of old Mol\* plugin instances in production.

### Guideline

Gate behind `import.meta.env.DEV` so the global reference only exists during development.

---

## 7. SVG Depiction — Low Impact, Worth Monitoring

**Finding:** The 2D SVG depiction string is stored in `depictionData.svg` and rendered into the DOM. For complex multi-chain peptides with many atoms, this can be a large string. However, it's a single copy and needed for display, so the opportunity is limited.

### Guideline

If SVGs grow very large, consider server-side SVG simplification or rasterizing to PNG above a complexity threshold. This is low priority unless users routinely edit 30+ residue peptides.

---

## Summary: Priority Roadmap

| Priority | Area | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Remove `include_images=true`; serve thumbnails as URLs | Medium | Very high — eliminates tens of MB |
| **P0** | Slim library response to card-essential fields only | Low | High — reduces per-monomer payload ~80% |
| **P1** | Fetch monomer details on demand (detail dialog) | Medium | High — large images loaded only when needed |
| **P1** | Eliminate PDB/SDF duplication across 4 state layers | Medium | Medium–High |
| **P2** | Lean sequence monomer objects (strip unused fields) | Low–Medium | Medium |
| **P2** | Prune global caches (`GLOBAL_STATUS_IN_FLIGHT`, library cache) | Low | Medium |
| **P3** | `localStorage` cleanup for old job inputs | Low | Low–Medium |
| **P3** | Gate `window.plugin` behind `DEV` | Trivial | Low |

---

## Preserving Real-Time Interactivity

The key fields that **must** remain client-side for instant interaction are:

- **`m_RgroupIdx`** and **`m_subtype`** on sequence monomers — needed for bond validation, cap detection, circularization checks, and drag-and-drop constraints
- **`symbol`**, **`pdbName`**, **`res-idx`** — needed for display and hover labeling
- **`linkMap`** derived from BILN — lightweight, computed from the BILN string itself

Everything else (images, SMILES, SDF, molecular weight, full R-group leaving groups, etc.) can be fetched on demand without impacting the user's interactive editing experience.
