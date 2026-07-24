#!/usr/bin/env bash
# Serve dist/ with astro preview using the project-local Node 22 toolchain
# (system Node on this machine is 20; Astro 7 requires >=22.12).
set -euo pipefail
export PATH="$HOME/.local/opt/node-v22.23.1-linux-x64/bin:$PATH"
cd "$(dirname "$0")/.."
exec npm run preview
