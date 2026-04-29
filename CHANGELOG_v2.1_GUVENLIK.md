# MR HASAR — v2.1 GÜVENLİK YAMASI (CANLI KODA UYUMLU)
**Tarih:** 2026-04-29
**Hazırlayan:** Otomatik kontrollü değişiklik seti
**Altın Kural:** Mevcut canlı verisi/yapısı KORUNMUŞTUR. Tüm modüller (mail, sms, saha, portal, ortak, paydaş, personel, police, ihbar-foyu, içtihat, hesap, arama-log, konum, yönlendirme, şablon, AI, mesaj) **dokunulmadan** kalır.

> v2.0 ZIP'i (`extracted/`'a göre üretilmişti) **kullanmayın** — canlının ileri özelliklerini ezerdi. **Bu v2.1 doğrudan canlı koda göre üretildi.**

---

## DEPLOY EDİLECEK ARTEFAKT

**`mr_hasar_yama_v2.1_2026-04-29.zip` — 69 KB, 18 dosya.**

Sadece **değişen / yeni** dosyaları içerir. Üzerine yazınca diğer modüller etkilenmez.

---

## ÇÖZÜLEN 7 SORUN (canlının zaten çözülmüş kısımları korunarak)

### #1 — DB ŞİFRESİ + JWT SECRET → `.env`
- **Önce:** `api/config/database.php:5,7` `MrHasar2025!` + `md5(DB_PASS)` JWT secret repoda açık.
- **Şimdi:** `api/config/.env`'den okunur (.env yoksa eski değerlere düşer — canlı kırılmaz).
- **Korunan:** `ensure_prim_columns()` otomatik migrasyonu, `MAX_FILE_SIZE=512MB`, ek dosya tipleri.

### #2 — Hata detay sızıntısı → log'a yönlendirildi
- **Önce:** `login.php` 500 hata response'unda `'detail' => $e->getMessage()` saldırgana iç bilgi sızdırıyor.
- **Şimdi:** Production'da `detail` response'a düşmüyor, log dosyasına yazılıyor (`bootstrap.php:APP_ENV`).
- **Korunan:** `display_errors=0` zaten ayarlıydı; brute force koruması (login_attempts), 2FA, netsantral, yetkiler bütünüyle aynen.

### #3 — CORS (kök helpers.php whitelist'e geçirildi)
- **Önce:** `helpers.php` (kök) `Access-Control-Allow-Origin: *` (wildcard) kullanıyor.
- **Şimdi:** Sadece `https://sistem.mrhasardanismanlik.com` izinli; ek güvenlik başlıkları (Vary, X-Content-Type-Options, X-Frame-Options, Referrer-Policy).
- **Korunan:** `api/config/helpers.php` zaten whitelist'teydi, dokunulmadı.

### #4 — Soft-delete + FK CASCADE→RESTRICT
- **Önce:** `dosya/delete.php` `SET FOREIGN_KEY_CHECKS=0` + `DELETE` — mağdur, evrak, masraf, araç hepsi uçabilirdi (canlının mevcut davranışı bu).
- **Şimdi:**
  - `dosyalar.silindi`, `silinme_tarihi`, `silen_kullanici_id` kolonları eklendi.
  - `delete.php` artık `silindi=1` işaretliyor, fiziksel silme yok.
  - Yeni `restore.php` ile geri yüklenebilir.
  - FK'ler `CASCADE → RESTRICT` (yanlış DELETE çalışsa bile koruma).
  - `dosya/list.php` ve `dosya/get.php` varsayılan olarak silinen kayıtları gizler. Admin `?silinen=1` ile görür.

### #5 — Form input focus-loss → izole component
- **Önce:** `app.js:137,138` TopNav'da `bildirimSayisi` (60sn) + `mailSayisi` (30sn) state'leri → setState her tetiklendiğinde tüm TopNav re-render → form focus kayboluyor.
- **Şimdi:** `BildirimBadge` ve `MailBadge` `React.memo` ile sarılı izole component'ler. Polling artık sadece kendi badge'lerini günceller, TopNav etkilenmez.
- **Korunan:** Sesli bildirim, browser notification, mail yetki kontrolü, son_id kontrolü, beep.

