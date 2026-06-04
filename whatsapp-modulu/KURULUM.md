# 📱 MR HASAR — WHATSAPP MODÜLÜ (Kurulum Kılavuzu)

**Bağımsız modül.** Netsantral / CRM / Arama / SMS / mevcut dosya akışına dokunmaz.
İşletme-başlatımlı tüm mesajlar **Meta onaylı şablonla** gönderilir (WhatsApp kuralı → ban-güvenli).

---

## A) Dosyaları sunucuya kopyala (yerlerine)
| Depodaki dosya | Sunucuda yeri |
|---|---|
| `api/config/whatsapp_helper.php` | `api/config/whatsapp_helper.php` |
| `api/v1/dosya/_dosya_whatsapp_hook.php` | `api/v1/dosya/_dosya_whatsapp_hook.php` |
| `api/v1/whatsapp/test.php` | `api/v1/whatsapp/test.php` |
| `api/v1/whatsapp/toplu-gonder.php` | `api/v1/whatsapp/toplu-gonder.php` |
| `api/v1/whatsapp/log-list.php` | `api/v1/whatsapp/log-list.php` |
| `panel/whatsapp.js` | `js/pages/whatsapp.js` |

> `whatsapp_loglari` tablosu **kendiliğinden** oluşur (manuel SQL yok).

## B) `index.html`'e 1 satır (panel için)
`js/app.js` satırının **hemen ÜSTÜNE**:
```html
<script type="text/babel" data-type="module" src="js/pages/whatsapp.js"></script>
```
→ Girişten sonra sağ-altta **yeşil WhatsApp butonu** çıkar (kamera butonunun üstünde).

## C) Dosya açılışında otomatik mesaj — `dosya/create.php`'ye 1 satır kanca
`api/v1/dosya/create.php` içinde, mevcut **prim hook** bloğunun (`_dosya_prim_hook.php`) **hemen altına** ekle:
```php
/* WHATSAPP — dosya açılış bildirimi (bağımsız, try/catch korumalı) */
try {
    require_once __DIR__ . '/_dosya_whatsapp_hook.php';
    if (function_exists('wa_dosya_acildi')) wa_dosya_acildi($db, (int)$dosyaId, $user['id'] ?? null);
} catch (\Throwable $e) { error_log('[wa create hook] ' . $e->getMessage()); }
```
- **Tek satırlık ekleme mantığı**, mevcut prim hook ile aynı. WhatsApp hata verse bile **dosya açılışı bozulmaz**.
- İstemezsen bu bloğu silmen yeter — eski hâle döner.
- *(Durum değişiminde mesaj için ileride `update.php`'ye `wa_dosya_durum_degisti($db,$dosyaId,$yeniDurum)` eklenir — Aşama 3.)*

## D) Bağlantı bilgilerini gir (panelden)
Sağ-alt **WhatsApp → AYARLAR**:
- **Access Token · Phone Number ID · WABA ID · API sürümü** (Netgsm/Meta panelinden aldıkların)
- **MODÜL AKTİF** anahtarını aç
- **DOSYA AÇILIŞI: AÇIK** + **Onaylı şablon adı** + **dil (tr)**
- KAYDET

## E) Onaylı şablon oluştur (Meta/Netgsm) — ŞART
Meta Business / Netgsm panelinde bir **mesaj şablonu** oluştur ve onaylat:
- **Ad:** `dosya_acilis` · **Kategori:** Utility · **Dil:** Türkçe
- **Gövde:** `Sayın {{1}}, {{2}} numaralı dosyanız MR Hasar Danışmanlık'ta açılmıştır. Süreç boyunca tarafınıza bilgi verilecektir.`
- `{{1}}` = ad-soyad, `{{2}}` = dosya no (sistem otomatik doldurur).
- Onaylanınca şablon adını (`dosya_acilis`) AYARLAR'a yaz.

## F) Test
- **AYARLAR → kaydet**, sonra `api/v1/whatsapp/test.php`'ye kendi numaranla şablon testi (ileride panele test butonu da eklenir).
- Bir **deneme dosyası** aç → telefon alanına kendi numaranı yaz → Kaydet → WhatsApp mesajı gelmeli.

## G) Toplu / Manuel gönderim (tek ekran)
**WhatsApp → TOPLU GÖNDERİM:** numaraları yapıştır → tip (şablon/metin) → şablon adı/parametre veya metin → GÖNDER. Sonuçlar + kayıt görünür.
> ⚠️ 24 saat dışındaki kişilere **yalnız onaylı şablon**. Çok sayıda izinsiz numara → numaran engellenebilir. Kendi izinli müşterilerine gönder.

## Güvenlik
- Access Token koda yazılmaz; **sunucudaki ayarlar tablosunda** durur (sen girersin).
- Tüm gönderimler **`whatsapp_loglari`** tablosuna işlenir.
- Mevcut modüller (Netsantral/CRM/Arama/SMS) **değişmez**.

---
*Genişletilebilir: yeni olaylar `_dosya_whatsapp_hook.php`'ye, yeni gönderim türleri `whatsapp_helper.php`'ye eklenir; ana sisteme dokunulmaz.*
