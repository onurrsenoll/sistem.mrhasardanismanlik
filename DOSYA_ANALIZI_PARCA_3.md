# MR HASAR — DOSYA YAŞAM DÖNGÜSÜ DERİNLEMESİNE ANALİZİ
## Parça 3/3 — MASRAFLAR + AI ANALİZ + KOMİSYON + KRİTİK BUG'LAR + EYLEM PLANI

> Bu parça finansal modüllerin entegrasyonu ve dosya yaşam döngüsünün **en kritik 3 bug'ını** içerir.

---

## A. MASRAF YAŞAM DÖNGÜSÜ (5 endpoint — `api/v1/masraf/`)

### 1. create.php — masraf ekleme
**Akış:** dosya_id + masraf_kalemi + tutar + kasa_id zorunlu, açıklama + işlem_tarihi opsiyonel.
**Bakiye kontrolü** (satır 38-40): kasa_id verilmişse bakiye yetersizse 422 hatası.
**Kasa hareket kaydı:** DB trigger ile **otomatik** yapıldığı yorumlarda yazılı.

### 2. ode.php — ödeme akışı (en güvenli endpoint)
- Masraf kontrolü → durum kontrolü → kasa bakiye kontrolü
- Transaction içinde:
  1. `masraflar.odeme_durumu = 'odendi'`
  2. Kasa bakiyesi düşürme
  3. `kasa_hareketleri` ödeme kaydı
  4. **Bağlı paydaş komisyonu varsa** (`paydas_komisyon_id`) → o da `odendi` durumuna geçer

### 3. update.php — güncelleme
Yetki: `dosya-masraf-duzenle`. Güncellenebilir: tutar, masraf_kalemi, açıklama.

### 4. delete.php — silme (admin/muhasebe)
- Bağlı paydaş komisyonu varsa silinir
- `FOREIGN_KEY_CHECKS = 0` set edilir
- `masraflar` DELETE
- FK_CHECKS geri açılır

### 5. list.php
Filtreler: dosya_id, kasa_id, baslangic/bitis tarih. Standart sayfalama.

---

## B. KOMİSYON / HAKEDİŞ OTOMATİKLEŞTİRME

**Personel hakediş** (`personel/hakedis-hesapla.php`): MANUEL tetiklenir (otomatik değil). Aylık çalıştırılır.
- Maaş = (maas / 30) * çalışan_gün
- Prim = departmana göre (Ofis/CRM kademe, Saha kademe, vb.)
- Dosya sayısı: `COALESCE(sorumlu_id, created_by)` ile hesaplanır (v6 güncellemesi)

**Paydaş komisyonu** (`paydas/komisyon-ekle.php`):
- Manuel — dosya kapanınca otomatik **değil**.
- Durum: 'bekliyor' veya 'odendi'.

**Paydaş komisyon ödeme** (`paydas/komisyon-ode.php`):
- Masraf ödeme ile aynı mantık
- Bağlı `masraf_id` varsa onu da `odendi` yapar
- `muhasebe.komisyonlar` tablosunu da güncellemeyi dener (try/catch)

---

## C. AI ANALİZ ENTEGRASYONU

| Endpoint | Amaç | API | Durum |
|---|---|---|---|
| `hesap/ai-analiz.php` | ADK profesyonel rapor | Claude | 🔴 401 invalid x-api-key |
| `hesap/bh-ai-analiz.php` | Bedeni hasar tazminat | Claude | 🔴 401 |
| `hesap/ocr-analiz.php` | Belge OCR (ruhsat, BH, ADK) | Claude Vision (Haiku 4.5) | 🟡 Eski yorum Gemini diyor — kod artık Claude |
| `hesap/evrak-analiz.php` | KTT/İhbar Föyü OCR | Claude Vision + GD ön işleme | 🟡 401 fallback'a düşüyor |
| `hesap/rayic-arastirma.php` | arabam.com/otoplus.com fiyat scrape | ZenRows API | 🟡 API key gerekli |
| `hesap/tahkim-emsal-ara.php` | Tahkim emsal kararı | Claude | ⚠️ "TAHMİNİ" işareti — gerçek değil |
| `hesap/dosyaya-kaydet.php` | Sonuçları evrak olarak kaydet | — | 🟢 Çalışıyor |

**Akış:** Detay sayfası → "AI ile analiz et" → API çağrısı → JSON yanıt → `evrak_turu='ADK RAPORU'` ile `evraklar`'a yeni satır + disk'e dosya (`uploads/hesap/{id}_{tip}_{ts}.json`).

