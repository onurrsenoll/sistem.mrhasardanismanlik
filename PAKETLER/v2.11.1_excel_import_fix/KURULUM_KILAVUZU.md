# MR HASAR v2.11.1 — POLİÇE EXCEL IMPORT FIX

**Tarih:** 10.05.2026
**Kapsam:** POLİÇE → YENİLEME TAKİBİ → Excel şablonu + import işlemi.
**Bu paket v2.11'in SUPERSET'idir** — v2.11 değişikliklerinin tamamını içerir, v2.11'i ayrıca uygulamanıza gerek yok.

---

## 1) TESPİT EDİLEN PROBLEM

Kullanıcı 66 kayıtlık Excel yükledi, **sadece 2 kayıt göründü**, 64 kayıt sessizce kayboldu. Üç kök sebep birden:

1. **Backend `excel-import.php`** boş `musteri_adi` veya boş `sigorta_sirketi` satırları reddediyordu → 64 satır silinen.
2. **Frontend `topluKaydet`** backend yanıtını okumadan "X başarıyla eklendi" yazıyordu → kullanıcı yanılgıya düşüyordu.
3. **Frontend tarih parser'ı** dar — bazı Excel tarih formatları `Invalid Date`'e dönüşüp INSERT'i patlatıyordu.

---

## 2) UYGULANAN DÜZELTMELER

### Yeni Excel Şablonu (10 kolon)
| # | Kolon |
|---|---|
| 1 | YENİLEME TARİHİ |
| 2 | TELEFON |
| 3 | MÜŞTERİ ADI SOYADI |
| 4 | DOĞUM TARİHİ |
| 5 | VERGİ NO / T.C. NO |
| 6 | PLAKA |
| 7 | BELGE SERİ NO |
| 8 | ŞASE NUMARASI |
| 9 | MARKA |
| 10 | MODEL YILI |

> Eski şablondaki `POLİÇE TÜRÜ` ve `AÇIKLAMA` kolonları **kaldırıldı**, `MARKA` ve `MODEL YILI` **eklendi**, `TELEFON` 8. sıradan 2. sıraya alındı.

### Backend Lenient Validation
- Eksik **MÜŞTERİ ADI** → `BELİRSİZ` placeholder, kayıt yine yazılır.
- Eksik **SİGORTA ŞİRKETİ** → `BELİRSİZ` placeholder.
- Eksik **POLİÇE NO** → otomatik `IMP-mikrotime-rand` üretilir.
- Eksik **BRANŞ** → `TRAFİK` (varsayılan).
- Eksik / hatalı **TARİH** → NULL (kayıt yine geçer).
- Tekrar eden **POLİÇE NO** → otomatik suffix eklenir, kaybolmaz.

### Frontend Honest Reporting
- TOPLU KAYDET sonrası backend'in **gerçek** `basarili` / `hatali` sayıları gösterilir.
- Hata olan satırların **ilk 10 tanesinin listesi alert ile** kullanıcıya sunulur.
- Önizleme tablosunda eksik müşteri/tarih satırları **turuncu sol-kenar** ile işaretlenir.

