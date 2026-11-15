"""Package the browser game using only Python's standard library."""
import hashlib
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / "skyflow"
OUTPUT = ROOT / "output" / "itch"


def runtime_files():
    html = (GAME / "index.html").read_text(encoding="utf-8-sig")
    paths = {"index.html"}
    paths.update(re.findall(r'(?:src|href)=["\']([^"\']+)["\']', html))
    paths = {name.split("?", 1)[0] for name in paths}
    for name in list(paths):
        if name.endswith((".html", ".css", ".js")):
            source = (GAME / name).read_text(encoding="utf-8-sig")
            paths.update(re.findall(r'assets/[A-Za-z0-9_.-]+', source))
    for name in paths:
        resolved = (GAME / name).resolve()
        if not resolved.is_relative_to(GAME.resolve()) or not resolved.is_file():
            raise ValueError(f"Missing or unsafe runtime file: {name}")
        # Windows file lookup is case-insensitive; itch.io file lookup is not.
        parent = GAME
        for part in Path(name).parts:
            if part not in {child.name for child in parent.iterdir()}:
                raise ValueError(f"Case mismatch: {name}")
            parent /= part
        if len(name) > 240 or resolved.stat().st_size > 200 * 1024**2:
            raise ValueError(f"itch.io per-file limit exceeded: {name}")
    if len(paths) > 1000 or sum((GAME / name).stat().st_size for name in paths) > 500 * 1024**2:
        raise ValueError("itch.io archive limit exceeded")
    return sorted(paths)


def build():
    version = json.loads((ROOT / "package.json").read_text(encoding="utf-8-sig"))["version"]
    names = runtime_files()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    archive = OUTPUT / f"tower-404-{version}-html5.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipped:
        for name in names:
            # Fixed metadata keeps repeated builds byte-identical.
            entry = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            zipped.writestr(entry, (GAME / name).read_bytes())
    with zipfile.ZipFile(archive) as zipped:
        assert zipped.testzip() is None, "ZIP integrity failure"
        assert set(zipped.namelist()) == set(names)
        assert "index.html" in zipped.namelist()
        for name in names:
            assert zipped.read(name) == (GAME / name).read_bytes(), name
    manifest = {
        "version": version,
        "archive": archive.name,
        "bytes": archive.stat().st_size,
        "sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
        "files": {name: hashlib.sha256((GAME / name).read_bytes()).hexdigest() for name in names},
    }
    (OUTPUT / f"tower-404-{version}-manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Built and verified: {archive}")
    print(f"{len(names)} runtime files; {manifest['bytes'] / 1024**2:.2f} MiB; index.html at archive root")
    print(f"SHA-256: {manifest['sha256']}")


if __name__ == "__main__":
    build()
