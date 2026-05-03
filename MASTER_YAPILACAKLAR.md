# MR HASAR — MASTER YAPILACAKLAR LİSTESİ
**Tarih:** 03 Mayıs 2026
**Kaynak:** SİSTEM_DENETIMI (3 bölüm) + DOSYA_ANALIZI (3 parça) + KAPANAN_DOSYA_DOGRULAMA + DOSYA_KAPANIS_MODULU_TASARIM + CHANGELOG'lar (5 adet) + repo kod analizi

> Sistem genel sağlığı: **%92 fonksiyonel, çekirdek omurga sağlam.**
> Bu döküman bütün geçmiş raporlardaki tespit edilen tüm yapılacakları tek yerde toplar. Önceliğe göre sıralı.

---

## ✅ TAMAMLANANLAR (BUGÜN — 03 MAYIS 2026)

```
✅ #001 — v2.1 DB password .env'e taşındı
✅ #002 — display_errors production'da gizlendi
✅ #003 — FK CASCADE → RESTRICT (mağdur/araç/masraf/evrak korumalı)
✅ #004 — Soft-delete sistemi (silindi=1)
✅ #005 — Logout blacklist (oturumlar tablosu)
✅ #006 — Refresh token rotation (tek kullanımlık, 30 gün)
✅ #007 — JWT_SECRET environment'a taşındı (64 karakter)
✅ #008 — .env web'den korunuyor (api/config/.htaccess)
✅ #009 — v2.1.2 Bildirim modülü aktivasyonu (3 yeni helper)
✅ #010 — v2.1.2 Yeni dosya açıldığında otomatik bildirim
✅ #011 — v2.1.2 Atama değişiminde bildirim
✅ #012 — v2.1.3 Mesajlar gelen/giden/yeni sekmeleri çalışıyor
✅ #013 — v2.1.3 Mesajlar breadcrumb düzeltmesi
✅ #014 — #3 CORS wildcard kaldırıldı, whitelist'e geçildi
✅ #015 — X-Frame-Options, X-XSS-Protection, Referrer-Policy başlıkları
✅ #016 — #5 Form focus-loss (BildirimBadge React.memo)
```

**Toplam: 16 madde tamam** 🎯

---

## 🔴 KRİTİK BEKLEYENLER

> Bunlar canlıda **mali tutarsızlık** veya **veri kaybı** riski yaratır.

### #017 — Masraf SİLİNDİĞİNDE kasa bakiyesi geri yüklenmiyor
- **Konum:** `api/v1/masraf/delete.php:35-38`
- **Sorun:** `FOREIGN_KEY_CHECKS=0` ile trigger bypass → kasa bakiyesi olduğundan az
- **Çözüm:** Manuel rollback (`UPDATE kasalar SET bakiye = bakiye + ? WHERE id = ?`)
- **Süre:** 30 dk — **Risk:** Sıfır (sadece backend)

### #018 — Masraf GÜNCELLEMEDE kasa hareketi senkronize değil
- **Konum:** `api/v1/masraf/update.php`
- **Sorun:** Tutar değiştirilirse kasa_hareketleri eski tutarda kalır
- **Çözüm:** Eski/yeni tutar farkını hesapla, ek hareket kaydı yaz, kasa düzelt
- **Süre:** 45 dk — **Risk:** Düşük

### #019 — Paralel ödeme race condition (FOR UPDATE yok)
- **Konum:** `api/v1/masraf/ode.php`, `api/v1/paydas/komisyon-ode.php`
- **Sorun:** İki kullanıcı aynı anda aynı masrafı ödeyebilir → çift kasa düşümü
- **Çözüm:** SELECT'e `FOR UPDATE` veya conditional UPDATE
- **Süre:** 30 dk — **Risk:** Düşük

### #020 — KAPANMIŞ dosyaya masraf/evrak ekleme engelliği yok
- **Konum:** `api/v1/masraf/create.php`, `api/v1/evrak/upload.php`
- **Sorun:** Kapanmış dosyaya masraf eklenebiliyor → hakediş yeniden hesaplanmaz, muhasebe bozulur
- **Çözüm:** `if dosya.asama === 'DOSYA KAPANDI' return 403`
- **Süre:** 30 dk — **Risk:** Düşük