### Sağlam Tarih Parser
- Frontend (`parseExcelDate`): ISO, DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY, Excel serial, JS Date objesi.
- Backend (`v211_parse_date`): Aynı formatlar PHP tarafında.
- Bilinmeyen format → boş string / NULL (eskisi gibi insert'i patlatmıyor).

### Çakışma-güvenli Poliçe No üretimi
- Frontend: `IMP-{8 hane timestamp}-{3 hane index}-{4 hane random}`
- Backend: çakışma tespit ederse otomatik suffix ekler.

### Yenileme Tablosunda Yeni Kolonlar
- `MARKA` ve `MODEL YILI` artık tablo + edit modal'da görünüyor.

---

## 3) v2.11'DEN GELEN DİĞER POLİÇE DÜZELTMELERİ

Bu paket v2.11'in **tüm** düzeltmelerini de içerir:

- **delete.php / bulk-delete.php**: Poliçe silindiğinde tahsilatların kasaya etkisi atomik geri alınır (#017 mali tutarsızlık).
- **create.php / update.php**: `belge_seri`, `dogum_tarihi`, `sase_no`, `personel`, `marka`, `model_yili` artık doğru kaydedilir.
- **hatirlatma-kontrol.php**: Alıcılar yetki matrisinden seçilir, sabit rol kısıtı yok.
- **Tüm endpoint'ler**: `auth_required([rol,...])` → `auth_required()` yumuşatıldı.
- **tahsilat-list.php**: `islem_yapan_id` → `olusturan_id` kolon adı düzeltildi + kasa join.
- **PoliceYeni**: Bitiş tarihi useEffect kullanıcı manuel girdisini ezmiyor.
- **PoliceTahsilat**: Ölü `kullanicilar` state ve `mForm.devir_bakiye` initial state hatası giderildi.
- **PoliceKazanc**: Ölü `donem` state kaldırıldı.

---

## 4) PAKET İÇERİĞİ

```
MR_HASAR_v2.11.1_EXCEL_IMPORT_FIX_2026-05-10/
├── YUKLENECEK_DOSYALAR/
│   ├── api/v1/police/
│   │   ├── excel-import.php   ← v2.11.1: lenient + marka/model_yili
│   │   ├── create.php         ← v2.11.1: marka/model_yili eklendi
│   │   ├── update.php         ← v2.11.1: marka/model_yili eklendi
│   │   ├── delete.php         ← v2.11: kasa rollback
│   │   ├── bulk-delete.php    ← v2.11: kasa rollback
│   │   ├── hatirlatma-kontrol.php ← v2.11
│   │   ├── tahsilat-ekle.php  ← v2.11
│   │   ├── tahsilat-list.php  ← v2.11
│   │   ├── list.php           ← v2.11
│   │   ├── get.php            ← v2.11
│   │   └── rapor.php          ← v2.11
│   └── js/pages/
│       └── police.js          ← v2.11.1: yeni şablon + bulletproof import
└── SQL/
    ├── 01_v211_police_fix.sql      ← v2.11
    └── 02_v2111_marka_model.sql    ← v2.11.1
```

> RUHSAT OKUYUCU (`qr-ruhsat.js`) ve İHBAR FÖYÜ (`ihbar-foyu.js`) **dahil DEĞİL** — dokunulmadı.

---

## 5) KURULUM

### Adım 1 — SQL Migration
```bash
mysql -u <kullanici> -p <veritabani> < SQL/01_v211_police_fix.sql
mysql -u <kullanici> -p <veritabani> < SQL/02_v2111_marka_model.sql
```
Her iki dosya **idempotent**'tir — defalarca çalıştırılabilir.

### Adım 2 — Dosya Yükleme
`YUKLENECEK_DOSYALAR/` içeriğini sunucudaki **aynı yola** üzerine yazarak kopyalayın.

### Adım 3 — Cache
- Sunucu opcache reset.
- Tarayıcı `Ctrl+F5`.

---

## 6) TEST

1. **POLİÇE → YENİLEME TAKİBİ → EXCEL ŞABLON İNDİR**
   - İndirilen şablonun başlık satırında 10 kolon olduğunu doğrula:
     `YENİLEME TARİHİ | TELEFON | MÜŞTERİ ADI SOYADI | DOĞUM TARİHİ | VERGİ NO / T.C. NO | PLAKA | BELGE SERİ NO | ŞASE NUMARASI | MARKA | MODEL YILI`

2. **66 satırlık Excel'i yükle**
   - Bazı satırlarda MÜŞTERİ ADI eksik olsun.
   - ÖNİZLEME tablosunda eksik satırlar turuncu sol-kenar ile işaretli.
   - "X SATIR OKUNDU. Y satırda MÜŞTERİ ADI eksik (BELİRSİZ olarak kaydedilecek)." mesajını gör.

3. **TOPLU KAYDET**
   - Backend yanıtı: tüm 66 satır kaydolur.
   - Mesaj: `66 / 66 POLİÇE BAŞARIYLA İÇE AKTARILDI`.
   - Yenileme tablosu 66 kayıt gösterir.
   - Eksik müşteri olanlar `BELİRSİZ` ile listelenir.

4. **DÜZENLE → BELİRSİZ kaydı düzelt** → `KAYDET`.
   - DB'de değişiklik kalıcı olur.

---

## 7) GERİ ALMA

- Önceki `js/pages/police.js` dosyasını geri yükleyin.
- Önceki `api/v1/police/*.php` dosyalarını geri yükleyin.
- Migration kolonları DB'de kalır (DROP gerek yok).
