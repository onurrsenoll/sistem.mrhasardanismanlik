# MR HASAR v2.16 — TÜM GÜNCEL DOSYALAR TEK PAKETTE

**Tarih:** 15.05.2026
**İçerik:** v2.10 + v2.11.2 + v2.14 + v2.15'in tüm dosyaları, tek zipte.

---

## 🎯 BU PAKET NE İÇERİR?

| Sürüm | Modül | Dosya |
|---|---|---|
| **v2.15** | DOSYA Backend FK Guard | `api/v1/dosya/update.php` |
| **v2.14** | DOSYA Frontend | `js/pages/dosya-detay.js` + `js/pages/dosya-yeni.js` |
| **v2.11.2** | POLİÇE | 11 PHP + `js/pages/police.js` + 3 SQL |
| **v2.10** | RUHSAT OKUYUCU | `js/pages/qr-ruhsat.js` |

**Toplam:** 15 PHP/JS dosyası + 3 SQL migration

---

## 📋 KURULUM — 3 ADIM

### ADIM 1️⃣ — SQL Migration (sadece POLİÇE için, sırayla)

cPanel → phpMyAdmin → veritabanını seç → SQL sekmesi → her dosyayı **sırayla** yapıştır ve çalıştır:

1. `SQL/01_v211_police_fix.sql`
2. `SQL/02_v2111_marka_model.sql`
3. `SQL/03_v2112_nullable_dates.sql`

> Üçü de **idempotent** — defalarca çalıştırılabilir, zarar vermez.

### ADIM 2️⃣ — Dosyaları Sunucuya Yükle

`YUKLENECEK_DOSYALAR/` klasörünün **içeriğini** sunucudaki aynı yola **üzerine yazarak** kopyala:

| Lokal | Sunucu |
|---|---|
| `YUKLENECEK_DOSYALAR/api/v1/dosya/update.php` | `<web_root>/api/v1/dosya/update.php` |
| `YUKLENECEK_DOSYALAR/api/v1/police/*.php` (11 dosya) | `<web_root>/api/v1/police/` |
| `YUKLENECEK_DOSYALAR/js/pages/dosya-detay.js` | `<web_root>/js/pages/dosya-detay.js` |
| `YUKLENECEK_DOSYALAR/js/pages/dosya-yeni.js` | `<web_root>/js/pages/dosya-yeni.js` |
| `YUKLENECEK_DOSYALAR/js/pages/police.js` | `<web_root>/js/pages/police.js` |
| `YUKLENECEK_DOSYALAR/js/pages/qr-ruhsat.js` | `<web_root>/js/pages/qr-ruhsat.js` |

**`<web_root>`** = `public_html` veya cPanel'de domain klasörü.

### ADIM 3️⃣ — Cache Temizle

1. **PHP opcache reset** (varsa): cPanel → Multi PHP Manager → opcache reset
2. **Tarayıcı:** `Ctrl+F5` (hard refresh)

---

## ✅ NE DÜZELTİLDİ / NE GELDİ

### DOSYA modülü
- ✅ DOSYA DETAY → DÜZENLE → KAYDET artık FK hatası vermez (v2.15)
- ✅ DOSYA DETAY DÜZENLE'de gereksiz alanlar kaldırıldı (Poliçe No, Sigorta Branşı, Sigorta Türü, Talep Türü, Karşı Poliçe No, Mağdur Tel 2 / İl / İlçe / Cinsiyet / Meslek / E-Posta)
- ✅ YENİ DOSYA AÇ ile DOSYA DETAY DÜZENLE alan setleri **tutarlı**
- ✅ YENİ DOSYA'da BH için **GELİR TUTARI** alanı eklendi
- ✅ Mağdur Adı yazılınca araç sahibi alanı gerçekten state'e işleniyor (önceden sadece görsel idi)
- ✅ VAR/YOK butonları kompakt
- ✅ DOSYA SORUMLUSU seçince personelin ADK/BH prim kartı görünüyor

### POLİÇE modülü
- ✅ Mali tutarsızlık çözüldü (poliçe silinince kasa rollback)
- ✅ Excel import bulletproof: 66 satırın hepsi kaydoluyor, eksik bilgili olanlar "EKSİK BİLGİ" grubunda gösteriliyor → DÜZENLE ile tamamlanır
- ✅ Yeni 10 kolonlu Excel şablonu (TELEFON 2. sıra, MARKA + MODEL YILI eklendi)
- ✅ FK rol kısıtları kaldırıldı (sadece yetki matrisi)
- ✅ Yenileme hatırlatması artık yetki matrisinden alıcıları seçiyor

### RUHSAT OKUYUCU modülü
- ✅ Tesseract OCR + Claude Sonnet 4.5 AI hibrit
- ✅ API anahtarı (`sk-or-v1-...`) localStorage'da
- ✅ Excel/PDF export, 200 limit geçmiş

---

## 🛡️ NEYE DOKUNULMADI

- DB Schema (sadece v2.11.2 SQL migration'ları → idempotent ALTER)
- Diğer modüller: muhasebe, CRM, paydaşlar, ictihat, bildirimler vs.
- Mevcut dosya/poliçe verileri
- Yetki sistemi
- Kullanıcı hesapları

---

## ❓ SIK SORULAN SORULAR

**S: Önceki paketleri yüklediyseniz tekrar yüklemek zorunda mıyım?**
C: Hayır, bu paket önceki sürümlerin **üzerine** yazılır (superset). Tek deployment yeterli.

**S: SQL migration'ları çalıştırmazsam ne olur?**
C: POLİÇE Excel import / yenileme listesi'nde sorun çıkar. DOSYA modülünü etkilemez. POLİÇE menüsünü kullanmıyorsanız atlayabilirsiniz.

**S: Bir dosya kaybolursa veya yanlış kopyalanırsa?**
C: Sunucudaki mevcut dosyalar yedeğinizdedir (cPanel'de FileManager → yedek). Zip'i tekrar açıp eksik dosyayı kopyalayabilirsiniz.

**S: Cache temizlemezsem?**
C: Tarayıcı eski JS'i çalıştırmaya devam eder, değişiklikleri görmezsiniz. **Mutlaka `Ctrl+F5`** yapın.

---

## 🔄 GERİ ALMA

Sunucudaki mevcut dosyaların yedeği yoksa cPanel'in günlük yedeklerinden geri yükleyin. Schema değişikliği geri alınmaz (kolonlar geride kalır, eski kod yine çalışır).
