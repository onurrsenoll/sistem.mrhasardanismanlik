# MR HASAR — SİSTEM DENETİMİ — BÖLÜM 3
## Veritabanı + Yetki Matrisi + İş Akışları + Endpoint Listesi

> Bölüm 1 (frontend) ve Bölüm 2 (backend modülleri + kırık özellikler) ayrı dosyalarda.
> Bu bölüm: sistemin **iç anatomisi** — DB tablo haritası, yetki matrisi tam dökümü, ana iş akışları.

---

# I. VERİTABANI ŞEMASI (TABLOLAR)

## A. Çekirdek tablolar (kullanıcı/dosya/CRM)

| Tablo | İçerik | Önemli ilişkiler |
|---|---|---|
| `users` | Tüm kullanıcı hesapları (admin, avukat, uzman, personel, muhasebe, portal) | tüm tabloların `created_by` / `gonderen_id` / `kullanici_id` referansı |
| `dosyalar` | Hasar dosyaları (ADK / BH) — ana iş kaydı | `magdurlar`, `araclar`, `evraklar`, `masraflar`, `crm_notlari` çocuğu |
| `magdurlar` | Dosya başına tek mağdur | `dosya_id` FK → dosyalar |
| `araclar` | Dosya başına 1+ araç (mağdur, karşı taraf) | `dosya_id` FK |
| `evraklar` | Yüklenmiş PDF/JPG dosyalar | `dosya_id` FK + `kullanici_id` |
| `masraflar` | Eksper ücreti, servis vb. dosya masrafları | `dosya_id`, `kasa_id`, `kullanici_id` FK |
| `crm` | Potansiyel müşteri (henüz dosya açılmamış) | `donusen_dosya_id` → dosyalar (dönüşüm sonrası) |
| `crm_notlari` | CRM kayıtlarına eklenen notlar | `crm_id` FK |
| `crm_ekleri` | CRM dosya ekleri | `crm_id` FK |
| `tanimlamalar` | Sigorta şirketi, dosya türü, evrak türü, sözleşme şablonu vs. | — |

## B. Muhasebe tabloları

| Tablo | İçerik |
|---|---|
| `kasalar` | Banka, kasa, ortak kasa hesapları |
| `kasa_hareketleri` | Tüm para hareketleri (gelir, gider, transfer, masraf ödemesi) |
| `gelirler` | Gelir kayıtları (fatura, tahsilat) — trigger ile kasa_hareketleri'ne yansır |
| `paydas_komisyonlari` | Ortak/avukat komisyonu kayıtları |
| `personel` | Personel ana kaydı (users tablosuyla bağlı) |
| `personel_hakedis` | Personel prim/hakedişleri |

## C. Otomatik tetikli (notification) tablolar

| Tablo | İçerik |
|---|---|
| `bildirimler` | Sistem-içi bildirim — alici_id, baslik, icerik, tip, ilgili_dosya_id |
| `mesajlar` (yeni şema) | Kullanıcılar arası iç mesajlaşma |
| `ajanda` | Görev / randevu — kullanici_id, dosya_id, hatirlatma_gonderildi flag'i |
| `oturumlar` | Aktif oturumlar (logout blacklist için — v2.1 ile aktif kullanılacak) |

## D. İletişim tabloları

| Tablo | İçerik |
|---|---|
| `arama_loglari` | WebRTC çağrı kayıtları + analiz |
| `mail_hesaplar` | IMAP/SMTP hesabı (şifre AES-256-CBC) |
| `mail_mesajlar` | İndirilmiş mail kopyaları |
| `mail_sablonlari` | Tetikli mail şablonları (dosya_acildi, police_yenileme) |
| `sms_loglari` | Gönderilen SMS kayıtları |
| `gelen_smsler` | NetGSM webhook'tan gelen SMS'ler |

## E. Saha + Portal + İhbar Föyü tabloları

| Tablo | İçerik |
|---|---|
| `saha_dosyalar` | Mobilden açılan hasar tespit kayıtları |
| `saha_dosya_medya` | Saha fotoğrafları + ses kayıtları |
| `portal_erisim` | Müşteri portal erişim tanımları |
| `portal_otp` | Portal SMS doğrulama kodları |
| `portal_mesajlar` | Müşteri ile mesajlaşma |
| `portal_loglar` | Portal erişim kayıtları |
| `hasar_ihbar` | İhbar föyü ana kaydı |
| `hasar_ihbar_parcalar` | İhbar föyüne bağlı parça listesi |

