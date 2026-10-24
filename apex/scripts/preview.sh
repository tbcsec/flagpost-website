#!/usr/bin/env bash
# Serve dist/ with astro preview using the project-local Node 22 toolchain
# (system Node on this machine is 20; Astro 7.4.2 requires >=22.23.4).
set -euo pipefail
export PATH="$HOME/.local/opt/node-v22.23.4-linux-x64/bin:$PATH"
cd "$(dirname "$0")/.."
exec npm run preview
