# MR HASAR — v2.9.3 PDF İNDİR + ÖNİZLE (İHBAR FÖYÜ + AY SONU RAPORU)

**Tarih:** 2026-05-08

## YAPILAN

İhbar Föyü ve Ay Sonu Raporu sayfalarına 2 yeni buton eklendi (mevcut YAZDIR korundu):

- **YAZDIR** (eski) — tarayıcı print (Ctrl+P benzeri)
- **PDF İNDİR** (yeni) — `html2pdf.js` ile gerçek PDF dosyası indirir
- **ÖNİZLE** (yeni) — Yeni pencerede temiz HTML olarak gösterir + otomatik print diyaloğu açar

## NASIL ÇALIŞIR

### PDF İNDİR (en güvenilir)
1. Sayfayı aç, veriyi yükle
2. **PDF İNDİR** butonuna bas
3. Tarayıcı `IHBAR_FOYU_PLAKA_2026-05-08.pdf` veya `AY_SONU_RAPORU_NISAN_2026.pdf` dosyasını otomatik indirir
4. `html2pdf.js` mevcut sayfanın render'ını yakalar, A4 boyutunda PDF üretir

### ÖNİZLE
1. **ÖNİZLE** butonuna bas
2. Yeni pencere açılır (popup engelli ise alert verir)
3. Sade ve temiz görünüm + otomatik print diyaloğu (500ms sonra)

### Avantajlar
- `window.print()` problemi yok — html2pdf doğrudan PDF üretir
- Boş çıktı sorunu çözülür — DOM zaten yüklü, html2pdf direkt yakalar
- Mevcut YAZDIR butonu da çalışmaya devam eder

## DOSYALAR (2 dosya)

| Kaynak | Hedef |
|---|---|
| `YUKLENECEK_DOSYALAR/js/pages/ihbar-foyu.js` | `<root>/js/pages/ihbar-foyu.js` |
| `YUKLENECEK_DOSYALAR/js/pages/muhasebe.js` | `<root>/js/pages/muhasebe.js` |

**Hard reload** (Ctrl+Shift+R). SQL gerekmez. `html2pdf.js` zaten index.html'de yüklü.

## STATİK TEST ✅
- 2/2 JSX dosyası `@babel/parser` parse geçti

## DOKUNULMAYAN
app.js, mesajlar.js, dosya-yeni, dosya-detay, ortaklar, crm, webrtc-widget, webrtc-phone, paydas API'leri, helpers.php — hepsi aynı.
