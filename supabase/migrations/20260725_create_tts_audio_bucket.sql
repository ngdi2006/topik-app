-- Persistent cache for generated ElevenLabs audio.
-- Objects use the deterministic path: <voice-id>/<sha256(text + "_" + voice-id)>.mp3
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'tts-audio',
    'tts-audio',
    true,
    10485760,
    ARRAY['audio/mpeg', 'audio/mp3']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can read cached TTS audio" ON storage.objects;
CREATE POLICY "Public can read cached TTS audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'tts-audio');

-- Uploads and updates are intentionally performed only with the service-role key.
