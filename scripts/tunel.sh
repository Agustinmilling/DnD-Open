#!/usr/bin/env bash
# Abre un túnel público de Cloudflare (gratis, sin cuenta) hacia el servidor local.
# La dirección https://<algo>.trycloudflare.com aparece en la salida y cambia en cada arranque.
set -euo pipefail
PORT="${PORT:-3000}"
CF="$(command -v cloudflared || true)"
[ -z "$CF" ] && [ -x "$HOME/.local/bin/cloudflared" ] && CF="$HOME/.local/bin/cloudflared"
if [ -z "$CF" ]; then
  echo "No encuentro cloudflared. Instálalo con: sudo pacman -S cloudflared" >&2
  exit 1
fi
exec "$CF" tunnel --no-autoupdate --url "http://localhost:$PORT"
