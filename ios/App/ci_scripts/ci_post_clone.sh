#!/bin/sh
set -eu

# Xcode Cloud resolves the local Capacitor Swift packages immediately after
# this hook. Both node_modules and the bundled web app are ignored by Git.
repository_root="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../../.." && pwd)}"
cd "$repository_root"

if [ ! -f package-lock.json ] || [ ! -f .nvmrc ]; then
  echo "Missing package-lock.json or .nvmrc in $repository_root" >&2
  exit 1
fi

node_version="$(tr -d '[:space:]' < .nvmrc)"
case "$node_version" in
  ''|*[!0-9.]*)
    echo "Invalid Node version in .nvmrc" >&2
    exit 1
    ;;
esac

# Xcode Cloud provides Homebrew, but Node is not guaranteed. Use the exact
# version pinned by this repository so npm ci and Vite are reproducible.
if [ "$(node --version 2>/dev/null || true)" != "v$node_version" ]; then
  case "$(uname -m)" in
    arm64) node_arch=arm64 ;;
    x86_64) node_arch=x64 ;;
    *) echo "Unsupported macOS architecture: $(uname -m)" >&2; exit 1 ;;
  esac

  node_archive="node-v${node_version}-darwin-${node_arch}.tar.gz"
  node_url="https://nodejs.org/dist/v${node_version}"
  node_dir="$(mktemp -d "${TMPDIR:-/tmp}/operatingroom-node.XXXXXX")"
  curl -fsSL --retry 3 --retry-delay 2 "$node_url/$node_archive" -o "$node_dir/$node_archive"
  curl -fsSL --retry 3 --retry-delay 2 "$node_url/SHASUMS256.txt" -o "$node_dir/SHASUMS256.txt"

  expected_hash="$(awk -v file="$node_archive" '$2 == file { print $1 }' "$node_dir/SHASUMS256.txt")"
  actual_hash="$(shasum -a 256 "$node_dir/$node_archive" | awk '{ print $1 }')"
  if [ -z "$expected_hash" ] || [ "$expected_hash" != "$actual_hash" ]; then
    echo "Node archive checksum verification failed" >&2
    exit 1
  fi

  mkdir "$node_dir/runtime"
  tar -xzf "$node_dir/$node_archive" -C "$node_dir/runtime" --strip-components=1
  PATH="$node_dir/runtime/bin:$PATH"
  export PATH
fi

echo "Using Node $(node --version) and npm $(npm --version)"

# These values are embedded into the shipped web app. Only provide a
# publishable/anon key here; never use a Supabase secret or service-role key.
if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ] || [ -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
  echo "Xcode Cloud must define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY" >&2
  exit 1
fi

if [ "${VITE_APP_STORE_PREVIEW:-}" = "1" ]; then
  echo "VITE_APP_STORE_PREVIEW is only for screenshots; refusing to archive a preview build" >&2
  exit 1
fi

npm ci --include=dev --no-audit --no-fund
npm run ios:sync
