#!/usr/bin/env bash
# MR HASAR — Frontend production build
# JSX dosyalarını js/dist/ altında derler. cPanel'e bunları yüklersiniz.
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo "[HATA] npm bulunamadı. Node.js 18+ kurun."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "[ADIM 1/2] Bağımlılıklar kuruluyor (ilk seferde 1-2 dk)..."
  npm install --silent
fi

echo "[ADIM 2/2] JSX → JS derleniyor..."
rm -rf js/dist
npm run build --silent

echo ""
echo "✓ Tamam. Çıktı: js/dist/"
echo "  Şimdi tüm 'extracted/' klasörünü ZIP'leyip cPanel'e yükleyin."
