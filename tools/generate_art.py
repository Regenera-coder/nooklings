"""Generate Nooklings art with the OpenAI Images API, from a list of jobs.

Runs on your own computer (it needs your OpenAI API key and the Drive handover folder).
Uses only the Python standard library: no installs.

    set OPENAI_API_KEY=sk-...                      (Windows cmd;  PowerShell: $env:OPENAI_API_KEY="sk-...")
    python generate_art.py --list-models           (check which image models your account has)
    python generate_art.py --stage masters --dry-run
    python generate_art.py --stage masters         (10 images: look at them before going on)
    python generate_art.py --stage poses
    python generate_art.py --stage redraws

Each job sends a prompt plus reference images and saves one PNG. A job whose output file already
exists is skipped, so the script can be stopped and started again at any time. To redo an image,
delete it (and anything drawn from it) and run again.

Options:
    --jobs FILE      job list (default: art_jobs.json next to this script)
    --base FOLDER    the Drive handover folder (default: the folder this script is in)
    --stage NAME     masters | poses | redraws | all   (default: all)
    --only TEXT      only jobs whose output name contains TEXT (e.g. --only crumb)
    --model ID       image model (default below)
    --quality Q      low | medium | high  (default: high)
    --dry-run        show what would be generated and check the reference files, without calling the API
"""
from __future__ import annotations

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

API = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
DEFAULT_MODEL = "gpt-image-2.5-sunburst"  # check with --list-models; newer IDs can be passed with --model


def arg(name: str, default: str | None = None) -> str | None:
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv and sys.argv.index(name) + 1 < len(sys.argv) else default


def key() -> str:
    k = os.environ.get("OPENAI_API_KEY", "").strip()
    if not k:
        sys.exit("OPENAI_API_KEY is not set. Set it in this terminal first (see the top of this file). Never put the key in a file in Drive.")
    return k


def call(url: str, data: bytes | None = None, content_type: str | None = None, timeout: int = 600) -> dict:
    req = urllib.request.Request(url, data=data, method="POST" if data is not None else "GET")
    req.add_header("Authorization", f"Bearer {key()}")
    if content_type:
        req.add_header("Content-Type", content_type)
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read())


def multipart(fields: dict[str, str], files: list[Path]) -> tuple[bytes, str]:
    boundary = "----nooklings" + uuid.uuid4().hex
    out = bytearray()
    for name, value in fields.items():
        out += f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode()
    for f in files:
        out += f'--{boundary}\r\nContent-Disposition: form-data; name="image[]"; filename="{f.name}"\r\nContent-Type: image/png\r\n\r\n'.encode()
        out += f.read_bytes() + b"\r\n"
    out += f"--{boundary}--\r\n".encode()
    return bytes(out), f"multipart/form-data; boundary={boundary}"


def generate(job: dict, refs: list[Path], model: str, quality: str) -> tuple[bytes, dict]:
    fields = {"model": model, "prompt": job["prompt"], "size": job["size"], "quality": quality, "n": "1"}
    body, ctype = multipart(fields, refs)
    res = call(f"{API}/images/edits", body, ctype)
    item = res["data"][0]
    if item.get("b64_json"):
        img = base64.b64decode(item["b64_json"])
    else:  # some models return a short-lived link instead
        with urllib.request.urlopen(item["url"], timeout=300) as r:
            img = r.read()
    return img, res.get("usage", {})


def main() -> int:
    here = Path(__file__).resolve().parent
    if "--list-models" in sys.argv:
        ids = sorted(m["id"] for m in call(f"{API}/models")["data"] if "image" in m["id"])
        print("Image models on this account:\n  " + "\n  ".join(ids) if ids else "No image models found on this account.")
        return 0

    jobs_file = Path(arg("--jobs", str(here / "art_jobs.json")))
    base = Path(arg("--base", str(here)))
    stage, only = arg("--stage", "all"), arg("--only")
    model, quality = arg("--model", DEFAULT_MODEL), arg("--quality", "high")
    dry = "--dry-run" in sys.argv

    jobs = [j for j in json.loads(jobs_file.read_text(encoding="utf-8")) if stage in ("all", j["stage"]) and (not only or only in j["out"])]
    if not jobs:
        print("No jobs match.")
        return 0
    if not dry:
        key()

    done = skipped = failed = waiting = 0
    tokens_in = tokens_out = 0
    for n, job in enumerate(jobs, 1):
        out = base / job["out"]
        label = f"[{n}/{len(jobs)}] {Path(job['out']).name}"
        if out.exists():
            skipped += 1
            continue
        refs = [base / r for r in job["refs"]]
        missing = [r for r in refs if not r.exists()]
        if missing:
            # References made by earlier jobs (a master sheet, the walk pose) appear as the run goes on.
            waiting += 1
            print(f"{label}: waiting for {', '.join(m.name for m in missing)}")
            continue
        if dry:
            print(f"{label}: would generate {job['size']} from {len(refs)} reference image(s)")
            done += 1
            continue
        for attempt in range(1, 5):
            try:
                size = job["size"]
                try:
                    img, usage = generate(job, refs, model, quality)
                except urllib.error.HTTPError as e:
                    detail = e.read().decode(errors="replace")
                    if e.code == 400 and "size" in detail.lower() and size != "1536x1024" and size != "1024x1024":
                        # The wide reference sheet size is not available on every model: use the standard wide size.
                        print(f"{label}: {size} not accepted, using 1536x1024")
                        img, usage = generate({**job, "size": "1536x1024"}, refs, model, quality)
                    else:
                        raise urllib.error.HTTPError(e.url, e.code, detail, e.headers, None) from None
                out.parent.mkdir(parents=True, exist_ok=True)
                tmp = out.with_suffix(".part")
                tmp.write_bytes(img)
                tmp.replace(out)
                tokens_in += int(usage.get("input_tokens", 0))
                tokens_out += int(usage.get("output_tokens", 0))
                done += 1
                print(f"{label}: saved")
                break
            except urllib.error.HTTPError as e:
                msg = str(e.reason)[:300]
                if e.code in (401, 403):
                    sys.exit(f"{label}: the API key was refused ({e.code}). {msg}")
                if e.code in (429, 500, 502, 503) and attempt < 4:
                    wait = 20 * attempt
                    print(f"{label}: busy ({e.code}), trying again in {wait}s")
                    time.sleep(wait)
                    continue
                failed += 1
                print(f"{label}: FAILED ({e.code}) {msg}")
                break
            except Exception as e:  # network drop, timeout
                if attempt < 4:
                    print(f"{label}: {type(e).__name__}, trying again in 15s")
                    time.sleep(15)
                    continue
                failed += 1
                print(f"{label}: FAILED {e}")
                break

    print(f"\n{'Would generate' if dry else 'Generated'} {done}, already there {skipped}, waiting on earlier images {waiting}, failed {failed}.")
    if tokens_in or tokens_out:
        print(f"Tokens used this run: {tokens_in:,} in, {tokens_out:,} out. See your OpenAI usage page for the cost.")
    if waiting and not dry:
        print("Run the same command again to draw the images that were waiting.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
