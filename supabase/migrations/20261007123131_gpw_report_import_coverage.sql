-- Small operational cursor; raw report packages are never persisted.
CREATE TABLE public.gpw_report_import_coverage (
  isin text PRIMARY KEY REFERENCES public.gpw_companies(isin),
  checked_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','complete','error')),
  lei text,
  legal_name text,
  identity_source_url text,
  error text CHECK (length(error) <= 2000)
);
ALTER TABLE public.gpw_report_import_coverage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gpw_report_import_coverage FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.gpw_report_import_coverage TO service_role;
