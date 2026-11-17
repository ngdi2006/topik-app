# Workbook coordinate review

All 543 source pages were measured from their original scanned images. Their dimensions vary, so coordinates always use each image's actual width and height. The review pairs stable question IDs with printed dotted lines, parentheses, writing cells, circled choice numbers and matching items.

The visual review uses original images plus labeled measured anchors. Exact pixel anchors determine final geometry. Estimated visual coordinates are secondary. Pages with a matching number of answer regions use question order, never the previous displaced widget positions. Introductory tables and ambiguous multiline dialogues have directly checked exceptions. Reading prompts, word banks and duplicate answer widgets retain IDs and stored answers but are marked `is_context` when they are not independent answer spaces.

The external service completed 535 visual reviews; the remaining eight pages were checked directly after it returned HTTP 402. Their cached records identify the direct review method. No further external requests are needed to apply the saved results.

The final audit checks printed character overlap and widget collisions. Writes use optimistic concurrency. Eight fields edited concurrently by the admin on volume 1 page 38 were preserved; remaining cells on that page were measured separately. No user-answer tables are updated.

Multiple-choice nodes also have an optional `hit_rect`, measured independently from `rect`. `rect` remains the exact number/word marker used for selection feedback and admin editing; `hit_rect` covers the visible option text row. Selecting an option highlights the row blue and emphasizes its original marker. Editing a marker clears the old hit area so it cannot remain at stale coordinates. Page 39's conjugation table now has twelve measured answer cells, including the previously missing 마시다 cell; all prior field IDs are preserved.

`scripts/sync_workbook_choice_rows.mjs` exports a fresh snapshot, `scripts/prepare_workbook_choice_rows.py` measures hit areas/table cells, and the sync command with `--apply` writes them using optimistic concurrency. Validate with `node --test scripts/test-workbook-choice-rows.cjs` and the isolated browser fixture `node scripts/test-workbook-ui.mjs`.

The subsequent cell audit also scans enclosed empty cells without dotted baselines, including whole missing answer rows. Use `python scripts/audit_workbook_table_cells.py`, `python scripts/repair_workbook_table_cells.py`, `python scripts/audit_workbook_table_cells.py --planned`, and `python scripts/verify_workbook_table_plan.py` after a fresh export. Directly checked mappings cover volume 1 pages 5, 11, 12, 14, 55, 56, 64, 220, 238 and volume 2 page 108. Printed sample syllables, punctuation, empty headers and the calendar illustration are explicitly distinguished from answer cells. `scripts/test-workbook-table-cells.cjs` verifies existing answer IDs, unchanged choice hit areas, input collisions and complete conjugation columns. The audit result is `reports/workbook-table-audit.json`.

Matching items now have a separate normalized `port` position. Small touch buttons and SVG lines use the same port; text/image rectangles remain content bounds. Measured printed bullets are reused, otherwise ports sit in the blank gutter outside the item. A node marked `is_context` remains in stored metadata for compatibility but is excluded from interaction/progress. `allow_shared_targets` permits multiple sources to keep the same target when the exercise requires it.

`python scripts/inspect_workbook_matching.py` produces review sheets for all 31 matching groups. `python scripts/repair_workbook_matching.py` measures text rows/picture bounds and ports. Volume 1 page 37 has a separate stable `p37-match-verbs` field for the previously missing noun-to-verb stage; original picture and target IDs are retained. Page 160 also permits shared verbs. The completed example on page 63 remains noninteractive. Test with `node --test scripts/test-workbook-matching.cjs` and `node scripts/test-workbook-matching-ui.mjs`. The latter uses the real overlay with isolated fake saved answers, covering desktop/mobile, shared verbs and reload. These changes never rewrite existing user annotations.

Artifacts are private local caches under `tmp/workbook-coordinate-review`, excluded from Git. The current verified result is `reports/workbook-coordinate-verification.json`.

```powershell
python scripts/scan_workbook_coordinate_anchors.py
node scripts/review_workbook_coordinates.mjs --concurrency 16
python scripts/refine_workbook_coordinate_exceptions.py
python scripts/plan_workbook_coordinate_corrections.py
python scripts/audit_workbook_coordinate_plan.py
node --test scripts/test-workbook-coordinate-review.cjs
node scripts/apply_workbook_coordinate_review.mjs
node scripts/summarize_workbook_coordinate_review.mjs
```

For a later rerun, first export a fresh source snapshot, preserve any concurrent admin edits, and inspect those pages before applying. The commands above are processing tools, not an unattended schedule; do not regenerate a plan over newer admin edits without merging them.
