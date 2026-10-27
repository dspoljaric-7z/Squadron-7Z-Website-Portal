-- Track which announcements each user has read
-- Run manually in Supabase dashboard → SQL editor for project yetrzecfdckzmnqwrffm

CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, announcement_id)
);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own rows
CREATE POLICY "announcement_reads_own" ON public.announcement_reads
  FOR ALL TO authenticated
  USING (profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1))
  WITH CHECK (profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));
