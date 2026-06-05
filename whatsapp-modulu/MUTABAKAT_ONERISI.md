# 📱 MR HASAR DANIŞMANLIK — DOSYA WHATSAPP BİLDİRİM MODÜLÜ
## Mutabakat / Öneri Metni (Güncel — Odaklı Kapsam)
*Tarih: 04.06.2026 · Teknik dil yok*

---

## 1) Kapsam (net)
WhatsApp **yalnız DOSYALARA** bağlı, **olay tabanlı otomatik bildirim** modülüdür.
- **Gelen kutusu / CRM yok.** Sadece **dosya olaylarında** müşteriye otomatik WhatsApp gider.
- **Genişletilebilir:** Yeni olaylar / fonksiyonlar sonradan kolayca eklenebilir.

## 2) Ne yapar? (olaylar)
- **① Dosya açılışı:** Dosyada **Kaydet** denip dosya sisteme kaydolunca →
  müşteriye otomatik WhatsApp: *"Sayın {ad_soyad}, {dosya_no} numaralı dosyanız sistemimizde açılmıştır…"* (metin senin, düzenlenebilir).
- **② Dosya durumu değişince (opsiyonel, onayınla):** Aşama/durum değişince →
  *"Sayın {ad_soyad}, {dosya_no} dosyanızın durumu güncellendi: {yeni_durum}"*.
- **③ İleride eklenebilir:** evrak yüklendi, ödeme alındı, randevu/eksik evrak hatırlatma… (mimari buna hazır).

## 3) Dosya ile eşleşme
- Mesajın gideceği numara = dosyadaki **iletişim numarası** (telefon).
- Hitap = dosyadaki **ad-soyad**.
- Mesaj metnindeki `{ad_soyad}`, `{dosya_no}`, `{yeni_durum}` alanları **otomatik** doldurulur.

## 4) Genişletilebilir mimari (önemli)
İki yeni dosya + sistemin kendi deseni:
- **`whatsapp_helper.php`** — WhatsApp gönderme motoru (Meta Cloud API) + ayar + kayıt. *(SMS'teki `sms_helper.php` gibi.)*
- **`_dosya_whatsapp_hook.php`** — tüm dosya-WhatsApp mantığı burada; her olay bir **fonksiyon**. Yeni özellik = bu dosyaya yeni fonksiyon (create.php'ye tekrar dokunmadan).
- Olaylar **aç/kapa** edilebilir, metinler ayarlardan **düzenlenebilir**.

## 5) Sisteme nasıl bağlanır? (mevcut desenle, tek satır)
Sistem zaten `_dosya_prim_hook.php`'yi şöyle çağırıyor:
```
require_once '.../_dosya_prim_hook.php';
if (function_exists('sync_dosya_prim')) sync_dosya_prim($db, $dosyaId, 'create');
```
WhatsApp da **aynı şekilde**, `create.php` (ve opsiyonel `update.php`) sonuna **tek satır**:
```
require_once '_dosya_whatsapp_hook.php';
if (function_exists('wa_dosya_acildi')) wa_dosya_acildi($db, $dosyaId);
```
- `try/catch` korumalı → WhatsApp hata verse bile **dosya açılışı asla bozulmaz**.
- **Tek satır ekleme**, mevcut hiçbir davranış değişmez, istenirse o satır silinince eski hâline döner.

## 6) WhatsApp'ın şablon kuralı (bilinmesi gereken)
Müşteri sana **ilk yazmadıysa**, işletme tarafından başlatılan mesaj **Meta onaylı "şablon"** olmalıdır (WhatsApp kuralı). Dolayısıyla "dosya açıldı" mesajı bir **onaylı şablon** olarak gönderilir; metni birlikte hazırlarız, sen onaylatırsın, sistem `{ad_soyad}`/`{dosya_no}` alanlarını doldurup gönderir.

## 7) Kesinlikle dokunulmayacaklar
🚫 **Netsantral · CRM menüsü · Arama · SMS · mevcut dosya akışının davranışı.** Yalnız 1 satır eklenir; gerisi yeni dosyalardır.

## 🔟 Toplu / Manuel Gönderim Ekranı (tek ekranda)
Modül içinde, **tek ekrandan**:
- **Numara listesi:** Numaraları **kopyala-yapıştır** ile topluca gir (alt alta veya virgüllü).
- **Mesaj:** Hazır **şablon** seç + alanları doldur **veya** serbest metin yaz.
- **Medya:** Görsel / PDF / video **ekle**.
- **GÖNDER:** Her numara için **sonuç** (gitti / hata) + otomatik **kayıt (log)**.

### ⚠️ WhatsApp toplu gönderim kuralı (önemli — SMS'ten farklı)
- Sana **son 24 saatte yazmamış** kişilere **serbest metin/medya gönderilemez** → **Meta onaylı şablon** gerekir (şablon başlığına medya, gövdesine değişken metin konabilir).
- **Hacim & kalite:** Çok sayıda izinsiz/"soğuk" numaraya gönderim, işletme numaranın **kalite puanını düşürür ve engellenmeye** yol açabilir; günlük limitler vardır (kademeli artar).
- **En güvenlisi:** Kendi **izinli müşterilerine, onaylı şablonla** göndermek. Modül uygun olmayan gönderimde **uyarır**.

## 8) Aşamalar
- **Aşama 1:** WhatsApp motoru + ayar ekranı + **dosya açılışında otomatik mesaj** + kayıt (log). *(Çekirdek.)*
- **Aşama 2:** **Toplu / Manuel Gönderim ekranı** (tek ekran — madde 10): numara yapıştır + şablon/metin + medya + gönder + sonuç.
- **Aşama 3:** **Durum değişiminde** otomatik mesaj (opsiyonel, onayınla).
- **Aşama 4:** Metin/şablon yönetimi, olay aç-kapa, yeni olaylar (evrak/ödeme/hatırlatma).
- **Aşama 5:** Raporlama (kaç mesaj gitti, iletildi/okundu).

## 9) Senden gerekenler / Mutabakat
- İşletme WhatsApp bağlantı bilgileri (var).
- **1 onaylı şablon** ("dosya açıldı" metni — birlikte hazırlarız).
- Onay → **Aşama 1**'i kurarım; ayrı modül, tek satır ekleme, mevcut sistem korunur.

---
*Genişletilebilir: tüm fonksiyonlar `_dosya_whatsapp_hook.php` + `whatsapp_helper.php` içinde büyür; sistemin geri kalanına dokunulmaz.*
