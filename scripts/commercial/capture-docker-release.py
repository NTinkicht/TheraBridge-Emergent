#!/usr/bin/env python3
"""Capture Docker-exported candidate release bytes; never assert deployment or rights."""
import argparse
import hashlib
import json
import re
import subprocess
import sys
import tarfile

PIN = re.compile(r"^[a-zA-Z0-9._/-]+(?::[a-zA-Z0-9._-]+)?@sha256:[0-9a-f]{64}$")
HEX = re.compile(r"^[0-9a-f]{64}$")
MAX_FILES = 100000
MAX_FILE_BYTES = 512 * 1024 * 1024
MAX_TOTAL_BYTES = 4 * 1024 * 1024 * 1024


def path_ok(value):
    return (isinstance(value, str) and 0 < len(value) <= 512
            and not value.startswith("/") and "\\" not in value
            and all(part not in ("", ".", "..") for part in value.split("/"))
            and all(ord(ch) >= 32 and ord(ch) != 127 for ch in value))


def inventory(archive):
    """Stream docker export tar without extraction, hashing only regular files."""
    files, seen = [], set()
    other = {"symlinks": 0, "hardlinks": 0, "directories": 0, "other": 0}
    total = 0
    for entry in archive:
        path = entry.name
        if path.startswith("./"):
            path = path[2:]
        if entry.isdir():
            other["directories"] += 1
            continue
        if not path_ok(path) or path in seen:
            raise ValueError("INVALID_OR_DUPLICATE_EXPORT_PATH")
        seen.add(path)
        if entry.issym():
            other["symlinks"] += 1
            continue
        if entry.islnk():
            other["hardlinks"] += 1
            continue
        if not entry.isfile():
            other["other"] += 1
            continue
        if entry.size < 0 or entry.size > MAX_FILE_BYTES:
            raise ValueError("FILE_SIZE_LIMIT")
        total += entry.size
        if total > MAX_TOTAL_BYTES or len(files) >= MAX_FILES:
            raise ValueError("EXPORT_BUDGET_EXCEEDED")
        payload = archive.extractfile(entry)
        if payload is None:
            raise ValueError("MISSING_EXPORT_BYTES")
        digest = hashlib.sha256()
        remaining = entry.size
        while remaining:
            chunk = payload.read(min(1024 * 1024, remaining))
            if not chunk:
                raise ValueError("TRUNCATED_EXPORT_FILE")
            digest.update(chunk)
            remaining -= len(chunk)
        files.append({"path": path, "sha256": digest.hexdigest(), "bytes": entry.size})
    files.sort(key=lambda item: item["path"])
    return files, other


def docker_output(*arguments):
    result = subprocess.run(["docker", *arguments], stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, check=True, timeout=90)
    return result.stdout.decode("utf-8").strip()


def capture(edition, reference):
    if edition not in ("SAAS", "ENTERPRISE") or not PIN.fullmatch(reference):
        raise ValueError("EXPECTED_DIGEST_PINNED_IMAGE")
    image_name, digest = reference.rsplit("@", 1)
    detail = json.loads(docker_output("image", "inspect", reference))
    if len(detail) != 1 or reference not in detail[0].get("RepoDigests", []):
        raise ValueError("INSPECTED_IMAGE_DOES_NOT_MATCH_PIN")
    container = docker_output("create", "--", reference)
    if not re.fullmatch(r"[a-f0-9]{64}", container):
        raise ValueError("INVALID_CONTAINER_IDENTIFIER")
    try:
        process = subprocess.Popen(["docker", "export", container],
                                   stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        try:
            with tarfile.open(fileobj=process.stdout, mode="r|") as stream:
                files, skipped = inventory(stream)
        except BaseException:
            process.kill()
            raise
        finally:
            process.stdout.close()
            status = process.wait(timeout=120)
        if status != 0:
            raise ValueError("DOCKER_EXPORT_FAILED")
    finally:
        subprocess.run(["docker", "rm", "-f", container], stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, check=False, timeout=60)
    return {"edition": edition, "imageRef": image_name,
            "ociDigest": digest, "filesystemCaptureStatus": "UNATTESTED_CANDIDATE",
            "releaseApproval": False, "files": files,
            "captureLimitations": {"source": "LOCAL_DOCKER_EXPORT_NOT_DEPLOYMENT_ATTESTATION",
                                   "nonRegularEntriesOmitted": skipped,
                                   "volumesAndRuntimeMountsNotIncluded": True,
                                   "independentSignatureVerified": False,
                                   "commercialApproval": False}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("edition", choices=["SAAS", "ENTERPRISE"])
    parser.add_argument("image", help="registry/path:tag@sha256:<64 lowercase hex>")
    parser.add_argument("output", help="new candidate manifest; must not exist")
    args = parser.parse_args()
    result = capture(args.edition, args.image)
    payload = {"schema": "therabridge-com02-release-file-evidence-v1",
               "commercialApproval": False, "images": [result]}
    # 'x' forbids silent replacement of prior evidence.
    with open(args.output, "x", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, subprocess.SubprocessError, json.JSONDecodeError,
            tarfile.TarError) as error:
        print("RELEASE_CAPTURE_FAILED:", type(error).__name__, str(error)[:160],
              file=sys.stderr)
        sys.exit(1)
