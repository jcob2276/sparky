"""One renewal job for the scheduled and dashboard-triggered runs."""
import argparse
import fcntl
import json
import os
import re
import socket
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path("/home/ubuntu/.local/share/altkeeper-sparky")
BIN = ROOT.parent / "altkeeper-staging/v0.5.7/AltKeeper-v0.5.7-Linux-ARM64/AltKeeper"
PHONE = ("100.90.143.65", 49152)
PROFILES = ("app.vanguard.os", "app.vanguard.os.widgets")
STATUS = ROOT / "renew-status.json"
LOCK = ROOT / "renew.lock"


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def interpret(code, output, bundle, force):
    expiry = re.search(r"new profile valid until (\S+)", output)
    if code == 0 and f"RENEWED {bundle}" in output.splitlines() and expiry:
        return "renewed", expiry[1]
    if code == 0 and not force and "no renewal needed" in output:
        return "current", None
    return "failed", None


def run_profile(bundle, force):
    try:
        with socket.create_connection(PHONE, timeout=3):
            pass
    except OSError:
        return "offline", None

    args = [str(BIN), "renew", "--bundle", bundle, "--min-days", "3"]
    if force:
        args.append("--force")
    env = {**os.environ, "HOME": str(ROOT.parent.parent.parent), "ALTKEEPER_PHONE": f"{PHONE[0]}:{PHONE[1]}"}
    try:
        result = subprocess.run(args, cwd=ROOT, env=env, capture_output=True, text=True, timeout=30)
    except subprocess.TimeoutExpired:
        return "timeout", None
    except OSError:
        return "failed", None
    return interpret(result.returncode, result.stdout, bundle, force)


def update_profile(previous, bundle, force):
    result, expires = run_profile(bundle, force)
    checked_at = utc_now()
    current = {**previous, "lastAttempt": checked_at, "result": result}
    if result == "renewed":
        current.update(lastRenewed=checked_at, expires=expires)
    return current


def read_status():
    try:
        return json.loads(STATUS.read_text())
    except FileNotFoundError:
        return {}


def save_status(profiles):
    temporary = STATUS.with_suffix(".tmp")
    temporary.write_text(json.dumps(profiles) + "\n")
    temporary.replace(STATUS)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("status", "scheduled", "force"))
    mode = parser.parse_args().mode
    os.umask(0o077)

    with LOCK.open("a") as lock:
        busy = False
        try:
            mode_lock = fcntl.LOCK_SH if mode == "status" else fcntl.LOCK_EX
            fcntl.flock(lock, mode_lock | fcntl.LOCK_NB)
        except BlockingIOError:
            busy = True

        profiles = read_status()
        if mode == "status" or busy:
            print(json.dumps({"profiles": profiles, "busy": busy}))
            return 75 if busy and mode != "status" else 0

        for bundle in PROFILES:
            profiles[bundle] = update_profile(profiles.get(bundle, {}), bundle, mode == "force")
            save_status(profiles)

        print(json.dumps({"profiles": profiles, "busy": False}))
        return int(any(profiles[bundle]["result"] not in ("renewed", "current") for bundle in PROFILES))


if __name__ == "__main__":
    raise SystemExit(main())
