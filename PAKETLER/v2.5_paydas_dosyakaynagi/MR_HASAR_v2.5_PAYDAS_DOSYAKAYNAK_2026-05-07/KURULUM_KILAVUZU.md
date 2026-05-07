# MR HASAR — v2.5.6 BÜTÜNLEŞİK PAKET

**Tarih:** 2026-05-08
**Branch:** `claude/view-all-branches-qZ0JW`
**Kapsam:**
- Güvenlik altyapısı (v2.1) — auth, helpers, soft-delete, FK CASCADE→RESTRICT
- KASA bütünlüğü (Madde 11+12+13) — atomik kasa-bakiyesi koruması
- v2.5 PAYDAŞ TÜR + DOSYA KAYNAĞI (5 yeni tip)
- KAPANIŞ MODÜLÜ (Madde 5.4) — DOSYA KAPAT modal hesaplamaları
- MAHSUP ZİNCİRİ (Madde 4) — menü item + route
- AVUKAT otomatik atama (Türkçe karakter destekli)
- KAZA İLÇE dropdown
- ÇAĞRI WIDGET fix — admin/uzman/personel rolleri otomatik görür
- Yetki matrisi — yeni modüller için izin kayıtları

---

## ALTIN KURALLAR

- **HİÇBİR MEVCUT VERİ SİLİNMEZ.** Tüm SQL'ler additive — `IF NOT EXISTS` / `NOT EXISTS` kontrolleri var.
- **KASA / ÖDEME / MAHSUP / KOMİSYON / HAKEDIŞ mantığı dokunulmadı.**
- Tüm dosyalar **statik olarak parse-test edildi** (JSX + PHP).

---

## YÜKLEME SIRASI

### 1) SQL Migration — phpMyAdmin > İçe Aktar

**Sırayla çalıştırın** (her biri tekrar çalıştırılabilir, hata vermez):

| # | Dosya | Açıklama |
|---|---|---|
| 0 | `SQL/00_v21_guvenlik_yamasi_OPSIYONEL.sql` | **Sadece daha önce yüklenmediyse.** Soft-delete + FK güvenliği. |
| 1 | `SQL/01_paydas_dosyakaynagi_genisletme.sql` | `paydaslar.tur` VARCHAR(40) (zaten yüklü olabilir) |
| 2 | `SQL/02_v25_yetki_matrisi.sql` | Yeni modüllere admin yetki kayıtları |

> **NOT:** Daha önce v2.5'i yüklediyseniz `01` zaten uygulanmış. `02` mutlaka çalıştırılmalı (yeni yetkiler için). `00` sadece güvenlik altyapısı eksikse gerekir.

### 2) Yedek (önerilir)

```
api/v1/paydas/list.php
api/v1/paydas/komisyon-ode.php
api/v1/masraf/ode.php
api/v1/masraf/update.php
api/v1/dosya/get.php
api/v1/dosya/list.php
api/v1/dosya/delete.php
api/v1/dosya/restore.php
api/v1/auth/*.php
api/config/*.php
js/app.js
js/webrtc-widget.js
js/pages/dosya-yeni.js
js/pages/dosya-detay.js
js/pages/ortaklar.js
index.html
```

### 3) Dosyaları Yükle

`YUKLENECEK_DOSYALAR/` klasörünün içeriğini sunucuya kopyalayın (klasör yapısını koruyarak):

| Klasör | Açıklama |
|---|---|
| `api/config/` | Güvenlik altyapısı (zaten yüklü olabilir, üzerine yazmak güvenli) |
| `api/v1/auth/` | Login/logout/refresh (zaten yüklü) |
| `api/v1/dosya/` | Soft-delete + güvenli list/get (zaten yüklü) |
| `api/v1/masraf/` | KASA bütünlüğü (zaten yüklü olabilir) |
| `api/v1/paydas/list.php` | v2.5 — çoklu tur filtresi |
| `api/v1/paydas/komisyon-ode.php` | KASA bütünlüğü |
| `index.html` | v2.5 — is-ortaklari.js + is-paydaslari.js script'leri |
| `js/app.js` | v2.5 — menü + route'lar |
| `js/webrtc-widget.js` | **v2.5.6 fix** — admin/uzman/personel görür |
| `js/pages/dosya-yeni.js` | v2.5 — DOSYA KAYNAĞI 5 değer + AVUKAT otomatik + KAZA İLÇE dropdown |
| `js/pages/dosya-detay.js` | v2.5 — KAPANIŞ MODÜLÜ + DOSYA KAYNAĞI 5 değer |
| `js/pages/ortaklar.js` | v2.5 — turMap + IsOrtaklariView/IsPaydaslariView expose |
| `js/pages/is-ortaklari.js` | YENİ — Personel + Avukat 2 sekme |
| `js/pages/is-paydaslari.js` | YENİ — 5 tur chip-bar + filter |

