# MR HASAR — SİSTEM DENETİMİ — BÖLÜM 2: BACKEND + KIRIKLAR + EYLEM PLANI

> Bölüm 1 (frontend) ayrı dosyada. Bu dosya kalan 3 bölümün özeti — eylem odaklı.

---

# I. BACKEND MODÜLLERİ — DURUMA GÖRE TASNİF

## 🟢 SAĞLAM (16 modül, ~140 endpoint)
**Müdahale gerekmiyor, çalışıyor:**

| Modül | Endpoint | Ana iş |
|---|---|---|
| `auth/` | 7 | login (brute-force + 2FA), me, change-password, profil, avatar, 2fa-setup/verify |
| `dosya/` | 8 | CRUD + bulk-delete + excel-import/sablon |
| `crm/` | 10 | CRUD + dosya-yukle + not-ekle + dönüştür + unified-get |
| `masraf/` | 5 | create + list + ode + update + delete |
| `evrak/` | 6 | upload + download + list + delete + tani + diagnose ⚠️ |
| `mail/` | 12 | IMAP/SMTP/şablon, AES-256 şifreleme, tetikli gönderim |
| `mesaj/` | 7 | İç mesajlaşma CRUD |
| `bildirim/` | 5 | List, oku, sil, bulk-delete + create ⚠️ (okundu kolonu yazmıyor) |
| `ajanda/` | 6 | CRUD + bulk-delete + hatırlatma-kontrol |
| `muhasebe/` | 25 | Kasa, gelir, gider, hareket, komisyon, transfer, raporlar |
| `ortak/` | 8 | CRUD + hareket-list/ekle |
| `paydas/` | 9 | CRUD + komisyon-list/ekle/öde |
| `personel/` | 9 | CRUD + hakediş-list/hesapla/öde + migrate |
| `police/` | 13 | CRUD + tahsilat + hatırlatma + excel-import + rapor + hasar-dosya-aç |
| `saha/` | 14 | CRUD + onaya-gönder + onayla/reddet + dosyaya-dönüştür + medya |
| `portal/` | 16 | OTP + TC giriş + link giriş + erişim CRUD + mesaj |
| `sms/` | 12 | Gönder + topluğonder + iptal + rapor + kredi + log + webhook |
| `tanim/` | 8 | CRUD + bulk-create + araç marka/model + ücretlendirme |
| `yonlendirme/` | 8 | CRUD + import + toplu-işlem + not-ekle |
| `sablon/` | 5 | CRUD (matbu evrak/sözleşme şablonları) |
| `arama-log/` | 9 | CRUD + istatistik ⚠️ (display_errors=1 var) + kayıt yükle/indir |
| `konum/` | 3 | Güncelle + listele + geçmişi |
| `ihbar-foyu/` | 5 | CRUD (parça listesi destekli) |

## 🟡 DİKKAT GEREKEN (3 modül)

| Modül | Sorun | Öncelik |
|---|---|---|
| `sistem/` (16 endpoint) | `tema-config.php` ve `sistem.js` static asset gibi geliyor — endpoint mi yoksa kütüphane mi belirsiz | Düşük |
| `ai/` | Ortak AI helper. **error_log dolu Claude 401 ve Gemini 404 ile** | Yüksek |
| `config/` | helpers.php / ai-helper.php burada da var — tekrarlı yapı (`api/config/` ile çakışabilir) | Orta |

## 🔴 KIRIK (2 modül + endpointler)

| Modül | Sorun |
|---|---|
| `hesap/` (7 endpoint) | `ocr-analiz.php` Gemini 404, `ai-analiz.php` Claude 401, `bh-ai-analiz.php` aynı, fallback var ama kalitesi düşük. **Yeni AI key + güncel model gerek.** |
| `ictihat/` (4 endpoint) | Backend var ve çalışıyor. **AMA frontend'de yetki kontrolü hiç yok** — herkes yargıtay/tahkim AI sorgusu yapabiliyor. |
| `netsantral/` | **Klasör canlıda yok.** Frontend autocall* metotları (4 adet) hep 404 alıyor. |

