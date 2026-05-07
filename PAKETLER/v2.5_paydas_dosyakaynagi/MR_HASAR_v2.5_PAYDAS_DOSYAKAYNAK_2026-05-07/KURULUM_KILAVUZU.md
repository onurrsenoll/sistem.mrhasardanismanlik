# MR HASAR — v2.5 PAYDAŞ TÜR + DOSYA KAYNAĞI Yaması

**Tarih:** 2026-05-07
**Branch:** `claude/view-all-branches-qZ0JW`
**Kapsam:** PAYDAŞLAR menüsünün İŞ ORTAKLARI / İŞ PAYDAŞLARI / EKSPER & SİGORTA olarak yeniden düzenlenmesi + DOSYA KAYNAĞI alanının 5 yeni değer ile genişletilmesi

---

## ALTIN KURALLAR (DEĞİŞMEDİ)

- **HİÇBİR MEVCUT VERİ SİLİNMEZ.** SQL sadece kolon genişletir, eski tüm değerler korunur.
- **KASA / ÖDEME / MAHSUP / KOMİSYON / HAKEDIŞ / EKSPER & SİGORTA mantığı tamamen aynı.**
- **DB kolonları (sigorta_brans, talep_turu) korunur** — sadece UI'dan kaldırıldı. Eski dosyalar değer göstermeye devam eder.
- Eski paydaşların `tur` değerleri (sigorta_acentesi, oto_galeri, oto_kiralama, tamirci) **dokunulmaz** — kullanıcı isterse paydaş kartından tek tek günceller.

---

## YÜKLEME SIRASI

### 1) SQL Migration

```bash
mysql -u <kullanici> -p <db_adi> < SQL/01_paydas_dosyakaynagi_genisletme.sql
```

Yapılan tek değişiklik:
- `paydaslar.tur` kolonu **VARCHAR(40) NOT NULL DEFAULT 'sigorta_acentesi'** olarak ayarlanır (ENUM ise genişletilir; zaten VARCHAR ise yan etkisi yok).
- `idx_paydaslar_tur` indexi eklenir (varsa atlanır).

**Hiçbir tablo silinmez. Hiçbir veri güncellenmez.**

### 2) Yedek

`YUKLENECEK_DOSYALAR/` içindeki dosyaları yüklemeden önce mevcut sistemde aşağıdaki dosyaların yedeğini alın:

```
api/v1/paydas/list.php
js/app.js
js/pages/dosya-yeni.js
js/pages/dosya-detay.js
js/pages/ortaklar.js
```

### 3) Dosyaları Yükle

`YUKLENECEK_DOSYALAR/` klasörünün içeriğini sunucuya, ilgili konumlara kopyalayın:

| Kaynak | Hedef |
|---|---|
| `YUKLENECEK_DOSYALAR/api/v1/paydas/list.php` | `<root>/api/v1/paydas/list.php` |
| `YUKLENECEK_DOSYALAR/js/app.js` | `<root>/js/app.js` |
| `YUKLENECEK_DOSYALAR/js/pages/dosya-yeni.js` | `<root>/js/pages/dosya-yeni.js` |
| `YUKLENECEK_DOSYALAR/js/pages/dosya-detay.js` | `<root>/js/pages/dosya-detay.js` |
| `YUKLENECEK_DOSYALAR/js/pages/ortaklar.js` | `<root>/js/pages/ortaklar.js` |
| `YUKLENECEK_DOSYALAR/js/pages/is-ortaklari.js` | `<root>/js/pages/is-ortaklari.js` (YENİ) |
| `YUKLENECEK_DOSYALAR/js/pages/is-paydaslari.js` | `<root>/js/pages/is-paydaslari.js` (YENİ) |
| `YUKLENECEK_DOSYALAR/index.html` | `<root>/index.html` |

