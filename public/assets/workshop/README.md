# Workshop asset files

The registry in `src/features/workshop/assetRegistry.ts` is the source of truth.

Store optimized transparent WebP files in these folders:

- `tools/`
- `parts/`
- `materials/`
- `devices/`
- `containers/`
- `control-parts/`

File names must match the stable asset ID, for example `tools/hammer.webp`.
Missing files are safe: `WorkshopAssetIcon` falls back to the legacy SVG renderer for tools and to a neutral placeholder for other asset types.
