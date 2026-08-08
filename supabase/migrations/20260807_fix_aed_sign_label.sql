UPDATE public.vocabulary_vong2
SET
    word_kr = '자동 심장박동기',
    word_vi = 'Máy khử rung tim ngoài tự động',
    description_vi = 'Chỉ dẫn vị trí đặt máy khử rung tim ngoài tự động (AED).',
    audio_url = NULL,
    updated_at = NOW()
WHERE word_kr = '심장박동기';
