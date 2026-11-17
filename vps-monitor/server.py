#!/usr/bin/env python3
"""Centrum sterowania VPS.

Lokalny serwer (tylko 127.0.0.1) pośredniczy między przeglądarką a VPS-em przez SSH.
Odczyty są swobodne. Akcje zmieniające stan wymagają tokenu sesji, sprawdzania Host/Origin,
mają listę chronionych usług i ścieżek, a usuwanie plików to przeniesienie do kosza.
"""
import json, os, posixpath, re, secrets, shlex, subprocess, threading, time
from datetime import datetime
from urllib.parse import parse_qs, quote, urlparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LOCAL = os.environ.get("LOCAL") == "1"          # 1 = panel działa na samym VPS-ie (bez SSH)
HOST = "localhost" if LOCAL else os.environ.get("VPS_HOST", "root@100.100.25.95")
PORT = int(os.environ.get("PORT", "8765"))
BIND = os.environ.get("BIND", "127.0.0.1")
AUTH_TS = os.environ.get("AUTH_TAILSCALE") == "1"  # 1 = wpuszczaj tylko urządzenia z Twojego konta Tailscale
HERE = os.path.dirname(os.path.abspath(__file__))
TOKEN = secrets.token_urlsafe(24)
EXTRA_HOSTS = [h.strip() for h in os.environ.get("EXTRA_HOSTS", "").split(",") if h.strip()]
ALLOWED_HOSTS = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"} | {f"{h}:{PORT}" for h in EXTRA_HOSTS}
ALLOWED_ORIGINS = {"http://" + h for h in ALLOWED_HOSTS}
STATIC = {"/app.css": "text/css; charset=utf-8", "/app.js": "text/javascript; charset=utf-8"}
MAX_UPLOAD = 4 * 1024 ** 3
MAX_EDIT = 500 * 1024
TRASH = "/home/ubuntu/.kosz-panel"
AUDIT_FILE = os.environ.get("AUDIT_FILE", os.path.join(HERE, "audit.log"))

SOCK = "/tmp/vpsmon-%h-%p-%r"
SSH = ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=8",
       "-o", "ControlMaster=auto", "-o", f"ControlPath={SOCK}", "-o", "ControlPersist=120", HOST]


def argv(cmd):
    """Polecenie do wykonania: lokalnie na VPS-ie albo przez SSH z Maca."""
    return ["bash", "-c", cmd] if LOCAL else SSH + [cmd]


# ---------------------------------------------------------------- tożsamość Tailscale
_ident = {}
ALLOWED_LOGINS = {x for x in os.environ.get("ALLOW_LOGINS", "").split(",") if x}


def ts_json(*args):
    r = subprocess.run(["tailscale", *args], capture_output=True, text=True, timeout=6)
    return json.loads(r.stdout)


def ts_login(ip):
    now = time.time()
    c = _ident.get(ip)
    if c and now - c[0] < 60:
        return c[1]
    try:
        login = ts_json("whois", "--json", ip).get("UserProfile", {}).get("LoginName", "")
    except Exception:
        login = ""
    _ident[ip] = (now, login)
    return login


def init_auth():
    """Domyślnie wpuszczam tylko konto, do którego należy ten serwer w Tailscale."""
    if ALLOWED_LOGINS:
        return
    try:
        st = ts_json("status", "--json")
        uid = str(st["Self"]["UserID"])
        ALLOWED_LOGINS.add(st["User"][uid]["LoginName"])
    except Exception:
        pass

