# MR HASAR v2.11.2 — POLİÇE EKSİK BİLGİ KABUL

**Tarih:** 10.05.2026
**Bu paket v2.11.1'in SUPERSET'idir.** v2.11 + v2.11.1 + v2.11.2 değişikliklerinin TAMAMINI içerir.

---

## 1) PROBLEM

Kullanıcının yüklediği Excel'de 68 satır var ve hepsinde **YENİLEME TARİHİ + TELEFON kolonları boş**. Kullanıcı şu akışı istiyor:

> "BU EXCEL'I YÜKLE, SONRASINDA DÜZENLE DİYEREK EKSİK ALANLARI TAMAMLAYACAĞIM."

İki teknik engel:

1. `policeler.bitis_tarihi` (ve diğer tarih kolonları) DB schema'sında `NOT NULL` olabilir → INSERT NULL ile patlar.
2. Frontend YENİLEME LİSTESİ ekranı kayıtları `kalan_gun` değerine göre 4 gruba ayırıyor (KRİTİK / ACİL / YAKLAŞAN / İLERİ TARİH). `bitis_tarihi` NULL olunca `kalan_gun = NaN`, hiçbir gruba düşmüyor → kayıt DB'de var ama ekranda görünmüyor.

---

## 2) DÜZELTMELER

### Schema (Migration)
- `bitis_tarihi`, `baslangic_tarihi`, `tanzim_tarihi`, `dogum_tarihi` artık **`DATE NULL DEFAULT NULL`**.
- Idempotent — daha önce NULLable ise sessiz geçer.

### Frontend
- **Yeni "EKSİK BİLGİ" grubu** YENİLEME LİSTESİ'nde en üstte gösterilir (mor renk).
- Stat kartları 5'e çıktı: `EKSİK / KRİTİK / ACİL / YAKLAŞAN / TOPLAM`.
- `kalan_gun` NULL-safe: bitiş tarihi yoksa hesaplama yapılmaz, kayıt EKSİK BİLGİ grubuna alınır.
- Tablo gösteriminde:
  - Bitiş tarihi yoksa **"⚠ EKSİK"** rozeti.
  - Kalan gün yoksa **"?"** rozeti.
- `DÜZENLE` butonu zaten mevcut — kullanıcı tek tek tarihleri tamamlar, kayıt otomatik olarak doğru gruba (KRİTİK/ACİL/...) geçer.

---

## 3) PAKET İÇERİĞİ

```
MR_HASAR_v2.11.2_EKSIK_BILGI_KABUL_2026-05-10/
├── YUKLENECEK_DOSYALAR/
│   ├── api/v1/police/   (11 PHP — v2.11.1'den aynen)
│   └── js/pages/
│       └── police.js    ← v2.11.2: EKSİK BİLGİ grubu + null-safe kalan_gun
└── SQL/
    ├── 01_v211_police_fix.sql      ← v2.11
    ├── 02_v2111_marka_model.sql    ← v2.11.1
    └── 03_v2112_nullable_dates.sql ← v2.11.2 (YENİ)
```

> RUHSAT OKUYUCU + İHBAR FÖYÜ **dahil DEĞİL** — dokunulmadı.

---

## 4) KURULUM (önceki v2.11/v2.11.1 yüklenmediyse de bu pakette yeterli)

### Adım 1 — SQL Migration (3 dosya, sırayla)
```bash
mysql -u <kullanici> -p <veritabani> < SQL/01_v211_police_fix.sql
mysql -u <kullanici> -p <veritabani> < SQL/02_v2111_marka_model.sql
mysql -u <kullanici> -p <veritabani> < SQL/03_v2112_nullable_dates.sql
```

### Adım 2 — Dosya Yükleme
`YUKLENECEK_DOSYALAR/` içeriğini sunucudaki **aynı yola** üzerine yazarak kopyalayın.

### Adım 3 — Cache
- Sunucu opcache reset.
- Tarayıcı `Ctrl+F5`.

---

## 5) TEST AKIŞI

1. **POLİÇE → YENİLEME TAKİBİ → EXCEL ŞABLON İNDİR**
2. Şablonu doldur: **YENİLEME TARİHİ ve TELEFON kolonlarını boş bırak**, geri kalanları doldur (sizin örneğinizdeki gibi).
3. **EXCEL YÜKLE** → 68 satır okunur, eksik müşteri/tarih satırları turuncu sol-kenar.
4. **TOPLU KAYDET** → "68 / 68 POLİÇE BAŞARIYLA İÇE AKTARILDI".
5. Yenileme listesinde:
   - **EKSİK BİLGİ** grubu: 68 kayıt (mor)
   - KRİTİK / ACİL / YAKLAŞAN / İLERİ TARİH: 0 kayıt (henüz bitiş yok)
6. **EKSİK BİLGİ** grubunda her satırda **DÜZENLE** ikonu → modal açılır → YENİLEME TARİHİ ve TELEFON'u gir → KAYDET.
7. Kayıt otomatik olarak doğru gruba (KRİTİK/ACİL/YAKLAŞAN/İLERİ TARİH) geçer.

---

## 6) GERİ ALMA

- `js/pages/police.js`'i geri yükleyin.
- `api/v1/police/*.php` dosyalarını geri yükleyin.
- Migration'ın eklediği NULL constraint geride kalır (zarar vermez).