## F. Sistem tabloları

| Tablo | İçerik |
|---|---|
| `yetkiler` | Kullanıcı bazlı yetki kayıtları (`kullanici_id`, `modul`, `islem`, `izin`) |
| `ayarlar` | Firma ayarları (firma_adi, logo, tema vs.) |
| `log_kayitlari` | Audit log (tüm önemli işlemler) |
| `login_attempts` | Brute-force koruma — başarısız giriş kayıtları |
| `konum_kayitlari` | Personel GPS konum geçmişi |
| `mr_ucretlendirme_tarife` | Hizmet ücretlendirme tarifesi |
| `dosya_surecler` | Dosya aşama geçmişi (audit) |

**Toplam tahmini tablo:** ~30 ana tablo + otomatik migrasyon ile gelen yardımcı tablolar.

---

# II. YETKİ MATRİSİ (KULLANIM KILAVUZU)

## A. Yetki anahtarı formatı

`user.yetkiler["{modul}_{islem}"] === 1` → kullanıcının yetkisi var.

`config/helpers.php` içindeki **`YETKI_MAP`** dizisi 234 endpoint'i bu anahtarlara eşler. Her endpoint çağrıldığında `auth_required()` otomatik kontrol eder.

## B. Modül → yetki anahtarları (KULLANICI YÖNETİMİNDE GÖSTERİLECEK)

### 📁 dosya — Hasar dosyası yönetimi
| Yetki anahtarı | Açıklama |
|---|---|
| `dosya_dosya-liste` | Dosya listesi görüntüle |
| `dosya_dosya-detay` | Dosya detayı görüntüle |
| `dosya_dosya-yeni` | Yeni dosya oluştur (Excel import dahil) |
| `dosya_dosya-duzenle` | Dosya bilgisini düzenle |
| `dosya_dosya-sil` | Dosya sil |
| `dosya_dosya-toplu-sil` | Toplu dosya sil |
| `dosya_dosya-masraf-ekle` | Dosyaya masraf ekle |
| `dosya_dosya-masraf-duzenle` | Masraf düzenle |
| `dosya_dosya-masraf-ode` | Masraf öde (kasa düşür) |
| `dosya_dosya-masraf-sil` | Masraf sil |

### 👥 crm — Müşteri ilişkileri
| Yetki | Açıklama |
|---|---|
| `crm_crm-arama` | CRM listesi/detay görüntüleme |
| `crm_crm-yeni` | Yeni CRM kaydı + dönüşüm |
| `crm_crm-duzenle` | CRM düzenleme + not ekleme + dosya yükleme |
| `crm_crm-sil` | Tek CRM sil |
| `crm_crm-toplu-sil` | Toplu CRM sil |
| `crm_saha-liste` | Saha kayıtlarını görüntüle |
| `crm_saha-yeni` | Yeni saha dosyası |
| `crm_saha-duzenle` | Saha düzenleme + medya yükleme |
| `crm_saha-sil` | Saha kaydı/medya sil |
| `crm_saha-onay` | Saha kaydını onay akışına gönder + onayla + dosyaya dönüştür |
| `crm_saha-red` | Saha kaydını reddet |

### 💰 muhasebe — Mali işlemler
| Yetki | Açıklama |
|---|---|
| `muhasebe_muhasebe-kasa` | Kasa görüntüle/oluştur/güncelle |
| `muhasebe_muhasebe-kasa-sil` | Kasa sil |
| `muhasebe_muhasebe-gelir` | Gelir listesi |
| `muhasebe_muhasebe-gelir-ekle` | Gelir kaydı oluştur |
| `muhasebe_muhasebe-gider` | Gider listesi |
| `muhasebe_muhasebe-gider-ekle` | Gider kaydı oluştur |
| `muhasebe_muhasebe-hareket-duzenle` | Kasa hareketi düzenle |
| `muhasebe_muhasebe-hareket-sil` | Kasa hareketi sil |
| `muhasebe_muhasebe-transfer` | Kasalar arası transfer |
| `muhasebe_muhasebe-rapor` | Genel finansal rapor |
| `muhasebe_muhasebe-aysonu` | Ay sonu raporu |
| `muhasebe_muhasebe-kapanis` | Kapanış raporu |
| `muhasebe_muhasebe-maliyet` | Maliyet analiz raporu |
| `muhasebe_muhasebe-komisyon` | Komisyon listesi/oluşturma/ödeme |
| `muhasebe_muhasebe-bakiye-sifirla` | ⚠️ Bakiye sıfırlama (riskli) |
| `muhasebe_personel-yeni` | Personel oluştur |
| `muhasebe_personel-duzenle` | Personel düzenle |
| `muhasebe_personel-sil` / `personel-toplu-sil` | Personel sil |
| `muhasebe_personel-hakedis` | Hakediş listesi/hesaplama |
| `muhasebe_personel-maas-ode` | Personel maaş ödeme |

