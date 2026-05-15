# MR HASAR v2.13 — DOSYA DETAY DÜZENLE: TÜM ALANLAR

**Tarih:** 10.05.2026
**Tek dosya:** `js/pages/dosya-detay.js`
**Dokunulmayan:** Backend, diğer modüller, ihbar-foyu, qr-ruhsat, police, dosya-yeni.

---

## 1) NE DÜZELTİLDİ

DOSYA DETAY → DÜZENLE modal'ında **eksik kalan 22+ alan** istisnasız düzenlenebilir hale getirildi. Backend `update.php` zaten 30 dosya + 14 mağdur + 13 araç alanını whitelist'te tutuyor — sadece frontend modal'da gözükmüyordu. Şimdi tümü gözüküyor ve KAYDET basıldığında güncelleniyor.

### Eklenen Yeni Bölümler

| Bölüm | Yeni Alanlar |
|---|---|
| **DOSYA BİLGİLERİ** | KAZA İLÇE (cascade dropdown — KAZA İLİ değişince otomatik yenilenir) |
| **DOSYA SORUMLUSU** | Personel seçilince **anlık ADK PRİM / BH PRİM kartı** (dosya türüne göre aktif olan vurgulanır) |
| **SİGORTA & EKSPER & SERVİS** (yeni bölüm) | POLİÇE NO, SİGORTA BRANŞI (15 seçenek), SİGORTA TÜRÜ, DOSYA TALEP TÜRÜ, SORUMLU SİGORTA ŞİRKETİ, **EKSPER FİRMA** (paydaşlardan tur=eksper), **ONARIM SERVİSİ** (paydaşlardan tur=servis/kaportaci) |
| **MAĞDUR BİLGİLERİ** | E-POSTA, ADRES, CİNSİYET |
| **MAĞDUR (BH)** (yeni bölüm) | GELİR DURUMU, GELİR TUTARI, SAKATLIK / YARALANMA AÇIKLAMASI |
| **SÜRÜCÜ & KUSUR (BH)** (yeni bölüm) | SÜRÜCÜ ADI SOYADI, EHLİYET NO, KUSUR ORANI |
| **MAĞDUR ARAÇ** | PLAKA, MARKA, MODEL/PAKET, MODEL YILI, KASKO |
| **KARŞI ARAÇ** | PLAKA |

### Otomatik Davranışlar

1. **İl/İlçe cascade** — Kaza İli ve Mağdur İli değiştirilince ilçe seçenekleri otomatik yenilenir (dosya-yeni'deki ile aynı `MR.ILCELER` kaynağı).
2. **Eksper firma seçimi hatasız** — Paydaşlar tablosunda `tur='eksper'` olanlar dropdown'a düşer; listede yoksa manuel input alanı açılır.
3. **Onarım servisi** — `tur='servis'` veya `'kaportaci'` paydaşlar; manuel girişe de izin verir.
4. **Dosya Sorumlusu prim göstergesi:**
   - Personel seçildiğinde personelin `prim_adk` ve `prim_bh` değerleri kart olarak görünür.
   - Dosya türü ADK ise ADK kartı, BH ise BH kartı vurgulanır.
   - Personel kartında prim tanımlı değilse "Prim tanımı yok" yazısı düşer.

### "DOSYA SORUMLUSUNA OTOMATİK PRİM YANSIMASI" — Kontrol

> **Backend zaten bağlı:** `personel/hakedis-hesapla.php`:56-66 her ay sonu hakediş hesabında `dosyalar.sorumlu_id` üzerinden seçilen personele atanan ADK ve BH dosya sayılarını sayar. `prim_adk` ve `prim_bh` çarpanları otomatik uygulanır. Yeni kod gerekmedi.
>
> **Frontend artık görünür kıldı:** Sorumlu seçince personelin prim değerleri ve dosya türüne göre aktif prim kart olarak gösteriliyor — kullanıcı doğru personeli atadığını anlık görüyor.

---

## 2) KAPSAM TEYİDİ — NEYE DOKUNULMADI

- ✅ Backend `api/v1/dosya/update.php` — DOKUNULMADI (zaten tüm alanlar whitelist'te)
- ✅ DB schema — DOKUNULMADI (gereksiz ALTER yok)
- ✅ Diğer pages: `dosya-yeni.js`, `dosya-liste.js`, `police.js`, `ihbar-foyu.js`, `qr-ruhsat.js`, `muhasebe.js`, vb.
- ✅ Mağdur/araç entegrasyonu, mevcut dosya akış mantığı, kapanış modülü, masraf/evrak sekmeleri
- ✅ Yetki sistemi
- ✅ İl/İlçe cascade kaynağı (`MR.ILLER`, `MR.ILCELER`)

---

## 3) PAKET İÇERİĞİ

```
MR_HASAR_v2.13_DOSYA_DETAY_TUM_ALANLAR_2026-05-10/
└── YUKLENECEK_DOSYALAR/
    └── js/pages/
        └── dosya-detay.js   ← TEK DOSYA, mevcut canli + v2.13 eklemeleri
```

---

## 4) KURULUM

1. `dosya-detay.js` dosyasını sunucudaki **aynı yola** üzerine yazarak kopyalayın.
2. Tarayıcıda `Ctrl+F5`.

> SQL migration **GEREKMİYOR** — backend update.php zaten gerekli ALTER'ları idempotent çalıştırıyor (line 21-46).

---

## 5) TEST AKIŞI

1. **DOSYA İŞLEMLERİ → DOSYA LİSTESİ → herhangi bir dosyayı aç → DÜZENLE.**
2. Modal'ın **780px** genişlikte açıldığını gör.
3. Aşağıdaki sıraya göre tüm bölümlerin görünür olduğunu doğrula:
   - DOSYA BİLGİLERİ (artık KAZA İLÇE cascade ile)
   - AVUKAT ATAMASI
   - DOSYA SORUMLUSU & PAYDAS
   - **(YENİ)** Sorumlu seçince ADK/BH prim kartı belirir
   - **(YENİ)** SİGORTA & EKSPER & SERVİS — Eksper Firma dropdown'unda "tur=eksper" paydaşlar listelenir
   - MAĞDUR BİLGİLERİ (artık E-POSTA, CİNSİYET dahil)
   - **(YENİ)** ADRES tek satır
   - **(YENİ — sadece BH)** Gelir & Sakatlık bölümü
   - **(YENİ — sadece BH)** SÜRÜCÜ & KUSUR
   - MAĞDUR ARAÇ (artık PLAKA, MARKA, MODEL, MODEL YILI, KASKO dahil)
   - KARŞI ARAÇ (artık PLAKA dahil)
   - NOTLAR
4. Tüm alanları değiştir → DEĞİŞİKLİKLERİ KAYDET.
5. Modal kapanır, dosya yeniden yüklenir, BİLGİ sekmesinde yeni değerler görünür.
6. Tekrar DÜZENLE'ye bas → form yeni değerlerle dolu gelmeli.

### DOSYA SORUMLUSU Prim Kartı Testi
- Personel seçince yeşil kart aşağı düşer.
- ADK dosyada ADK PRİM kartı opaque (1.0), BH PRİM kartı yarı saydam (0.6).
- BH dosyaya geçince kartlar tersine değişir.

---

## 6) GERİ ALMA

Önceki `dosya-detay.js` dosyasını geri yükleyin. Backend dokunulmadığı için ek işlem yok.
