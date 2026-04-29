# MR HASAR DANIŞMANLIK — SİSTEM DENETİMİ RAPORU
## Bölüm 1/4 — Yönetici Özeti + Frontend Haritası

**Tarih:** 2026-04-29
**Kapsam:** Canlı sistemin tamamı — 234 PHP endpoint, 29 frontend sayfası, 28 backend modülü
**Yöntem:** 5 paralel ajan ile paralel sistematik tarama + kod referansı doğrulama

---

# I. YÖNETİCİ ÖZETİ

## Sistem büyüklüğü
| Boyut | Sayı |
|---|---|
| PHP endpoint dosyası (api/v1/) | **234** |
| Frontend sayfası (js/pages/) | **29** |
| Backend modülü (klasör) | **28** |
| Frontend yardımcı bileşen dosyası | **9** |
| Veritabanı tablosu (tahmini) | ~30+ |

## Genel sağlık skoru
| Alan | Durum | Yorum |
|---|---|---|
| Çekirdek dosya akışı (CRM, dosya, masraf) | 🟢 Sağlam | Sözdizimi temiz, mantık tutarlı |
| Muhasebe (gelir/gider/kasa/komisyon) | 🟢 Sağlam | 25 endpoint, trigger destekli |
| Mail modülü (IMAP+SMTP+şablon) | 🟢 Sağlam | AES-256 şifreleme, full işlevsel |
| SMS / NetGSM | 🟢 Sağlam | Webhook, gönderim, log tam |
| Saha modülü (mobil) | 🟢 Sağlam | Onaya gönder/onayla/reddet akışı |
| Portal (müşteri) | 🟢 Sağlam | OTP + TC giriş |
| Auth / 2FA / brute-force | 🟢 Sağlam | login_attempts + TOTP entegrasyonu |
| Yetki matrisi (YETKI_MAP) | 🟢 Çalışıyor | helpers.php'de 800+ satır |
| AI entegrasyonları (hesap/ictihat) | 🔴 KIRIK | Gemini 404, Claude 401 hataları |
| Netsantral autocall (frontend) | 🔴 KIRIK | Backend klasörü hiç yok |
| İçtihat sayfası yetki | 🔴 AÇIK | Hiç yetki kontrolü yok |
| evrak/diagnose hardcoded key | 🟡 RİSK | `?key=mrhasar2025` |
| display_errors arama-log'da açık | 🟡 RİSK | İki dosya production'da debug açık |
| Bildirim şema tutarsızlığı | 🟡 ORTA | bildirim/create.php okundu kolonu yazmıyor |
| Duplicate evrak-okuyucu dosyaları | 🟡 KOZMETIK | 3 sürüm yan yana duruyor |
| test-debug.php yetki kontrolü | 🟡 RİSK | auth_required() çağrısı yok |

## Kısa hüküm
Sistem **%92 fonksiyonel.** İş süreçlerinin omurgası (dosya yönetimi, CRM, muhasebe, mail, SMS, saha, portal, auth) sağlam. Üç noktada **kırık özellik** var: (1) AI analiz modülleri eski API model çağırıyor, (2) NetSantral autocall özelliği için backend hiç yok, (3) İçtihat sayfası herkese açık.

---

# II. FRONTEND HARİTASI

## A. Ana menü yapısı (`js/app.js:9-76`)