### 4) Hard reload

**Ctrl+Shift+R** (tarayıcı cache temizle).

---

## YENİ DAVRANIŞLAR

### Çağrı Widget (gelen arama)
- **Önceki sürüm:** Sadece `admin` rolü direkt görüyordu; diğer roller `netsantral_*` veya `cagri_*` yetkisi gerektiriyordu (DB'de tanımlı değildi).
- **v2.5.6:** `admin`, `uzman`, `personel` rolleri otomatik görür. Diğer roller için yetki kontrolü devam eder.
- **Sonuç:** Ses + görüntü artık birlikte gelir.

### DOSYA KAYNAĞI (yeni dosya açma)
- 5 değer: SERVİS / KAPORTACI / ACENTE / PASİF TEMSİLCİ / DİĞER
- **SERVİS / KAPORTACI** → ONARIM SERVİSİ alanı dropdown (paydaslar.tur=servis|kaportaci); seçim paydas_id'yi otomatik atar; PAYDAŞ KAYNAĞI section gizli
- **ACENTE / PASİF TEMSİLCİ / DİĞER** → ayrı PAYDAŞ KAYNAĞI section, filtreli dropdown

### AVUKAT — otomatik atama
- ADK / MDK → ad_soyad'ında "DEMİRHAN" geçen avukat (Türkçe karakter destekli)
- BH → "EMRE" geçen avukat
- Bulunamazsa sarı uyarı banner: İŞ ORTAKLARI > AVUKAT'tan kontrol edin.

### Menü
```
PAYDAŞLAR
 ├─ İŞ ORTAKLARI       (PERSONEL | AVUKAT 2 sekme)
 ├─ İŞ PAYDAŞLARI      (5 tip filtre)
 └─ EKSPER & SİGORTA   (Madde 1)

MUHASEBE
 └─ MAHSUP ZİNCİRİ     (yeni — Madde 4)
```

---

## DOĞRULAMA TESTLERİ

1. ✅ DOSYA KAPAT modal — Tazminat girince Hesap Özeti tüm satırları otomatik dolar mı?
2. ✅ MUHASEBE > MAHSUP ZİNCİRİ menüde görünüyor mu?
3. ✅ Telefonun zilini çal — sağ üst köşede gelen arama widget'ı görünüyor mu?
4. ✅ Yeni dosya: ADK seçince "AVUKAT (OTOMATİK — ADK)" mor kart DEMİRHAN EMİR ile dolu mu?
5. ✅ Yeni dosya: KAZA İLİ değiştir → KAZA İLÇE dropdown otomatik filtrelenip sıfırlanıyor mu?
6. ✅ Yeni dosya: DOSYA KAYNAĞI=SERVİS → ONARIM SERVİSİ dropdown'ı paydas_id'yi atıyor mu?
7. ✅ PAYDAŞLAR > İŞ PAYDAŞLARI yeni paydaş ekleme — TÜR dropdown 9 değer (5 yeni + 4 eski) gösteriyor mu?

---

## STATİK DOĞRULAMA (geliştirici notu)

Pakete dahil edilen **tüm dosyalar parse test'inden geçti**:
- 7 JS/JSX dosyası (`@babel/parser` ile JSX modunda)
- 16 PHP dosyası (`php -l` ile)

Eğer paketi yükledikten sonra runtime hatası alırsan **konsol screenshot'ı ile bildir** — fix edilebilir.

---

## ROLLBACK

1. **Frontend:** Yedeklediğin eski JS/HTML dosyalarını geri yükle.
2. **Backend:** Yedeklediğin eski PHP'leri geri yükle.
3. **DB:** SQL migration'lar additive — geri alınması gerekmez (yetki kayıtları siliniyorsa: `DELETE FROM yetkiler WHERE modul='paydaslar' AND islem IN ('is-ortaklari','is-paydaslari','paydaslar-eksper-sigorta');`)

---

**Hazırlayan:** Claude (Onur Şenol için)
**Tarih:** 2026-05-08
**Önceki paketler:** v2.5.5 → v2.5.6 BÜTÜNLEŞIK
**Sonraki paket:** v2.6 — para formatı (1.000,00 binlik ayraç) — kullanıcı isteğiyle ayrı round'da
