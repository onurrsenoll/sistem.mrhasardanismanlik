# MR HASAR — DOSYA YAŞAM DÖNGÜSÜ DERİNLEMESİNE ANALİZİ
## Parça 1/3 — YENİ DOSYA AÇMA AKIŞI

> 3 paralel ajan tarafından canlı koddan çıkarılan bulgular. Bu parça: `dosya-yeni.js` (frontend) + `dosya/create.php` (backend) + bağlı modüller.

---

## A. ÇALIŞMA MANTIĞI — adım adım

### 1. Frontend (dosya-yeni.js, ~2000 satır, tek aşamalı, 93 alan)
Form **5 mantıksal blok** halinde:

| Blok | Alanlar |
|---|---|
| **Mağdur Bilgileri** | ad_soyad, tc_kimlik, telefon, telefon2, iban, adres, il, ilce, dogum_tarihi |
| **Dosya Bilgileri** | dosya_turu (ADK/BH/MDK), kaza_tarihi, komisyon, noter_vekalet, sorumlu_id, ortak_id, paydas_id |
| **Dosya Kaynağı** | CRM | OFİS | PAYDAŞ (paydas_id koşullu) |
| **Sigorta** | sigorta_sirket, hasar_no, police_no, sorumlu_sigorta (sadece BH) |
| **Araç Bilgileri** | ADK/MDK: mağdur + karşı araç (plaka, marka, model, ruhsat sahip, kasko, sürücü). BH: sadece sürücü kusur, ehliyet, sakatlık açıklaması |

Zorunlu alanlar (`validate()` satır 111-128): ad_soyad, tc_kimlik, telefon, il, ilce, dosya_turu, kaza_tarihi, komisyon, noter_vekalet, sorumlu_id, dosya_kaynak, sigorta_sirket, hasar_no, ADK/MDK için ma_plaka.

### 2. Backend (create.php, 543 satır)
Sırasıyla:

1. **DDL Migrasyon** (38-77): Eksik kolonları otomatik ekle (`ensure_*_columns`)
2. **Dosya no üret** (`generate_dosya_no`): YYYY-NNNN formatı
3. **Sorumlu ID çözümle**: users tablosunda doğrudan ara, yoksa personel.user_id'ye çevir
4. **Transaction başlat**
5. **dosyalar INSERT** (22 parametre)
6. **magdurlar INSERT** (14 parametre)
7. **araclar INSERT** (1-2 kayıt; ADK/MDK iki taraflı, BH tek taraflı kısmi)
8. **Otomatik prim akışı:**
   - Personel primi → bilgi olarak döner (masraf yazmaz)
   - Paydaş primi → 3 tabloya yazar (`masraflar` + `paydas_komisyonlari` + `komisyonlar`) çift bağlı
   - Dosya kaynağı bazlı yönlendirici ücret → `masraflar` (ödenmedi)
   - Noter vekalet ücreti → `masraflar` (ödenmedi)
