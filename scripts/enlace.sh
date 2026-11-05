#!/usr/bin/env bash
# Muestra la dirección pública actual del túnel (si está instalado como servicio).
URL="$(journalctl --user -u mesa-de-dados-tunel -n 300 --no-pager 2>/dev/null | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1)"
if [ -n "$URL" ]; then echo "$URL"; else echo "Todavía no hay enlace. Mira: systemctl --user status mesa-de-dados-tunel" >&2; exit 1; fi
