# MR HASAR — v3.0 KAPSAMLI PAKET KURULUM KILAVUZU
**Tarih:** 04 Mayıs 2026
**Paket:** MR_HASAR_v3.0_KAPSAMLI_2026-05-04.zip

---

## 📦 PAKET İÇERİĞİ

```
SQL/
└── 01_v30_kapsamli_migration.sql            (additive — yeni tablo + 5 ayar)

api/config/
└── _validasyon_helpers.php                  (8 validasyon fonksiyonu)

api/v1/dosya/
├── create.php                               (validasyon + eksper + asgari ücret)
├── update.php                               (Bug D fix + validasyon)
├── get.php                                  (eksper paydaş JOIN + tüm alanlar)
├── kapanis-olustur.php                      (yeni — Madde 5.4 entegre)
├── kapanis-getir.php                        (yeni)
├── kapanis-listesi.php                      (yeni)
└── mahsup-zinciri.php                       (yeni)

api/v1/muhasebe/
└── ay-sonu-rapor-v30.php                    (yeni — Madde 5.4 uyum kontrollü)

js/pages/
├── dosya-yeni.js                            (validasyon + eksper paydaş + asgari ücret radio)
└── dosya-detay.js                           (Bug A render fix + kapanış modal v3.0)
```

---

## 🚀 KURULUM SIRASI

### 1) SQL Migrasyonu Çalıştır
```sql
-- phpMyAdmin / cPanel SQL'den
SOURCE 01_v30_kapsamli_migration.sql;
```
**Kontrol:**
```sql
SHOW TABLES LIKE 'dosya_kapanis_kayitlari';        -- 1 satır dönmeli
SHOW COLUMNS FROM dosyalar LIKE 'eksper_paydas_id'; -- 1 satır dönmeli
SHOW COLUMNS FROM magdurlar LIKE 'gelir_durumu_tipi'; -- 1 satır dönmeli
SELECT * FROM ayarlar WHERE anahtar LIKE 'asgari_ucret%' OR anahtar LIKE 'kapanis_%';
```

### 2) Backend Dosyalarını Yükle
- `api/config/_validasyon_helpers.php` → public_html/api/config/
- `api/v1/dosya/*.php` → public_html/api/v1/dosya/ (mevcut create.php, update.php, get.php ÜZERİNE yaz)
- `api/v1/dosya/kapanis-*.php` ve `mahsup-zinciri.php` → public_html/api/v1/dosya/ (yeni)
- `api/v1/muhasebe/ay-sonu-rapor-v30.php` → public_html/api/v1/muhasebe/

### 3) Frontend Dosyalarını Yükle
- `js/pages/dosya-yeni.js` → public_html/js/pages/ (üzerine)
- `js/pages/dosya-detay.js` → public_html/js/pages/ (üzerine)

### 4) Cache Temizle
- Tarayıcıda Ctrl+F5 / Cmd+Shift+R
- cPanel → LiteSpeed Cache → Purge All (varsa)

---

## ✅ TEST SENARYOLARI (12 ADIM)

### 🟢 FAZ 1 — DOSYA AKIŞ BUG FİX

**Test 1 — Detay Sayfasında Tüm Alanlar Görünüyor**
- Yeni bir ADK dosyası aç (tüm alanları doldur)
- Detay sayfasını aç
- ✅ Beklenen: TC, Telefon, IBAN, Adres, İl, İlçe, Cinsiyet, Meslek, Doğum Tarihi, Gelir Durumu görünür
- ✅ Eksper Firması (paydaş seçildiyse) görünür
- ✅ Sigorta Branşı, Onarım Servisi, Talep Türü görünür

**Test 2 — Düzenle → Kaydet → Tüm Alanlar Korunur**
- Detay sayfasından "DÜZENLE" → bir alan değiştir → KAYDET
- ✅ Beklenen: Değişiklik kalır, diğer alanlar silinmez

**Test 3 — Bug D: Mağdur Olmayan Dosyaya Mağdur Eklendi**
- (Eski) magdur kaydı olmayan bir dosya bul
- Detayına mağdur bilgisi gir → KAYDET
- ✅ Beklenen: magdurlar tablosuna INSERT yapılır

### 🟡 FAZ 2 — VALİDASYON

**Test 4 — TC Algoritma Reddi**
- Yeni dosya aç → TC: `12345678901` (geçersiz)
- ✅ Beklenen: "GEÇERSİZ T.C. KİMLİK NO (algoritma hatası)"

**Test 5 — Plaka Format Reddi**
- Mağdur araç plakası: `@AB123`
- ✅ Beklenen: "GEÇERSİZ MAĞDUR ARACI PLAKASI"

**Test 6 — Kaza Tarihi Gelecek Reddi**
- Kaza tarihi: 2030-01-01
- ✅ Beklenen: "KAZA TARİHİ GELECEK OLAMAZ"

**Test 7 — IBAN Format Reddi**
- IBAN: `TR123` (kısa)
- ✅ Beklenen: "GEÇERSİZ IBAN (TR + 24 hane olmalı)"

**Test 8 — Komisyon Range Reddi**
- Komisyon: `200`
- ✅ Beklenen: "KOMİSYON ORANI 0-100 ARASI OLMALI"

### 🟣 FAZ 2.5 — ASGARİ ÜCRET + EKSPER

