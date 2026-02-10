# MR HASAR DANIŞMANLIK - KURULUM REHBERİ
## cPanel Adım Adım Kurulum

---

## ADIM 1: VERİTABANI OLUŞTURMA

### 1.1 — Yeni Veritabanı Oluştur
1. cPanel ana sayfaya git
2. **"MySQL® Veritabanı Sihirbazı"** veya **"MySQL® Databases"** tıkla
3. **Yeni Veritabanı Adı** kısmına yaz: `dosyatakip`
   - cPanel otomatik olarak başına ekler → `mrhasard_dosyatakip`
4. **"Veritabanı Oluştur"** tıkla

### 1.2 — Veritabanı Kullanıcısı Oluştur
1. Aynı sayfada **"MySQL Kullanıcıları"** bölümüne git
2. **Kullanıcı adı**: `dtuser`
   - Tam adı olacak: `mrhasard_dtuser`
3. **Şifre**: Güçlü bir şifre gir (Şifre Oluşturucu kullan)
   - ⚠️ BU ŞİFREYİ BİR YERE NOT ET! API'de kullanacağız
4. **"Kullanıcı Oluştur"** tıkla

### 1.3 — Kullanıcıyı Veritabanına Ata
1. **"Veritabanına Kullanıcı Ekle"** bölümüne git
2. Kullanıcı: `mrhasard_dtuser`
3. Veritabanı: `mrhasard_dosyatakip`
4. **"Ekle"** tıkla
5. Yetki ekranında **"TÜM AYRICALIKLAR"** (ALL PRIVILEGES) işaretle
6. **"Değişiklik Yap"** tıkla

### 1.4 — SQL Dosyasını Çalıştır
1. cPanel'de **phpMyAdmin** aç
2. Sol menüden **`mrhasard_dosyatakip`** veritabanını tıkla
3. Üstteki menüden **"SQL"** sekmesini tıkla
4. Sana verdiğim `mr_hasar_db.sql` dosyasının içeriğini yapıştır
5. **"Git"** (veya "Çalıştır") butonuna bas
6. Yeşil ✅ başarılı mesajı gelecek

### 1.5 — Kontrol Et
phpMyAdmin'de sol menüde şu tablolar görünmeli:
```
✅ users (5 kayıt)
✅ dosyalar
✅ magdurlar
✅ araclar
✅ kasalar (4 kayıt)
✅ masraflar
✅ evraklar
✅ kasa_hareketleri
✅ crm
✅ crm_notlari
✅ hesaplamalar
✅ tanimlamalar (~70 kayıt)
✅ bildirimler
✅ ajanda
✅ log_kayitlari
✅ oturumlar
```

---

## ADIM 2: KARAKTER SETİ DÜZELTMESİ

⚠️ Senin sunucuda karakter seti `latin1` görünüyor. Türkçe için düzeltme:

1. phpMyAdmin'de `mrhasard_dosyatakip` veritabanını seç
2. **"İşlemler"** sekmesine git
3. **"Karşılaştırma"** (Collation) kısmını bul
4. **`utf8mb4_turkish_ci`** seç
5. **"Git"** tıkla

---

## ADIM 3: DOSYALARI YÜKLEME

### 3.1 — Dosya Yöneticisi ile
1. cPanel → **"Dosya Yöneticisi"** aç
2. **`public_html`** klasörüne git
3. Sana vereceğim dosyaları buraya yükle:

```
public_html/
├── index.html          ← React build
├── assets/             ← JS/CSS dosyaları
├── .htaccess           ← Routing ayarları
├── api/                ← PHP Backend (klasör oluştur)
│   ├── config/
│   │   └── database.php
│   │   └── auth.php
│   │   └── helpers.php
│   ├── v1/
│   │   ├── auth/
│   │   ├── dosya/
│   │   ├── masraf/
│   │   ├── evrak/
│   │   ├── crm/
│   │   └── ...
│   └── .htaccess
└── uploads/            ← Evrak klasörü (oluştur)
    └── .htaccess
```

### 3.2 — Klasör Oluşturma
`public_html` içinde şu klasörleri oluştur:
- `api`
- `api/config`
- `api/v1`
- `api/v1/auth`
- `api/v1/dosya`
- `api/v1/masraf`
- `api/v1/evrak`
- `api/v1/crm`
- `api/v1/muhasebe`
- `api/v1/tanim`
- `api/v1/sistem`
- `uploads`

---

## ADIM 4: SSL SERTİFİKASI (HTTPS)

1. cPanel → **"SSL/TLS"** veya **"Let's Encrypt"** bul
2. Domain'in için **ücretsiz SSL** kur
3. **"Force HTTPS Redirect"** aktif et
   - Bu sayede http:// otomatik https:// olur

---

## ADIM 5: PHP AYARLARI

1. cPanel → **"MultiPHP INI Editor"** veya **"PHP Ayarları"**
2. Şu değerleri kontrol et / ayarla:
   - `upload_max_filesize` = **20M** (en az)
   - `post_max_size` = **25M**
   - `max_execution_time` = **120**
   - `memory_limit` = **256M**

---

## ÖNEMLİ BİLGİLER

| Bilgi | Değer |
|-------|-------|
| Veritabanı Adı | `mrhasard_dosyatakip` |
| Veritabanı Kullanıcı | `mrhasard_dtuser` |
| Veritabanı Şifre | (senin belirlediğin) |
| Veritabanı Host | `localhost` |
| PHP Versiyonu | 8.4.17 ✅ |
| MariaDB | 10.6.25 ✅ |

---

## SORUN GİDERME

**"Access Denied" hatası alırsan:**
- Kullanıcı-veritabanı eşleşmesini kontrol et
- Şifreyi tekrar gir

**Türkçe karakterler bozuk görünürse:**
- Veritabanı karşılaştırmasını utf8mb4_turkish_ci yap
- Tüm tablolarda aynı karşılaştırmayı seç

**Dosya yükleme çalışmıyorsa:**
- uploads/ klasör izinlerini 755 yap
- PHP upload limitini kontrol et

**Sayfa 404 veriyorsa:**
- .htaccess dosyasının yüklendiğinden emin ol
- cPanel'de "mod_rewrite" aktif mi kontrol et
# sistem.mrhasardanismanlik
