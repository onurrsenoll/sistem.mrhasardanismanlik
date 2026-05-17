# MR HASAR v2.24.1 — HOTFIX: 3 KRİTİK UYUMSUZLUK + ÇALIŞMA MODELİ BOŞ AÇILMA

**Tarih:** 17.05.2026
**Tip:** HOTFIX (3 dosya — 1 JS + 1 PHP + 1 SQL)
**Hedef:** v2.24 yüklenmiş kurulumlar — **ŞARTLI ZORUNLU**

---

## 🐛 ÇÖZÜLEN SORUNLAR

### 1) ÇALIŞMA MODELİ sekmesi boş açılıyor (UI bug)
**Sebep:** Render koşulu `{detayTab === 'model' && detayModelForm && (...)}` şeklindeydi.
`detayModelForm` sadece `cari-ozet.php` başarılı dönerse set ediliyordu. İlk açılışta veya
yavaş yanıt halinde sekmenin altı boş kalıyordu.
**Çözüm:** `detayAc()` başında personel kolonlarından (`p.maas`, `p.prim_adk`, `p.prim_bh`)
**default form** kurulur; cari yanıtı gelince override edilir.

### 2) Dosya sorumlusu güncellendiğinde PRİM EKLENMEYEBİLİYORDU
**Sebep:** Bizim `_dosya_prim_hook.php` personeli `WHERE user_id = ?` ile arıyordu.
Ama mevcut v2.20 `dosya/create.php` sistemde `WHERE user_id = ? OR id = ?` paterni kullanıyor
(dosyalar.sorumlu_id tarihsel olarak bazen users.id, bazen personel.id tutmuş).
Bu uyumsuzluk yüzünden bazı sorumlu atamaları personele eşleşmiyor, prim kayıt **oluşmuyordu**.
**Çözüm:** Hook artık `WHERE user_id = ? OR id = ?` ile arar; user_id eşleşmesini önceliklendirir.

### 3) sorumlu_id NULL ise prim cari'ye düşmüyordu
**Sebep:** v2.19 `dosya-listesi.php` zaten `COALESCE(sorumlu_id, created_by)` ile dosyayı
açan kişiye fallback yapıyordu. Hook bu mantığı taklit etmiyordu.
**Çözüm:** Hook ve genişletilmiş BACKFILL SQL aynı fallback'i uygular.

### 🟢 DOĞRULANAN UYUM TANIMLAMALARI
- Model tipi enum: Frontend ↔ Backend kazanc-model ↔ SQL migration **uyumlu** (`sabit / sabit_prim / kademeli_saha / kademeli_ofis`)
- Kademe JSON: KademeEditor `{min, max, birim, etiket}` ↔ `parcali_kademe_hesap()` `$k['min'], $k['max'], $k['birim']` **uyumlu**
- Ödeme dönem marking: `odeme-yap.php` o dönemin "bekliyor" kayıtlarını "sayildi" yapıyor — donem bazlı eşleşme doğru
- Personel kolonları (maas/prim_adk/prim_bh): kazanc-model.php POST'unda eski personel tablosuna da yazılıyor (geriye uyum)
- DÖNEM = `acilis_tarihi`'nin YYYY-MM'i — dosya/create.php `acilis_tarihi = CURDATE()` ile yazıyor → **dosya oluşturma ayı = dönem** ✅

---

## 📂 YÜKLEME — 3 DOSYA

| Paketteki yol | Sunucuda yol |
|---|---|
| `YUKLENECEK_DOSYALAR/js/pages/personel.js` | `/var/www/html/js/pages/personel.js` |
| `YUKLENECEK_DOSYALAR/api/v1/personel/_dosya_prim_hook.php` | `/var/www/html/api/v1/personel/_dosya_prim_hook.php` |
| `SQL/02_v241_backfill_genisletilmis.sql` | phpMyAdmin → SQL → çalıştır |

Sonra **Ctrl + F5**.

> **Not:** `dosya/create.php` ve `dosya/update.php` dosyaları DEĞİŞMEDİ. Hook'u onlar
> `require_once` ile çağırıyor; biz sadece hook'un kendisini güncelledik. Yani v2.24'te
> yüklediğiniz create/update zaten yeni hook'u otomatik kullanacak.

---

## 🧪 TEST SENARYOSU (kullanıcı talebi)

> "Mevcut dosyada dosya sorumlusu güncellediğimde sorumlu kullanıcı ve tanımlı personel ise dosya oluşturma tarihli olarak kişiye prim eklenmeli"

### Adımlar:
1. DOSYALAR sayfasından **mevcut bir dosyayı aç** (örn. 15.04.2026'da açılmış)
2. **DÜZENLE** → SORUMLU dropdown'ı aç → bir personeli seç (Sercan Kaya Tumgan) → **KAYDET**
3. PERSONEL sayfası → Sercan Kaya Tumgan'a tıkla → modal aç
4. **CARİ HESAP** sekmesine geç
5. **2026-04** dönemi satırında **+1 ADK (veya BH)** görmelisin
6. Bakiye otomatik artmış olmalı (kademeli prim hesabıyla)
7. **PRİM HAKEDİŞ** sekmesi → 2026-04'ü aç → o dosya listede görünmeli

### Sorumlu değiştirme senaryosu:
1. Aynı dosyada SORUMLU'yu BAŞKA PERSONELE değiştir → KAYDET
2. Eski personelin CARİ → o dönem prim'i **'iptal' veya 'iptal_mahsup'** durumuna düşer (bekleyenden iptal, sayılandan mahsup)
3. Yeni personelin CARİ → +1 yeni "bekliyor" kayıt

---

## 🛡️ RİSK

- 🟢 SQL `INSERT IGNORE` + `NOT EXISTS` ile idempotent — birden çok kez çalıştırılabilir
- 🟢 Hook'un yeni sorgusu v2.20 paterni ile aynı — geriye dönük güvenli
- 🟢 personel.js değişiklik yalnız `detayAc` ve render koşulu — UX sadece iyileşir
- 🟢 Geri alma: v2.24 dosyalarını geri yükle

---

## 🚫 EKSTRA UYARI — BU YÜKLENDİKTEN SONRA

Eski v2.24 BACKFILL'i yalnızca `user_id = sorumlu_id` eşleşmesini yakalamıştı. v2.24.1 BACKFILL'i:
- `sorumlu_id = personel.id` durumlarını da yakalar
- `sorumlu_id NULL` ise `created_by` üzerinden yakalar

Yani **eski dosyalarınız için EKSTRA prim kayıtları oluşabilir**. Bu istenen davranıştır
(dosyayı kim açtıysa onun primidir). Bir personel için aniden cari'de artış görürseniz
bunun **geçmiş dosyaların doğru sahibine yazılması** olduğunu bilin — uydurma değildir.