9. **dosya_surecler** log kaydı
10. **Transaction commit**
11. **Portal erişimi** (otomatikse): UUID + SMS gönder
12. **Avukat SMS bildirimi** (ortak varsa)
13. **v2.1.2 sistem-içi bildirim** (avukat/ortak/sorumlu'ya)

---

## B. NE DOĞRU ÇALIŞIYOR

✅ **Transaction disiplini** — Ana akış (dosya+mağdur+araç+masraflar) tek transaction içinde, hata olunca rollback.
✅ **Plaka normalizasyon** — Hem frontend (`formatPlaka`) hem backend (`format_plaka`) uppercase + boşluk sil.
✅ **Çoklu prim hesaplaması** — Sorumlu personel + paydaş + dosya kaynağı + noter ücreti → her biri ayrı masraf kalemi.
✅ **Dosya no çakışma yok** — Yıl+max+1 mantığı, eşzamanlı oluşturmada bile DB unique kısıtı var.
✅ **Portal entegrasyonu** — Müşteri otomatik SMS ile portal kodu alır.
✅ **v2.1.2 bildirim** — Atanan avukat/ortak/sorumlu sisteme girdiğinde bildirim görür.

---

## C. EKSİKLER VE SORUNLAR

### 🟡 ORTA RİSK (veri kalitesi)

**1. TC kimlik doğrulaması atlanıyor**
`helpers.php` içinde `validate_tc()` fonksiyonu var ama `create.php`'de **çağrılmıyor**.
- **Etki:** `00000000000` veya `12345` gibi geçersiz TC kayıtları kaydedilebilir.
- **Öneri:** create.php satır 142'den önce: `if (!validate_tc($body['tc_kimlik'])) json_error('Gecersiz TC')`.

**2. Plaka karakter doğrulaması yok**
Sadece uppercase + trim yapılıyor, geçersiz karakter (`@`, `-`, vb.) backend'e geçebiliyor.
- **Etki:** Aramalarda eşleşmeme, raporlarda kirli veri.
- **Öneri:** Regex `/^[0-9]{2}[A-Z]{1,3}[0-9]{2,4}$/` her iki tarafa.

**3. Negatif/aşırı değer kontrolü yok**
Komisyon `-50` veya `200` (yüzde) olabilir. Noter ücreti `-1000` olabilir.
- **Etki:** Muhasebede negatif komisyon → kasa hareketi ters yön.
- **Öneri:** `0 <= komisyon <= 100`, `noter_vekalet >= 0` validasyonu.

**4. Gelecek tarihli kaza tarihi**
Frontend ve backend `kaza_tarihi > today` kontrolü yapmıyor.
- **Etki:** "2030-01-01" tarihli kaza dosyası açılabilir.
- **Öneri:** `<input max="{today}">` + backend kontrol.

### 🟡 ORTA RİSK (mantıksal)

**5. Sorumlu ID çevirim ambiguity**
Personel ID gönderildiyse → users.id'de ara → yoksa personel tablosundan user_id çevir → **bu da yoksa giriş yapan kullanıcı varsayılan atanır**.
- **Etki:** Gerçek sorumlu örtülür; raporlar yanlış kişiyi gösterir.
- **Öneri:** Kullanıcı eşleşmesi bulunamazsa hata döndür, varsayılan atama yapma.

**6. BH araç bilgisi eksik INSERT**
BH dosyasında araç sadece `plaka + marka + model_yili` ile yazılır. Ruhsat sahip, TC, kasko, sürücü detayı **NULL kalır**.
- **Etki:** BH raporlarında araç bilgisi tam görüntülenmez.
- **Öneri:** BH için de tüm araç alanlarını INSERT'e dahil et.

**7. Paydaş primi 3 tablo tutarsızlık riski**
Paydaş primi → `masraflar` + `paydas_komisyonlari` + `komisyonlar` (3 ayrı INSERT).
- **Etki:** İkincisi başarısız olursa ilki kalır → tutarsız muhasebe verisi (ana transaction'ın commit'i bunu engellemiyor çünkü bu adım transaction içinde değil).
- **Öneri:** Tüm 3 INSERT'i ana transaction içine al.

### 🟢 KOZMETİK / İYİLEŞTİRME

**8. ADK'de zorunlu olan ma_plaka backend'de tekrar kontrol edilmiyor**
Frontend bypass edilirse araçsız ADK dosyası açılabilir.

**9. İl-ilçe çapraz doğrulaması yok**
Frontend `ILCELER` sabitine güveniyor; backend kontrolsüz.

**10. Excel import tarih hata bastırılıyor**
`excel-import.php` içinde tarih parse hatası `try/catch` ile sessiz geçiliyor; log'a yazılmıyor.

---

## D. KENDİ FİKİRLERİM (mimari öneriler)

1. **Form'u multi-step'e böl** — 93 alan tek sayfada bunaltıyor. Mağdur → Dosya → Sigorta → Araç → Atama akışı kullanıcıyı yönlendirir, validation per-step yapılabilir.
2. **Otomatik prim hesaplamasını ayrı serviste topla** — Şu an `create.php` 543 satır; prim mantığı 132 satır içinde gömülü. Ayrı `prim_hesapla()` helper'ı bakımı kolaylaştırır.
3. **Ortak/avukat e-posta zorunlu yap** — v2.1.2 bildirim sistemi ortak.email üzerinden çalışıyor. Email yoksa bildirim sessizce atlanıyor. Frontend'de ortak oluştururken email zorunlu olmalı.
4. **Dosya numarası önceden göster** — Kullanıcı kayıt etmeden önce hangi dosya numarasını alacağını görse referans için kolay olur (preview endpoint).

---

**Parça 1 tamam. Parça 2 (detay+düzenle) yazılıyor.**