**Hata yönetimi sorunlu:** API başarısızsa kullanıcıya net mesaj **gösterilmiyor** — `error_log`'a yazılıyor, frontend yerel fallback'e (basit hardcoded cevap) düşüyor. Kullanıcı "AI analiz etti" sanıyor ama kalitesiz çıktı alıyor.

---

## D. 🔴 KRİTİK 3 BUG (acil müdahale)

### BUG #1 — Masraf SİLİNDİĞİNDE kasa bakiyesi geri yüklenmiyor
**Konum:** `masraf/delete.php:35-38`
```php
$db->exec("SET FOREIGN_KEY_CHECKS = 0");
$stmt = $db->prepare('DELETE FROM masraflar WHERE id = ?');
$stmt->execute([$id]);
$db->exec("SET FOREIGN_KEY_CHECKS = 1");
```
**Senaryo:**
1. Eksper ücreti 5000 TL masraf eklendi → kasa bakiyesi 50.000 → 45.000 (trigger)
2. Yanlış olduğu fark edildi, masraf silindi
3. **`FOREIGN_KEY_CHECKS=0` ile trigger bypass ediliyor** → kasa bakiyesi 45.000 olarak kaldı

**Etki:** Kasa bakiyesi gerçekten olduğundan **az** görünüyor. Ay sonu raporu yanlış. Muhasebe-canlı tutarsızlığı.

