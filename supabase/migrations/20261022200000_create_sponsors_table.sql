-- Create sponsors table for SRISHTI 2.7
CREATE TABLE IF NOT EXISTS public.sponsors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT DEFAULT 'PARTNER',
  logo TEXT NOT NULL,
  website TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- Allow public read access to sponsors
CREATE POLICY "Public read sponsors"
  ON public.sponsors
  FOR SELECT
  USING (true);

-- Allow authenticated/admin write access
CREATE POLICY "Admin write sponsors"
  ON public.sponsors
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert default sponsors if table is empty
INSERT INTO public.sponsors (id, name, tier, logo, website, display_order)
VALUES
  ('sp-1', 'Google for Developers', 'TITLE SPONSOR', 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=400&auto=format&fit=crop&q=80', 'https://developers.google.com', 1),
  ('sp-2', 'Kerala Startup Mission', 'INNOVATION PARTNER', 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&auto=format&fit=crop&q=80', 'https://startupmission.kerala.gov.in', 2),
  ('sp-3', 'Red Bull', 'ENERGY PARTNER', 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=400&auto=format&fit=crop&q=80', 'https://www.redbull.com', 3),
  ('sp-4', 'GitHub Education', 'TECH PARTNER', 'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=400&auto=format&fit=crop&q=80', 'https://education.github.com', 4),
  ('sp-5', 'Intel OneAPI', 'PLATINUM PARTNER', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=80', 'https://intel.com', 5),
  ('sp-6', 'IEDC Thrissur', 'ECOSYSTEM PARTNER', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&auto=format&fit=crop&q=80', 'https://stthomas.ac.in', 6)
ON CONFLICT (id) DO NOTHING;
