#!/usr/bin/env bash
# Release helper: bump version, tag, push, publish to npm, create GitHub release.
# Usage: scripts/release.sh [patch|minor|major]  (default: patch)
set -euo pipefail

BUMP="${1:-patch}"

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major]" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree not clean. Commit or stash changes first." >&2
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "main" ]]; then
  echo "Not on main (on '$BRANCH'). Aborting." >&2
  exit 1
fi

git pull --ff-only

NEW_VERSION="$(npm version "$BUMP" -m "chore: release v%s")"
echo "Bumped to $NEW_VERSION"

git push
git push origin "$NEW_VERSION"

npm publish

gh release create "$NEW_VERSION" --title "$NEW_VERSION" --generate-notes

echo "Released $NEW_VERSION: npm + GitHub"
