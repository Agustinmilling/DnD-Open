#!/usr/bin/env bash
# Instala el juego y el túnel como servicios de usuario de systemd, para que sigan
# en marcha aunque se cierre la terminal, y arranquen solos al encender el PC.
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node)"
UNITS="$HOME/.config/systemd/user"
mkdir -p "$UNITS"
cat > "$UNITS/mesa-de-dados.service" <<UNIT
[Unit]
Description=Mesa de Dados (servidor del juego)
After=network-online.target

[Service]
WorkingDirectory=$DIR
Environment=PORT=3000
ExecStart=$NODE $DIR/server.js
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
UNIT
cat > "$UNITS/mesa-de-dados-tunel.service" <<UNIT
[Unit]
Description=Mesa de Dados (túnel público de Cloudflare)
After=mesa-de-dados.service network-online.target
Requires=mesa-de-dados.service

[Service]
Environment=PORT=3000
Environment=PATH=$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/env bash $DIR/scripts/tunel.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
UNIT
systemctl --user daemon-reload
systemctl --user enable --now mesa-de-dados.service
if [ "${1:-}" != "--sin-tunel" ]; then systemctl --user enable --now mesa-de-dados-tunel.service; fi
# Permite que los servicios sigan aunque cierres la sesión (puede pedir contraseña; si falla no pasa nada).
loginctl enable-linger "$(id -un)" 2>/dev/null || true
echo "Servicios instalados. Enlace público: bash scripts/enlace.sh (tarda unos segundos en aparecer)."
