# sparky-vps — co tu jest

Maszyna Oracle Always Free (Frankfurt, A1.Flex 2 OCPU / 12 GB / 200 GB), dostep tylko przez Tailscale
(`ssh -i ~/.ssh/oci_sparky ubuntu@100.100.25.95`). Sekrety zyja tylko na maszynie w `/etc/sparky-*.env` (chmod 600).

| Co | Plik | Harmonogram / uwagi |
|---|---|---|
| Tworzenie maszyny | `../oci-create-free-vps.ps1` | jednorazowo, ponawia przy braku miejsca |
| Backup bazy (pg_dump) | `backup-db.sh` + `sparky-backup.{service,timer}` | 03:15, rotacja 30d/12t/12m, `/var/backups/sparky` |
| Backup plikow (Kuma + 4 buckety przez S3/rclone) | `backup-files.sh` + `sparky-backup-files.{service,timer}` | 03:45, przyrostowo, nic nie kasuje |
| Worker kolejki `pgmq.sparky_jobs` | `worker/sparky-worker.py` + `.service` | ciagle; rola DB `sparky_worker` (tylko kolejka) |
| Archiwum surowego tetna Oury (SQLite) | `/var/lib/sparky-archive/archive.db` (zapisuje worker) | pg_cron `archive-oura-hr-daily` 04:10 UTC; kopia w `backup-files.sh` (`/var/backups/sparky/archive`) |
| Kopia danych finansowych (JSON Lines, bez `bank_connection_secrets`) | `backup-db.sh` -> `/var/backups/sparky/finance` | z backupem bazy 03:15; dzienne 30 dni, miesieczne (1. dnia) bez wygasania |
| Ceny i wartosc portfela | handler `fetch_prices` w `sparky-worker.py` (yfinance + kursy do PLN) | pg_cron `fetch-prices-daily` pn-pt 23:00 UTC; tabele `finance_price_history`, `finance_portfolio_daily` |
| Alert zgody bankowej | funkcja SQL `bank_consent_watch()` (bez VPS) | pg_cron `bank-consent-watch` 07:00 UTC; 7/3/1 dni przed koncem, po terminie, cisza >48 h -> Telegram przez `outbound_messages` |
| Uptime Kuma | `/opt/uptime-kuma` (Docker) | `http://100.100.25.95:3001`, tylko Tailscale |

Sekrety: `../vps-set-db-password.ps1` (DATABASE_URL), `../vps-set-service-key.ps1`. Klucze S3 do bucketow: `S3_ENDPOINT`,
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` w `/etc/sparky-backup.env`.

## Worker: dodawanie zadan

```sql
select pgmq.send('sparky_jobs', '{"type":"echo","payload":{"a":1}}');
```

Typy: `echo`, `sleep` (test), `invoke_function` (payload: `function`, `body`, `timeout`; wymaga `SUPABASE_FUNCTION_KEY`
w `/etc/sparky-worker.env`). Blad -> ponowienie po 15 min, po 5 probach wiadomosc laduje w archiwum z logiem
(`journalctl -u sparky-worker`). Wynik sukcesu: archiwum `pgmq.a_sparky_jobs`.

### Archiwum surowych szeregow (`archive_oura_hr`)

Supabase trzyma tylko wskazniki dzienne (`oura_hr_daily`); surowe probki tetna zyja na VPS-ie w SQLite
(`hr_samples`, klucz `user_id+ts+source`, plus `archive_runs`). Zadanie:
`select pgmq.send('sparky_jobs', jsonb_build_object('type','archive_oura_hr','payload', jsonb_build_object('user_id','<uuid>','days_back',400)));`
Worker pobiera okna po 7 dni przez `sync?service=oura-hr-raw`. Uwierzytelnia waski sekret `ARCHIVE_SECRET`
(`/etc/sparky-worker.env` na VPS i sekret funkcji w Supabase), nie klucz serwisowy; token Oury nie opuszcza Supabase.
Zapis jest idempotentny, wiec ponowienie po bledzie jest bezpieczne. Odczyt: `sudo -u sparky-worker sqlite3 /var/lib/sparky-archive/archive.db`.

Nowy typ = nowa funkcja z dekoratorem `@handler("nazwa")` w `sparky-worker.py`, potem `scp` + `systemctl restart sparky-worker`.

## Migracje bazy zwiazane z VPS

`20261107120000_index_advisor_hypopg`, `20261107130000_pgmq_wrappers`, `20261107140000_pgmq_worker_role`
(haslo roli `sparky_worker` nadane poza repo, jest tylko w `/etc/sparky-worker.env` na maszynie).