# ---------------------------------------------------------------- polecenia odczytu
LIVE_CMD = r"""
echo '##OS'; . /etc/os-release 2>/dev/null; echo "$PRETTY_NAME"; uname -r; hostname; uptime -p
echo '##MEM'; grep -E '^(MemTotal|MemAvailable|MemFree|Buffers|Cached|SwapTotal|SwapFree|Shmem|SReclaimable):' /proc/meminfo
echo '##LOAD'; cat /proc/loadavg; nproc
echo '##CPU'; head -1 /proc/stat
echo '##DISK'; df -PBM -x tmpfs -x devtmpfs -x squashfs -x overlay -x efivarfs 2>/dev/null | tail -n +2
echo '##PS'; ps -eo pid=,user:12=,pcpu=,pmem=,rss=,comm= --sort=-rss | head -30
echo '##PORTS'; ss -tulnHp 2>/dev/null | awk '{print $1, $5, $7}' | head -60
echo '##FW'; iptables -S INPUT 2>/dev/null
"""
DOCKER_CMD = r"""
command -v docker >/dev/null 2>&1 || exit 0
echo '##PS'; docker ps -a --format '{{.Names}}|{{.Image}}|{{.State}}|{{.Status}}|{{.Ports}}|{{.ID}}' 2>/dev/null
echo '##STATS'; docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}' 2>/dev/null
"""
SERV_CMD = r"""
systemctl list-units --type=service --all --no-legend --plain --no-pager 2>/dev/null | awk '{u=$1;l=$2;a=$3;s=$4;$1=$2=$3=$4="";print u"|"l"|"a"|"s"|"substr($0,5)}'
"""
PKG_CMD = r"""
echo '##MANUAL'; apt-mark showmanual 2>/dev/null
echo '##DPKG'; dpkg-query -W -f='${Package}\t${Version}\t${Installed-Size}\n' 2>/dev/null
echo '##SNAP'; snap list 2>/dev/null | tail -n +2 | awk '{print $1"\t"$2}'
echo '##IMAGES'; docker images --format '{{.Repository}}:{{.Tag}}|{{.Size}}' 2>/dev/null
"""

state = {"live": None, "docker": None, "services": None, "packages": None, "error": None, "ts": 0}
history = {"mem": [], "cpu": [], "swap": []}
_prev_cpu = None
lock = threading.Lock()
audit_log = []


class ApiError(Exception):
    def __init__(self, msg, needs_force=False):
        super().__init__(msg)
        self.msg, self.needs_force = msg, needs_force


def run_rc(cmd, timeout=30, stdin=None):
    r = subprocess.run(argv(cmd), capture_output=True, text=not isinstance(stdin, bytes), input=stdin, timeout=timeout)
    out = r.stdout if isinstance(r.stdout, str) else r.stdout.decode("utf-8", "replace")
    err = r.stderr if isinstance(r.stderr, str) else r.stderr.decode("utf-8", "replace")
    return r.returncode, out, err


def run(cmd, timeout=30):
    rc, out, err = run_rc(cmd, timeout)
    if rc != 0 and not out:
        raise RuntimeError(err.strip() or f"ssh exit {rc}")
    return out


def sections(text):
    out, cur = {}, None
    for line in text.splitlines():
        if line.startswith("##"):
            cur = line[2:].strip()
            out[cur] = []
        elif cur:
            out[cur].append(line)
    return out


