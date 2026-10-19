-- Token for the Android home-screen food widget: lets the native widget log meals without a Supabase session.
-- Only the SHA-256 hash is stored; the edge function `widget-food` is the sole reader/writer (service role).
CREATE TABLE IF NOT EXISTS public.widget_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.widget_tokens ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: anon/authenticated clients can never read the hash; service role bypasses RLS.
REVOKE ALL ON public.widget_tokens FROM anon, authenticated;