> **NOT:** `index.html` zaten `is-ortaklari.js` ve `is-paydaslari.js` script etiketleri eklenmiş halde geliyor. Manuel düzenleme YAPMAYIN — sadece dosyayı kopyalayıp üzerine yazın. Bu dosya `TUM_YENI_MODULLER_04.05.2026` paketindeki son sürüme dayanır (eksper-sigorta + mahsup-zinciri script'leri korunur).

### 4) Tarayıcı önbelleğini temizle

Hard reload (Ctrl+Shift+R / Cmd+Shift+R).

---

## YAPILAN DEĞİŞİKLİKLER

### DB
- `paydaslar.tur` kolonu artık **VARCHAR(40)**. 5 yeni değeri kabul eder: `servis`, `kaportaci`, `acente`, `pasif_temsilci`, `diger`. Eski 4 değer (sigorta_acentesi, oto_galeri, oto_kiralama, tamirci) korunur.
- `dosyalar` tablosu DOKUNULMAZ. `sigorta_brans`, `talep_turu`, `dosya_kaynagi`, `paydas_id` kolonları aynen kalır.

### Backend
- `api/v1/paydas/list.php` — `?tur=servis,kaportaci,acente` gibi virgülle ayrılmış çoklu tur filtresi destekler. Eski tek tur filtreleri çalışmaya devam eder.

### Frontend
- **`app.js`** — PAYDAŞLAR menüsü 3 alt menüye ayarlandı:
  - İŞ ORTAKLARI → `is-ortaklari` (Personel + Avukat 2 sekmeli)
  - İŞ PAYDAŞLARI → `is-paydaslari` (5 türden filtreleme)
  - EKSPER & SİGORTA → `paydaslar-eksper-sigorta` (Madde 1 paketinde tanımlı)
  - Eski `ortaklar-*` ve `personel-*` route'ları **geri uyumluluk için korundu** (eski linkler kırılmaz).

- **`dosya-yeni.js`** — DOSYA KAYNAĞI dropdown 5 değerli oldu: SERVİS / KAPORTACI / ACENTE / PASİF TEMSİLCİ / DİĞER. Seçilen değere göre PAYDAŞ dropdown'ı otomatik filtrelenir (örn: SERVİS seçilince sadece `tur='servis'` paydaşlar listelenir). SİGORTA BRANŞI ve DOSYA TALEP TÜRÜ alanları UI'dan kaldırıldı (DB kolonları kalır, eski dosyalar değer göstermeye devam eder).

- **`dosya-detay.js`** — DOSYA KAYNAĞI dropdown'ında 5 yeni değer + eski 2 değer (geri uyumluluk). Avukat görünümünde yeni 5 değer otomatik "YÖNLENDİRME" olarak gösterilir.

- **`ortaklar.js`** — `turMap`'e 4 yeni değer eklendi (`servis`, `kaportaci`, `acente`, `pasif_temsilci`). Tur dropdown'ları yeni/eski tipler olarak `<optgroup>` ile ayrıldı. Yeni paydaş eklerken default tur `servis` (eski default `sigorta_acentesi`'di). Component'ler `MR.IsOrtaklariView` / `MR.IsPaydaslariView` olarak expose edildi.

- **`is-ortaklari.js` (YENİ)** — 2 sekmeli wrapper (PERSONEL | AVUKAT). Sekmeler mevcut `MR.PersonelPage` ve `MR.IsOrtaklariView`'i render eder.

- **`is-paydaslari.js` (YENİ)** — 5 tur'lu chip-bar bilgi banner'ı + mevcut `MR.IsPaydaslariView` component. Kullanıcı tur dropdown'ından filtreleyebilir.

---

## DOĞRULAMA TESTLERİ

1. ✅ PAYDAŞLAR menüsünde 3 alt menü görünüyor mu?
2. ✅ İŞ ORTAKLARI'nda PERSONEL ve AVUKAT sekmeleri çalışıyor mu?
3. ✅ İŞ PAYDAŞLARI'nda yeni tipler (SERVİS/KAPORTACI/ACENTE/PASİF TEMSİLCİ/DİĞER) için chip-bar görünüyor mu?
4. ✅ Yeni paydaş eklerken TÜR dropdown'ında 9 değer (5 yeni + 4 eski) görünüyor mu?
5. ✅ Yeni dosya açılışında DOSYA KAYNAĞI 5 değerli mi? Seçilen değere göre PAYDAŞ dropdown filtreleniyor mu?
6. ✅ SİGORTA BRANŞI ve DOSYA TALEP TÜRÜ alanları yeni dosya formunda yok, ama eski dosya detayında varsa görünüyor mu?
7. ✅ Eski dosyalardaki paydas_id korunuyor mu?
8. ✅ EKSPER & SİGORTA menüsü Madde 1 paketi yüklüyse hâlâ çalışıyor mu?

---

## ROLLBACK

Bu yama geri alınabilir bir yamadır:

1. **Frontend rollback:** Yedeklediğiniz `app.js`, `dosya-yeni.js`, `dosya-detay.js`, `ortaklar.js` dosyalarını geri yükleyin. `is-ortaklari.js` ve `is-paydaslari.js` dosyalarını silin. `index.html`'de eklediğiniz 2 script satırını kaldırın.
2. **Backend rollback:** Yedeklediğiniz `api/v1/paydas/list.php` dosyasını geri yükleyin.
3. **DB rollback:** `paydaslar.tur` zaten VARCHAR ise hiçbir değişiklik gerekmez. ENUM'a geri çevirmek zorunda değilseniz (gerekli değil).

---

**Hazırlayan:** Claude (Onur Şenol için)
**Önceki paketler:** v2.4 (PERSONEL + PAYDAŞ), v3.0 (KAPSAMLI), MASTER v3.0.11
**Sonraki paketler:** —