# ---------------------------------------------------------------- audyt
def audit(action, target, ok, msg=""):
    e = {"ts": datetime.now().isoformat(timespec="seconds"), "action": action, "target": target, "ok": ok, "msg": msg}
    audit_log.append(e)
    del audit_log[:-300]
    try:
        with open(AUDIT_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
    except OSError:
        pass


def load_audit():
    try:
        with open(AUDIT_FILE, encoding="utf-8") as f:
            for l in f.readlines()[-300:]:
                audit_log.append(json.loads(l))
    except (OSError, ValueError):
        pass


# ---------------------------------------------------------------- parsowanie
def parse_live(text):
    global _prev_cpu
    s = sections(text)
    osl = s.get("OS", []) + [""] * 4
    mem = {}
    for l in s.get("MEM", []):
        k, v = l.split(":")
        mem[k] = int(v.split()[0]) * 1024
    total, avail = mem.get("MemTotal", 0), mem.get("MemAvailable", 0)
    cache = mem.get("Buffers", 0) + mem.get("Cached", 0) + mem.get("SReclaimable", 0)
    used = total - avail
    swap_t = mem.get("SwapTotal", 0)
    swap_u = swap_t - mem.get("SwapFree", 0)
    load = s.get("LOAD", ["0 0 0", "1"]) + ["1"]
    l1, l5, l15 = [float(x) for x in load[0].split()[:3]]
    cores = int(load[1] or 1)
    cpu_pct = None
    if s.get("CPU"):
        f = [int(x) for x in s["CPU"][0].split()[1:9]]
        idle, tot = f[3] + f[4], sum(f)
        if _prev_cpu and tot > _prev_cpu[1]:
            cpu_pct = round(100 * (1 - (idle - _prev_cpu[0]) / (tot - _prev_cpu[1])), 1)
        _prev_cpu = (idle, tot)
    disks = []
    for l in s.get("DISK", []):
        p = l.split()
        if len(p) >= 6:
            disks.append({"fs": p[0], "size": int(p[1][:-1]) * 1048576, "used": int(p[2][:-1]) * 1048576, "mount": p[5]})
    procs = []
    for l in s.get("PS", []):
        p = l.split(None, 5)
        if len(p) == 6:
            procs.append({"pid": int(p[0]), "user": p[1], "cpu": float(p[2]), "mem": float(p[3]), "rss": int(p[4]) * 1024, "name": p[5]})
    ports = []
    for l in s.get("PORTS", []):
        p = l.split(None, 2)
        if len(p) >= 2:
            proc = p[2].split('"')[1] if len(p) == 3 and 'users:(("' in p[2] else ""
            ports.append({"proto": p[0], "addr": p[1], "proc": proc})
    fw = {"restrictive": False, "open": {"tcp": [], "udp": []}}
    for l in s.get("FW", []):
        if re.match(r"-P INPUT (DROP|REJECT)", l) or re.match(r"-A INPUT -j (REJECT|DROP)", l):
            fw["restrictive"] = True
        m = re.search(r"-p (tcp|udp)\b.*--dport (\d+)", l)
        if m and "-j ACCEPT" in l and " -i " not in l:
            fw["open"][m.group(1)].append(int(m.group(2)))
    live = {
        "fw": fw,
        "os": osl[0], "kernel": osl[1], "hostname": osl[2], "uptime": osl[3],
        "mem": {"total": total, "used": used, "cache": cache, "avail": avail, "swap_total": swap_t, "swap_used": swap_u},
        "load": [l1, l5, l15], "cores": cores, "cpu": cpu_pct, "disks": disks, "procs": procs, "ports": ports,
    }
    if total:
        history["mem"].append(round(100 * used / total, 1))
        history["swap"].append(round(100 * swap_u / swap_t, 1) if swap_t else 0)
    history["cpu"].append(cpu_pct if cpu_pct is not None else 0)
    for k in history:
        del history[k][:-120]
    live["history"] = {k: list(v) for k, v in history.items()}
    return live


def pct(x):
    try:
        return float(x.strip().rstrip("%"))
    except ValueError:
        return 0.0


def parse_docker(text):
    s = sections(text)
    stats = {}
    for l in s.get("STATS", []):
        p = l.split("|")
        if len(p) == 5:
            stats[p[0]] = {"cpu": pct(p[1]), "mem": p[2], "memp": pct(p[3]), "net": p[4]}
    cs = []
    for l in s.get("PS", []):
        p = l.split("|")
        if len(p) == 6:
            cs.append({"name": p[0], "image": p[1], "state": p[2], "status": p[3], "ports": p[4], "id": p[5], **stats.get(p[0], {})})
    return {"available": "PS" in s, "containers": cs}


PROT_SVC = re.compile(r"^(ssh|sshd|tailscaled|docker|containerd|dbus|networkd-dispatcher|systemd-.*|getty@.*|serial-getty@.*|user@.*|cloud-init.*)\.service$")


def parse_services(text):
    out = []
    for l in text.splitlines():
        p = l.split("|")
        if len(p) == 5 and p[0].endswith(".service"):
            out.append({"unit": p[0], "load": p[1], "active": p[2], "sub": p[3], "desc": p[4].strip(), "protected": bool(PROT_SVC.match(p[0]))})
    return out


def parse_packages(text):
    s = sections(text)
    manual = set(x for x in s.get("MANUAL", []) if x)
    pk = []
    for l in s.get("DPKG", []):
        p = l.split("\t")
        if len(p) == 3:
            try:
                size = int(p[2]) * 1024
            except ValueError:
                size = 0
            pk.append({"name": p[0], "version": p[1], "size": size, "manual": p[0] in manual})
    pk.sort(key=lambda x: -x["size"])
    snaps = [dict(zip(("name", "version"), l.split("\t"))) for l in s.get("SNAP", []) if "\t" in l]
    images = [dict(zip(("name", "size"), l.split("|"))) for l in s.get("IMAGES", []) if "|" in l]
    return {"apt": pk, "snap": snaps, "images": images}


def poller(fn, parse, key, every, timeout):
    while True:
        try:
            val = parse(run(fn, timeout))
            with lock:
                state[key] = val
                if key == "live":
                    state.update(error=None, ts=time.time())
        except Exception as e:
            if key == "live":
                with lock:
                    state.update(error=str(e), ts=time.time())
        time.sleep(every)


# ---------------------------------------------------------------- polityka ścieżek
WRITE_ROOTS = ("/home", "/opt", "/srv", "/tmp", "/var/www", "/root")
ROOT_DIRS = {"/home", "/opt", "/srv", "/tmp", "/var/www", "/root", "/home/ubuntu", "/home/dtms", "/home/opc"}


def safe_path(p):
    p = p or "/"
    if "\0" in p or not p.startswith("/"):
        p = "/"
    return posixpath.normpath(p)


def valid_name(n):
    if not n or n in (".", "..") or "/" in n or "\0" in n or len(n) > 255:
        raise ApiError("Nieprawidłowa nazwa (bez ukośników, niepusta).")
    return n


def policy(path):
    """('ok'|'warn'|'block', powód)"""
    p = safe_path(path)
    if not any(p == r or p.startswith(r + "/") for r in WRITE_ROOTS):
        return "block", "Zmiany są dozwolone tylko w /home, /opt, /srv, /tmp, /var/www i /root."
    if p in ROOT_DIRS:
        return "block", "To katalog główny konta lub usługi. Nie zmieniam go z panelu."
    parts = p.split("/")
    if ".ssh" in parts or "authorized_keys" in parts:
        return "block", "Klucze SSH są chronione, żeby nie stracić dostępu do serwera."
    if p == TRASH or p.startswith(TRASH + "/"):
        return "block", "Kosz obsługuje się przez przycisk Kosz."
    if p.startswith("/opt/") or p.startswith("/root"):
        return "warn", "Ta ścieżka może należeć do działającej usługi. Zmiana może ją zepsuć."
    return "ok", ""


def dir_policy(path):
    """Czy w tym folderze wolno tworzyć i wysyłać pliki (sam folder może być chroniony przed zmianą nazwy/usunięciem)."""
    p = safe_path(path)
    if p in ("/", "/home") or not any(p == r or p.startswith(r + "/") for r in WRITE_ROOTS):
        return "block"
    if ".ssh" in p.split("/") or p == TRASH or p.startswith(TRASH + "/"):
        return "block"
    return "warn" if p.startswith("/opt") or p.startswith("/root") else "ok"


def need(path, force):
    lvl, why = policy(path)
    if lvl == "block":
        raise ApiError(why)
    if lvl == "warn" and not force:
        raise ApiError(why, needs_force=True)


# ---------------------------------------------------------------- API odczytu
def api_ls(path):
    q = shlex.quote(path)
    out = run(f"LC_ALL=C find {q} -mindepth 1 -maxdepth 1 -printf '%y\\t%s\\t%TY-%Tm-%Td %TH:%TM\\t%CY-%Cm-%Cd %CH:%CM\\t%u\\t%m\\t%f\\n' 2>&1 | head -4000", 30)
    items = []
    for l in out.splitlines():
        p = l.split("\t")
        if len(p) == 7:
            items.append({"type": p[0], "size": int(p[1]), "mtime": p[2], "ctime": p[3], "owner": p[4], "mode": p[5], "name": p[6]})
    return {"path": path, "items": items, "policy": dir_policy(path)}


def api_du(path):
    q = shlex.quote(path)
    out = run(f"du -xka --max-depth=1 {q} 2>/dev/null | sort -rn | head -120", 180)
    sizes = {}
    for l in out.splitlines():
        s, _, name = l.partition("\t")
        if s.isdigit():
            sizes[name] = int(s) * 1024
    total = sizes.pop(path, None)
    return {"path": path, "total": total, "sizes": {posixpath.basename(k): v for k, v in sizes.items()}}


def api_cat(path):
    q = shlex.quote(path)
    cmd = (f'P={q}; [ -f "$P" ] || {{ echo "##NOFILE"; exit; }}; S=$(stat -L -c %s "$P"); echo "##SIZE $S"; '
           f'if [ "$S" -eq 0 ] || grep -Iq . "$P" 2>/dev/null; then echo "##TEXT"; head -c 200000 "$P"; else echo "##BINARY"; fi')
    out = run(cmd, 30)
    head, _, rest = out.partition("\n")
    if head.startswith("##NOFILE"):
        return {"path": path, "kind": "none"}
    size = int(head.split()[1]) if head.startswith("##SIZE") else 0
    kind, _, body = rest.partition("\n")
    if kind.startswith("##BINARY"):
        return {"path": path, "kind": "binary", "size": size}
    return {"path": path, "kind": "text", "size": size, "text": body, "truncated": size > 200000, "policy": policy(path)[0]}


def api_trash():
    out = run(f'cd {TRASH} 2>/dev/null || exit 0; for d in */; do d=${{d%/}}; [ -e "$d/origin" ] || continue; '
              f'printf "%s\\t%s\\t%s\\n" "$d" "$(cat "$d/origin")" "$(du -sk "$d/item" 2>/dev/null | cut -f1)"; done', 30)
    items = []
    for l in out.splitlines():
        p = l.split("\t")
        if len(p) == 3 and p[2].isdigit():
            items.append({"id": p[0], "origin": p[1], "size": int(p[2]) * 1024, "ts": int(p[0].split("-")[0])})
    items.sort(key=lambda x: -x["ts"])
    return {"items": items}


def api_backup():
    out = run("cat /var/lib/vps-control-center/backup-status.json 2>/dev/null || echo '{}'; echo '##A'; systemctl is-active vps-backup.service; "
              "echo '##T'; systemctl show vps-backup.timer -p NextElapseUSecRealtime --value; "
              "echo '##C'; grep -q '^client_id' /root/.config/rclone/rclone.conf 2>/dev/null && echo own || echo shared", 30)
    status_txt, _, rest = out.partition("##A\n")
    active, _, rest = rest.partition("##T\n")
    nxt, _, client = rest.partition("##C\n")
    try:
        st = json.loads(status_txt or "{}")
    except ValueError:
        st = {}
    return {"status": st, "running": active.strip() in ("active", "activating"), "next": nxt.strip(), "own_client": client.strip() == "own"}


def api_logs(kind, name):
    if kind == "docker":
        if not re.fullmatch(r"[A-Za-z0-9_.-]+", name):
            raise ApiError("Zła nazwa kontenera.")
        out = run(f"docker logs --tail 300 --timestamps {shlex.quote(name)} 2>&1", 30)
    elif kind == "service":
        if not re.fullmatch(r"[A-Za-z0-9@:_.\\-]+\.service", name):
            raise ApiError("Zła nazwa usługi.")
        out = run(f"journalctl -u {shlex.quote(name)} -n 300 --no-pager -o short-iso 2>&1", 30)
    else:
        raise ApiError("Nieznany rodzaj logów.")
    return {"text": out}


# ---------------------------------------------------------------- akcje
PROT_COMM = re.compile(r"^(sshd|tailscaled|systemd.*|dockerd|containerd.*|init|kthreadd)$")


def act(b):
    t, force = b.get("type"), bool(b.get("force"))
    if t == "docker":
        a, name = b.get("action"), str(b.get("name", ""))
        if a not in ("start", "stop", "restart") or not re.fullmatch(r"[A-Za-z0-9_.-]+", name):
            raise ApiError("Nieprawidłowa akcja kontenera.")
        rc, out, err = run_rc(f"docker {a} {shlex.quote(name)} 2>&1", 90)
        return {"ok": rc == 0, "msg": (out or err).strip()}
    if t == "service":
        a, unit = b.get("action"), str(b.get("name", ""))
        if not unit.endswith(".service"):
            unit += ".service"
        if a not in ("start", "stop", "restart") or not re.fullmatch(r"[A-Za-z0-9@:_.\\-]+\.service", unit):
            raise ApiError("Nieprawidłowa akcja usługi.")
        if PROT_SVC.match(unit):
            raise ApiError(f"{unit} jest chroniona (SSH, Tailscale, Docker i usługi systemowe). Zatrzymanie mogłoby odciąć dostęp do serwera.")
        rc, out, err = run_rc(f"systemctl {a} {shlex.quote(unit)} 2>&1; systemctl is-active {shlex.quote(unit)}", 90)
        return {"ok": rc == 0 or out.strip().endswith("active"), "msg": (out or err).strip()}
    if t == "kill":
        pid, sig = int(b.get("pid", 0)), b.get("sig", "TERM")
        if pid <= 1 or sig not in ("TERM", "KILL"):
            raise ApiError("Nieprawidłowy proces lub sygnał.")
        rc, comm, _ = run_rc(f"cat /proc/{pid}/comm 2>/dev/null", 15)
        comm = comm.strip()
        if not comm:
            raise ApiError("Proces już nie istnieje.")
        if PROT_COMM.match(comm):
            raise ApiError(f"Proces {comm} jest chroniony.")
        rc, out, err = run_rc(f"kill -{sig} {pid} 2>&1", 15)
        return {"ok": rc == 0, "msg": (out or err).strip() or f"Wysłano {sig} do {comm} ({pid})"}
    if t == "backup":
        rc, st, _ = run_rc("systemctl is-active vps-backup.service", 15)
        if st.strip() in ("active", "activating"):
            raise ApiError("Kopia już trwa.")
        rc, out, err = run_rc("systemctl start --no-block vps-backup.service 2>&1", 20)
        return {"ok": rc == 0, "msg": (out or err).strip() or "Kopia wystartowała"}
    if t == "mkdir":
        d, name = safe_path(b.get("dir")), valid_name(b.get("name", ""))
        need(d + "/" + name, force)
        P, D = shlex.quote(d + "/" + name), shlex.quote(d)
        rc, out, err = run_rc(f'[ -e {P} ] && exit 17; mkdir -- {P} && chown --reference={D} {P}', 20)
        if rc == 17:
            raise ApiError("Taka nazwa już istnieje.")
        return {"ok": rc == 0, "msg": (out or err).strip() or "Utworzono folder"}
    if t == "rename":
        src, new = safe_path(b.get("path")), valid_name(b.get("new_name", ""))
        dst = posixpath.join(posixpath.dirname(src), new)
        need(src, force)
        need(dst, force)
        rc, out, err = run_rc(f"[ -e {shlex.quote(dst)} ] && exit 17; mv -n -- {shlex.quote(src)} {shlex.quote(dst)}", 30)
        if rc == 17:
            raise ApiError("Element o takiej nazwie już istnieje.")
        return {"ok": rc == 0, "msg": (out or err).strip() or "Zmieniono nazwę"}
    if t == "trash":
        paths = [safe_path(p) for p in b.get("paths", [])]
        if not paths:
            raise ApiError("Nic nie wybrano.")
        for p in paths:
            need(p, force)
        done = 0
        for p in paths:
            P = shlex.quote(p)
            cmd = (f'[ -e {P} ] || exit 4; mkdir -p {TRASH} && chown ubuntu:ubuntu {TRASH}; '
                   f'ID=$(date +%s)-$RANDOM; T={TRASH}/$ID; mkdir "$T" && printf "%s" {P} > "$T/origin" && mv -- {P} "$T/item"')
            rc, out, err = run_rc(cmd, 600)
            if rc != 0:
                raise ApiError((out or err).strip() or f"Nie udało się przenieść {p} do kosza.")
            done += 1
        return {"ok": True, "msg": f"Przeniesiono do kosza: {done}"}
    if t == "restore":
        i = str(b.get("id", ""))
        if not re.fullmatch(r"\d+-\d+", i):
            raise ApiError("Zły identyfikator.")
        T = f"{TRASH}/{i}"
        rc, orig, _ = run_rc(f"cat {T}/origin 2>/dev/null", 15)
        if not orig:
            raise ApiError("Nie ma takiego elementu w koszu.")
        need(orig, True)
        rc, out, err = run_rc(f'P={shlex.quote(orig)}; [ -e "$P" ] && exit 17; mkdir -p "$(dirname "$P")" && mv -- {T}/item "$P" && rm -f {T}/origin && rmdir {T}', 600)
        if rc == 17:
            raise ApiError(f"W miejscu {orig} jest już coś o tej nazwie.")
        return {"ok": rc == 0, "msg": (out or err).strip() or f"Przywrócono do {orig}"}
    if t == "empty_trash":
        if b.get("confirm") != "USUŃ":
            raise ApiError("Brak potwierdzenia.")
        rc, out, err = run_rc(f"[ -d {TRASH} ] && find {TRASH} -mindepth 1 -maxdepth 1 -exec rm -rf -- {{}} +", 900)
        return {"ok": True, "msg": "Kosz opróżniony"}
    raise ApiError("Nieznana akcja.")


def write_file(b):
    path, text, force = safe_path(b.get("path")), b.get("text", ""), bool(b.get("force"))
    data = text.encode("utf-8")
    if len(data) > MAX_EDIT:
        raise ApiError("Plik jest za duży do edycji w panelu.")
    need(path, force)
    P = shlex.quote(path)
    cmd = (f'[ -f {P} ] || exit 4; T={P}.panel-tmp; cat > "$T" && chown --reference={P} "$T" && chmod --reference={P} "$T" && mv -f "$T" {P}')
    rc, out, err = run_rc(cmd, 30, stdin=data)
    if rc == 4:
        raise ApiError("Plik nie istnieje.")
    return {"ok": rc == 0, "msg": (out or err).strip() or "Zapisano"}


# ---------------------------------------------------------------- serwer HTTP
class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, code, body, ctype, extra=None):
        b = body if isinstance(body, bytes) else body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(b)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(b)

    def js(self, obj, code=200):
        self.send(code, json.dumps(obj), "application/json")

    def guard(self, write=False, tokq=None):
        if self.headers.get("Host") not in ALLOWED_HOSTS:
            self.send(403, "zły host", "text/plain")
            return False
        if AUTH_TS:
            ip = self.client_address[0]
            if ip.startswith("::ffff:"):
                ip = ip[7:]
            # połączenia z samego serwera (pozostałe usługi na VPS-ie) nie są wpuszczane
            if ip in ("127.0.0.1", "::1", BIND) or ts_login(ip) not in ALLOWED_LOGINS or not ALLOWED_LOGINS:
                self.send(403, "Brak dostępu: wejdź z urządzenia zalogowanego na Twoje konto Tailscale.", "text/plain; charset=utf-8")
                return False
        if write:
            o = self.headers.get("Origin")
            if (o and o not in ALLOWED_ORIGINS) or self.headers.get("X-Token") != TOKEN:
                self.send(403, "brak uprawnień", "text/plain")
                return False
        if tokq is not None and tokq != TOKEN:
            self.send(403, "brak uprawnień", "text/plain")
            return False
        return True

    # ---- GET
    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        if not self.guard(tokq=q.get("token", [""])[0] if u.path == "/api/download" else None):
            return
        try:
            if u.path in ("/", "/index.html"):
                with open(os.path.join(HERE, "index.html"), encoding="utf-8") as f:
                    return self.send(200, f.read().replace("__TOKEN__", TOKEN), "text/html; charset=utf-8")
            if u.path in STATIC:
                with open(os.path.join(HERE, u.path[1:]), "rb") as f:
                    return self.send(200, f.read(), STATIC[u.path])
            path = safe_path(q.get("path", ["/"])[0])
            if u.path == "/api/live":
                with lock:
                    return self.js({"live": state["live"], "error": state["error"], "ts": state["ts"], "host": HOST})
            if u.path == "/api/docker":
                with lock:
                    return self.js(state["docker"] or {"available": False, "containers": []})
            if u.path == "/api/services":
                with lock:
                    return self.js(state["services"] or [])
            if u.path == "/api/packages":
                with lock:
                    return self.js(state["packages"])
            if u.path == "/api/audit":
                return self.js(list(reversed(audit_log)))
            if u.path == "/api/meta":
                return self.js({"host": HOST, "writeRoots": WRITE_ROOTS, "trash": TRASH, "maxUpload": MAX_UPLOAD})
            if u.path == "/api/ls":
                return self.js(api_ls(path))
            if u.path == "/api/du":
                return self.js(api_du(path))
            if u.path == "/api/cat":
                return self.js(api_cat(path))
            if u.path == "/api/trash":
                return self.js(api_trash())
            if u.path == "/api/backup":
                return self.js(api_backup())
            if u.path == "/api/logs":
                return self.js(api_logs(q.get("kind", [""])[0], q.get("name", [""])[0]))
            if u.path == "/api/download":
                return self.download(path)
            self.send(404, "nie ma", "text/plain")
        except ApiError as e:
            self.js({"error": e.msg})
        except Exception as e:
            self.js({"error": str(e)})

    def download(self, path):
        P = shlex.quote(path)
        rc, out, _ = run_rc(f'if [ -d {P} ]; then echo d; elif [ -f {P} ]; then stat -L -c %s {P}; else echo none; fi', 20)
        out = out.strip()
        name = posixpath.basename(path) or "dysk"
        if out == "none":
            return self.js({"error": "Nie ma takiego pliku."})
        if out == "d":
            cmd, fname, length = f"tar czf - -C {shlex.quote(posixpath.dirname(path) or '/')} {shlex.quote(name)}", name + ".tar.gz", None
        else:
            cmd, fname, length = f"cat -- {P}", name, int(out)
        audit("pobranie", path, True)
        proc = subprocess.Popen(argv(cmd), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Disposition", f"attachment; filename*=UTF-8''{quote(fname)}")
        if length is not None:
            self.send_header("Content-Length", str(length))
        self.end_headers()
        try:
            while True:
                chunk = proc.stdout.read(1 << 20)
                if not chunk:
                    break
                self.wfile.write(chunk)
        except (BrokenPipeError, ConnectionResetError):
            proc.kill()
        finally:
            proc.stdout.close()
            proc.wait()

    # ---- POST
    def do_POST(self):
        u = urlparse(self.path)
        if not self.guard(write=True):
            return
        try:
            if u.path == "/api/upload":
                return self.upload(parse_qs(u.query))
            n = int(self.headers.get("Content-Length", 0))
            if n > 2_000_000:
                raise ApiError("Za duże żądanie.")
            body = json.loads(self.rfile.read(n) or b"{}")
            if u.path == "/api/action":
                try:
                    res = act(body)
                except ApiError as e:
                    audit(f"{body.get('type')}:{body.get('action', '')}", str(body.get("name") or body.get("path") or body.get("paths") or body.get("id") or ""), False, e.msg)
                    raise
                audit(f"{body.get('type')}:{body.get('action', '')}".rstrip(":"), str(body.get("name") or body.get("path") or body.get("paths") or body.get("id") or body.get("pid") or ""), res["ok"], res["msg"][:200])
                return self.js(res)
            if u.path == "/api/write":
                try:
                    res = write_file(body)
                except ApiError as e:
                    audit("zapis pliku", str(body.get("path")), False, e.msg)
                    raise
                audit("zapis pliku", str(body.get("path")), res["ok"], res["msg"][:200])
                return self.js(res)
            self.send(404, "nie ma", "text/plain")
        except ApiError as e:
            self.js({"ok": False, "error": e.msg, "needs_force": e.needs_force})
        except Exception as e:
            self.js({"ok": False, "error": str(e)})

    def upload(self, q):
        d = safe_path(q.get("path", ["/"])[0])
        name = valid_name(q.get("name", [""])[0])
        ow = "1" if q.get("overwrite", ["0"])[0] == "1" else "0"
        force = q.get("force", ["0"])[0] == "1"
        n = int(self.headers.get("Content-Length", 0))
        if n > MAX_UPLOAD:
            raise ApiError("Plik jest większy niż limit 4 GB.")
        need(d + "/" + name, force)
        D, T = shlex.quote(d), shlex.quote(d + "/" + name)
        cmd = (f'[ -d {D} ] || exit 3; if [ -e {T} ] && [ {ow} != 1 ]; then exit 17; fi; '
               f'cat > {T}.upload-part && mv -f {T}.upload-part {T} && chown --reference={D} {T}')
        proc = subprocess.Popen(argv(cmd), stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        left, broken = n, False
        while left > 0:
            chunk = self.rfile.read(min(1 << 20, left))
            if not chunk:
                break
            left -= len(chunk)
            if not broken:
                try:
                    proc.stdin.write(chunk)
                except (BrokenPipeError, OSError):
                    broken = True
        try:
            proc.stdin.close()
        except OSError:
            pass
        rc = proc.wait()
        err = proc.stderr.read().decode("utf-8", "replace").strip()
        target = d + "/" + name
        if rc == 17:
            return self.js({"ok": False, "exists": True, "error": "Plik o tej nazwie już istnieje."})
        if rc == 3:
            audit("wysłanie pliku", target, False, "brak folderu")
            raise ApiError("Folder docelowy nie istnieje.")
        audit("wysłanie pliku", target, rc == 0, f"{n} B" if rc == 0 else err[:200])
        self.js({"ok": rc == 0, "msg": err or "Wysłano", "size": n})


if __name__ == "__main__":
    if AUTH_TS:
        init_auth()
        print("Wpuszczam konta Tailscale:", ", ".join(sorted(ALLOWED_LOGINS)) or "(brak, odmawiam wszystkim)", flush=True)
    load_audit()
    for fn, parse, key, every, tmo in ((LIVE_CMD, parse_live, "live", 2, 25), (DOCKER_CMD, parse_docker, "docker", 5, 30),
                                       (SERV_CMD, parse_services, "services", 8, 30), (PKG_CMD, parse_packages, "packages", 90, 60)):
        threading.Thread(target=poller, args=(fn, parse, key, every, tmo), daemon=True).start()
    print(f"Centrum sterowania VPS: http://{BIND}:{PORT}  (tryb: {'na serwerze' if LOCAL else 'przez SSH ' + HOST})", flush=True)
    ThreadingHTTPServer((BIND, PORT), H).serve_forever()