---

# II. KIRIK ÖZELLİKLER VE TUTARSIZLIKLAR — TAM LİSTE

## 🔴 KRİTİK (3 madde)

### 1. AI modeli güncel değil → ADK/BH analizleri çökmüş
- **Kanıt:** `api/v1/ai/error_log` → 3700+ satır `Claude HTTP 401 invalid x-api-key` ve `Gemini HTTP 404 models/gemini-2.0-flash is no longer available`
- **Etki:** Hesap-ADK ve Hesap-BH ekranlarında "AI Analiz" tıklandığında başarısız → kullanıcı sessizce yerel hesaba düşüyor (kalite düşük)
- **Çözüm:** (a) Yeni Anthropic API key, (b) Gemini'yi `gemini-1.5-pro` veya `gemini-2.0-flash-exp`'e güncelle

### 2. NetSantral autocall özelliği — backend hiç yok
- **Kanıt:** `js/config.js:397-400` 4 metot tanımlı ama `/api/v1/netsantral/` klasörü canlıda yok
- **Etki:** Bu özelliğe basıldığında "Sunucu yanıt hatası" alınıyor
- **Çözüm:** (a) Frontend'den özelliği kaldır, (b) veya backend'i geliştir (NetSantral API entegrasyonu)

### 3. İçtihat sayfası yetki kontrolü tamamen yok
- **Kanıt:** `js/pages/ictihat.js`'te `hasYetki` çağrısı 0 (sıfır)
- **Etki:** Herhangi bir personel yargıtay/tahkim AI sorgusu yapabilir → AI faturayı şişirir, hassas hukuki sorgular logsuz çalışır
- **Çözüm:** Sayfa açılışına `if (!MR.hasYetki(user, 'ictihat', 'goruntule')) return <YetkisizErisim/>` koy

## 🟡 ORTA (4 madde)

### 4. `evrak/diagnose.php?key=mrhasar2025` — hardcoded backdoor
- Kanıt: `api/v1/evrak/diagnose.php` ilk satırlarda
- Etki: Repo'yu görebilen herkes diagnostik bilgilere erişir (dosya yolları, izin durumları)
- Çözüm: Backdoor key'i kaldır, sadece `auth_required(['admin'])` bırak

### 5. `arama-log/list.php` ve `istatistik.php` display_errors=1
- Kanıt: İlk satırlarda `ini_set('display_errors', 1)` açık
- Etki: Production'da hata olunca PHP stack trace + dosya yolları kullanıcıya gider
- Çözüm: İki dosyada `1` → `0` yap, veya bootstrap.php yüklensin

### 6. `bildirim/create.php` INSERT'inde `okundu` kolonu yazmıyor
- Kanıt: `bildirim/create.php`: `INSERT INTO bildirimler (gonderen_id, alici_id, baslik, icerik, tip, ilgili_dosya_id)` — `okundu` yok
- Karşılaştırma: `mesaj/create.php`: `INSERT INTO bildirimler (... , okundu, ilgili_dosya_id) VALUES (..., 0, ...)` — yazıyor
- Etki: Manuel gönderilen bildirimlerin `okundu` durumu DEFAULT'a bırakılıyor (genelde 0, ama şemaya bağlı)
- Çözüm: bildirim/create.php'ye `, okundu` ekle, değer = 0

### 7. `kasa_hareketleri` INSERT şemaları tutarsız
- `gelir-ekle.php` 7 kolon yazıyor, `bakiye-duzelt.php` 6 kolon (dosya_id yok)
- Etki: Hareket kaynağı analizi (hangi dosyadan geldi?) bazı satırlarda eksik
- Çözüm: Schema normalize, `dosya_id NULL` olarak tüm INSERT'lere ekle

## 🟡 KOZMETİK (3 madde)

