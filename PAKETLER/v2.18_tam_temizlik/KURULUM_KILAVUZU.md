# MR HASAR v2.18 — TAM TEMİZLİK

**Tarih:** 15.05.2026
**Kapsam:** Üç ekrandan istenmeyen alanlar KESINLIKLE kaldırıldı + BİLGİ sekmesi tüm alanları gösterir + DOSYA KAYNAĞI 5 sabit değer

---

## ✅ NE YAPILDI

### A) HER 3 EKRANDAN KESINLIKLE KALDIRILDI

| Alan | DOSYA YENİ | DOSYA DÜZENLE | DOSYA DETAY (BİLGİ) |
|---|:-:|:-:|:-:|
| Telefon 2 | ❌ (yoktu) | ❌ kaldırıldı | ❌ kaldırıldı |
| E-Posta | ❌ kaldırıldı | ❌ kaldırıldı | ❌ kaldırıldı |
| Adres | ❌ kaldırıldı | ❌ kaldırıldı | ❌ kaldırıldı |
| İl | ❌ kaldırıldı | ❌ kaldırıldı | ❌ kaldırıldı |
| İlçe | ❌ kaldırıldı | ❌ kaldırıldı | ❌ kaldırıldı |
| Cinsiyet | ❌ kaldırıldı | ❌ kaldırıldı | ❌ kaldırıldı |
| Meslek | ❌ kaldırıldı | ❌ kaldırıldı | ❌ kaldırıldı |
| Karşı Araç POLİÇE NO | ❌ | ❌ | ❌ (v2.14'te kaldırılmıştı, doğrulandı) |
| SİGORTA BRANŞI | ❌ | ❌ | ❌ |
| SİGORTA TÜRÜ | ❌ | ❌ | ❌ |
| DOSYA TALEP TÜRÜ | ❌ | ❌ | ❌ |
| BH POLİÇE NO | ❌ | ❌ | ❌ |

> **Backend whitelist'lerinden de tamamen çıkarıldı**: `create.php` artık bu alanları INSERT'e dahil etmiyor, `update.php` artık güncellemeleri yok sayıyor. DB kolonları yerinde kalır (geri uyumluluk için), ama yeni kayıtlarda NULL kalır.

### B) DOSYA KAYNAĞI — 3 EKRANDA TEK STANDART

```
SEÇİNİZ
SERVİS
KAPORTACI
ACENTE
PASİF TEMSİLCİ
DİĞER
```

OFİS CRM ve PAYDAŞ/YÖNLENDİREN seçenekleri **KESINLIKLE kaldırıldı**.

### C) DOSYA DETAY → BİLGİ SEKMESİ ZENGİNLEŞTİRİLDİ

Önceki sürümde **16 alan görüntülenmiyordu** — şimdi hepsi BİLGİ sekmesinde görünüyor:

**Dosya bilgileri:**
- ✅ PAYDAŞ (YÖNLENDİREN)
- ✅ KAZA İLÇE
- ✅ NOTER VEKALET

**Sigorta & Eksper & Servis (yeni grup):**
- ✅ SORUMLU SİGORTA
- ✅ EKSPER FİRMA
- ✅ ONARIM SERVİSİ

**BH özel (yeni grup, sadece BH'da):**
- ✅ SÜRÜCÜ ADI
- ✅ EHLİYET NO
- ✅ KUSUR ORANI
- ✅ SAKATLIK / YARALANMA AÇIKLAMASI

**Mağdur:**
- ✅ IBAN
- ✅ GELİR DURUMU (BH)
- ✅ GELİR TUTARI (BH)

**Mağdur Araç:**
- ✅ PLAKA (satıra eklendi)
- ✅ KASKO
- ✅ BH dosyaları için de görünür artık (önceden sadece ADK/MDK)

**Karşı Araç:**
- ✅ PLAKA (satıra eklendi)
- ❌ POLİÇE NO (kaldırıldı — istemiştiniz)

**Notlar:**
- ✅ NOTLAR (vurgulanmış kutu)

---

## 📦 PAKET İÇERİĞİ

```
MR_HASAR_v2.18_TAM_TEMIZLIK_2026-05-15.zip
│
├── KURULUM_KILAVUZU.md
│
├── SQL/
│   └── 01_v217_arac_kolon_backfill.sql   ← v2.17'den, hala gerekli
│
└── YUKLENECEK_DOSYALAR/
    ├── api/v1/dosya/
    │   ├── create.php   ← Mağdur INSERT temizlendi
    │   └── update.php   ← Whitelist temizlendi
    └── js/pages/
        ├── dosya-yeni.js   ← form state temizlendi + UI temizlendi
        └── dosya-detay.js  ← BİLGİ sekmesi + DÜZENLE + KAYNAKLAR temizlendi
```

---

## 🚀 SIRALI YÜKLEME — ZORUNLU SIRA

### 1️⃣ SQL Migration (önce — v2.17'den miras, yine gerekli)
phpMyAdmin → SQL → `SQL/01_v217_arac_kolon_backfill.sql` yapıştır → Çalıştır

> Bu migration eski araç kolonlarındaki veriyi yeni kolonlara backfill eder. **İdempotent** — daha önce çalıştırdıysanız zarar vermez.

### 2️⃣ Backend Dosyaları

| Lokal | Sunucu |
|---|---|
| `YUKLENECEK_DOSYALAR/api/v1/dosya/create.php` | `<web_root>/api/v1/dosya/create.php` |
| `YUKLENECEK_DOSYALAR/api/v1/dosya/update.php` | `<web_root>/api/v1/dosya/update.php` |

### 3️⃣ Frontend Dosyaları

| Lokal | Sunucu |
|---|---|
| `YUKLENECEK_DOSYALAR/js/pages/dosya-yeni.js` | `<web_root>/js/pages/dosya-yeni.js` |
| `YUKLENECEK_DOSYALAR/js/pages/dosya-detay.js` | `<web_root>/js/pages/dosya-detay.js` |

### 4️⃣ Cache Temizle
- PHP opcache reset
- Tarayıcı `Ctrl+F5`

---

## ⚠️ RİSK NOTLARI (abartmadan)

| Risk | Şiddet | Açıklama |
|---|---|---|
| Mevcut dosyaların E-Posta/Adres/İl/İlçe/Meslek değerleri | 🟢 DÜŞÜK | DB'de kalır, sadece UI'da gösterilmez ve düzenlenemez. Veri kaybı yok. |
| Yarım yükleme | 🟡 ORTA | 4 dosyayı birlikte yükle. Sadece frontend yüklenirse backend hala bu alanları kabul eder (zararsız ama tutarsız). |
| Veri kaybı | 🟢 YOK | Hiçbir DB kolonu silinmedi, sadece frontend ve backend whitelist'inden çıkarıldı. |
| Diğer modüller | 🟢 YOK | Police, ihbar-foyu, qr-ruhsat, muhasebe, CRM dokunulmadı. |

---

## 🧪 TEST AKIŞI

1. **YENİ DOSYA AÇ**:
   - Mağdur bölümünde sadece: ADI SOYADI, T.C. KİMLİK, TELEFON, IBAN, GELİR DURUMU (BH), GELİR TUTARI (BH), DOĞUM TARİHİ
   - Adres, İl/İlçe, Cinsiyet, Meslek, E-Posta YOK
   - DOSYA KAYNAĞI: SERVİS / KAPORTACI / ACENTE / PASİF TEMSİLCİ / DİĞER (5 seçenek)

2. **DOSYA DETAY → BİLGİ**:
   - Açtığın dosyada artık şunlar görünmeli: PAYDAŞ, KAZA İLÇE, NOTER VEKALET, SORUMLU SİGORTA, EKSPER FİRMA, ONARIM SERVİSİ, BH için SÜRÜCÜ/EHLİYET/KUSUR/SAKATLIK, MAĞDUR ARAÇ PLAKA + KASKO, KARŞI ARAÇ PLAKA, NOTLAR
   - Mağdur'da Telefon 2, İl, İlçe, Meslek, E-Posta, Adres GÖZÜKMEMELİ

3. **DOSYA DETAY → DÜZENLE**:
   - Mağdur Bilgileri'nde sadece AD SOYAD, T.C. KİMLİK, TELEFON, IBAN, DOĞUM TARİHİ
   - DOSYA KAYNAĞI 5 seçenek
   - Karşı Araç POLİÇE NO yok

---

## 🛡️ NEYE DOKUNULMADI

- DB Schema (sadece v2.17 SQL'i — yeni kolon ekleme)
- Eski dosyaların mevcut adres/meslek/email değerleri DB'de duruyor (sadece UI'da gizli)
- Diğer modüller hepsi
- Yetki sistemi
