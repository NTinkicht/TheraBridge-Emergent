#!/usr/bin/env python3
"""Offline adversarial regression tests for candidate Docker release evidence."""
import importlib.util
import io
import json
import tarfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "capture_release", "scripts/commercial/capture-docker-release.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def make_tar(entries):
    raw = io.BytesIO()
    with tarfile.open(fileobj=raw, mode="w") as archive:
        for name, data, kind in entries:
            info = tarfile.TarInfo(name)
            if kind == "file":
                info.size = len(data)
                archive.addfile(info, io.BytesIO(data))
            elif kind == "symlink":
                info.type = tarfile.SYMTYPE
                info.linkname = "elsewhere"
                archive.addfile(info)
            else:
                info.type = tarfile.DIRTYPE
                archive.addfile(info)
    raw.seek(0)
    return raw


def read_inventory(entries):
    raw = make_tar(entries)
    with tarfile.open(fileobj=raw, mode="r|") as stream:
        return module.inventory(stream)


class ReleaseCaptureTests(unittest.TestCase):
    def test_real_bytes_hashed_sorted_without_extraction(self):
        records, omitted = read_inventory([
            ("opt/", b"", "directory"),
            ("opt/z.txt", b"z", "file"),
            ("opt/a.txt", b"hello", "file"),
            ("opt/link", b"", "symlink"),
        ])
        self.assertEqual([r["path"] for r in records], ["opt/a.txt", "opt/z.txt"])
        self.assertEqual(records[0]["sha256"],
                         "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824")
        self.assertEqual(omitted["symlinks"], 1)
        self.assertEqual(omitted["directories"], 1)

    def test_path_traversal_duplicate_and_absolute_rejected(self):
        for name in ("../secret", "/etc/passwd", "a/../b", "a//b", "a\\b"):
            with self.subTest(name=name):
                with self.assertRaisesRegex(ValueError, "INVALID_OR_DUPLICATE"):
                    read_inventory([(name, b"x", "file")])
        with self.assertRaisesRegex(ValueError, "INVALID_OR_DUPLICATE"):
            read_inventory([("x", b"x", "file"), ("x", b"y", "file")])

    def test_forged_or_mutable_image_reference_is_rejected_pre_docker(self):
        for reference in ("some/image:latest",
                          "some/image@sha256:" + "A" * 64,
                          "some/image@sha256:" + "a" * 63,
                          "some/image;echo@sha256:" + "a" * 64):
            with self.subTest(reference=reference):
                with self.assertRaisesRegex(ValueError, "EXPECTED_DIGEST"):
                    module.capture("SAAS", reference)
        with self.assertRaisesRegex(ValueError, "EXPECTED_DIGEST"):
            module.capture("BOTH", "repo@sha256:" + "a" * 64)

    def test_local_inspect_digest_mismatch_rejected_before_export(self):
        reference = "registry.example/x@sha256:" + "a" * 64
        with patch.object(module, "docker_output", return_value=json.dumps([
            {"RepoDigests": ["registry.example/x@sha256:" + "b" * 64]}])):
            with self.assertRaisesRegex(ValueError, "INSPECTED_IMAGE"):
                module.capture("SAAS", reference)

    def test_docker_repo_digest_canonical_tag_and_registry_port(self):
        reference = "registry.example:5000/therabridge/api:v1@sha256:" + "a" * 64
        canonical = "registry.example:5000/therabridge/api@sha256:" + "a" * 64
        export_tar = make_tar([("opt/app/readme.txt", b"licensed?", "file")])

        class FakeExport:
            def __init__(self):
                self.stdout = export_tar
            def wait(self, timeout=None):
                return 0
            def kill(self):
                pass

        def fake_docker(*args):
            if args[:2] == ("image", "inspect"):
                return json.dumps([{"RepoDigests": [canonical]}])
            if args[0] == "create":
                return "c" * 64
            raise AssertionError(args)

        from contextlib import ExitStack
        with ExitStack() as stack:
            stack.enter_context(patch.object(module, "docker_output", side_effect=fake_docker))
            stack.enter_context(patch.object(module.subprocess, "Popen", return_value=FakeExport()))
            stack.enter_context(patch.object(module.subprocess, "run"))
            result = module.capture("SAAS", reference)
        self.assertEqual(result["imageRef"], "registry.example:5000/therabridge/api:v1")
        self.assertEqual(result["ociDigest"], "sha256:" + "a" * 64)
        self.assertEqual(result["filesystemCaptureStatus"], "UNATTESTED_CANDIDATE")
        self.assertFalse(result["captureLimitations"]["independentSignatureVerified"])
        self.assertEqual(result["files"][0]["path"], "opt/app/readme.txt")

    def test_candidate_is_never_published_or_legally_approved(self):
        source = open("scripts/commercial/capture-docker-release.py",
                      encoding="utf-8").read()
        self.assertIn('"UNATTESTED_CANDIDATE"', source)
        self.assertIn('"independentSignatureVerified": False', source)
        self.assertIn('"commercialApproval": False', source)
        self.assertIn('"volumesAndRuntimeMountsNotIncluded": True', source)


if __name__ == "__main__":
    unittest.main()
