# MR HASAR v2.17 — TAM UYUM PAKETİ

**Tarih:** 15.05.2026
**Kapsam:** DOSYA YENİ ↔ DOSYA DETAY DÜZENLE — tüm uyumsuzluklar ve eksikler giderildi
**İçerik:** 4 dosya + 1 SQL migration

---

## 🎯 BU PAKET NE ÇÖZÜYOR?

Önceki sürümlerde DOSYA YENİ ile DOSYA DETAY DÜZENLE **farklı API contract'ları** kullanıyordu:
- DOSYA YENİ → eski kısa anahtarlar (`ma_ruhsat`, `ma_tc`, `ma_yil`)
- DOSYA DETAY → yeni uzun anahtarlar (`ma_ruhsat_sahibi`, `ma_tc_kimlik`, `ma_model_yili`)

Sonuç: yeni açılan dosyaların araç bilgisi DB'de **eski kolonlara** yazılıyordu, düzenle açıldığında **yeni kolonlardan** okuyordu → boş gözüküyordu.

**v2.17 ile artık tek dil:** her iki ekran aynı anahtarları, backend aynı kolonları kullanıyor.

---

## 📦 PAKET İÇERİĞİ

```
MR_HASAR_v2.17_TAM_UYUM_2026-05-15.zip
│
├── KURULUM_KILAVUZU.md          ← bu dosya
│
├── SQL/
│   └── 01_v217_arac_kolon_backfill.sql
│
└── YUKLENECEK_DOSYALAR/
    ├── api/v1/dosya/
    │   ├── create.php           ← yeni anahtarlara göre yazıyor (eski destek de var)
    │   └── update.php           ← noter_vekalet whitelist + idempotent ALTER
    └── js/pages/
        ├── dosya-yeni.js        ← anahtarlar dosya-detay ile aynı
        └── dosya-detay.js       ← Noter Vekalet, Dosya Kaynağı 5 seçenek, BH Mağdur Araç
```

---

## 🚀 SIRALI YÜKLEME — KESINLIKLE BU SIRADA

### ADIM 1️⃣ — SQL Migration (KRİTİK — ÖNCE BUNUNLA BAŞLA)

cPanel → phpMyAdmin → veritabanını seç → **SQL** sekmesi → SQL dosyasının içeriğini yapıştır → **Çalıştır**

**Dosya:** `SQL/01_v217_arac_kolon_backfill.sql`

Bu migration:
1. Eksik yeni kolonları ekler (idempotent — varsa atlar)
2. Eski kolonlardaki veriyi yeni kolonlara KOPYALAR (`COALESCE` ile sadece yeni boşsa)
3. `noter_vekalet` kolonunu garanti altına alır

**Tekrar çalıştırılabilir** — zarar vermez. Eski kolonları SİLMEZ.

### ADIM 2️⃣ — Backend Dosyaları

cPanel FileManager veya FTP ile sunucudaki **aynı yola** üzerine yaz:

| Lokal | Sunucu |
|---|---|
| `YUKLENECEK_DOSYALAR/api/v1/dosya/create.php` | `<web_root>/api/v1/dosya/create.php` |
| `YUKLENECEK_DOSYALAR/api/v1/dosya/update.php` | `<web_root>/api/v1/dosya/update.php` |

### ADIM 3️⃣ — Frontend Dosyaları

| Lokal | Sunucu |
|---|---|
| `YUKLENECEK_DOSYALAR/js/pages/dosya-yeni.js` | `<web_root>/js/pages/dosya-yeni.js` |
| `YUKLENECEK_DOSYALAR/js/pages/dosya-detay.js` | `<web_root>/js/pages/dosya-detay.js` |

### ADIM 4️⃣ — Cache Temizle

1. **PHP opcache reset** (cPanel → Multi PHP Manager veya `<?php opcache_reset(); ?>`)
2. **Tarayıcı:** `Ctrl+F5` (hard refresh)

---

## ✅ NE DÜZELDİ — ÖZET

### Anahtar Standardizasyonu (uçtan uca)
- 12 araç alanı için **iki ekran artık aynı dili konuşuyor**
- Backend `create.php` yeni anahtarları DB'nin doğru kolonlarına yazıyor
- Backend `update.php` zaten yeni anahtarları okuyordu — uyum tamam
- Eski kolonlardaki tarihi veri yeni kolonlara backfill edildi

