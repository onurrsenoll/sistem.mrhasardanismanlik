# 📦 MR HASAR — MASTER v3.0.11
**Tarih:** 04 Mayıs 2026
**Amaç:** Çalışmaya başladığımızdan beri **çalıştığı doğrulanan** + **kayıp olabilecek özelliklerin temiz orijinalleri** tek paket.

---

## 🟢 KESIN_YUKLE/ → Bunları MUTLAKA yükle (3 dosya)

Bu 3 dosya kanıtlanmış çalışıyor (RESCUE testi geçti) veya basit bug fix:

```
KESIN_YUKLE/js/app.js                         →  public_html/js/app.js
KESIN_YUKLE/js/pages/muhasebe.js              →  public_html/js/pages/muhasebe.js
KESIN_YUKLE/api/v1/muhasebe/ay-sonu-rapor.php →  public_html/api/v1/muhasebe/ay-sonu-rapor.php
```

| Dosya | Boyut | Kaynak | Yapan |
|---|---|---|---|
| app.js | 67 KB | v2.1.2-3-CORS_BIRLESIK (3 May) | E-POSTA + 9 muhasebe alt menü + yeni çağrı widget geri |
| muhasebe.js | 212 KB | v2.1 GÜVENLİK (29 Nis) | AY SONU/KAPANIŞ/ORTAK KASA component'leri |
| ay-sonu-rapor.php | 13 KB | v2.1 + benim silindi fix | Silinen dosyalar artık AY SONU RAPORU'nda görünmez |

---

## 🟡 EGER_OZELLIK_KAYBI_VARSA_YUKLE/ → Şüphe varsa yükle (5 dosya)

Önceki v3.0.x güncellemelerimde Şubat 2026 (api.zip) sürümünden modifiye etmiştim. Eğer kullanıcı bunları yüklediyse aşağıdaki dosyaları orijinaline döndürmek için kullanın.

**ÖNCE TEST ET — yüklemeden önce:**
- Yeni dosya açma sayfası tüm alanları gösteriyor mu? (eksper paydaş, gelir tipi, kasko alanları)
- Detay sayfası tüm bilgileri gösteriyor mu?
- Düzenle butonu sorunsuz çalışıyor mu?

**Eğer her şey normal görünüyorsa bu klasörü YÜKLEME.**
**Eğer eksik özellikler varsa şu dosyaları yükle:**

```
EGER_OZELLIK_KAYBI_VARSA_YUKLE/api/v1/dosya/create.php  →  public_html/api/v1/dosya/create.php
EGER_OZELLIK_KAYBI_VARSA_YUKLE/api/v1/dosya/update.php  →  public_html/api/v1/dosya/update.php
EGER_OZELLIK_KAYBI_VARSA_YUKLE/api/v1/dosya/get.php     →  public_html/api/v1/dosya/get.php
EGER_OZELLIK_KAYBI_VARSA_YUKLE/js/pages/dosya-yeni.js   →  public_html/js/pages/dosya-yeni.js
EGER_OZELLIK_KAYBI_VARSA_YUKLE/js/pages/dosya-detay.js  →  public_html/js/pages/dosya-detay.js
```

| Dosya | Boyut | Kaynak | Tarih |
|---|---|---|---|
| create.php | 33 KB | v2.4 PERSONEL | 4 May 01:09 |
| update.php | 15 KB | v2.1 GÜVENLİK | 29 Nis |
| get.php | 6 KB | v2.1 GÜVENLİK | 29 Nis |
| dosya-yeni.js | 35 KB | v2.1 GÜVENLİK | 29 Nis |
| dosya-detay.js | 110 KB | v2.1 GÜVENLİK | 29 Nis |

> **NOT:** Bu dosyaları yüklerseniz, v3.0 ile getirdiğimiz **eksper paydaş seçimi**, **gelir durumu radio**, **Madde 5.4 kapanış modal'ı**, **kasko şirket/poliçe alanları** geçici olarak kaybolur. Ancak temiz orijinaller olduğu için **özellik kaybı olmaz** — v2.1+v2.4'ün sahip olduğu tüm özellikler geri gelir.

---

## ❌ ARTIK YÜKLEMEYECEKLER (önceki paketlerimden)

Şu paketlerin içindeki **app.js, muhasebe.js, dosya-yeni.js, dosya-detay.js, create.php, update.php, get.php** dosyalarını **YÜKLEME**:

- ❌ v3.0_kapsamli (Şubat baz)
- ❌ v3.0.1_hotfix
- ❌ v3.0.2_hotfix
- ❌ v3.0.5_hotfix
- ❌ v3.0.6_hotfix
- ❌ v3.0.7_hotfix
- ❌ v3.0.8_hotfix

Bunlar canlı sistemini ezerdi.

---

## 🚀 YÜKLEME SIRASI (cPanel File Manager)

```
1. KESIN_YUKLE/js/app.js                         →  public_html/js/app.js                         (üzerine yaz)
2. KESIN_YUKLE/js/pages/muhasebe.js              →  public_html/js/pages/muhasebe.js              (üzerine yaz)
3. KESIN_YUKLE/api/v1/muhasebe/ay-sonu-rapor.php →  public_html/api/v1/muhasebe/ay-sonu-rapor.php (üzerine yaz)
4. Tarayıcıda Ctrl + F5
```

5-7. (Opsiyonel — eğer eksik özellikler hâlâ görünüyorsa):
```
5. EGER_OZELLIK_KAYBI_VARSA_YUKLE/api/v1/dosya/create.php →  public_html/api/v1/dosya/create.php
6. EGER_OZELLIK_KAYBI_VARSA_YUKLE/api/v1/dosya/update.php →  public_html/api/v1/dosya/update.php
7. EGER_OZELLIK_KAYBI_VARSA_YUKLE/api/v1/dosya/get.php    →  public_html/api/v1/dosya/get.php
8. EGER_OZELLIK_KAYBI_VARSA_YUKLE/js/pages/dosya-yeni.js  →  public_html/js/pages/dosya-yeni.js
9. EGER_OZELLIK_KAYBI_VARSA_YUKLE/js/pages/dosya-detay.js →  public_html/js/pages/dosya-detay.js
10. Tarayıcıda Ctrl + F5
```

---

## ✅ DOĞRULAMA (yükleme sonrası)

Tüm bu dosyaları yükledikten sonra şu test akışını yap:

1. **MUHASEBE menüsünde 9 alt menü** (GELİR/GİDER/KOMİSYON/KASA/ORTAK KASA/MALİYET/FİNANSAL/KAPANIŞ/AY SONU)
2. **AY SONU RAPORU** açılınca silinmiş dosyalar görünmemeli
3. **E-POSTA menüsü** dropdown'da
4. **Yeni dosya aç** sayfası tüm alanları gösteriyor (sigorta, araç, kasko, mağdur)
5. **Dosya detay** sayfası girdiğin tüm bilgileri gösteriyor
6. **Düzenle butonu** açılıyor, kaydet sonrası bilgiler korunuyor

Bir sorun olursa söyle — ona göre düzeltirim. v3.0 yeni özelliklerini (eksper paydaş, gelir tipi, kasko şirket, Madde 5.4) bundan SONRA, **temiz v2.1 baz alarak** yeniden eklerim.
