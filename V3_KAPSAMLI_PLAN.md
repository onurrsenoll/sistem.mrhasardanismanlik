# MR HASAR — v3.0 KAPSAMLI ENTEGRASYON PLANI
**Tarih:** 04 Mayıs 2026
**Kapsam:** Bug Fix + v2.3 Validasyon + v3.0 Dosya Kapanış Modülü
**Durum:** Onay bekliyor

---

## 🔴 FAZ 1 — DOSYA AKIŞI BUG ANALİZİ

### Tespit Edilen Sorunlar

#### Bug A: Dosya Detayında Tüm Alanlar Görünmüyor
- **Konum:** `dosya-detay.js` satır 266-580
- **Sebep:** Detay render'ı `magdur.ad_soyad`, `dosya.sigorta_sirket` gibi temel alanları okuyor — ancak yeni eklenen alanlar (sürücü bilgileri, araç ek detayları, kasko poliçeleri, sigorta türü vb.) gösterimde **eksik**
- **Etki:** Yeni dosya açarken girilen bilgiler kaybolmuyor (DB'de var) ama detay sayfasında görüntülenmiyor — kullanıcı "kayıtsız" sanıyor

#### Bug B: Düzenle → Kaydet Bazı Alanları Güncellemiyor
- **Konum:** `dosya-detay.js` satır 320-380 (`dosyaGuncelle`)
- **Sebep:** Düzenleme modal'ında **sadece 30 alan** gönderiliyor; geri kalan dosya alanları (talep_turu, surucu_kusur, sakatlik_aciklama, sorumlu_sigorta vb.) modal'da yok
- **Etki:** Kullanıcı düzenleyip kaydedince modal'da olmayan alanlar **DB'de kaybolmuyor** ama görünür alanların eksikliği yanıltıcı

#### Bug C: Mağdur/Araç UPDATE'i FK Sırası
- **Konum:** `update.php` satır 200+ (mağdur araç INSERT/UPDATE)
- **Sebep:** Yeni araç INSERT yaparken `dosya_id` zaten parametrelerin SONUNA ekleniyor, ama insert fields/values listeleri tutarsız sırada
- **Etki:** Bazen yeni araç INSERT'i başarısız oluyor (sessiz)

#### Bug D: Update Sırasında Mağdur Yoksa
- **Konum:** `update.php` magdur kısmı
- **Sebep:** `$hasMagdurData = true` set olur, ama `INSERT INTO magdurlar` yoksa update fail
- **Etki:** Mağdursuz dosyalarda magdur ekleme çalışmıyor

---

## 🟡 FAZ 2 — v2.3 VALİDASYON

### Eklenen Kontroller

| # | Validasyon | Konum | Etki |
|---|---|---|---|
| 1 | **TC Kimlik 11 hane + algoritma** | dosya/create.php + helpers.php | `00000000000` ya da hatalı TC reddedilir |
| 2 | **Plaka regex** `^[0-9]{2}[A-Z]{1,3}[0-9]{2,4}$` | create.php + update.php | `@AB123` gibi geçersiz plakalar reddedilir |
| 3 | **Komisyon 0-100** range | create.php + update.php | Negatif veya 200+ değer reddedilir |
| 4 | **Kaza tarihi gelecek değil** | create.php + update.php + frontend | "2030-01-01" tarihli kaza engellenir |
| 5 | **Telefon normalleştirme** | helpers.php yeni `normalize_phone()` | Boşluk/parantez temizleme, 10 hane kontrolü |
| 6 | **IBAN format kontrolü** (TR + 24 hane) | create.php + update.php | TR ile başlamayan IBAN reddedilir |
| 7 | **Email format** | create.php + update.php | filter_var ile kontrol |
| 8 | **Frontend HTML5 validation** | dosya-yeni.js + edit modal | `<input max>` `<input pattern>` |

### Frontend Geri Bildirim
- Hata durumunda inline error mesajı (kırmızı border + altta açıklama)
- Form gönderilmeden önce client-side validation
- Hata varsa server gönderimi engellenir

---

## 🟣 FAZ 3 — v3.0 DOSYA KAPANIŞ MODÜLÜ (Madde 5.4 Entegre)

### Tasarım

#### A. Yeni Tablo: `dosya_kapanis_kayitlari`
Excel hesap tablosunun birebir karşılığı — **kalıcı snapshot**:
```
- sigorta_tahsilat        (sigortadan gelen)
- sozlesme_orani / tutar  (örn %20)
- noter_masrafi
- muvekkile_havale
- yonlendiren_ucreti      (madde 5.4 — KAZANÇTAN ÖNCE düşülür)
- yonlendiren_kaynak       (CRM OFİS / SERVİS / KAPORTACI)
- net_vekalet_ucreti
- faiz, stopaj, kdv
- toplam_kazanc           (= sigorta - havale - yonlendiren - noter)
- net_toplam_kazanc       (toplam kazanc paylaşılacak)
- yari_pay_yuzde          (default 50)
- onur_payi               (= net × 0.5)
- avukat_payi             (= net × 0.5)
- mahsup_edilecek         (önceki dosyalardan kalan)
- mahsup_kaynak_dosya_id  (hangi dosyadan mahsup)
- not_metni
```

#### B. Yeni Endpoint'ler
```
POST /api/v1/dosya/kapanis-olustur.php
   - Body: tüm hesap kalemleri
   - Yapar:
     1. Kapanış kaydı INSERT
     2. dosyalar.asama = 'DOSYA KAPANDI', kapanma_tarihi
     3. gelirler tablosuna gelir kaydı (kasaya yansır)
     4. Bekleyen mahsup varsa onur_payi'ndan otomatik düş
     5. Hesap tablosu HTML/PDF olarak evraklara kaydet

GET /api/v1/dosya/kapanis-getir.php?id=X
   - Dosyanın kapanış snapshot'ını getir

GET /api/v1/dosya/kapanis-listesi.php?donem=YYYY-MM
   - Ay sonu raporu için tüm kapanışları listele
   - %50 pay özeti, mahsup zinciri, toplam Onur ve Avukat payı

POST /api/v1/dosya/mahsup-zinciri.php
   - Bir dosyada mahsup oluştur, sonraki dosyada otomatik düş
```

#### C. Frontend — Dosya Kapanış Modal v3.0
Mevcut "DOSYA KAPAT" modal'ı güncellenecek:
- 3 sütun: **Tahsilat / Kesintiler / Pay Hesaplama**
- Her alan için tooltip + canlı hesaplama (input değişirse net pay anında güncellenir)
- "Hesap Tablosu Önizle" — Excel formatında HTML görsel
- "Kapatma Onayı" — son kontrol modal'ı + Madde 5.4 doğrulama
- **Madde 5.4 uyumu** otomatik kontrol: Yönlendiren ücreti varsa kazançtan düşüldüğüne emin olunur, paylaşımdan **önce**

#### D. Aylık Otomatik Mutabakat Raporu
- `kapanis-listesi.php` ay sonu çalıştırıldığında PDF üretir
- Format: 2026 Ocak Ay Sonu Raporu PDF temasıyla aynı
- Her dosya için: Sigorta → Net → %50 pay → Onur/Avukat
- Toplam: Aylık Onur payı, Avukat payı, Mahsup zinciri özeti
- **Madde 5.4 uyumsuz dosyalar kırmızı işaretli**

---

## 📦 PAKET YAPISI

### Tek Büyük ZIP — `MR_HASAR_v3.0_KAPSAMLI_2026-05-04.zip`

```
SQL/
└── 01_kapanis_modulu.sql                  (yeni tablo + örnek veri)

YUKLENECEK_DOSYALAR/
├── api/v1/dosya/
│   ├── create.php                         (validasyon eklendi)
│   ├── update.php                         (bug fix + validasyon)
│   ├── get.php                            (alan tamamlama)
│   ├── kapanis-olustur.php                (yeni)
│   ├── kapanis-getir.php                  (yeni)
│   ├── kapanis-listesi.php                (yeni)
│   └── mahsup-zinciri.php                 (yeni)
├── api/config/
│   └── helpers.php                        (validate_tc, validate_iban, validate_plaka,
│                                            normalize_phone, validate_kaza_tarihi)
├── api/v1/muhasebe/
│   └── ay-sonu-rapor.php                  (kapanis_kayitlari'ndan PDF üretimi)
└── js/pages/
    ├── dosya-detay.js                     (tüm alanlar görüntülenir + bug fix)
    ├── dosya-yeni.js                      (validasyon + UI)
    └── dosya-kapanis.js                   (yeni — kapanış modal v3.0)

KURULUM_KILAVUZU.md                        (12 test senaryosu)
```

---

## ⏱️ TAHMİNİ ÇALIŞMA SÜRESİ

| Faz | İş | Süre |
|---|---|---|
| 1 | Dosya akış bug'ları (create + update + get + detay render) | 3 saat |
| 2 | v2.3 Validasyon (8 kontrol + helpers.php + frontend) | 2 saat |
| 3 | v3.0 Dosya Kapanış Modülü (SQL + 4 endpoint + modal) | 5 saat |
| - | Test + kılavuz + paketleme | 1 saat |
| - | **TOPLAM** | **~11 saat çalışma** |

---

## ✅ GARANTİLER

1. **Veri Kaybı Yok** — mevcut hiçbir veri silinmez/değişmez (additive migration)
2. **Geri Alma Var** — her dosya yedeği zaten alınmış, yamayı kaldırmak kolay
3. **Mevcut Akışlar Bozulmaz** — masraf, evrak, CRM, ajanda, muhasebe akışları aynen çalışmaya devam eder
4. **Madde 5.4 Doğru Hesap** — kapanış modal'ı **kazançtan ÖNCE** yönlendiren ücretini düşer, %50/%50 paylaşır
5. **Kapsamlı Test** — 12 test senaryosu kılavuzda

---

## 🔍 DOSYA AKIŞ BUG'LARI — DETAY ÇÖZÜM

### Bug A Çözümü — Detay Sayfası Tüm Alanları
Mevcut `dosya-detay.js` `InfoRow` ile alan gösterirken aşağıdaki alanları **eklemiyor**:

**Eklenecek Mağdur Alanları:**
- TC Kimlik, Telefon 2, Email, IBAN, Adres (mevcut)
- Cinsiyet, Meslek, Gelir Durumu, Gelir Tutarı (eksik)

**Eklenecek Dosya Alanları:**
- Talep Türü, Sürücü Kusur, Sakatlık Açıklama (BH için)
- Sorumlu Sigorta, Sigorta Branş, Eksper Firma (eksik)

**Eklenecek Araç Alanları:**
- Belge Tescil No, Onarım Gün Süresi, Geçmiş Hasar (var/yok)
- Sürücü Ad/TC, Ruhsat Sahibi-Sürücü Aynı/Farklı

### Bug B Çözümü — Update Modal Tam Liste
Mevcut modal **30 alan** gönderiyor. Tüm dosya alanlarını ekleyeceğim — modal'a yeni "İleri Düzenleme" sekmesi ekleyip tüm alanlar düzenlenebilecek.

### Bug C Çözümü — INSERT Sırası
INSERT'lerde dosya_id parametre sırası kontrolü, FK kısıtlamaları test.

### Bug D Çözümü — Mağdur Yoksa Otomatik INSERT
update.php'de `$hasMagdurData` kontrolü sonrası, mağdur kaydı yoksa **otomatik INSERT INTO magdurlar** yapılır (sadece UPDATE değil).

---

## ❓ ONAY BEKLİYOR

Bu plan kapsamlı ve sistemin mevcut işleyişini bozmadan **3 büyük problem** çözer:
- Dosya akış bug'ları → kullanıcının dediği "veri görünmüyor" sorunu
- v2.3 Validasyon → veri kalitesi
- v3.0 Dosya Kapanış Modülü → Madde 5.4 entegrasyonu

**Onayını ver** ("evet" veya "OK") — kod yazımına başlayacağım.

İstersen önce **sadece bug fix** yapayım (3 saat), sonra v2.3 ve v3.0'ı ayrı paketlerde yapayım. Ama tek pakette daha entegre çalışacak.

**Tek paket mi (önerim) yoksa ayrı sırayla mı?**