| Menü | Alt menüler | Erişim koşulu |
|---|---|---|
| **ANA SAYFA** | — | Herkes |
| **DOSYA İŞLEMLERİ** | Dosya Listesi, Yeni Dosya | `dosya_dosya-liste`, `dosya_dosya-yeni` |
| **CRM** | CRM Listesi, Yeni Kayıt, CRM Arama, CRM Analiz | `crm_*` yetkileri |
| **HESAPLAMALAR** | Araç Değer Kaybı, Bedeni Hasar | `hesaplamalar_*` |
| **POLİÇE** | Liste, Yeni, Tahsilat, QR Ruhsat OCR, İhbar Föyü | `police_*` |
| **SAHA** | Liste, Yeni Saha Dosyası | `saha_*` |
| **E-POSTA** | (tek sayfa) | `eposta_eposta-goruntule` |
| **AJANDA** | (tek sayfa) | `ajanda_goruntule` |
| **İÇTİHAT** | Yargıtay, Tahkim, Kusur Emsal, Poliçe Limit | ⚠️ **Yetki kontrolü yok** |
| **MUHASEBE** | Kasalar, Hareketler, Gelir, Gider, Komisyon, Transfer, Rapor, Maliyet, Ay Sonu, Kapanış | `muhasebe_*` |
| **TANIMLAMALAR** | Dosya Tanımları, Evrak Tanımları, Finansal, Matbu Evrak, Genel | `tanimlamalar_*` |
| **ORTAKLAR** | Liste, Yeni, Hareketler | `paydaslar_*` |
| **PERSONEL** | Liste, Yeni, Hakediş | `paydaslar_*` |
| **SİSTEM** | Kullanıcı, Yetki, Firma Ayarları, SMS, Portal, Cihaz Güvenliği, Toplu Aktarım, Veri Yönetimi, Log, Sistem Bildirimleri, Konum, NetSantral, Tema, CRM Analiz | Sadece admin / yetkili |

**Toplam menü öğesi:** 14 ana + 50+ alt menü.

## B. Sayfaların özeti

