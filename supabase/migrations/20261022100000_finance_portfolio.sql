-- Finanse: portfel pozycji (heatmapa, alokacja, dopłata), cel majątku netto i szybkie wpisy gotówkowe,
-- które od razu zmieniają saldo konta.

-- 1) Pozycje portfela. Ticker to symbol notowań (np. VGWD.DE, ETFBSPXPL.WA), cena idzie z serwisu notowań.
CREATE TABLE IF NOT EXISTS public.finance_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  ticker text NOT NULL CHECK (ticker ~ '^[A-Za-z0-9^][A-Za-z0-9./^=-]{0,24}$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  asset_class text NOT NULL DEFAULT 'etf'
    CHECK (asset_class IN ('etf', 'stock', 'bond', 'crypto', 'other')),
  quantity numeric NOT NULL CHECK (quantity >= 0),
  avg_cost_pln numeric NOT NULL DEFAULT 0 CHECK (avg_cost_pln >= 0),
  target_weight_pct numeric CHECK (target_weight_pct IS NULL OR (target_weight_pct >= 0 AND target_weight_pct <= 100)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS finance_holdings_user_ticker
  ON public.finance_holdings (user_id, upper(ticker));

ALTER TABLE public.finance_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY finance_holdings_owner ON public.finance_holdings
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON public.finance_holdings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_holdings TO authenticated;
GRANT ALL ON public.finance_holdings TO service_role;

COMMENT ON TABLE public.finance_holdings IS
  'Pozycje portfela inwestycyjnego użytkownika (ilość, średni koszt w PLN, docelowa waga). Wycena z notowań na żywo.';

-- 2) Cel majątku netto (pierwszy cel: 100 000 zł).
ALTER TABLE public.finance_profile
  ADD COLUMN IF NOT EXISTS net_worth_target numeric NOT NULL DEFAULT 100000
    CHECK (net_worth_target > 0);

-- 3) Wpis gotówkowy może wskazywać konto, wtedy zmienia jego saldo.
ALTER TABLE public.finance_transactions
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.finance_accounts (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS finance_transactions_account_idx
  ON public.finance_transactions (account_id) WHERE account_id IS NOT NULL;

-- 4) Atomowy szybki wpis: transakcja + zmiana salda konta w jednej operacji.
CREATE OR REPLACE FUNCTION public.add_finance_cash_entry(
  p_kind text,
  p_amount numeric,
  p_category text,
  p_note text,
  p_date date,
  p_account_id uuid DEFAULT NULL
)
RETURNS public.finance_transactions
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_tx public.finance_transactions;
  v_signed numeric;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_kind NOT IN ('expense', 'income') THEN
    RAISE EXCEPTION 'invalid kind';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  v_signed := CASE WHEN p_kind = 'expense' THEN -p_amount ELSE p_amount END;

  IF p_account_id IS NOT NULL THEN
    UPDATE public.finance_accounts
    SET balance = balance + v_signed
    WHERE id = p_account_id AND user_id = v_user;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'account not found';
    END IF;
  END IF;

  INSERT INTO public.finance_transactions (user_id, amount, category, note, transaction_date, kind, account_id)
  VALUES (
    v_user, v_signed, COALESCE(NULLIF(btrim(p_category), ''), 'Inne'),
    NULLIF(btrim(p_note), ''), COALESCE(p_date, CURRENT_DATE), p_kind, p_account_id
  )
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$;

REVOKE ALL ON FUNCTION public.add_finance_cash_entry(text, numeric, text, text, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_finance_cash_entry(text, numeric, text, text, date, uuid) TO authenticated;
