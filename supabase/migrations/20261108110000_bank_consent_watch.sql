-- Alert o koncu zgody bankowej i o milczacej synchronizacji (Telegram przez outbound_messages -> vanguard-outbox-sender).
-- chat_id bierzemy z ostatniej wiadomosci wyslanej uzytkownikowi (nie trzymamy go w repo).
-- p_dry = true: nic nie wstawia, tylko zwraca tresci (do testow).

create or replace function public.bank_consent_watch(p_now timestamptz default now(), p_dry boolean default false)
returns table(msg text, dedupe text)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_chat bigint;
  v_days integer;
  v_hours integer;
  v_text text;
  v_key text;
begin
  for r in
    select c.id, c.user_id, c.valid_until, c.last_synced_at, c.aspsp_name
    from public.bank_connections c
    where c.status = 'active'
  loop
    v_text := null; v_key := null;
    v_days := ceil(extract(epoch from (r.valid_until - p_now)) / 86400.0);

    if r.valid_until is not null and r.valid_until <= p_now then
      v_text := format('Zgoda bankowa (%s) wygasla. Odnow polaczenie w Finansach, inaczej synchronizacja stoi.', coalesce(r.aspsp_name, 'bank'));
      v_key := format('bank-consent-%s-expired-%s', r.id, to_char(p_now, 'YYYY-MM-DD'));
    elsif r.valid_until is not null and v_days in (7, 3, 1) then
      v_text := format('Zgoda bankowa (%s) wygasa za %s dni (%s). Odnow polaczenie w Finansach.',
                       coalesce(r.aspsp_name, 'bank'), v_days, to_char(r.valid_until at time zone 'Europe/Warsaw', 'DD.MM.YYYY'));
      v_key := format('bank-consent-%s-d%s', r.id, v_days);
    elsif r.last_synced_at is not null and r.last_synced_at < p_now - interval '48 hours' then
      v_hours := floor(extract(epoch from (p_now - r.last_synced_at)) / 3600.0);
      v_text := format('Synchronizacja banku milczy od ok. %s h. Moze to limit banku, ale sprawdz Finanse.', v_hours);
      v_key := format('bank-stale-%s-%s', r.id, to_char(p_now, 'YYYY-MM-DD'));
    end if;

    if v_text is null then continue; end if;
    msg := v_text; dedupe := v_key;
    return next;

    if not p_dry then
      select m.chat_id into v_chat from public.outbound_messages m
        where m.user_id = r.user_id order by m.created_at desc limit 1;
      if v_chat is null then
        select m.chat_id into v_chat from public.outbound_messages m order by m.created_at desc limit 1;
      end if;
      if v_chat is not null then
        insert into public.outbound_messages(user_id, chat_id, payload, priority, dedupe_key)
        values (r.user_id, v_chat,
                jsonb_build_object('method', 'sendMessage', 'body', jsonb_build_object('chat_id', v_chat, 'text', v_text)),
                1, v_key)
        on conflict (dedupe_key) do nothing;
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function public.bank_consent_watch(timestamptz, boolean) from public, anon, authenticated;

select cron.schedule('bank-consent-watch', '0 7 * * *', $$select * from public.bank_consent_watch()$$);
