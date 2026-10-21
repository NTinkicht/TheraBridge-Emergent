#!/usr/bin/env bash
# Run OUTSIDE Emergent, in a clean clone of NTinkicht/TheraBridge-Emergent.
# Creates a new branch from origin/main and copies ONLY allow-listed paths from the Emergent export branch.
# No Emergent history is merged, no template/platform files are copied, existing main files are never overwritten.
# It never pushes; you review, commit and push the new branch yourself and open a PR. Never force-push.
set -euo pipefail

EXPORT_BRANCH="${1:?usage: import-emergent-export.sh <export-branch> [new-branch]}"
TARGET="${2:-integrate/tb-em-011}"
ALLOW=(
  apps assets scripts docs/emergent
  artifacts/evaluation artifacts/tb-em-011
  .github/workflows/ci.yml docker-compose.yml .dockerignore .nvmrc
  .env.example package.json yarn.lock README.emergent.md
  .gitleaks.toml .gitleaksignore
)

git diff --quiet && git diff --cached --quiet || { echo "Working tree is not clean; aborting."; exit 1; }
git fetch origin main "$EXPORT_BRANCH"
SRC="origin/$EXPORT_BRANCH"

missing=()
collisions=()
for p in "${ALLOW[@]}"; do
  if ! git cat-file -e "$SRC:$p" 2>/dev/null; then missing+=("$p"); continue; fi
  while IFS= read -r f; do
    if git cat-file -e "origin/main:$f" 2>/dev/null && [ "$(git rev-parse "origin/main:$f")" != "$(git rev-parse "$SRC:$f")" ]; then
      collisions+=("$f")
    fi
  done < <(git ls-tree -r --name-only "$SRC" -- "$p")
done

if [ ${#missing[@]} -gt 0 ]; then
  printf 'Missing in %s (export incomplete, nothing changed):\n' "$SRC"; printf '  %s\n' "${missing[@]}"; exit 1
fi
if [ ${#collisions[@]} -gt 0 ]; then
  printf 'Files that differ from main (resolve by hand, nothing changed):\n'; printf '  %s\n' "${collisions[@]}"; exit 2
fi

git switch -c "$TARGET" origin/main
git checkout "$SRC" -- "${ALLOW[@]}"

echo
echo ".gitignore entries in the export that main lacks (merge by hand if wanted):"
comm -13 <(git show origin/main:.gitignore 2>/dev/null | sort -u) <(git show "$SRC:.gitignore" | sort -u) | sed 's/^/  /' || true
echo
git status --short
echo
echo "Next: review the diff, then: git commit -m 'Import controlled TheraBridge V1 synthetic export $(git rev-parse --short "$SRC")' && git push -u origin $TARGET"
echo "Open a PR into main and require CI to pass. Do not force-push."
