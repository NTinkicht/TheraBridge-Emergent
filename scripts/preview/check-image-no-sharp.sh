#!/usr/bin/env bash
# Fail if ANY layer of a built image contains sharp/libvips (including the Yarn
# cache), not just the merged filesystem. Usage: check-image-no-sharp.sh IMAGE
set -euo pipefail
image="${1:?usage: check-image-no-sharp.sh IMAGE}"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
docker save "$image" -o "$work/image.tar"
mkdir "$work/x"; tar -xf "$work/image.tar" -C "$work/x"
pattern='(^|/)node_modules/(sharp|@img)/|libvips[^/]*\.so'
layers=0; found=0
while IFS= read -r -d '' blob; do
  tar -tf "$blob" >"$work/list" 2>/dev/null || continue   # config/manifest JSON is not a tar
  layers=$((layers + 1))
  if grep -Eq "$pattern" "$work/list"; then
    found=1; echo "sharp/libvips present in layer ${blob#"$work/x/"}:" >&2
    grep -E "$pattern" "$work/list" | head -5 >&2
  fi
done < <(find "$work/x" -type f -print0)
[ "$layers" -gt 0 ] || { echo "NO_IMAGE_LAYERS_INSPECTED: $image" >&2; exit 1; }
[ "$found" -eq 0 ] || exit 1
echo "PASS: $layers layers of $image contain no sharp/@img/libvips"
