#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/release-local.sh <version> [asset ...]"
  echo "Example: scripts/release-local.sh 1.5.6 release/Markdown\\ Reader-1.5.6-arm64.dmg"
  exit 1
fi

VERSION="${1#v}"
TAG="v${VERSION}"
NOTES_FILE="docs/releases/v${VERSION}.md"
shift

if [[ ! -f "${NOTES_FILE}" ]]; then
  echo "Missing release notes: ${NOTES_FILE}"
  exit 1
fi

npm run lint
npm test
npm run build
npm run e2e
npm run electron:build:mac

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree has uncommitted changes. Commit before creating ${TAG}."
  exit 1
fi

if git rev-parse "${TAG}" >/dev/null 2>&1; then
  echo "Tag already exists: ${TAG}"
  exit 1
fi

git tag -a "${TAG}" -m "${TAG}"
git push origin main
git push origin "${TAG}"

if [[ $# -gt 0 ]]; then
  gh release create "${TAG}" "$@" --title "${TAG}" --notes-file "${NOTES_FILE}"
else
  gh release create "${TAG}" --title "${TAG}" --notes-file "${NOTES_FILE}"
fi
