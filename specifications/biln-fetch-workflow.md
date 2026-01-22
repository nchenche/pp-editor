# BILN change → fetch/workflow trace (pp-editor)

This documents the network operations triggered by changes to the BILN sequence in the peptide editor.

## Mermaid flowchart

```mermaid
flowchart TD
  A[BILN edited in UI] --> B{trySetBilnValue\n(tokenCount ≤ MAX_MONOMERS?)
}
  B -- no --> B0[Show limit dialog\n(no state update)]
  B -- yes --> C[bilnValue updated]

  C --> D{analyzeBiln(bilnValue)\ncommittable && bondsComplete?
}
  D -- no --> D0[No committedBiln update\n(no fetch)]
  D -- yes --> E[committedBiln set]

  %% 2D depiction
  E --> F[GET /api/core/molecules/depiction/2d\nquery: sequence, mode=rdkit, show-atom-indices,\nph_value, width, height, is_protonated=true]

  %% 3D generation (auto-sync)
  E --> G{autoSync3D && canGenerate3D\n&& NOT suppressed (resume/toggle guards)
}
  G -- no --> G0[No 3D generation]
  G -- yes --> H{Template mapping enabled?\n(effectiveAnyScaffoldEnabled && scaffoldMappingPayload)
}

  H -- yes --> I[POST /api/core/molecules/generate_3d_from_template\nbody: biln, template_id, scaffold_mappings\nquery: db_name=pepedit + requestParams]
  H -- no --> J[POST /api/core/molecules/generate_conformer\nbody: biln, ss_constraints?\nquery: db_name=pepedit + requestParams]

  %% async job lifecycle
  I --> K[Response 202: { job_id, status_url?, cancel_url? }]
  J --> K

  K --> L[Poll job status\nGET /api/core/molecules/conformer_jobs/<jobId>?db_name=pepedit\n(or status_url)]
  L --> M{Job terminal?\n(success/failed/canceled)
}
  M -- no --> L
  M -- yes --> N[Update structureOutput/resultRef\n(PDB/SMILES/SDF/etc)]

  %% manual generation
  P[User clicks "Generate 3D"] --> Q[Reset lastGenRef guard\n(trigger even if inputs unchanged)]
  Q --> H

  %% resume flow
  R[User resumes a conformer job] --> S[Programmatically set bilnValue]\n
  S --> T[Load existing PDB immediately (if available)]
  S --> U[Set suppression flags to block auto generation\nuntil next normal edit]
```

## Endpoint / implementation notes

- Depiction request is executed by `useFetchDepiction()`:
  - URL: `GET /api/core/molecules/depiction/2d` (from `DEPICT_2D_URL`)
  - Uses `apiFetch()`, which auto-appends `owner_id`/`user_id` when present.

- 3D generation request is executed by `useGenerate3D()` and uses the async job system (`useConformerJob()`):
  - Start job:
    - `POST /api/core/molecules/generate_conformer` (default)
    - or `POST /api/core/molecules/generate_3d_from_template` (when template mapping is enabled)
  - Poll status:
    - `GET /api/core/molecules/conformer_jobs/<jobId>` (or `status_url`)
    - Uses `apiFetchNoOwner()` (no owner-id injection) to keep job URLs deterministic.
  - Cancel (user action, not triggered by BILN change):
    - `POST /api/core/molecules/conformer_jobs/<jobId>/cancel` (or `cancel_url`)

## Key guards that affect whether fetches happen

- `committedBiln` only updates when BILN is committable and bonds are complete.
- Depiction is driven by `committedBiln` (not raw `bilnValue`).
- Auto 3D generation is blocked by:
  - `autoSync3D === false`
  - `canGenerate3D === false` (e.g., in SS mode constraints don’t cover all residues)
  - resume suppression flags (`suppressAutoConformerAfterResumeRef`, `suppressAutoConformerForBilnRef`, `suppressNextAutoConformerGenRef`)
  - `lastGenRef` dedupe (prevents re-sending identical inputs)
- Template overlap detection can block template-mode generation and open a warning dialog.