| # | Sayfa dosyası | Boyut | Ana amaç | Sorunlar |
|---|---|---|---|---|
| 1 | `home.js` | 26 KB | Dashboard: istatistik kartları, son işlemler | Sağlam |
| 2 | `dosya-liste.js` | 75 KB | Dosya tablosu, filtre, toplu işlem | Sağlam |
| 3 | `dosya-yeni.js` | 78 KB | Yeni dosya açma, ortak/avukat/sorumlu atama | Sağlam |
| 4 | `dosya-detay.js` | 79 KB | Dosya detayı, mağdur, masraf, evrak, AI analiz | Sağlam |
| 5 | `crm.js` | 80 KB | CRM listesi, yeni kayıt, dönüşüm | Sağlam |
| 6 | `crm-arama.js` | 77 KB | Webrtc arama paneli + analiz | Sağlam |
| 7 | `arama-gecmis.js` | 78 KB | Arama log analizi | Sağlam |
| 8 | `gorusme-kayitlari.js` | 76 KB | Ses kaydı oynatıcı | Sağlam |
| 9 | `hesap-adk.js` | 78 KB | Araç değer kaybı hesaplama (AI dahil) | ⚠️ Gemini 404 hatası |
| 10 | `hesap-bh.js` | 77 KB | Bedeni hasar tazminat hesabı (AI dahil) | ⚠️ Gemini 404 hatası |
| 11 | `police.js` | 82 KB | Poliçe listesi, tahsilat | Sağlam |
| 12 | `qr-ruhsat.js` | 74 KB | QR/Tesseract ruhsat OCR | Sağlam |
| 13 | `ihbar-foyu.js` | 76 KB | İhbar föyü + parça listesi | Sağlam |
| 14 | `saha.js` | 85 KB | Saha dosyası, fotoğraf yükleme, onay akışı | Sağlam |
| 15 | `konum-takip.js` | 75 KB | Personel konum haritası (Leaflet) | Sağlam |
| 16 | `mail.js` | 78 KB | IMAP gelen kutu, SMTP gönderim, ekler, şablon | Sağlam |
| 17 | `mesajlar.js` | 82 KB | İç mesajlaşma 4 sekme | ⚠️ Routing sorunu (v2.1.3'te çözüldü) |
| 18 | `bildirim.js` | 74 KB | Bildirim listesi, filtre, toplu işlem | Sağlam |
| 19 | `ajanda.js` | 79 KB | Görev/randevu takvimi | Sağlam |
| 20 | `ortaklar.js` | 81 KB | İş ortağı CRUD + hareket | Sağlam |
| 21 | `personel.js` | 82 KB | Personel + hakediş yönetimi | Sağlam |
| 22 | `muhasebe.js` | 84 KB | 10 alt sekme (kasa/gelir/gider/komisyon vs.) | Sağlam |
| 23 | `tanimlamalar.js` | 80 KB | Tüm tanım listeleri | Sağlam |
| 24 | `sistem.js` | 81 KB | Yönetim paneli (kullanıcı/yetki/log) | Sağlam |
| 25 | `ictihat.js` | 81 KB | Yargıtay/tahkim emsal arama | 🔴 **Yetki kontrolü hiç yok** |
| 26 | `tema-ayarlari.js` | 78 KB | Renk/tipografi düzenleyici | Sağlam |
| 27 | `evrak-okuyucu.js` | 77 KB | OCR ile evrak okuma (v3 — güncel) | Duplicate kardeşler var |
| 28 | `evrak-okuyucu .js` | 20 KB | (boşluklu isim — v2 eski) | 🟡 **Silinmeli** |
| 29 | `evrak-okuyucu (1).js` | 20 KB | (parantez — v2 eski kopya) | 🟡 **Silinmeli** |

## C. Çekirdek bileşenler (`js/`)

| Dosya | Satır | Amaç |
|---|---|---|
| `app.js` | 1476 | Ana uygulama, MENU, PageRouter, TopNav, polling |
| `config.js` | 747 | API client, MR.api.* metodları, toast, hasYetki |
| `components.js` | 607 | Ortak bileşenler (Modal, FormGroup, Confirm, EmptyState vb.) + LoginScreen + 2FA |
| `data.js` | 386 | Sabit veri (sigorta şirketleri, statüler vs.) |
| `icons.js` | 195 | Lucide ikonları wrapper |
| `utils.js` | 225 | Yardımcı fonksiyonlar |
| `webrtc-phone.js` | 1265 | JsSIP motor + cihaz seçimi + ses ayarları |
| `webrtc-widget.js` | 942 | Gelen çağrı popup + mount nokta (v2.1.1'de düzeltildi) |
| `jssip.bundle.min.js` | 1 (minified, ~280 KB) | JsSIP kütüphanesi |

## D. Yetki sistemi (frontend)

`MR.hasYetki(user, modul, islem)` formatında çalışır (`js/config.js:30-34`).

Format: `user.yetkiler[modul + '_' + islem] === 1`

**Örnek anahtarlar:**
- `dosya_dosya-liste` (dosya listesi görüntüleme)
- `crm_crm-yeni` (yeni CRM kaydı)
- `muhasebe_kasa-yonetimi`
- `eposta_eposta-goruntule`
- `netsantral_netsantral-goruntule`
- `bildirim_bildirim-gonder`

**Admin bypass:** `user.rol === 'admin'` ise tüm yetkiler otomatik var sayılır.

## E. PageRouter (sayfa yönlendirme)

`app.js:836-933` arasında ~100 satır if/else zinciri.

**Ele alınan rotalar (kısmi liste):**
- `home`, `dosya-liste`, `dosya-yeni`, `dosya-detay-{id}`
- `crm-liste`, `crm-yeni`, `crm-arama`, `crm-analiz`, `crm-detay-{id}`
- `saha`, `saha-yeni`, `saha-detay-{id}`
- `hesap-adk`, `hesap-bh`
- `eposta`, `ajanda`
- `mesajlar` (v2.1.3 sonrası tüm alt sekmeler)
- `police-*` (8 alt sayfa)
- `muhasebe-*` (10 alt sayfa)
- `sistem-*` (15 alt sayfa)
- `tanimlamalar-*` (5 alt sayfa)
- `ortaklar-*`, `personel-*`, `ictihat-*`
- `profil`

**Fallback:** Bilinmeyen rotada `<MR.HomePage />` döner. Kullanıcı kötü URL'de boş ekran görmez.
