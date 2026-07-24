#!/usr/bin/env bash
# Serve the built docs site with the project-local Node 22 toolchain, on a
# port that doesn't clash with the apex preview (4321).
set -euo pipefail
export PATH="$HOME/.local/opt/node-v22.23.1-linux-x64/bin:$PATH"
cd "$(dirname "$0")/.."
exec npm run preview -- --port 4322
