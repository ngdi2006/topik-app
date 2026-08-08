-- Corrections explicitly reviewed for Vòng 2 vocabulary.
-- Reset audio_url so stale MP3 files are not reused by admin/audio exports.
UPDATE public.vocabulary_vong2
SET word_kr = '테이블톱과 날물', audio_url = NULL, updated_at = NOW()
WHERE word_kr IN ('테이블톱', '테이블톱 / 날물', '테이블톱과날물', '테이블톱 và 날물');

UPDATE public.vocabulary_vong2
SET word_kr = '암나사(너트)', audio_url = NULL, updated_at = NOW()
WHERE word_kr = '암나사';

UPDATE public.vocabulary_vong2
SET word_kr = '수나사(볼트)', audio_url = NULL, updated_at = NOW()
WHERE word_kr = '수나사';

-- The current source contains both terms in one row. Keep its metadata while
-- splitting it into two learner-facing vocabulary records.
INSERT INTO public.vocabulary_vong2 (
    industry, type, word_kr, word_vi, image_url, audio_url, created_at, updated_at
)
SELECT
    industry, type, '수나사(볼트)', 'Bu lông', image_url, NULL, NOW(), NOW()
FROM public.vocabulary_vong2 source
WHERE source.word_kr = '암나사(너트), 수나사(볼트)'
  AND NOT EXISTS (
      SELECT 1 FROM public.vocabulary_vong2 existing
      WHERE existing.industry = source.industry AND existing.word_kr = '수나사(볼트)'
  );

UPDATE public.vocabulary_vong2
SET word_kr = '암나사(너트)', word_vi = 'Đai ốc', audio_url = NULL, updated_at = NOW()
WHERE word_kr = '암나사(너트), 수나사(볼트)';

UPDATE public.vocabulary_vong2
SET audio_url = NULL, updated_at = NOW()
WHERE word_kr IN (
    '수준기', '나사못', '혼합기', '파렛트', '니퍼', '전기 절단기',
    '줄자', '리머', '핸드 절단기', '줄', '붓', '보안경',
    '누전차단기', '전기 드릴', '마대', '자', '테이블톱과 날물',
    '암나사(너트)', '수나사(볼트)'
);
