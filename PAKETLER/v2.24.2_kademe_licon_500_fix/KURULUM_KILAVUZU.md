# MR HASAR v2.24.2 — HOTFIX: KademeEditor CRASH + cari-ozet 500

**Tarih:** 17.05.2026
**Tip:** HOTFIX (3 dosya)
**Hedef:** v2.24 / v2.24.1 yüklenmiş kurulumlar — **ZORUNLU**

---

## 🐛 ÇÖZÜLEN 2 SORUN

### 1) ÇALIŞMA MODELİ tıklayınca tarayıcı konsolunda crash
```
Uncaught ReferenceError: LIcon is not defined
    at KademeEditor (<anonymous>:3125:39)
```

**Sebep:** `KademeEditor` componenti modül-top seviyede tanımlandı (PersonelListesi
dışında). PersonelListesi içinde `const {C, LIcon, api} = MR;` ile destructure ediliyor
ama KademeEditor kendi scope'unda LIcon'a erişemiyor.

**Çözüm:** `const C = MR.C, S = MR.S, LIcon = MR.LIcon;` — LIcon eklendi.

### 2) `cari-ozet.php` 500 dönüyor → modal çöküyor
```
Failed to load resource: /api/v1/personel/cari-ozet.php?personel_id=4 → 500
```

**Sebep ihtimalleri:**
- SQL migration çalıştırılmadı → `personel_kazanc_modelleri` tablosu yok
- `_kademe_lib.php` sunucuya yüklenmedi
- DB connection / kolon uyumsuzluğu

**Çözüm:** `cari-ozet.php` artık **DEFENSİF**:
- Tabloların var olduğunu önce kontrol eder
- `_kademe_lib.php` yoksa fallback yapar
- Hata olsa bile **500 atmaz**, boş+geçerli cevap döner
- Sorunu `error_log`'a yazar (sunucu loglarında görünür)

Cevapta `_uyari` veya `_hata` alanı dönerse sunucu loglarında ne olduğunu görebilirsiniz.

---

## 📂 YÜKLEME — 3 DOSYA

| Paketteki yol | Sunucuda yol |
|---|---|
| `js/pages/personel.js` | `/var/www/html/js/pages/personel.js` |
| `api/v1/personel/cari-ozet.php` | `/var/www/html/api/v1/personel/cari-ozet.php` |
| `api/v1/personel/_kademe_lib.php` | `/var/www/html/api/v1/personel/_kademe_lib.php` |

> Eğer v2.24'ün `_kademe_lib.php` dosyası **zaten yüklü ise** üzerine yazılacak içeriği AYNIDIR (değişmedi) — yine de güvenli yana yüklemek için dahil ettim.

Ctrl + F5.

---

## 🧪 TEST

1. PERSONEL → bir personele tıkla
2. **ÇALIŞMA MODELİ** sekmesine geç → form alanları (Model Tipi dropdown, Aylık Sabit Maaş input, Kademe editörü) görünmeli, **konsolda hata olmamalı**
3. **CARİ HESAP** sekmesi → 4 metrik kart görünmeli (Maaş, Toplam Hakediş, Ödenen, Bakiye), tabloda ya veriler ya da "HENÜZ HAREKET YOK" yazısı görünmeli — **500 ekranı olmamalı**
4. Tarayıcı F12 → Konsol → kırmızı hata olmamalı

---

## 🛡️ RİSK

- 🟢 Sadece UI bug + endpoint defensifleştirmesi
- 🟢 SQL'e dokunulmadı, başka backend dosyası değişmedi
- 🟢 Geri alma: v2.24.1 personel.js + cari-ozet.php geri yükle

---

## ⚠️ SQL MIGRATION DURUMU

`cari-ozet.php` artık tabloların varlığını test ediyor. Cevapta:

- `_uyari: "v2.24 SQL migration tamamlanmadı"` görürseniz → **SQL'i tekrar çalıştırın:**
  ```
  PAKETLER/v2.24_kademeli_prim_cari_evrak/.../SQL/01_v224_kademeli_prim_evrak_migration.sql
  ```
- `_hata: "..."` görürseniz → sunucu `error_log`'una bakın (cPanel → Errors / hata günlüğü)
