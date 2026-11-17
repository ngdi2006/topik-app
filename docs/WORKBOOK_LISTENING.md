# Workbook listening

The 60 original B1–B60 recordings are processed with Gemini. The first four use native transcription word timestamps. The remaining recordings use speech intervals measured from the original waveform, with Gemini transcribing and translating each interval. Gemini-generated timestamps are never used to cut audio. Clips preserve the original recorded voice; Vietnamese is displayed as text.

The reader provides individual clips, previous/next, repeat, Korean transcript, Vietnamese translation and per-user playback progress. Full recordings remain available. Sentence boundaries follow source pauses and may include several short phrases or a split long utterance.

Answer guides are separate from translations. Gemini compares audio evidence with scanned exercises and stable field/option IDs. Guides are drafts for admin review. Missing or invalid evidence clears the proposed answer and marks it insufficient. Draft guides are excluded from learner API responses; there is no automatic grading based on these drafts. Both workbook books remain unpublished, visible through authorized admin preview.

MP3s B15, B19, B34 and B35 had inaccurate duration headers. Lossless frame remuxing repairs playback indexes in uploaded copies. Original files and original Storage objects are retained. Source checksums always refer to the original MP3.

All audio is in the private `textbooks` bucket. Authenticated API routes check book, unit and resource ownership before returning signed audio redirects. API payloads omit storage paths and local cache paths. Full audio and individual clips use separate user progress records.

Processing uses `.env.local`; never commit credentials or audio caches.

```powershell
node scripts/run_workbook_listening_pipeline.mjs --from 1 --to 60 --concurrency 2
node scripts/verify_workbook_listening.mjs
node scripts/test-workbook-listening.mjs
node scripts/test-workbook-listening-api.cjs
```

Processing resumes from checksum-validated local caches in `tmp/workbook-listening`. The verification report is `reports/workbook-listening-verification.json`; it checks all manifests, original hashes, bilingual text, local clips, guide references and evidence, private storage, admin preview status and remote clip bytes at both ends of every lesson. Each clip duration is checked during preparation.
