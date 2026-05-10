# MR HASAR v2.10 — RUHSAT OKUYUCU OCR + AI

**Tarih:** 2026-05-08
**Tek dosya yaması:** `js/pages/qr-ruhsat.js` (yerine geçer)

## NE DEĞİŞTİ
- **MEVCUT QR RUHSAT modülünün yerine** geçen yeni RUHSAT OKUYUCU.
- **Tesseract.js (Türkçe OCR)** ile birincil okuma.
- **OpenRouter — `anthropic/claude-sonnet-4-5`** AI fallback (eksik alanları tamamlar veya OCR güveni < %72 ise devreye girer).
- **API anahtarı**: `sk-or-v1-...` formatında, sadece bu cihazda saklanır → `localStorage` anahtarı **`mrh_orkey`**.
- **Geçmiş**: `localStorage` anahtarı **`mrh_ruhsat_v2`** — limit **200**.
- **7 alan**: ADI SOYADI · VERGİ/T.C. NO · PLAKA · BELGE SERİ NO · ŞASE NO · MARKA · MODEL YILI.
- **Excel export**: `RUHSAT_OCR_<YYYY-MM-DD>.xlsx` — turuncu **#FF6B35** başlık.
- **PDF**: "RUHSAT ANALİZ RAPORU" — A4, gizli iframe + `window.print()`.
- **Toplu yükleme**: Sürükle-bırak veya çoklu seçim, 2 paralel işleme.
- **OCR / AI rozet**: her kayıtta hangi kaynaktan geldiği bellidir.

## YÜKLEME
1. `YUKLENECEK_DOSYALAR/js/pages/qr-ruhsat.js` dosyasını sunucudaki **aynı yola** üzerine yazarak kopyalayın.
2. Tarayıcıda `Ctrl+F5` ile cache temizleyin.
3. Sol menüden **"QR RUHSAT OKUYUCU"** sekmesini açın → sağ üstten **"API ANAHTARI"** ile OpenRouter anahtarınızı (`sk-or-v1-…`) kaydedin.
4. Bir ruhsat görseli sürükleyin ya da seçin → sonuç anında görüntülenir, geçmişe eklenir.

## BAĞIMLILIKLAR
Tüm CDN'ler `index.html`'de zaten yüklü — ek kurulum **yok**:
- `tesseract.js@5`
- `xlsx@0.18.5`
- (PDF için ek kütüphane gerekmiyor — yazıcı önizleme `window.print()` ile)

## NOTLAR
- API anahtarı sunucuya gitmez; doğrudan tarayıcıdan OpenRouter'a istek gider.
- AI fallback, anahtar yoksa devre dışı kalır; bu durumda yalnız OCR çalışır.
- Geçmiş 200'ü aştığında en eski kayıtlar otomatik silinir.
