# Workshop asset architecture

## Current architecture

- `WorkshopToolIcon` is the legacy SVG renderer used by existing workshop screens.
- Question records store workshop data in `interview_questions.tool_config` (`JSONB`).
- Admin create/update APIs already preserve the full `tool_config` object.
- The new workshop feature adds typed asset, action and game registries without changing the existing database contract.

## Risks found

- Asset IDs and labels were duplicated across the legacy renderer, admin form and game logic.
- Adding a tool required editing a large rendering switch and several unrelated lists.
- Legacy question configs use location/action IDs that do not form a reusable game schema.
- Image files can be absent or renamed independently from question data.

## Phase 1 migration

1. Keep `WorkshopToolIcon` as the compatibility SVG renderer.
2. Render new and migrated screens through `WorkshopAssetIcon`.
3. Resolve old IDs with `legacyAdapter.ts` and registry aliases.
4. Store typed `game_config` inside the existing nullable `tool_config` JSONB.
5. Configure games through structured admin fields and a live preview.
6. Add real WebP assets gradually; missing images use safe fallbacks.

No production database migration is required in phase 1. A dedicated `game_config JSONB` column can be considered only after the schema is stable and reporting/query requirements justify it.

## Importing the remaining assets

1. Normalize a stable English `id`; never use display labels as keys.
2. Add Korean/Vietnamese names, type, aliases and legacy IDs to the registry.
3. Place the optimized image under `public/assets/workshop/<type>/<id>.webp`.
4. Map legacy question values to the stable ID.
5. Validate admin preview and the three interaction paths: pointer drag, click/tap and keyboard.
6. Import questions in small batches and check unresolved IDs before publishing.