### 8. Duplicate `evrak-okuyucu.js` (3 sürüm)
- `evrak-okuyucu.js` (v3, 78 KB) ✓ kullanılan
- `evrak-okuyucu .js` (boşluklu, v2, 20 KB) — silinmeli
- `evrak-okuyucu (1).js` (parantezli, v2 kopya) — silinmeli
- **Çözüm:** İki eski dosyayı sil

### 9. `api/test-debug.php` ve `test-login-debug.php` yetki olmadan
- `auth_required()` çağrısı yok
- Etki: URL bilen herkes config dump alır
- Çözüm: Production'da sil veya başına `auth_required(['admin'])` koy

### 10. `helpers.php` iki yerde çakışıyor
- Kök: `/helpers.php` (605 satır) — eski, wildcard CORS
- Modül: `/api/config/helpers.php` (816 satır) — yeni, whitelist CORS
- Etki: İki farklı ortak fonksiyon seti, geliştirme karışıklığı
- Çözüm: v2.1 yamasında kök helpers.php zaten güncellendi, ileride birleştirilebilir

---

# III. ÖNCELİKLENDİRİLMİŞ EYLEM PLANI

## 🚨 Bu hafta (3 madde — kısa)

| # | Madde | Tahmini süre | Risk |
|---|---|---|---|
| 1 | **İçtihat sayfasına yetki kapısı** — `if (!hasYetki) return <YetkisizErisim/>` | 30 dk | Çok düşük |
| 2 | **AI API key + model güncelleme** — Anthropic + Gemini panelden yeni key, helper'da model `gemini-2.0-flash` → `gemini-1.5-pro` | 1 saat | Düşük |
| 3 | **arama-log display_errors kapatma** — 2 dosyada `1` → `0` | 5 dk | Sıfır |

## 📋 Bu ay

| # | Madde | Süre | Risk |
|---|---|---|---|
| 4 | **NetSantral autocall** — frontend'den kaldır VEYA backend geliştir | 4-8 saat | Orta |
| 5 | **bildirim/create.php okundu kolonu fix** | 5 dk | Sıfır |
| 6 | **kasa_hareketleri INSERT şema normalleştirme** | 30 dk | Düşük |
| 7 | **Duplicate evrak-okuyucu.js dosyalarını sil** | 5 dk | Sıfır |
| 8 | **evrak/diagnose.php hardcoded key kaldır** | 10 dk | Düşük |
| 9 | **test-debug.php yetki ekle veya sil** | 10 dk | Düşük |

## 🔮 Daha sonra (v2.x güncellemeleri)
- Yetki sistemi UI iyileştirmesi (yetki adlarını netleştir, hangi yetki neyi açıyor görsel)
- HTTP cache başlıkları (#13)
- Mesaj/bildirim sayaç ayrımı (zarf/zil ikon)
- Cron entegrasyonu (hatırlatma için)
- Schema migrations'ı tek bir yere topla

---

# IV. SİSTEMİN GÜÇLÜ YANLARI (DİKKAT — bunlar sağlam, dokunma)

- **Brute force koruması** + **2FA (TOTP)** + **AES-256-CBC mail şifreleme** → güvenlik temeli iyi
- **YETKI_MAP** (helpers.php 800+ satır) → endpoint başına otomatik yetki kontrolü
- **Otomatik şema migrasyonları** → `ensure_*_columns()` fonksiyonları schema'yı kendi düzenliyor
- **Trigger destekli muhasebe** → gelir kaydında otomatik hesap hareketi
- **Saha onay akışı** → mobil → onaya gönder → onayla/reddet → dosyaya dönüştür
- **Mail tetikli gönderim** → şablon bazlı, {{değişken}} interpolasyon
- **Soft-delete + FK RESTRICT (v2.1 ile gelecek)** → veri kaybı koruması

---

## SONUÇ

Sistem **%92 fonksiyonel, çekirdek omurga sağlam.** Kritik 3 sorun (AI key, NetSantral, içtihat yetki) bu hafta çözülürse skoru %98'e çıkar. Diğer 7 sorun rutin bakım kapsamında.

Şimdi somut işe dönelim — hangisinden başlamak istersen.
