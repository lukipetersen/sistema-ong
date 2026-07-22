#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║      Sistema ONG — Setup local       ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Verificar Docker
if ! command -v docker &> /dev/null; then
  echo "❌  Docker no está instalado."
  echo "    Descargalo en: https://www.docker.com/products/docker-desktop"
  exit 1
fi

if ! docker info &> /dev/null; then
  echo "❌  Docker Desktop no está corriendo. Abrilo y volvé a intentar."
  exit 1
fi

echo "✅  Docker OK"

# Crear .env si no existe
if [ ! -f .env ]; then
  SECRET=$(LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*' < /dev/urandom | head -c 48 2>/dev/null || date +%s%N | sha256sum | head -c 48)
  echo "JWT_SECRET=${SECRET}" > .env
  echo "✅  Archivo .env creado con JWT_SECRET aleatorio"
else
  echo "✅  Archivo .env ya existe"
fi

# Build y arranque
echo ""
echo "🔨  Construyendo imágenes (primera vez ~3-5 min)..."
echo ""
docker compose up --build -d

echo ""
echo "⏳  Esperando que el sistema esté listo..."
sleep 5

# Verificar salud del backend
MAX=30
i=0
until curl -sf http://localhost/api/salud > /dev/null 2>&1; do
  i=$((i+1))
  if [ $i -ge $MAX ]; then
    echo "⚠️   El sistema tardó más de lo esperado. Revisá los logs:"
    echo "    docker compose logs backend"
    exit 1
  fi
  sleep 2
done

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅  Sistema ONG corriendo                       ║"
echo "║                                                  ║"
IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "tu-ip-local")
printf  "║  Local:  http://localhost                        ║\n"
printf  "║  Red:    http://%-34s║\n" "${IP}"
echo "║                                                  ║"
echo "║  Para detener:  docker compose down              ║"
echo "║  Para logs:     docker compose logs -f           ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
