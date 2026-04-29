# MR HASAR — v2.1.2 SİSTEM-İÇİ BİLDİRİM AKTİVASYONU
**Tarih:** 2026-04-29
**Risk:** Düşük (4 PHP dosyası, DB değişikliği yok, ana akış try/catch içinde)
**Çalışma süresi:** 5 dakika

> v2.1 ve v2.1.1 yamalarıyla **çakışmaz**. Bağımsız uygulanabilir.

---

## NE GETİRİYOR

### 1. Bildirim modülü gerçek anlamda etkin
- Bildirim modülünde önceki bir şema tutarsızlığı düzeltildi: `auth/login.php` "tanımsız giriş engellendi" bildirimini `kullanici_id, mesaj, link` kolonlarına yazıyordu — ama frontend `alici_id, icerik` üzerinden okuyor. Bu yüzden engellenmiş giriş bildirimleri admin panelinde **görünmüyordu**. Artık standart şemaya geçti.
- 3 yeni yardımcı fonksiyon eklendi (`bildirim_olustur`, `ortak_user_id_bul`, `bildirim_alici_gecerli`) — tüm modüller bunları kullanabilir.

### 2. Dosya açıldığında otomatik bildirim
**`api/v1/dosya/create.php`** içine: dosya başarıyla açıldıktan sonra atanan kişilere otomatik sistem-içi bildirim gönderiliyor.

| Atanan kişi | Kaynak | Bildirim başlığı |
|---|---|---|
| **avukat_id** | `users.id` (rol = avukat) | "TARAFINIZA YENİ DOSYA ATANDI" |
| **ortak_id** | `ortaklar.id` → email ile users hesabı | "TARAFINIZA YENİ DOSYA ATANDI" |
| **sorumlu_id** | `users.id` (uzman/personel) | "YENİ DOSYA SORUMLULUĞU" |

Bildirim içeriği:
```
Sayın avukatımız, tarafınıza bir dosya atanmıştır.
Dosya No: 2026-0123 | Tür: Araç Değer Kaybı |
Müşteri: AHMET YILMAZ | Sigorta: AKSİGORTA
```

İlgili dosyaya tek tıkla gidilebilir (frontend `ilgili_dosya_id` üzerinden link kuruyor).

### 3. Atama değişiminde bildirim (yeni)
**`api/v1/dosya/update.php`** — daha önce sadece SMS gönderiyordu; şimdi sistem-içi bildirim de gönderiyor.

| Değişim | Yeni atanana | Eski atanmışa |
|---|---|---|
| avukat_id değişti | "TARAFINIZA YENİ DOSYA ATANDI" | "DOSYA ATAMASI KALDIRILDI" |
| ortak_id değişti | aynı | aynı |
| sorumlu_id değişti | "YENİ DOSYA SORUMLULUĞU" | "DOSYA SORUMLULUĞU KALDIRILDI" |

---

## YAYGIN SENARYOLARI ÇÖZER

| Senaryo | Önce | Şimdi |
|---|---|---|
| Yeni dosya açıldı, avukat atandı | Avukat haberi yok (sadece güncelleme sırasında SMS var) | Avukat sisteme girdiğinde **kırmızı 1** badge görür, bildirimler sayfasında "size yeni dosya atandı" |
| İş ortağı (ortaklar tablosundaki) dosya aldı | Haberi yok | E-posta ile bağlı users hesabına bildirim |
| Sorumlu (uzman/personel) atandı | Haberi yok | Sistem bildirimi |
| Atama değişti (rolleri değiştirme) | Yalnız SMS | Hem SMS hem sistem bildirimi (+ eski kişiye "kaldırıldı" bildirimi) |
| 30 dk'da 2 başarısız giriş engellendi | Bildirim oluşuyordu ama yanlış kolonlara yazılıyordu, frontend göstermiyordu | Admin paneline düşüyor, kırmızı badge görünüyor |

---

## YÜKLEME (5 dakika)

### Eğer v2.1 yamasını **henüz yüklemediysen** (mesai sonrasında yapacaktın)
Bu yamayı **şimdi** yükleyebilirsin, v2.1 ile çakışmaz. Veya mesai sonrası v2.1 ile birlikte yükleyebilirsin.

### Adımlar
1. cPanel → Dosya Yöneticisi → `/home/mrhasard/sistem.mrhasardanismanlik.com/`
2. **"Yükle"** → `mr_hasar_yama_v2.1.2_bildirim_2026-04-29.zip` (26 KB)
3. ZIP'e sağ tık → **"Çıkart"** → **"Mevcut dosyaların üzerine yaz"** işaretli
4. ZIP'i sil

**Üzerine yazılan 4 dosya:**
- `api/config/helpers.php`
- `api/v1/auth/login.php`
- `api/v1/dosya/create.php`
- `api/v1/dosya/update.php`

**Diğer hiçbir dosya, klasör, veritabanı etkilenmez.**

---

## TEST

1. **Admin hesapla giriş yap.**
2. **Yeni Dosya Aç** → avukat ve/veya ortak ve/veya sorumlu seç → kaydet.
3. Atadığın **avukat hesabıyla** çıkış-giriş yap.
4. Sağ üstte **kırmızı kabarcık** görünmeli.
5. Bildirimler sayfasına git → "TARAFINIZA YENİ DOSYA ATANDI" ile dosya numarası, müşteri adı, sigorta şirketi.
6. Tıklayınca dosya detayına gitmeli.

**Engellenen giriş bildirimi testi:**
1. Yanlış şifre ile 2 kere giriş dene → 3. seferinde "30 DAKİKA ENGELLENDİ" hatası alırsın
2. Admin hesabıyla başka tarayıcıdan gir → bildirimlerde "TANIMSIZ GİRİŞ DENEMESİ ENGELLENDİ" görmeli

---

## ÖNEMLİ NOTLAR

### Ortak hesabı yoksa ne olur?
Eğer `ortaklar.email` boşsa veya o e-postayla `users` kaydı yoksa, **ortak için bildirim atlanır** (sessizce). Ana akış kesilmez. SMS akışı zaten kendi mantığıyla çalışmaya devam eder.

### Bildirim üreten ana akışı kesmez
Tüm bildirim çağrıları `try/catch` içinde. Bildirim oluşturma başarısız olsa bile dosya açılışı/güncellemesi etkilenmez. Hata sadece error_log'a yazılır.

### Kullanıcı kendine bildirim göndermez
Eğer dosyayı açan kişi aynı zamanda atanan kişi ise (örn. admin kendine atadıysa) bildirim **atlanır**.

### Aynı kişiye duplicate bildirim göndermez
Eğer avukat_id ve sorumlu_id aynı kullanıcıysa sadece bir bildirim gider.

---

## ROLLBACK

Yedeğindeki orijinal 4 PHP dosyasını geri yükle. Veritabanı değişmedi.

---

## v2.1 + v2.1.1 + v2.1.2 SIRASI (mesai sonrası)

1. ✓ **v2.1.1** zaten canlıda (gelen çağrı + ses)
2. **v2.1.2** — şimdi veya v2.1 ile beraber (bildirim aktivasyonu)
3. **v2.1** — mesai sonrası (güvenlik paketi: env, soft-delete, refresh token, focus-loss)

Üçü de bağımsız, sıra fark etmez. Tek seferde birleşik istersen söyle, tek bir ZIP yaparım.