### Eksik Alanlar Eklendi
- ✅ **NOTER VEKALET (TL)** — DOSYA DETAY DÜZENLE'de düzenlenebilir
- ✅ **DOSYA KAYNAĞI** — 7 seçenek (OFİS CRM, SERVİS, KAPORTACI, ACENTE, PASİF TEMSİLCİ, DİĞER, PAYDAŞ/YÖNLENDİREN)
- ✅ **BH için MAĞDUR ARAÇ** bölümü artık DOSYA DETAY'da görünür ve düzenlenebilir
- ✅ BH araç INSERT'i artık `kasko` alanını da kaydediyor

### Geriye Uyumluluk (Risk Önleyici)
- Backend `create.php` hem yeni hem eski anahtarları kabul eder (yeni öncelikli, fallback eski)
- Eski kolonlar silinmez, mevcut veri korunur
- Migration idempotent

---

## ⚠️ RİSK NOTLARI (abartmadan)

| Risk | Şiddet | Açıklama |
|---|---|---|
| Yarım yükleme | 🟡 ORTA | 4 dosya + 1 SQL hepsini yükle. Sadece bir tanesini atlamak yeni dosya açmayı bozar. Sıralı yükle. |
| Backfill kaynaklı veri kaybı | 🟢 DÜŞÜK | Sadece yeni kolon BOŞ ise eski kolondan kopyalanır (`IFNULL`). Mevcut doğru veri korunur. |
| Eski kolonlar | 🟢 DÜŞÜK | Silinmiyor — geriye uyumluluk için yerinde kalır. Pratikte zararsız. |
| Mevcut dosyalar | 🟢 DÜŞÜK | Migration veriyi yeni kolonlara kopyaladığı için DOSYA DETAY DÜZENLE artık dolu açılır. |

---

## 🧪 TEST AKIŞI (yükleme sonrası)

### Test 1 — Mevcut dosya düzenleme
1. DOSYA İŞLEMLERİ → eski bir dosyayı aç (v2.17'den önce yapılmış)
2. DÜZENLE → MAĞDUR ARAÇ bölümünde RUHSAT SAHİBİ alanı **artık dolu** olmalı (önceden boş gözüküyordu)
3. Bir alanı değiştir → KAYDET → başarılı

### Test 2 — Yeni dosya
1. DOSYA İŞLEMLERİ → YENİ DOSYA → ADK seçili
2. Tüm alanları doldur (ARAÇ SAHİBİ vs.)
3. KAYDET → DOSYA DETAY açılır
4. DÜZENLE → tüm alanlar **doğru görünmeli** (özellikle ARAÇ SAHİBİ ve TC)

### Test 3 — BH dosyası araç
1. DOSYA İŞLEMLERİ → BH dosyasını aç → DÜZENLE
2. **MAĞDUR ARAÇ BİLGİLERİ** bölümü artık görünmeli (önceden gizliydi)
3. Plaka/marka/yıl/kasko düzenle → KAYDET → kaydolmuş

### Test 4 — Noter Vekalet
1. DOSYA DETAY DÜZENLE → DOSYA BİLGİLERİ → NOTER VEKALET (TL) alanı görünmeli
2. Değer gir → KAYDET → DB'de saklanır

### Test 5 — Dosya Kaynağı 7 seçenek
1. DOSYA DETAY DÜZENLE → DOSYA KAYNAĞI dropdown 7 seçenek listelemeli
2. SERVİS seç → KAYDET

---

## 🔄 GERİ ALMA

Olası sorun durumunda:
1. Önceki `create.php`, `update.php`, `dosya-yeni.js`, `dosya-detay.js` dosyalarını yedeğinizden geri yükleyin
2. SQL backfill geri alınmaz (kolonlar geride kalır, eski kod yine çalışır — zarar yok)

---

## 🛡️ NEYE DOKUNULMADI

- DB schema (kolon eklendi, **silinmedi**)
- Diğer modüller (police, ihbar-foyu, qr-ruhsat, muhasebe, CRM, paydaş)
- Mevcut dosya kayıtları (sadece backfill ile yeni kolonlar dolduruldu)
- Yetki sistemi
- Diğer JS sayfaları