### 🤝 paydaslar — Ortak ve paydaş yönetimi
| Yetki | Açıklama |
|---|---|
| `paydaslar_ortaklar-ortaklar` | Ortaklar listesi |
| `paydaslar_ortaklar-paydaslar` | Paydaşlar listesi |
| `paydaslar_ortaklar-detay` | Ortak detayı |
| `paydaslar_ortaklar-yeni` | Yeni ortak oluştur |
| `paydaslar_ortaklar-duzenle` | Ortak düzenle |
| `paydaslar_ortaklar-sil` / `ortaklar-toplu-sil` | Ortak sil |
| `paydaslar_paydaslar-toplu-sil` | Paydaş toplu sil |
| `paydaslar_personel-liste` | Personel listesi |

### 📞 İletişim modülleri
| Modül | Yetki | Açıklama |
|---|---|---|
| **eposta** | `eposta_eposta-goruntule` | Mail listesi + senkron |
| **eposta** | `eposta_eposta-gonder` | Mail gönder |
| **eposta** | `eposta_eposta-sil` | Mail sil |
| **mesajlar** | `mesajlar_mesaj-gonder` | İç mesaj gönder |
| **mesajlar** | `mesajlar_mesaj-sil` | İç mesaj sil |
| **netsantral** | `netsantral_netsantral-ayarlar` | NetSantral ayarları |

### 📊 Hesaplamalar / İçtihat / Diğer
| Modül | Yetki | Açıklama |
|---|---|---|
| **hesaplamalar** | `hesaplamalar_hesap-adk` | Araç değer kaybı hesabı |
| **hesaplamalar** | `hesaplamalar_hesap-bh` | Bedeni hasar hesabı |
| **ictihat** | `ictihat_ictihat-yargitay` | Yargıtay arama |
| **ictihat** | `ictihat_ictihat-tahkim` | Tahkim emsal arama |
| **ictihat** | `ictihat_ictihat-kusur-emsal` | Kusur emsal arama |
| **ictihat** | `ictihat_ictihat-police-limit` | Poliçe limit |
| **ajanda** | `ajanda_goruntule` | Ajanda görüntüle |
| **ajanda** | `ajanda_ajanda-ekle` / `duzenle` / `sil` / `toplu-sil` | CRUD |
| **bildirim** | `bildirim_bildirim-goruntule` | Bildirim listesi |
| **bildirim** | `bildirim_bildirim-sil` | Bildirim sil |
| **evrak** | `evrak_evrak-yukle` / `evrak-sil` | Evrak yönetimi |
| **police** | `police_police-liste` / `duzenle` / `excel` | Poliçe yönetimi |
| **crm-analiz** | `crm-analiz_*` | Arama analiz raporları |

### 🛡️ admin bypass
`user.rol === 'admin'` ise yukarıdaki tüm kontroller atlanır. Admin her şeye erişir.

---

# III. ÖNEMLİ İŞ AKIŞLARI

## A. CRM → Dosya dönüşümü
1. Personel telefon görüşmesi yapar → CRM kaydı oluşur (`crm_yeni`)
2. CRM not ekleme + ek dosya yükleme (`not-ekle`, `dosya-yukle`)
3. Karar verildi → "Dönüştür" butonu (`crm/donustur.php`)
4. Otomatik olarak `dosyalar` tablosuna kayıt + `crm.donusen_dosya_id` set
5. Dosyada avukat / ortak / sorumlu atanırsa → **v2.1.2 ile bildirim gider** (atanan kişiye)

## B. Saha → Dosya dönüşümü (mobil)
1. Saha personeli mobil uygulamada hasar tespiti yapar (`saha/create.php`)
2. Fotoğraflar + ses kayıtları yüklenir (`saha/dosya-yukle.php`)
3. "Onaya Gönder" → admin/uzman'a bildirim
4. Onay → dosyaya dönüştürülür (`saha/dosyaya-donustur.php`)
5. Veya reddet → "neden" bilgisiyle saha personeline bildirim

