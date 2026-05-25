-- Create vocabulary_vong2 table
CREATE TABLE IF NOT EXISTS public.vocabulary_vong2 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    industry TEXT NOT NULL DEFAULT 'COMMON', -- MANUFACTURING, FISHERY, AGRICULTURE, COMMON
    type TEXT NOT NULL DEFAULT 'TOOL', -- TOOL, SIGN
    word_kr TEXT NOT NULL,
    word_vi TEXT NOT NULL,
    image_url TEXT,
    audio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.vocabulary_vong2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to vocabulary_vong2" ON public.vocabulary_vong2 FOR SELECT USING (true);
CREATE POLICY "Allow admin all access to vocabulary_vong2" ON public.vocabulary_vong2 FOR ALL USING (auth.role() = 'authenticated'); -- simplified for now
