# MR HASAR v2.14 — DOSYA DETAY DÜZENLE & DOSYA YENİ — ALAN TEMİZLİĞİ

**Tarih:** 15.05.2026
**İki dosya:** `js/pages/dosya-detay.js` + `js/pages/dosya-yeni.js`

---

## 1) GÜNCELLEME HATASI HAKKINDA (kullanıcı sorusu)

Ekrandaki hata:
```
SQLSTATE[23000] FOREIGN KEY (`sorumlu_id`) REFERENCES `users` (`id`)
```

**Bu hata bu paketle çözülmedi** — sadece UI temizliği yapıldı. Hata bilgisi:
- Eski/yeni dosya farkı YOK.
- DOSYA SORUMLUSU dropdown'unda seçilen kullanıcının `user_id`'si `users` tablosunda mevcut değil → INSERT/UPDATE patlar.
- Çözüm için backend `update.php`'ye güvenlik kontrolü eklemek gerekir (geçersiz `sorumlu_id` geldiğinde NULL'a düşür). Talep ettiğinizde ayrı pakette yaparım.

---

## 2) KALDIRILAN ALANLAR

### DOSYA DETAY DÜZENLE (dosya-detay.js)

**Dosya Bilgileri (Sigorta & Eksper & Servis bölümü):**
- ❌ POLİÇE NO
- ❌ SİGORTA BRANŞI
- ❌ SİGORTA TÜRÜ
- ❌ DOSYA TALEP TÜRÜ

**Karşı Araç:**
- ❌ POLİÇE NO

**Mağdur Bilgileri:**
- ❌ TELEFON 2
- ❌ İL
- ❌ İLÇE
- ❌ CİNSİYET
- ❌ MESLEK
- ❌ E-POSTA

### DOSYA YENİ (dosya-yeni.js) — Tutarlılık için aynı kaldırmalar

- ❌ MAĞDUR İL / İLÇE (validation zorunluluğu da kaldırıldı)
- ❌ MAĞDUR MESLEK (BH için olan)
- ❌ BH POLİÇE NO
- ❌ KARŞI ARAÇ POLICE NO

### DOSYA YENİ'ye EKLENEN (eksikti)

- ✅ **GELİR TUTARI (TL)** — BH için, dosya-detay düzenle ile aynı (form.gelir_tutari)

---

## 3) VAR/YOK BUTONLARI KOMPAKTLAMA

| Önceki | Sonrası |
|---|---|
| padding 6px 16px, fontSize 11, gap 8 + paddingTop 4 | padding 4px 12px, fontSize 10, gap 6 |

Etki edilen 5 toggle çifti (10 buton):
- HAK MAHRUMİYET (Dosya)
- MAĞDUR ARAÇ KASKO
- MAĞDUR ARAÇ GEÇMİŞ HASAR
- KARŞI ARAÇ KASKO
- KARŞI ARAÇ RUHSAT SAHİBİ/SÜRÜCÜ

Artık 2 sütun grid'inde yan yana daha temiz duruyor, gereksiz dikey alan kaplamıyor.

---

## 4) DOKUNULMAYAN

- Backend `update.php`, `create.php`, schema — DOKUNULMADI
- Diğer modüller: `police.js`, `ihbar-foyu.js`, `qr-ruhsat.js`, `muhasebe.js`, vb.
- Mevcut dosya akış mantığı, kapanış modülü, masraf/evrak sekmeleri
- YAPI: Form layout, grid kolonları, section başlıkları — değişmedi

---

## 5) PAKET İÇERİĞİ

```
MR_HASAR_v2.14_DOSYA_DETAY_TEMIZLIK_2026-05-15/
└── YUKLENECEK_DOSYALAR/
    └── js/pages/
        ├── dosya-detay.js   ← v2.14 (kaldırma + kompakt VAR/YOK)
        └── dosya-yeni.js    ← v2.14 (kaldırma + GELİR TUTARI eklendi)
```

---

## 6) KURULUM

İki dosyayı sunucudaki **aynı yola** üzerine yazarak kopyalayın:
- `js/pages/dosya-detay.js`
- `js/pages/dosya-yeni.js`

Tarayıcıda `Ctrl+F5`.

> SQL/Backend değişikliği YOK.

---

## 7) TEST

### DOSYA YENİ
1. DOSYA İŞLEMLERİ → YENİ DOSYA → ADK seçili.
2. MAĞDUR BİLGİLERİ bölümünde İL/İLÇE alanlarının **olmadığını** doğrula.
3. BH seçince GELİR TUTARI alanının göründüğünü doğrula.
4. Sigorta bilgilerinde BH POLİÇE NO'nun olmadığını gör.
5. KARŞI ARAÇ bölümünde POLİÇE NO'nun olmadığını gör.

### DOSYA DETAY DÜZENLE
1. Listeden bir dosyayı aç → DÜZENLE.
2. SİGORTA & EKSPER & SERVİS bölümünde sadece **SORUMLU SİGORTA, EKSPER FİRMA, ONARIM SERVİSİ** kalmalı.
3. MAĞDUR BİLGİLERİ'nde sadece AD SOYAD, TC, TELEFON, IBAN, DOĞUM TARİHİ + ADRES (alt satır).
4. KARŞI ARAÇ'ta POLİÇE NO yok.
5. VAR/YOK butonlarının daha kompakt duracağını gör.

---

## 8) GERİ ALMA

Önceki `dosya-detay.js` ve `dosya-yeni.js` dosyalarınızı geri yükleyin.