## C. Mail tetikleme (otomatik şablon)
1. Şablon tanımlanır: tetik="dosya_acildi", konu="...", icerik_html="..."
2. Dosya açıldığında `tetikle.php` çağrılır
3. Şablon bulunur → `{{dosya_no}}`, `{{musteri_adi}}` gibi değişkenler interpolate edilir
4. SMTP üzerinden gönderilir (helper.php)

## D. Brute force + 2FA login akışı
1. Kullanıcı email + şifre girer
2. `login_attempts` tablosu kontrol → son 30 dk içinde 2+ başarısız varsa engelle (HTTP 429)
3. Şifre doğru → `users.totp_aktif` kontrol
4. 2FA aktif ise `temp_token` (5 dk geçerli) döndür
5. Kullanıcı 6 haneli kodu girer → `2fa-verify.php`
6. Kod doğru → asıl JWT verilir
7. **v2.1 ile:** ek olarak `oturumlar` tablosuna yazılır + refresh token üretilir

## E. Muhasebe trigger akışı
1. Kullanıcı gelir kaydı oluşturur (`gelir-create.php`, tahsilat_durumu='tahsil_edildi')
2. `trg_gelir_after_insert` trigger devreye girer
3. Otomatik olarak `kasa_hareketleri` tablosuna ekler (kasa bakiyesi güncellenir)
4. Komisyon varsa otomatik `paydas_komisyonlari`'na yazılır

## F. Bildirim akışı (v2.1.2 ile aktif)
1. Dosya açılır → `dosya/create.php` 
2. Avukat/ortak/sorumlu atanmışsa → `bildirim_olustur()` çağrılır (helpers.php)
3. `bildirimler` tablosuna kayıt → `alici_id`, `tip='bilgi'`, `ilgili_dosya_id`
4. Frontend BildirimBadge (60 sn polling) sayacı günceller
5. Kullanıcı bildirim sayfasına girince listeyi görür, tıkladığında okundu işaretler

---

# IV. ENDPOINT SAYIM ÖZETİ

| Modül | Endpoint sayısı | Klasör |
|---|---|---|
| muhasebe | **25** | `api/v1/muhasebe/` |
| portal | **16** | `api/v1/portal/` |
| sistem | **16** | `api/v1/sistem/` |
| saha | **14** | `api/v1/saha/` |
| police | **13** | `api/v1/police/` |
| mail | **12** | `api/v1/mail/` |
| sms | **12** | `api/v1/sms/` |
| crm | **10** | `api/v1/crm/` |
| paydas | **9** | `api/v1/paydas/` |
| personel | **9** | `api/v1/personel/` |
| arama-log | **9** | `api/v1/arama-log/` |
| ortak | **8** | `api/v1/ortak/` |
| dosya | **8** | `api/v1/dosya/` |
| yonlendirme | **8** | `api/v1/yonlendirme/` |
| tanim | **8** | `api/v1/tanim/` |
| auth | **7** | `api/v1/auth/` |
| mesaj | **7** | `api/v1/mesaj/` |
| hesap | **7** | `api/v1/hesap/` |
| evrak | **6** | `api/v1/evrak/` |
| ajanda | **6** | `api/v1/ajanda/` |
| masraf | **5** | `api/v1/masraf/` |
| bildirim | **5** | `api/v1/bildirim/` |
| ihbar-foyu | **5** | `api/v1/ihbar-foyu/` |
| sablon | **5** | `api/v1/sablon/` |
| ictihat | **4** | `api/v1/ictihat/` |
| konum | **3** | `api/v1/konum/` |
| ai | **2** | `api/v1/ai/` |
| **netsantral** | **0** ⚠️ | (KLASÖR YOK — frontend 4 endpoint çağırıyor) |
| config | **2** | `api/v1/config/` (helper kütüphane) |

**Toplam endpoint:** 234 PHP dosyası.

---

# V. SONUÇ

Sistemin iç anatomisi:
- **30 tablo** ile temiz bir veri modeli
- **~70 yetki anahtarı** ile granüler erişim kontrolü (8 modül üzerinde)
- **6 ana iş akışı** (CRM→dosya, saha→dosya, mail tetikleme, login, muhasebe trigger, bildirim)
- **234 endpoint** + **30 tablo** + **YETKI_MAP merkezileştirmesi** birleşince → kurumsal seviye yapı

Eylem planı **Bölüm 2**'de — 3 KRİTİK + 7 orta/kozmetik sorun.
