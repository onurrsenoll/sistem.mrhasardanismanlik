# MR HASAR — v2.9 BİLDİRİM + MENÜ + PRINT Yaması

**Tarih:** 2026-05-08
**Branch:** `claude/view-all-branches-qZ0JW`
**Kapsam:** Bildirimler ana menüye, dosya açılışı otomatik bildirim altyapısı, yazdır/PDF CSS güçlendirmesi

---

## YAPILAN

### ✅ Faz 1 — Bildirimler ana menüye taşındı
- `mesajlar-sistem` SİSTEM altından çıkarıldı
- Ana menüde **"BİLDİRİMLER"** (icon: Bell) E-POSTA'nın hemen yanına eklendi
- Tıklanınca **MesajlarPage** açılır (gelen/giden/yeni/sistem 4 sekme zaten var)
- BildirimBadge artık BİLDİRİMLER item'ında gösteriliyor (sayı: okunmamış mesaj+bildirim toplamı)
- `MENU_MODUL`'a `mesajlar: 'mesajlar'` eklendi (yetki sistemi için)

### ✅ Faz 2 — Dosya açılışında avukat/ortağa otomatik bildirim
**ZATEN ÇALIŞAN MEKANİZMA** doğrulandı:
- `api/v1/dosya/create.php` (v2.7'de düzeltilmiş hali) avukat/ortak/sorumluya `bildirim_olustur()` çağırıyor
- Dosya açıldığında atanan kişilere "TARAFINIZA YENİ DOSYA ATANDI" bildirimi gider
- Try-catch ile sarılı (bildirim hatası ana akışı kesmez)

**Pakete dahil:** `api/config/helpers.php` (v2.1.2 sürümü, `bildirim_olustur` ve `bildirim_alici_gecerli` helper'larını içerir)

> **NOT:** helpers.php zaten sunucuda yüklüyse üzerine yazsa da işlevsellik aynı. Eğer eski sürüm yüklüyse yeni sürüm bildirim helper'larını da getirir.

### ✅ Bildirim "okundu" davranışı
mesajlar.js'te zaten var (line 326+ `bildirimOkunduIsaretle`). Bildirim listesinde tıklayınca otomatik okundu işaretleniyor + `BildirimBadge` sayısı güncelleniyor (60 sn aralıkla refresh).

### ✅ Faz 3 — Yazdır/PDF CSS güçlendirmesi
`index.html` `@media print` CSS'i kapsamlı yenilendi:
- Üst gezinti, sidebar, footer, dropdown, button'lar **print modunda gizli**
- Webrtc widget, mail badge gizli
- Sayfa kesimi class'ları (`.page-break`, `.page-break-after`, `.avoid-break`) eklendi
- Tablo/satır parçalanma engeli (`page-break-inside: avoid`)
- A4, 1.2 cm margin
- Tüm shadow/text-shadow temizlendi (yazıcıda netlik)
- `-webkit-print-color-adjust: exact` (renkleri koru)

> **Uygulama yöntemi:** `Ctrl+P` veya yazdır butonu. Föy/rapor sayfalarında temiz yazdırma. **Tarayıcının yerleşik PDF olarak kaydet** seçeneğiyle de PDF üretilir.

### ✅ Faz 4 — Mesajlar sekme/kart yapısı
**ZATEN VAR.** mesajlar.js `MR.MesajlarPage` 4 sekmeli yapı (GELEN / GİDEN / YENİ / SİSTEM). subPage routing ile aynı sayfada geçiş. Değişiklik gerekmedi.

### ⏸️ Faz 5 — AY SONU PDF "boş geliyor" — ERTELENMİŞ
Mevcut `yazdir()` fonksiyonu DOM'dan `aysonu-rapor-icerik` elemanını alıp `window.open` ile basıyor. "Boş gelme" sebebi muhtemelen **runtime'da data yüklenmemiş** veya **React render zamanlaması** — statik analizle çözülmez. Sebep tespit edilemediği için **kafadan müdahale yüksek risk**.

**Senin yapman:** Sayfaya gir, F12 → konsol → "AY SONU RAPORU" sekmesi → bir dönem seç → bekle → "YAZDIR" tıkla → konsol screenshot'ı paylaş. **Veriyi gördüğümde anında düzeltme paketi atarım.**

---

## DOSYA LİSTESİ (3 dosya)

| Dosya | Açıklama |
|---|---|
| `js/app.js` | Faz 1 — Bildirim menü taşıma |
| `index.html` | Faz 3 — Print CSS güçlendirme |
| `api/config/helpers.php` | Faz 2 destek — bildirim helper'ları (v2.1.2 sürümü) |

---

## YÜKLEME

| Kaynak | Hedef |
|---|---|
| `YUKLENECEK_DOSYALAR/js/app.js` | `<root>/js/app.js` |
| `YUKLENECEK_DOSYALAR/index.html` | `<root>/index.html` |
| `YUKLENECEK_DOSYALAR/api/config/helpers.php` | `<root>/api/config/helpers.php` |

**Hard reload** (Ctrl+Shift+R).

> **helpers.php yedekle önce.** Eğer mevcut sunucuda farklı/özel düzenlemeler varsa, yedekten geri yüklenebilir.

SQL gerekmiyor.

---

## STATİK TEST ✅
- 1/1 PHP dosyası `php -l` geçti
- 1/1 JSX dosyası `@babel/parser` geçti

---

## DAVRANIŞ — yükleme sonrası

1. Üst gezinti çubuğunda **E-POSTA** ile **HESAPLAMALAR** arasına **"BİLDİRİMLER"** menü item'ı eklendi (Bell ikonu)
2. Okunmamış mesaj/bildirim varsa kırmızı sayı badge'i gözükür
3. SİSTEM > ALT MENÜ'den "SİSTEM BİLDİRİMLERİ" KALDIRILDI (artık BİLDİRİMLER üst menüde, SİSTEM sekme olarak içeride)
4. Avukatına/iş ortağına dosya atadığında otomatik bildirim gider — onlar BİLDİRİMLER menüsünden görür
5. Bildirim tıklandığında otomatik OKUNDU işaretlenir
6. Yazdır butonuna basınca tarayıcı print'i — sadece içerik basılır (gezinti/butonlar gizli)

---

## ROLLBACK
Yedeklediğin 3 dosyayı geri yükle.

---

**Hazırlayan:** Claude (Onur Şenol için)