### #021 — DOSYA KAPANDI → tekrar açma engellenmiyor
- **Konum:** `api/v1/dosya/update.php`
- **Sorun:** Frontend dropdown'da her aşama seçilebilir, KAPANDI'dan AÇIK'a dönüş mümkün
- **Çözüm:** Sadece admin yetkisine bağla
- **Süre:** 30 dk — **Risk:** Düşük

### #022 — İçtihat sayfası yetki kontrolü yok
- **Konum:** `js/pages/ictihat.js`
- **Sorun:** Herhangi bir personel yargıtay/tahkim AI sorgusu yapabilir → AI faturasını şişirir, hassas hukuki sorgular logsuz
- **Çözüm:** Sayfa açılışına `if (!hasYetki(user, 'ictihat', 'goruntule')) return <YetkisizErisim/>`
- **Süre:** 30 dk — **Risk:** Çok düşük

### #023 — AI API key + model güncelleme
- **Konum:** `api/v1/hesap/ai-analiz.php`, `bh-ai-analiz.php`, `ocr-analiz.php`
- **Sorun:** Claude 401 (invalid API key), Gemini 404 (model deprecated)
- **Etki:** Hesap-ADK / Hesap-BH / OCR analizi çalışmıyor — sessizce yerel fallback'e düşüyor
- **Çözüm:** (a) Yeni Anthropic key, (b) Gemini → `gemini-1.5-pro` veya `gemini-2.0-flash-exp`
- **Süre:** 1 saat (sen API key'leri verince)

### #024 — evrak/diagnose.php hardcoded backdoor
- **Konum:** `api/v1/evrak/diagnose.php`
- **Sorun:** `?key=mrhasar2025` URL parametresi auth bypass
- **Çözüm:** Hardcoded key kaldır, `auth_required(['admin'])` bırak
- **Süre:** 10 dk — **Risk:** Düşük

### #025 — arama-log/list.php ve istatistik.php display_errors=1
- **Konum:** `api/v1/arama-log/list.php`, `istatistik.php`
- **Sorun:** Production'da PHP stack trace + dosya yolları kullanıcıya gider
- **Çözüm:** `ini_set('display_errors', 0)` ya da bootstrap.php yüklensin
- **Süre:** 5 dk — **Risk:** Sıfır

---

## 🟡 ORTA ÖNCELİK

### #026 — bildirim/create.php okundu kolonu yazmıyor
- **Konum:** `api/v1/bildirim/create.php`
- **Çözüm:** INSERT'e `, okundu` ekle, değer `0`
- **Süre:** 5 dk

### #027 — kasa_hareketleri INSERT şema tutarsızlığı
- **Sorun:** gelir-ekle 7 kolon, bakiye-duzelt 6 kolon (dosya_id eksik)
- **Çözüm:** Schema normalize, `dosya_id NULL` tüm INSERT'lere
- **Süre:** 30 dk

### #028 — TC kimlik doğrulaması atlanıyor
- **Konum:** `api/v1/dosya/create.php` (validate_tc çağrılmıyor)
- **Çözüm:** `if (!validate_tc($body['tc_kimlik'])) json_error('Gecersiz TC')`
- **Süre:** 15 dk

### #029 — Plaka karakter doğrulaması yok
- **Çözüm:** Regex `/^[0-9]{2}[A-Z]{1,3}[0-9]{2,4}$/` her iki tarafa
- **Süre:** 30 dk

### #030 — Negatif/aşırı komisyon kontrolü yok
- **Çözüm:** `0 <= komisyon <= 100`, `noter_vekalet >= 0`
- **Süre:** 15 dk

### #031 — Gelecek tarihli kaza tarihi engellenmiyor
- **Çözüm:** `<input max="{today}">` + backend kontrol
- **Süre:** 15 dk

### #032 — Aşama değiştirme yetki matrisinde tanımlı değil
- **Sorun:** Düzenleme yetkisi olan personel "DOSYA KAPANDI" yapabiliyor
- **Çözüm:** Ayrı `dosya-asama-degistir` yetkisi + matris (örn. avukat "HUKUK DAVASI AÇILDI")
- **Süre:** 1 saat

### #033 — Audit log eksik (eski/yeni değer)
- **Çözüm:** `dosya_surecler.detay` JSON formatına geç (önceki/yeni değerleri sakla)
- **Süre:** 1 saat

### #034 — Soft-delete cascade yok (zombie kayıtlar)
- **Sorun:** Dosya silindiğinde bağlı masraflar/evraklar list endpoint'lerde görünüyor
- **Çözüm:** masraf/list, evrak/list endpoint'lerine `INNER JOIN dosyalar WHERE silindi=0`
- **Süre:** 30 dk

### #035 — AI hata sessizliği
- **Sorun:** Claude API 401 dönerse kullanıcıya net mesaj yok, sessiz fallback
- **Çözüm:** Frontend toast: "AI servisi şu an erişilemez, basit hesaplama gösteriliyor"
- **Süre:** 30 dk

### #036 — Komisyon oranı değişimi geriye dönük yansımıyor
- **Sorun:** %30'dan %25'e indirilince bekleyen komisyon hâlâ %30'da
- **Çözüm:** Komisyon oran değişimi → bekleyen komisyonları yeniden hesapla
- **Süre:** 1 saat

---

## 🟢 KOZMETİK / TEMİZLİK

### #037 — Duplicate evrak-okuyucu.js (3 sürüm)
- **Çözüm:** `evrak-okuyucu .js` (boşluklu) ve `evrak-okuyucu (1).js` sil
- **Süre:** 5 dk

### #038 — test-debug.php ve test-login-debug.php yetki yok
- **Çözüm:** Sil veya `auth_required(['admin'])` ekle
- **Süre:** 10 dk

### #039 — helpers.php iki yerde (kök + api/config)
- **Sorun:** İki farklı ortak fonksiyon seti
- **Çözüm:** Kök helpers.php'yi silmeyi düşün (api/config/helpers.php yeterli)
- **Süre:** 30 dk

### #040 — sistem.js static asset belirsizliği
- **Çözüm:** Endpoint mi kütüphane mi netleştir (dosya yapısı düzelt)
- **Süre:** 30 dk

---

## 🟣 BÜYÜK PROJELER (Modül Düzeyi)

### #041 — DOSYA KAPANIŞ MODÜLÜ v3.0 ⭐ EN ÖNEMLİ
- **Belge:** `DOSYA_KAPANIS_MODULU_TASARIM.md` (zaten hazır, 427 satır)
- **Amaç:** Excel'in (Onur Şenol Kazanç Tablosu + her dosya hesap tablosu) yerini sistem alır
- **Yapılacaklar:**
  - Yeni tablo: `dosya_kapanis_kayitlari` (28 kolon, snapshot saklama)
  - 3 yeni endpoint: `kapanis-olustur`, `kapanis-getir`, `kapanis-listesi`
  - Mahsup zinciri (bir dosyadaki mahsup sonraki dosyada otomatik düşer)
  - Frontend modal güncelleme (dosya başı + mahsup alanları aktif)
  - **Protokol madde 5.4 uyumlu hesaplama** (DBO paylaşımdan ÖNCE düşülür)
- **Süre:** 8-12 saat (büyük iş)
- **Risk:** Orta — kapsamlı test gerekir
- **Öncelik:** **EN YÜKSEK** (Demirhan toplantısı sonrası kritik)

### #042 — AYLIK OTOMATİK MUTABAKAT RAPORU
- **Amaç:** Her ay 1'inde otomatik PDF rapor üret (Onur ve Demirhan kasalarına göre)
- **Yapılacaklar:**
  - Cron job kurulumu (her ayın 1'i, gece 03:00)
  - Rapor formatı: Aralık 2025 / Ocak 2026 PDF temasıyla aynı
  - Madde 5.4 uyum bayrağı (uyumsuzluk varsa kırmızı uyarı)
  - Otomatik mail gönderimi (Onur + Demirhan'a)
- **Süre:** 4-6 saat
- **Bağımlılık:** #041 tamamlanmalı önce

### #043 — DOSYA TÜR ÜCRETLERİ TARİFE TABLOSU
- **Belge:** `DOSYA TÜR ÜCRETLERİ - 2026.pdf`
- **Amaç:** 2025 ve 2026 tarifelerini DB'de tutmak (mr_ucretlendirme_tarife)
- **Yapılacaklar:**
  - Tablo şeması (yıl, dosya_turu, kaynak, tutar)
  - 2025 ve 2026 tarifelerini seed et
  - Yeni dosya açma formunda otomatik tarife önerisi
  - Tarife değişiminde geriye dönük dosyalar etkilenmesin
- **Süre:** 3-4 saat

### #044 — NETSANTRAL AUTOCALL ENTEGRASYONU
- **Sorun:** Frontend'de 4 metot var ama backend yok
- **Çözüm:** İki seçenek
  - (A) Frontend'den özelliği kaldır (1 saat)
  - (B) NetSantral API ile entegrasyon (4-8 saat)
- **Karar:** Sen seçeceksin

### #045 — BABEL CDN BAĞIMLILIĞI KALDIRMA
- **Belge:** v2.0 zip içinde js/dist/ derlemesi var (eski)
- **Sorun:** v2.1 ile JS dosyaları değişti, eski dist eskidi
- **Çözüm:** Ben senin canlı js/ dosyalarından yeni js/dist/ derlemeliyim
- **Süre:** 2-3 saat (derleme + index.html güncelleme + test)

### #046 — DOSYA KAPANIŞI 5 ANOMALİLİ DOSYA DÜZELTMESİ
- **Belge:** `KAPANAN_DOSYA_DOGRULAMA_RAPORU.md`
- **Liste:**
  - AYŞEGÜL DUMAN DEĞER KAYBI (7.400 TL mahsup yazılmamış)
  - AYŞEGÜL DUMAN HASAR (tüm finansal alanlar boş)
  - SAMET BAYRAKTAR HASAR (1.790 TL fark)
  - ... (3 dosya daha)
- **Çözüm:** Demirhan ile mutabakat → Excel'de manuel düzeltme + sistem #041 sonrası düzgün kayıt

---

## 🔮 GELECEKTEKI MİMARİ İYİLEŞTİRMELER

### #047 — Aşama listesini DB'ye taşı (`dosya_asama_tanimlari`)
### #048 — Dosya geçmişi sekmesi (`dosya_surecler` görünümü)
### #049 — Kapanmış dosya read-only mod
### #050 — Edit conflict tespiti (optimistic locking)
### #051 — Aşama bazlı wizard rehberi
### #052 — Form'u multi-step'e böl
### #053 — Yetki sistemi UI iyileştirmesi (yetki adlarını netleştir, görsel)
### #054 — HTTP cache başlıkları
### #055 — Mesaj/bildirim sayaç ayrımı (zarf/zil ikon)
### #056 — Cron entegrasyonu (hatırlatma için)
### #057 — Schema migrations'ı tek yere topla
### #058 — Hassasiyet artırma: BH araç INSERT eksik alanları

---

## 🏛️ DEMİRHAN İŞBİRLİĞİ KAPSAMINDA

### #059 — Demirhan ile mahsuplaşma toplantısı
- Hazırlanan belgeler:
  - PROTOKOL_TUTARSIZLIK_RAPORU.pdf (1.682.825 TL haksız kayıp tespiti)
  - NIYET_BEYANI_VE_MAHSUPLASMA.pdf (mahsuplaşma teklifi)
- **Sıradaki:** Toplantı yapıldı mı? Sonuç ne?

### #060 — Demirhan'dan eksik 51 dosya hesap tablosu talep
### #061 — Şubat-Haziran 2025 ay sonu raporları talep
### #062 — Ocak 2025 kapanış dosyaları listesi talep
### #063 — Mahsup işlemlerinin tam dökümü (TEVFİK UYSAL gibi zarar dosyaları)

---

## 🎯 ÖNCELİKLENDİRİLMİŞ EYLEM PLANI

### A) Bu hafta yapılması gerekenler — KRİTİK PAKET (~3 saat)

```
v2.2 KRİTİK FİNANSAL HOTFIX (tek paket)
├── #017 — Masraf delete kasa rollback
├── #018 — Masraf update kasa hareketi senkron
├── #019 — Paralel ödeme race condition (FOR UPDATE)
├── #020 — Kapanmış dosya masraf/evrak ekleme engeli
├── #021 — Kapanmış dosya tekrar açma engeli (sadece admin)
└── #022 — İçtihat sayfası yetki kapısı
```

### B) Bu hafta yapılması gerekenler — GÜVENLİK PAKETİ (~30 dk)

```
v2.2 GÜVENLİK MİNİ HOTFIX
├── #024 — evrak/diagnose backdoor key kaldır
├── #025 — arama-log display_errors kapat
└── #038 — test-debug.php yetki ekle
```

### C) Bu ay — VERİ KALİTESİ PAKETİ (~3 saat)

```
v2.3 VALİDASYON PAKETİ
├── #028 — TC kimlik doğrulaması
├── #029 — Plaka regex
├── #030 — Komisyon negatif/aşırı kontrolü
├── #031 — Gelecek tarih engeli
├── #026 — bildirim/create okundu kolonu
└── #027 — kasa_hareketleri şema normalize
```

### D) Bu ay — TEMİZLİK PAKETİ (~1 saat)

```
v2.3 TEMİZLİK
├── #037 — Duplicate evrak-okuyucu sil
├── #032 — Aşama yetki matrisi
├── #033 — Audit log JSON detay
├── #034 — Soft-delete cascade
└── #035 — AI hata sessizliği
```

### E) Önemli büyük projeler

```
v3.0 DOSYA KAPANIŞ MODÜLÜ ⭐
├── #041 — Yeni tablo + 3 endpoint + frontend modal (8-12 saat)
├── #042 — Aylık otomatik mutabakat raporu (4-6 saat)
└── #043 — Tarife tablosu (3-4 saat)

v2.5 ARA YAMALAR
├── #044 — NetSantral autocall karar
└── #045 — Babel CDN local'a alma

v2.1.1 BEKLEYEN
└── Çağrı widget mount + ses kalitesi (hafta sonu)
```

---

## 📊 ÖZET DURUM

| Kategori | Toplam | Tamam | Bekleyen |
|---|---:|---:|---:|
| **Tamamlanan** | 16 | 16 | 0 |
| **Kritik** | 9 | 0 | 9 |
| **Orta öncelik** | 11 | 0 | 11 |
| **Kozmetik** | 4 | 0 | 4 |
| **Büyük projeler** | 6 | 0 | 6 |
| **Mimari iyileştirme** | 12 | 0 | 12 |
| **Demirhan kapsamı** | 5 | 2 | 3 |
| **TOPLAM** | **63** | **18** | **45** |

**Sistem %29 hedefe ulaşmış** (16+2 / 63)

---

## 💡 ÖNERİM — SIRASIYLA

### Şimdi/yakında (sen seçeceksin):
1. **v2.2 KRİTİK FİNANSAL HOTFIX** (3 saat, sıfır risk) → masraf bug'ları + kapanmış dosya kilidi + içtihat yetki
2. **v2.2 GÜVENLİK MİNİ** (30 dk) → backdoor + display_errors + test-debug
3. **AI key güncelleme** (sen yeni key verince) → ADK/BH/OCR çalışır

### Sonra:
4. **Demirhan toplantısı yapıldıysa** → mutabakat sonucuna göre v3.0 tasarımı revize
5. **v3.0 Dosya Kapanış Modülü** (büyük iş — protokol madde 5.4 entegrasyonu, mahsup zinciri, otomatik rapor)

### Ayrı oturumlarda (mesai dışı):
6. **v2.1.1 Çağrı widget** (hafta sonu)
7. **v2.5 Babel CDN local** (test gerektirir, gece)
8. **v2.3 Validasyon + Temizlik paketleri** (operasyonel rahat zamanda)

---

**Sen söyle, hangisinden başlayalım?**
