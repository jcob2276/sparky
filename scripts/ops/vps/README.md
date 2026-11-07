# sparky-vps — co tu jest

Maszyna Oracle Always Free (Frankfurt, A1.Flex 2 OCPU / 12 GB / 200 GB), dostep tylko przez Tailscale
(`ssh -i ~/.ssh/oci_sparky ubuntu@100.100.25.95`). Sekrety zyja tylko na maszynie w `/etc/sparky-*.env` (chmod 600).

| Co | Plik | Harmonogram / uwagi |
|---|---|---|
| Tworzenie maszyny | `../oci-create-free-vps.ps1` | jednorazowo, ponawia przy braku miejsca |
| Backup bazy (pg_dump) | `backup-db.sh` + `sparky-backup.{service,timer}` | 03:15, rotacja 30d/12t/12m, `/var/backups/sparky` |
| Backup plikow (Kuma + 4 buckety przez S3/rclone) | `backup-files.sh` + `sparky-backup-files.{service,timer}` | 03:45, przyrostowo, nic nie kasuje |
| Worker kolejki `pgmq.sparky_jobs` | `worker/sparky-worker.py` + `.service` | ciagle; rola DB `sparky_worker` (tylko kolejka) |
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

Nowy typ = nowa funkcja z dekoratorem `@handler("nazwa")` w `sparky-worker.py`, potem `scp` + `systemctl restart sparky-worker`.

## Migracje bazy zwiazane z VPS

`20261107120000_index_advisor_hypopg`, `20261107130000_pgmq_wrappers`, `20261107140000_pgmq_worker_role`
(haslo roli `sparky_worker` nadane poza repo, jest tylko w `/etc/sparky-worker.env` na maszynie).
