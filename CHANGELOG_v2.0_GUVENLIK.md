# MR HASAR — v2.0 GÜVENLİK & STABİLİZE PAKETİ
**Tarih:** 2026-04-28
**Hazırlayan:** Otomatik kontrollü değişiklik seti
**Altın Kural:** Mevcut canlı verisi/yapısı korunmuştur. Tüm değişiklikler **eklemeli (additive)** ve **geri dönüşümlüdür**.

---

## ÇÖZÜLEN 8 KRİTİK SORUN

### #1 — DB ŞİFRESİ VE JWT SECRET ARTIK REPO'DA AÇIK DEĞİL
**Önce:** `api/config/database.php:5,7` içinde `MrHasar2025!` düz metin + `md5(DB_PASS)` JWT secret.
**Şimdi:**
- `api/config/.env` dosyasından okunuyor (commit edilmiyor — `.gitignore`'da).
- `.env` yoksa eski sabitler hâlâ çalışır (canlı kırılmaz).
- `api/config/.env.example` örnek dosya commit ediliyor.
- `api/config/env.php` minimal env yükleyici eklendi.

**CANLIYA UYGULAMA:** cPanel → Dosya Yöneticisi → `api/config/.env.example` → kopyala → `.env` olarak yeniden adlandır → değerleri gerçek şifre/secret ile doldur. **JWT_SECRET için yeni güçlü bir değer üretin** (en az 64 karakter rastgele).

---

### #2 — PRODUCTION'DA HATA AYRINTILARI ARTIK SIZMIYOR
**Önce:** `api/v1/auth/login.php:2-3` `error_reporting(E_ALL); ini_set('display_errors', 1)` — saldırgana stack trace, dosya yolu, SQL leak.
**Şimdi:**
- Yeni `api/config/bootstrap.php` `APP_ENV=production` iken `display_errors=0` ayarlar, tüm hatalar log dosyasına yazılır.
- `helpers.php:json_error()` production'da `detail` alanını response'a koymaz, log'a yazar.
- `database.php:getDB()` PDO bağlantı hatasında detay sızdırmaz.

**ETKİLENEN DOSYALAR:** `api/config/bootstrap.php` (yeni), `api/config/database.php`, `api/config/helpers.php`, `api/v1/auth/login.php`, `api/v1/auth/me.php`.

---

### #3 — CORS ARTIK BEYAZ LİSTEDE
**Önce:** `Access-Control-Allow-Origin: *` + `Allow-Credentials: true` → CSRF saldırı yüzeyi.
**Şimdi:**
- `helpers.php:setup_headers()` `ALLOWED_ORIGINS` env değişkenindeki listeyi kontrol eder.
- Sadece izinli origin yansıtılır; aksi halde CORS başlığı hiç set edilmez.
- Ek güvenlik başlıkları: `Vary: Origin`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`.
- `.env` boşsa eski wildcard davranışı korunur (geçiş süreci için).

---

### #4 — DOSYA SİLİNCE MAĞDUR/MASRAF/EVRAK ARTIK UÇMUYOR
**Önce:** `mr_hasar_db.sql:103,164,185` `ON DELETE CASCADE` — bir dosya silindiğinde mağdur, masraf, evrak topyekün uçuyordu. Geri dönüşü yok.
**Şimdi:** ÇİFT KATMANLI KORUMA:
1. **Soft-delete:** `dosyalar.silindi`, `silinme_tarihi`, `silen_kullanici_id` kolonları eklendi. `dosya/delete.php` artık fiziksel silme yapmaz, `silindi=1` işaretler.
2. **FK koruması:** `magdurlar`, `araclar`, `masraflar`, `evraklar` FK'leri `CASCADE` → `RESTRICT` olarak değiştirildi. Yanlışlıkla DELETE yapılsa bile FK korur.
3. Yeni `dosya/restore.php` ile silinen dosya geri yüklenebilir.
4. `dosya/list.php` ve `dosya/get.php` varsayılan olarak silinen kayıtları gizler. Admin `?silinen=1` ile görebilir.

**MİGRASYON:** `migrations/2026_04_28_security_safety.sql` — phpMyAdmin'de SQL sekmesinden çalıştırılır. Sadece `ALTER ADD COLUMN` ve FK güncelleme. Veri silinmez.

---

### #5 — FORM ALANINDAN KENDİLİĞİNDEN ÇIKMA SORUNU ÇÖZÜLDÜ
**Önce:** `js/app.js:70` TopNav içinde 60 sn'de bir `setInterval` → `setBildirimSayisi()` → tüm TopNav re-render → form input focus kayboluyordu.
**Şimdi:** Bildirim sayacı `BildirimBadge` adlı `React.memo` ile sarılı izole bileşene taşındı. Polling artık sadece kendi badge'ini günceller, TopNav ve altındaki sayfalar etkilenmez. **v29-v37 fix'lerinin kök sebebi düzeltildi.**

---

### #6 — ÇIKIŞ YAP ARTIK GERÇEKTEN ÇIKARTIYOR
**Önce:** Şemada `oturumlar` tablosu tanımlı ama login.php ona yazmıyordu. Çıkış sadece istemcide token'ı siliyor, sunucu hâlâ kabul ediyordu.
**Şimdi:**
- `login.php` → `oturumlar`'a token_hash + IP yazıyor.
- Yeni `api/v1/auth/logout.php` → `gecerli=0` işaretliyor.
- `auth.php:auth_required()` her istekte `oturumlar.gecerli` kontrol ediyor. İptal edilmiş tokenlar 401 alır.
- `session_revoke_all_for_user()` yardımcısı: bir kullanıcının tüm oturumlarını uzaktan kapatma imkanı (gelecekteki "tüm cihazlardan çık" için).
- Eski (migrasyon öncesi) tokenlar geçerli sayılır — backwards compatible.

---

### #7 — REFRESH TOKEN: 24 SAAT SONRA OTOMATİK YENİLENME
**Önce:** Tek 24 saatlik JWT, dolunca zorla yeniden giriş.
**Şimdi:**
- Yeni `refresh_tokens` tablosu (migrasyonda yaratılır).
- Login response'unda artık `refresh_token` da var (30 gün geçerli, env'den ayarlanır).
- Yeni `api/v1/auth/refresh.php` → eski refresh ile yeni JWT + yeni refresh verir (token rotation).
- Frontend `MR.api.req()` 401 alınca otomatik refresh dener, başarılı olursa orijinal isteği tekrarlar.
- Aynı refresh tek kullanımlık — kullanıldığında iptal edilir (replay-resistant).

---

### #8 — JSX ARTIK TARAYICIDA DERLENMİYOR
**Önce:** `index.html:10` `babel/standalone` CDN + 17 modül `type="text/babel"` → her açılışta ~150 KB Babel + tüm JSX runtime'da derleniyor (2-3 sn yavaş başlangıç, mobilde berbat).
**Şimdi:**
- `package.json` + `build.sh` ile JSX → JS önceden derleniyor.
- Çıktı `js/dist/` altında, `index.html` artık `<script src="js/dist/...">` ile yüklüyor.
- Babel CDN script'i kaldırıldı.
- **Beklenen kazanım:** İlk açılışta ~2 sn daha hızlı, mobilde belirgin iyileşme.

**GELİŞTİRME AKIŞI:**
1. `js/` altındaki kaynak dosyaları düzenle.
2. Repo kökünde `bash build.sh` çalıştır (veya `npm run build`).
3. `js/dist/` güncellenir.
4. ZIP'le ve cPanel'e yükle.

---

## DEPLOYMENT ADIMLARI (canlı sıraya göre)

### A) Önce yedek al (zorunlu)
1. cPanel → Yedekler → "Tam Yedek" indir VEYA
2. phpMyAdmin → `mrhasard_dosyatakip` → "Dışa Aktar" → SQL indir.
3. `public_html` klasörünü FTP ile indir.

### B) Veritabanı migrasyonu
1. phpMyAdmin → `mrhasard_dosyatakip` → SQL sekmesi.
2. `migrations/2026_04_28_security_safety.sql` içeriğini yapıştır → **Git**.
3. Hata olmamalı (tüm `IF NOT EXISTS` ve `IF` blokları idempotent).

### C) `.env` dosyası
1. `api/config/.env.example` → `api/config/.env` olarak kopyala.
2. Gerçek değerleri doldur:
   - `DB_PASS` = canlı şifre (cPanel'den bildiğiniz)
   - `JWT_SECRET` = yeni 64+ karakter rastgele dize. Üretmek için cPanel SSH'da: `openssl rand -hex 64`
   - `ALLOWED_ORIGINS` = `https://mrhasardanismanlik.com,https://www.mrhasardanismanlik.com` (veya gerçek domain)
   - `APP_ENV=production`

### D) Dosyaları yükle
1. ZIP içeriğini `public_html`'a açın (`uploads/` ve `api/config/.env` HARİÇ — bunları YÜKLEMEYİN).
2. Eski `js/` raw dosyaları kalsın sorun olmaz; yeni `js/dist/` öncelikli.

### E) Doğrulama
1. Tarayıcıda admin hesapla giriş yap.
2. Geliştirici Konsolu → Network sekmesinde:
   - `/auth/login.php` response → `data.refresh_token` alanı var mı? ✓
   - Form doldururken 60 sn beklediğinde input focus KAYBOLMAMALI ✓
   - Bir dosya silmeyi dene → mağdur/masraf'ın hâlâ DB'de olduğunu phpMyAdmin'den kontrol et ✓
3. Logout butonu → tekrar giriş denenmeli (eski token artık 401 dönmeli — **DİKKAT:** logout edilen tokenı doğrudan kullanma testi yapabilirsiniz).

---

## DOKUNULMAYAN ALANLAR (ALTIN KURAL)

- ❌ `uploads/` klasörü — tek dokunulmadı.
- ❌ Mevcut kullanıcı kayıtları, dosya kayıtları, kasalar, masraflar.
- ❌ Mevcut iş akışları: dosya açma, CRM, hesaplamalar, ajanda, muhasebe, NetSantral.
- ❌ Mevcut yetki rolleri.
- ❌ Mevcut frontend tasarımı/temaları.

## DEĞİŞEN/EKLENEN DOSYALAR (özet)

**Yeni:**
- `api/config/env.php`
- `api/config/bootstrap.php`
- `api/config/.env.example`
- `api/v1/auth/logout.php`
- `api/v1/auth/refresh.php`
- `api/v1/dosya/restore.php`
- `migrations/2026_04_28_security_safety.sql`
- `js/dist/*` (önceden derlenmiş JSX)
- `package.json`, `build.sh`, `.gitignore`
- `CHANGELOG_v2.0_GUVENLIK.md`

**Güncellenen:**
- `api/config/database.php` — env ile uyumlu
- `api/config/auth.php` — oturum + refresh fonksiyonları
- `api/config/helpers.php` — CORS whitelist + güvenli json_error
- `api/v1/auth/login.php` — temizlendi, refresh token üretiyor
- `api/v1/auth/me.php` — temizlendi
- `api/v1/dosya/delete.php` — soft-delete
- `api/v1/dosya/list.php` — silindi filtresi
- `api/v1/dosya/get.php` — silindi kontrolü
- `js/config.js` — refresh token interceptor
- `js/components.js` — login refresh token saklama
- `js/app.js` — BildirimBadge izolasyonu, async logout
- `index.html` — Babel CDN kaldırıldı, dist/ yükleniyor

---

## GERİ ALMA (rollback) GEREKİRSE

1. Eski `public_html` yedeğini geri yükle.
2. DB için: migrasyon eklediği kolonları sil (opsiyonel, kalabilir):
   ```sql
   ALTER TABLE dosyalar DROP COLUMN silindi, DROP COLUMN silinme_tarihi, DROP COLUMN silen_kullanici_id;
   DROP TABLE refresh_tokens;
   ```
3. FK'leri eski CASCADE'e döndürmek isterseniz migrasyon dosyasını ters çevirip uygulayın.