**Test 9 — Asgari Ücret Otomatik (BH dosyası)**
- Yeni BH dosyası → Gelir Durumu = "ASGARİ ÜCRET" seç
- Kaydet → DB'de `magdurlar.gelir_tutari = 28075.50` (2026 net)
- ✅ Beklenen: Otomatik 2026 net asgari ücret atanır

**Test 10 — Eksper Paydaş Seçimi**
- Önce Paydaş kartı oluştur: `tur='eksper'`
- Yeni ADK dosyası → "EKSPER FİRMASI (PAYDAŞ)" listesinde paydaş görünür
- Seç → Kaydet → DB'de `dosyalar.eksper_paydas_id` dolu
- Detay sayfasında "EKSPER FİRMASI" + yetkili + telefon görünür

### 🔵 FAZ 3 — DOSYA KAPANIŞ MODÜLÜ

**Test 11 — Kapanış Hesabı (Madde 5.4)**
- Bir dosya kapat:
  - Sigorta Tahsilatı: 17.635,00
  - Sözleşme Oranı: %20 → Sözleşme Tutarı: 3.527,00 → Müvekkile Havale: 14.108,00
  - Yönlendiren Ücreti: 500
  - Noter Masrafı: 1.596
  - Karşı Vekalet: 8.817 / Faiz: 580 / Stopaj: 2.939 / KDV %20
- ✅ Beklenen Hesap:
  - Toplam Kazanç = 17.635 - 14.108 - 500 - 1.596 = **1.431,00**
  - Net Kazanç = Toplam - Dosya Masrafları + Faiz - Stopaj
  - Onur Payı = Net × 0.5
- ✅ DB Kontrol:
  ```sql
  SELECT * FROM dosya_kapanis_kayitlari WHERE dosya_id = X;
  SELECT asama, kapanma_tarihi FROM dosyalar WHERE id = X;  -- 'DOSYA KAPANDI'
  ```

**Test 12 — Aylık Mutabakat Raporu**
```
GET /api/v1/muhasebe/ay-sonu-rapor-v30.php?donem=2026-05
```
- ✅ Beklenen: JSON içinde
  - `dosyalar[]` (kapanış kayıtları)
  - `toplamlar` (sigorta_tahsilat toplamı, onur_payi toplamı, vb.)
  - `paydas_ozet[]` (yönlendiren bazlı döküm)
  - `avukat_ozet[]` (avukat bazlı döküm)
  - `madde54_uyumsuz[]` (uyumsuz dosyalar — varsa)

---

## 🔒 GERİ ALMA (Rollback)

Tüm migrasyonlar **additive**. Geri almak için:
```sql
-- 1) Tabloyu sil (eğer kullanılmıyorsa)
DROP TABLE IF EXISTS dosya_kapanis_kayitlari;

-- 2) Yeni kolonları sil
ALTER TABLE dosyalar DROP COLUMN eksper_paydas_id;
ALTER TABLE magdurlar DROP COLUMN gelir_durumu_tipi;
ALTER TABLE magdurlar DROP COLUMN gelir_tutari;

-- 3) Ayarları sil
DELETE FROM ayarlar WHERE anahtar IN
  ('asgari_ucret_2026','asgari_ucret_2025','kapanis_madde54_aktif',
   'kapanis_kdv_orani','kapanis_sozlesme_orani');
```

Backend için: önceki sürüm dosyalarını yedekten geri yükle.

---

## 📞 SORUN GİDERME

**S: "Bu dosya zaten kapatılmış" hatası alıyorum**
C: Test sırasında `DELETE FROM dosya_kapanis_kayitlari WHERE dosya_id = X` ile temizleyin.

**S: Eksper paydaş listesi boş**
C: Önce paydaş kartı oluşturun: `INSERT INTO paydaslar (ad, tur, durum) VALUES ('Test Eksper', 'eksper', 'aktif');`

**S: Validasyon helper bulunamadı**
C: `api/config/_validasyon_helpers.php` dosyasının var olduğunu ve okunabilir olduğunu kontrol edin (chmod 644).

**S: Kapanış endpoint 401 hatası**
C: Kullanıcı oturumu açık ve `admin/uzman/personel` rolünde olmalı.

---

## 🎯 GARANTİLER

1. ✅ **Veri Kaybı Yok** — tüm migrasyonlar additive
2. ✅ **Geri Alma Var** — yukarıdaki SQL ile
3. ✅ **Mevcut Akışlar Bozulmaz** — masraf, evrak, CRM, ajanda, muhasebe aynı
4. ✅ **Madde 5.4 Doğru** — yönlendiren ücreti kazançtan ÖNCE düşer, %50/%50 paylaşır
5. ✅ **Mahsup Zinciri** — bekleyen mahsup otomatik onur payından düşülür

---

## 📝 NOTLAR

- 2026 NET asgari ücret: **28.075,50 TL** (ayarlar.asgari_ucret_2026)
- 2025 NET asgari ücret: **22.104,67 TL** (ayarlar.asgari_ucret_2025)
- Eksper firması ya paydaş listesinden seçilir ya manuel girilir (eski eksper_firma kolonu hala destekli — backwards compatible)
- Mağdurun Telefon 2 ve Email alanları frontend'den kaldırıldı (DB kolonları kalır — eski veri kaybolmaz)
