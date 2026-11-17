# ElevenLabs workbook transcription rebuild

The original B1–B60 MP3 recordings are transcribed directly by ElevenLabs Scribe v2 in Korean with word timestamps and speaker labels. The rebuild is isolated in `tmp/workbook-listening-elevenlabs`; existing Gemini manifests, Vietnamese translations and remote audio resources remain available until replacement material has been reviewed.

```powershell
node scripts/transcribe_workbook_audio.mjs --from 1 --to 60 --concurrency 2 --output-root tmp/workbook-listening-elevenlabs
node scripts/export_elevenlabs_workbook.mjs
```

Each lesson exports `transcript.ko.txt`, `transcript.ko.srt`, `transcript.json` (raw timestamped speech plus provenance), `segments.json`, and original-voice MP3 clips under `clips/`. The JSON carries the source SHA-256 checksum. Segment exports check ordered word coverage, valid boundaries and each clip's encoded duration. These checks do not establish that every recognized Korean word or linguistic sentence boundary is correct; outputs remain drafts for review.

MP3 seek indexes are rebuilt by copying original audio frames. This avoids incorrect duration headers in B15, B19, B34 and B35. Clip boundaries come from Scribe word timestamps, with short silence padding. No generated voice replaces the original recording.

Scribe performs speech-to-text; these Korean exports are source material for a fresh Vietnamese translation. They do not contain a new Vietnamese translation. Do not reuse old answer-guide segment references after changing segmentation.

The transcription cache requires the ElevenLabs provider, Scribe model and matching original checksum. A Gemini transcript can no longer satisfy this cache. Previous transcript JSON is backed up before replacement. The account subscription endpoint may reject a key that is allowed to use speech-to-text; successful Scribe requests establish the relevant connection.

## Installed question-group pilots: B1 and B2

The user subsequently changed the boundary rule to include the group bell: start 100 ms before the measured bell onset and stop 100 ms before the next group's bell. The last group still runs to EOF. `python scripts/detect_workbook_group_bells.py` locates the matching tonal events in non-speech gaps before the six reviewed headings. Run the B1/B2 pilot cutter, then `python scripts/detect_workbook_group_bells.py --verify-clips` to check the exported clips retain the opening bell and have silent endings. These detector thresholds are validated for B1/B2 only; other lessons require independent verification.

Following user review, B1 and B2 now use three explicit question-group clips each in their remote listening manifests. B1 uses 1–4, 5–8, 9–10; B2 uses 1–5, 6–7, 8–10. The printed B2 heading says 1–3, but questions 4–5 continue under the same instruction on the following page; both the recorded announcements and the next printed heading at question 6 confirm the 1–5 group.

`node scripts/install_workbook_group_pilots.mjs --apply` uploads the reviewed files, verifies remote bytes, backs up original metadata under `tmp/workbook-listening-elevenlabs/backups`, replaces the active segments and clears obsolete Gemini translations and answer guides for those two lessons. Old Storage objects remain for recovery but are no longer referenced by their active manifests. Other lessons and user answers are untouched. The installation report is `reports/workbook-group-pilots-install.json`.

Explicit group fields (`questionEndNumber`, `groupInstruction`) bypass heuristic grouping in the reader. The player streams the selected group file through its authenticated clip API; full audio remains separately available. Playback, group stopping, return to full recording and the private API are covered by `scripts/test-workbook-group-player.mjs` and `scripts/test-workbook-listening-api.cjs`. These changes are available in the local development web server; publishing application code to a separate production host is a separate operation.

Reports: `tmp/workbook-listening-elevenlabs/transcription-run.json` and `reports/workbook-elevenlabs-export.json`. Credentials are loaded from `.env.local` and must never be printed or committed.

## Batch replacement for all 60 lessons

The approved grouping has been extended to B1–B60: 255 group clips. The batch preparation is reproducible with:

```powershell
python scripts/plan_workbook_audio_groups.py
python scripts/build_workbook_bell_groups.py --cut
node scripts/install_workbook_bell_groups.mjs
node scripts/test-workbook-batch-groups.cjs
node scripts/test-workbook-group-player.mjs --batch
node scripts/install_workbook_bell_groups.mjs --apply
```

The planner pairs spoken instructions and question announcements with the workbook's listening fields. Explicit exceptions handle missing instructions, duplicated studio instructions, question groups spanning pages and printed numbering errors. The builder's `STARTS`, `OVERRIDES` and `PAGE_ANCHORS` record those decisions. It distinguishes group boundaries from chimes used to replay material within a group.

The source recordings contain several chime variants, including dominant frequencies near 392, 523 and 550 Hz. The builder searches only the non-speech gap immediately before each selected group, checks musical frequency bands and preserves 100 ms before the detected bell. There are 190 bell boundaries. At the remaining 65 starts no bell is detected in that gap, including recordings that begin directly with speech; these use measured silence or time zero. No chime is synthesized. The method and any fallback are retained in each group's report and remote `boundaryNotes`.

Per-lesson outputs are under `tmp/workbook-listening-elevenlabs/B<n>/question-groups`. Every source checksum, contiguous boundary, recognized-word coverage, encoded duration and decoded opening bell is checked before upload. Prelude speech such as a standalone “듣기” before the first instruction is excluded and counted separately. Group audio remains in private Storage and the authenticated clip route provides access. `pageNumber` and `anchorY` keep buttons on the printed group headings, including shared groups missing from old interaction OCR.

Installation retains a metadata backup for each replaced resource, verifies every uploaded file by downloading and hashing its bytes, replaces active listening segments, and clears the obsolete Vietnamese translations and answer-guide references. It does not change user answers, book publication, full-recording resources or old Storage objects kept for recovery. Only `textbook_resources.metadata.listening` is replaced. Reports are `reports/workbook-batch-group-preflight.json` and `reports/workbook-batch-group-install.json`.

## Real audio waveforms

The reader footer, summary player and every question group render precomputed peaks from the actual MP3. The played portion is indigo with a red playhead; click, drag or use arrow keys to seek. All views share one audio element. Seeking a paused selection keeps it paused; seeking another group selects and plays that group at the requested offset.

Generate data with `python scripts/prepare_workbook_waveforms.py`, then install with `node scripts/install_workbook_waveforms.mjs --apply`. These scripts verify source/clip checksums and preserve existing cuts and answers. The installer backs up metadata and reloads all 60 resources to verify 60 full-track and 255 group waveforms. `install_workbook_bell_groups.mjs` also retains checksum-matched local waveforms when rebuilding manifests. Missing peaks show a baseline instead of invented bars.

Waveforms use bounded uint8 arrays in the authenticated segments API; storage paths stay private. Reports: `reports/workbook-waveform-preparation.json`, `reports/workbook-waveform-installation.json`. Reader browser checks cover paused seeking, keyboard seeking, drag seeking, switching groups at an offset, full-track switching and synchronized progress at widths 320, 390, 768 and 1440.
