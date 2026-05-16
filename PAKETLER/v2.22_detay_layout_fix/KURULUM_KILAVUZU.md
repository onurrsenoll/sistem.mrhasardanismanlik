# MR HASAR v2.22 — LAYOUT FIX + ARAÇ GÖRSEL ENTEGRASYONU

**Tarih:** 16.05.2026
**Tek dosya:** `js/pages/dosya-detay.js`

---

## 🔥 NE DÜZELDİ — Kullanıcı Şikayetleri

| # | Şikayet | Çözüm |
|---|---|---|
| 1 | "Sayfanın sağında solunda kocaman boş alan var!" | **FULL-BLEED** — `width:100vw + marginLeft:calc(50% - 50vw)` ile container max-width sınırı aşıldı. Sayfa tam genişlikte kullanılıyor |
| 2 | "Üst dropdown çok uzun, butonların yanına saçma sıkışmış" | Aşama dropdown sabit `width:200px, maxWidth:200px` — taşma yok |
| 3 | "KARŞI ARAÇ kartında değerler kesiliyor (VA, HK04478)" | InfoRow `maxWidth:200` kaldırıldı → `flex:1 + ellipsis` (sütun genişliğine uyum) |
| 4 | "ARAÇ SAHİBİ / RUHSAT SAHİBİ başlığı 2 satıra düşmüş" | Başlık kısaltıldı: **ARAÇ SAHİBİ** |
| 5 | "3 sütun eşit değil" | `minmax(320px, 1fr)` ile her sütun en az 320px + tam eşit pay |

---

## 🚗 YENİ — MARKA MODEL GÖRSEL EŞLEŞTİRME MODÜLÜ

### Çalışma Mantığı
Mağdur ve Karşı Araç kartlarının ÜSTÜNDE **160px yükseklikte profesyonel araç görseli** otomatik gösteriliyor.

**Kaynak:** `imagin.studio` CDN — lisanslı, ticari kullanıma uygun, marka+model+yıl bazlı standart araç görseli sağlar.

**URL formatı:**
```
https://cdn.imagin.studio/getimage
  ?customer={KEY}
  &make=hyundai
  &modelFamily=tucson
  &modelYear=2023
  &angle=01
  &zoomType=fullscreen
  &fileType=webp
```

### Cache (yine kullanıcı isteği)
- **localStorage** anahtarı: `mr_arac_gorsel_v1`
- Format: `{ "MARKA_MODEL_YIL": "ok" | "fail" }`
- `fail` ise URL bir daha denenmez (network tasarrufu)
- `ok` ise browser HTTP cache zaten görüntüyü tutar (anlık açılış)

### Fallback Davranışı
Görsel yüklenmezse boş kalmaz — banner içinde:
```
HYUNDAI
TUCSON 1.6 CRDI ELITE PLUS 4X4 DCT
MODEL YILI · 2023
```
sade tipografi gösterilir.

### ⚠️ ÖNEMLİ LİSANS UYARISI
Şu an `IMAGIN_API_KEY = 'hrjavascript-mastery'` (eğitim/demo key) kullanılıyor.

**Ticari kullanım için imagin.studio'dan kendi API key'inizi almanız ZORUNLU**:
1. https://www.imagin.studio/library/api üzerinden lisans alın
2. `dosya-detay.js` dosyasında `IMAGIN_API_KEY` sabitini değiştirin
3. Tek satır değişikliği — başka kod dokunulmaz

Alternatif servisler (imagin.studio kabul edilmezse):
- Vehicle Imagery API
- CarsXE
- Stock Car Image API

---

## 📦 PAKET İÇERİĞİ

```
v2.22_detay_layout_fix/
├── KURULUM_KILAVUZU.md
├── MR_HASAR_v2.22_DETAY_LAYOUT_FIX_2026-05-16.zip
└── MR_HASAR_v2.22_DETAY_LAYOUT_FIX_2026-05-16/
    └── YUKLENECEK_DOSYALAR/
        └── js/pages/
            └── dosya-detay.js   ← TEK DOSYA
```

---

## 🚀 YÜKLEME

```
js/pages/dosya-detay.js → <sunucu>/js/pages/dosya-detay.js
```

**Ctrl+F5** ile cache temizle. Backend/DB dokunulmadı.

---

## 🧪 TEST

1. **Dosya detay aç** → sayfanın **tam genişliği kullanıldığını** doğrula (sağda solda boş alan yok)
2. **Üst kart** → 4 kutu eşit, aşama dropdown sabit boyut
3. **Mağdur Araç** → üst banner'da **HYUNDAI TUCSON 2023 araç fotoğrafı** (imagin'den)
4. **Karşı Araç** → **MG HS LUXURY 2024** görseli (MG markası imagin'de varsa)
5. **Görsel yüklenemezse** → fallback marka adı tipografisi (boş değil)
6. **F12 → Application → Local Storage** → `mr_arac_gorsel_v1` anahtarı altında cache görmeli
7. **InfoRow değerleri** sütun içinde tam görünmeli (VA, HK04478 vs. kesilmemeli)

---

## 🛡️ RİSK
- 🟢 **Layout fix**: yok, sadece görsel
- 🟡 **imagin.studio demo key**: ticari kullanımda hak ihlali olabilir — üretim key alınmalı
- 🟢 **Cache localStorage**: kullanıcı tarayıcısında, sunucu yükü yok

Geri alma: v2.21 dosya-detay.js'i üzerine yaz.