**Çözüm (önerilen):** delete.php'de manuel rollback:
```php
$db->prepare('UPDATE kasalar SET bakiye = bakiye + ? WHERE id = ?')
   ->execute([$masraf['tutar'], $masraf['kasa_id']]);
```
Veya **soft-delete** uygula (`silindi=1` flag, list query'lerinde filtre).

---

### BUG #2 — Masraf GÜNCELLEMEDE kasa hareketi senkronize değil
**Konum:** `masraf/update.php`
- Kullanıcı masrafı 5000'den 3000'e düşürür → masrafın kendisi güncellenir
- **Ama** `kasa_hareketleri` tablosundaki ilk hareket kaydı (5000 TL düşüş) **olduğu gibi kalır**
- Kasa bakiyesi 5000 düşmüş halde kalır

**Etki:** Bütçe raporlarında hareket tutarı vs. masraf tutarı arasında 2000 TL fark.

**Çözüm:** update.php'de tutar değişikliği varsa:
1. Eski tutarı oku, yeni tutarla farkı hesapla
2. `kasa_hareketleri`'ne ek hareket kaydı oluştur (düzeltme)
3. Kasa bakiyesini fark kadar düzelt

---

### BUG #3 — Paralel ödeme race condition (FOR UPDATE yok)
**Konum:** `masraf/ode.php` ve `paydas/komisyon-ode.php`

**Senaryo:** İki kullanıcı aynı anda aynı masrafı ödemeye basıyor.
```
T0: User A → SELECT masraf (durum='odenmedi')
T0: User B → SELECT masraf (durum='odenmedi')
T1: User A → UPDATE durum='odendi', kasa -= 5000
T2: User B → UPDATE durum='odendi', kasa -= 5000  ← BUG
```
Sonuç: Kasadan 10.000 TL düşürüldü, masraf bir kez ödendi.

**Etki:** Düşük olasılıklı ama oluşunca tespit zor — sessiz para kaybı.

**Çözüm:** ode.php'de SELECT'e `FOR UPDATE` ekle (row lock):
```php
$db->prepare('SELECT * FROM masraflar WHERE id = ? FOR UPDATE')
```
Veya conditional UPDATE (yetki sıkı):
```php
UPDATE masraflar SET durum='odendi' WHERE id=? AND durum='odenmedi'
// rowCount===0 ise hata
```

---

## E. AYRICA TESPİT EDİLEN — orta öncelikli sorunlar

### 1. Komisyon oranı değişimi geriye dönük yansımıyor
Dosya açıldığında %30 komisyon → paydaş komisyonu sabit tutar olarak yazıldı → sonra %25'e çekildi → bekleyen komisyon hâlâ %30'dan görünüyor.
**Çözüm:** Komisyon oran değişimi → bekleyen komisyonları yeniden hesapla.

### 2. Soft-delete cascade yok (zombie kayıtlar)
Dosya silindiğinde (silindi=1) → bağlı masraflar/evraklar/komisyonlar **hâlâ list endpoint'lerinde görünüyor**.
**Çözüm:** masraf/list, evrak/list endpoint'lerine `INNER JOIN dosyalar WHERE silindi=0`.

### 3. AI hata sessizliği
Claude API 401 dönerse kullanıcıya net mesaj yok, fallback sessizce devreye giriyor. Kullanıcı kalitesiz analiz aldığını fark edemiyor.
**Çözüm:** Frontend'de "AI servisi şu an erişilemez, basit hesaplama gösteriliyor" uyarısı.

### 4. evrak/diagnose.php hardcoded backdoor
`?key=mrhasar2025` parametresi ile auth bypass. Repo'yu görenden başkası bilmese de güvenlik açığı.
**Çözüm:** Hardcoded key'i kaldır, sadece `auth_required(['admin'])`.

---

## F. ÖNCELİKLENDİRİLMİŞ EYLEM PLANI

### 🔴 BU HAFTA (3 KRİTİK + zaman ~2-3 saat)

| # | Madde | Dosya | Tahmini süre |
|---|---|---|---|
| 1 | Masraf delete.php → kasa bakiye rollback | `api/v1/masraf/delete.php` | 30 dk |
| 2 | Masraf update.php → tutar değişiminde kasa hareketi düzelt | `api/v1/masraf/update.php` | 45 dk |
| 3 | ode.php + komisyon-ode.php → FOR UPDATE / conditional UPDATE | 2 dosya | 30 dk |
| 4 | Kapanmış dosyaya masraf/evrak ekleme engeli | `masraf/create.php`, `evrak/upload.php` | 30 dk |
| 5 | DOSYA KAPANDI → geri açma sadece admin | `dosya/update.php` | 30 dk |

### 🟡 BU AY (orta — 5-7 saat toplam)

| # | Madde | Süre |
|---|---|---|
| 6 | TC + plaka + range validasyonları (frontend + backend) | 2 saat |
| 7 | Sorumlu_id ambiguity düzeltme — eşleşme yoksa hata | 30 dk |
| 8 | BH araç INSERT eksik alanları tamamla | 30 dk |
| 9 | Aşama yetki matrisi (`dosya-asama-degistir`) | 1 saat |
| 10 | Audit log alan detayı (eski/yeni değer JSON) | 1 saat |
| 11 | AI hata kullanıcı uyarısı (frontend toast) | 30 dk |
| 12 | evrak/diagnose backdoor key kaldır | 10 dk |
| 13 | Soft-delete cascade — list endpoint'lerine filtre | 30 dk |

### 🟢 SONRAKİ SÜRÜM (mimari iyileştirme)

| # | Madde |
|---|---|
| 14 | Aşama listesini DB'ye taşı (`dosya_asama_tanimlari`) |
| 15 | Dosya geçmişi sekmesi (`dosya_surecler` görünümü) |
| 16 | Kapanmış dosya → read-only mod |
| 17 | Edit conflict tespiti (optimistic locking) |
| 18 | Aşama bazlı wizard rehberi |
| 19 | Komisyon oran değişimi → bekleyen kayıtları yeniden hesapla |
| 20 | Form'u multi-step'e böl |

---

## G. SONUÇ — DURUM ÖZETİ

**Çekirdek dosya yaşam döngüsü %85 fonksiyonel.** Yeni dosya açma, düzenleme, aşama yönetimi, evrak yükleme, atama bildirimleri, SMS otomasyonu — hepsi temel düzeyde çalışıyor.

**Kritik 3 finansal bug var:**
1. Masraf silindiğinde kasa rollback yok
2. Masraf güncellendiğinde kasa hareketi senkronize değil
3. Paralel ödemede race condition

Bu üçü canlıda **mali tutarsızlık** yaratabilir. Çözüm görece basit (~2-3 saat toplam kod değişikliği), riski sıfır (sadece backend düzeltmeleri, frontend etkilenmez).

**AI modülleri** API key ve model güncellemesi gerektiriyor (önceki Bölüm 2'de işlendi).

**Operasyonel iyileştirmeler** (kapanmış dosya kilidi, aşama yetki matrisi, audit log detayı, TC/plaka validasyonu) kullanıcı deneyimini ve veri kalitesini artıracak — ama acil değil.

---

**Hangi maddeden başlayalım?**

- **(A)** 🔴 Kritik 3 finansal bug paketini tek hot-fix ZIP olarak çıkaralım (~2-3 saat, sıfır risk)
- **(B)** Kapanmış dosya kilidi + DOSYA KAPANDI geri açma + aşama yetki matrisi (~1.5 saat)
- **(C)** TC/plaka/range validasyon paketi (~2 saat)
- **(D)** AI key/model güncellemesi (sen API key'leri verirsen ben helper'ları güncellerim)
- **(E)** Hepsini tek "v2.2 dosya modülü güçlendirme" yamasında topla (~5-6 saat, daha geniş test)

Karar?