### #6 — Logout gerçekten oturumu kapatıyor (oturumlar tablosu devrede)
- **Önce:** `oturumlar` tablosu vardı ama login.php ona yazmıyor, çıkış sadece istemcide token'ı siliyor.
- **Şimdi:**
  - `login.php` → `oturumlar.token_hash` yazıyor.
  - Yeni `auth/logout.php` → `gecerli=0` işaretliyor, server-side token iptali.
  - `auth.php:auth_required()` her istekte `session_is_valid()` kontrol ediyor.
  - `session_revoke_all_for_user()` yardımcısı: gelecekteki "tüm cihazlardan çık" özelliği için.
  - Migrasyon öncesi mevcut tokenlar geçerli sayılır (backwards-compat).

### #7 — Refresh token (24 saat sonra zorla logout artık yok)
- **Önce:** Tek 24 saatlik JWT, dolunca yeniden giriş.
- **Şimdi:**
  - Yeni `refresh_tokens` tablosu (30 gün geçerli, env'den ayarlanır).
  - Login response'una `refresh_token` eklendi.
  - Yeni `auth/refresh.php` → eski refresh ile yeni JWT + yeni refresh (token rotation).
  - Frontend `api.req()` 401 alınca otomatik refresh dener, başarılı olursa orijinal isteği tekrarlar.
  - Tek kullanımlık (replay-resistant).
  - **2FA akışı bozulmaz** — refresh token sadece 2FA tamamlandıktan sonra üretilir.

### #8 — Babel CDN → ERTELENDİ
**Bu sürümde uygulanmadı.** Sebep: canlının deployment akışı `js/*.js` raw → tarayıcıda Babel ile derleme şeklinde, cache busting `MR_VERSION = 'v4.' + Date.now()` ile çalışıyor. Pre-compile geçişi 25+ modül üzerinde organizational değişiklik gerektirir, deployment otomasyonuyla (akşam konuşacağımız konu) birlikte ele alınmalı.

---

## ÇIKARTILAN DOSYALAR LİSTESİ

ZIP içeriği (kök → public_html'a açılacak yapı):

**YENİ:**
- `api/config/env.php`
- `api/config/bootstrap.php`
- `api/config/.env.example`
- `api/v1/auth/logout.php`
- `api/v1/auth/refresh.php`
- `api/v1/dosya/restore.php`
- `migrations/2026_04_29_security_safety.sql`

**GÜNCELLENMİŞ (kanlının özelliklerini koruyarak yamalandı):**
- `api/config/database.php` — env desteği eklendi, `ensure_prim_columns()` aynen.
- `api/config/auth.php` — session/refresh fonksiyonları eklendi, YETKI_MAP/yetkiler/netsantral aynen.
- `api/config/helpers.php` — `json_error` production'da detail leak fix.
- `helpers.php` (kök) — wildcard CORS → whitelist + güvenlik başlıkları.
- `api/v1/auth/login.php` — refresh token üretimi + session register; brute force/2FA/netsantral/yetkiler aynen.
- `api/v1/dosya/delete.php` — soft-delete (mevcut FK_CHECKS=0 yaklaşımı kaldırıldı, veri kaybı yok).
- `api/v1/dosya/list.php` — `d.silindi` filtresi (view'a dokunulmadan).
- `api/v1/dosya/get.php` — silindi kontrolü.
- `js/config.js` — refresh token interceptor.
- `js/components.js` — login + 2FA refresh token sakla.
- `js/app.js` — BildirimBadge + MailBadge izolasyon (focus-loss).

---

## DEPLOYMENT — adım adım

### ADIM 1: yedek (sende zaten var)
- ✓ `.well-known.zip` (985 MB, dosyalar)
- ✓ `mrhasard_dosyatakip.sql` (DB)
**İkisinin de bilgisayarında olduğundan emin ol.**

### ADIM 2: Veritabanı migrasyonu
1. cPanel → phpMyAdmin → `mrhasard_dosyatakip` → SQL sekmesi
2. ZIP'ten çıkardığın `migrations/2026_04_29_security_safety.sql` içeriğini yapıştır → Git
3. Yeşil ✅. Hata olmamalı (idempotent — tekrar çalışsa bile sorun yok).

### ADIM 3: `.env` dosyası
1. JWT secret üret: tarayıcıda https://www.random.org/passwords/?num=1&len=64&format=plain&rnd=new
2. Dosya Yöneticisi → `public_html/sistem.mrhasardanismanlik.com/api/config/`
3. Yeni dosya: `.env` (başında nokta) → düzenle, içeriği doldur:
```
DB_HOST=localhost
DB_NAME=mrhasard_dosyatakip
DB_USER=mrhasard_dtuser
DB_PASS=<canlıdaki gerçek şifre — DEĞİŞTİRME>
JWT_SECRET=<random.org'dan kopyaladığın 64 karakter>
JWT_EXPIRE=86400
JWT_REFRESH_EXPIRE=2592000
APP_ENV=production
```

### ADIM 4: Yamayı yükle
1. Bilgisayarındaki `mr_hasar_yama_v2.1_2026-04-29.zip` cPanel Dosya Yöneticisi'ne yükle (`public_html/sistem.mrhasardanismanlik.com/`)
2. ZIP'e sağ tık → "Çıkart" → "Mevcut dosyaların üzerine yaz" işaretli
3. Çıkartma bitince ZIP'i sil
4. **uploads/ klasörü, .env dosyası, evrakaları, mail-ekleri DOKUNULMADI** — ZIP onları içermiyor

### ADIM 5: Doğrulama
1. Tarayıcıda gizli sekme aç → giriş yap
2. **F12 → Network → login.php cevabında `data.refresh_token` alanı görmelisin** ✓
3. Yeni dosya açma sayfasına git → bir alanı doldurmaya başla → **60 saniye bekle → focus kaybolmamalı** ✓ (eskiden burada cursor kayboluyordu)
4. Test bir dosya silmeyi dene → phpMyAdmin'de mağdur kaydının hâlâ durduğunu kontrol et → durmalı ✓
5. Çıkış yap → eski açık sayfayı F5 et → giriş ekranına gitmeli ✓

---

## RİSKLER VE KAÇINMA

| Adım | Risk | Olasılık | Kaçınma |
|---|---|---|---|
| Migrasyon | SQL hatası | Düşük (idempotent) | Yedeğin var. |
| `.env` DB_PASS yanlış | "DB bağlantı hatası" | Orta | cPanel MySQL'den şifreyi kopyala. |
| `.env` JWT_SECRET değişti | TÜM kullanıcılar zorla logout | %100 (bir kez) | Personeli önceden uyar. |
| `.env` yoksa | Sistem çalışır (eski sabitlerle, fallback) | İstemediğin durumdaysa hızlı | `.env` dosyasını sil, eski davranış geri gelir. |
| Yamada bug | Çok düşük (lint geçti, gerçek babel derledi) | Tüm dosyalar yedekte var, geri yükle. |

---

## ROLLBACK

**Site açılmıyor:**
- `api/config/.env` dosyasını sil/yeniden adlandır → fallback'e döner.

**Daha kötü:**
- `.well-known.zip` yedeğini cPanel'e yükle → "üzerine yaz" → eski hal.

**Migration geri al (gerek yok ama):**
```sql
ALTER TABLE dosyalar DROP COLUMN silindi, DROP COLUMN silinme_tarihi, DROP COLUMN silen_kullanici_id;
DROP TABLE refresh_tokens;
-- (oturumlar tablosu zaten şemada vardı, bırakılabilir)
```

---

## DOKUNULMAYAN ALANLAR

- ❌ `uploads/` (PDF evraklar, mail ekleri, arama kayıtları, avatar, logo)
- ❌ `data/`, `netgsm-sms-module/`
- ❌ Mail modülü, SMS modülü, Saha, Portal, Ortak, Paydaş, Personel, Police, İhbar Föyü, İçtihat, Hesap, Arama Log, Konum, Yönlendirme, Şablon, AI, Mesaj — **hepsi yerinde**
- ❌ 2FA, brute force koruması, NetSantral, Netsipp, yetki matrisi — **aynen**
- ❌ `index.html`, `portal.html`, `manifest.json`, `sw.js`, `proxy.php`, `favicon.svg` — **dokunulmadı**
- ❌ Mevcut müşteri/dosya/mağdur/masraf/kasa kayıtları — **hepsi sağlam**
