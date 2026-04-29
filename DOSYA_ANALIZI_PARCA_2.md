# MR HASAR — DOSYA YAŞAM DÖNGÜSÜ DERİNLEMESİNE ANALİZİ
## Parça 2/3 — DOSYA DETAY + DÜZENLE EKRANI + AŞAMA AKIŞI

> Ajan bulguları + canlı kod referansları. Bu parça: `dosya-detay.js`, `dosya-liste.js`, `dosya/get.php`, `dosya/update.php`, aşama (statü) akışı.

---

## A. ÇALIŞMA MANTIĞI

### 1. Sayfa yapısı (dosya-detay.js, 79 KB, 4 sekme)

| Sekme | İçerik | Backend |
|---|---|---|
| **BİLGİ** | Dosya temel + mağdur + araç + finansal özet | `dosya/get.php` |
| **MASRAFLAR** | Harcama listesi + ödeme durumu + ekleme/ödeme modal | `masraf/list.php`, `create.php`, `ode.php` |
| **EVRAKLAR** | Doküman yönetimi + yükleme + önizleme + AI analiz | `evrak/upload.php`, `download.php` + `hesap/*` |
| **DOSYA HESABI** | Masraf-gelir özeti + dosya kapatma | `muhasebe/gelir-create.php` |

**Üst butonlar:** Aşama değiştir (dropdown), DÜZENLE, PORTAL OLUŞTUR, SİL, DOSYAYI KAPAT.

### 2. Aşama akışı (data.js: ASAMALAR sabiti, 60+ değer)

Olası aşamalar (kısmi liste):
> DOSYA AÇIK → EVRAK BEKLENİYOR → İHBAR YAZILDI → EKSPER ATANDI → DOSYA TAMAMLANDI → ARABULUCULUK BAŞVURUSU → ARABULUCU ATANDI → ARABULUCULUK ANLAŞMA → HUKUK DAVASI AÇILDI → BİLİRKİŞİ → ADLİ TIP → KUSUR BİLİRKİŞİ → KARAR ÇIKTI → İCRA TAKİBİ → DOSYA KAPANDI

**Aşama değişiminde tetiklenenler** (`update.php:254-281`):
- `dosya_surecler` tablosuna log kaydı (islem_tipi='asama_degisikligi')
- SMS bildirimi (`sms_durum_degisikligi_evrakli` fonksiyonu — avukat ve/veya müşteriye)
- Frontend onay modal'ı (`asamaOnay` state)
- Sonuç kartı toast ile gösterim

### 3. Düzenle ekranı

**Konum:** Detay sayfası içinde modal (680px genişlik). Tek modal'da tüm bilgi düzenlenir.

**Düzenlenebilir alanlar (~30 alan):**
- Dosya: dosya_turu, sigorta_sirket, hasar_no, dosya_kaynagi, plaka, kaza_tarihi, kaza_il, haklilik, komisyon_orani, hak_mahrumiyet
- Atama: ortak_id (avukat), sorumlu_id, paydas_id
- Mağdur: ad_soyad, tc_kimlik, telefon, telefon2, il, ilce, dogum_tarihi, meslek, iban
- Araçlar: Mağdur (ma_*) + karşı (ka_*) — sadece ADK/MDK görünür

**Yetki:** Tek bir kontrol — `dosya-duzenle`. Hangi alanın hangi role açık olacağı ayrımı **yok**.

### 4. Backend get.php akışı

**JOIN'ler** (satır 48-118):
- magdurlar (LEFT JOIN, 1:1)
- araclar (LEFT JOIN, 1:n — taraf='magdur'/'karsi')
- masraflar + kasalar + users (kim ekledi)
- evraklar + users (kim yükledi)
- ortak/avukat/sorumlu/paydas (4 ayrı nested lookup)
- gelirler SUM (tahsilat toplamı)

**Yetki kısıtı** (satır 30-44):
- Admin → tümü
- Diğer roller → `dosya-liste`/`dosya-detay`/`goruntule` izni varsa tümü; yoksa sadece kendi avukat_id'sine sahip dosyalar

**Avukat rolü için gizleme** (satır 127-163):
- sorumlu_id, avukat_id, ortak_id, paydas_id ad_soyad gizlenir
- Komisyon_orani **kalır** (görünür)
- Masraf/evrak yükleyen kullanıcı adı + kasa adı gizlenir

**Soft-delete kontrolü:** v2.1 yamasında eklendi (`silindi=0` filtresi).

---

## B. NE DOĞRU ÇALIŞIYOR

✅ **Aşama log sistemi** — `dosya_surecler` tablosu her aşama değişimini kayıt altına alıyor; geçmiş izlenebilir.
✅ **Otomatik SMS bildirimi** — Aşama değiştiğinde avukat + müşteri SMS alıyor (varsa telefonları).
✅ **v2.1.2 sistem-içi bildirim** — Atama değişimi yeni atanana ve eski atanmışa bildirim gidiyor.
✅ **Yetki bazlı görünüm filtresi** — Avukat rolü hassas verileri (kim atadı, kasa adı) görmüyor.
✅ **JOIN performansı kabul edilebilir** — Tek SQL bloğunda toplam veri çekiliyor; N+1 problemi yok.
✅ **Mağdur/araç düzenleme update.php içinde** — Ayrı endpoint'e gerek yok, tek istekte hepsi güncellenir.

---

## C. EKSİKLER VE SORUNLAR

### 🔴 KRİTİK — kullanıcı operasyonel hatasına yol açabilir

**1. Dosya KAPANDIKTAN sonra masraf/evrak ekleme engellenmiyor**
- **Frontend:** Kapanmış dosyada DOSYA KAPAT butonu gizleniyor ama MASRAF EKLE / EVRAK YÜKLE butonları çalışıyor.
- **Backend:** `masraf/create.php` ve `evrak/upload.php`'de `dosya.asama` kontrolü **yok**.
- **Etki:** Personel kapanmış dosyaya yanlışlıkla masraf eklerse muhasebe raporu bozulur, hakediş yeniden hesaplanmaz.
- **Öneri:** Backend'de `if dosya.asama === 'DOSYA KAPANDI' return 403`. Ya da admin için ayrıca yetki.

**2. "DOSYA KAPANDI" → tekrar açılma engeli yok**
- Frontend aşama dropdown'ında her aşama seçilebiliyor (DOSYA KAPANDI'dan DOSYA AÇIK'a geri dönüş mümkün).
- **Etki:** Yanlışlıkla tekrar açma → finansal kayıtlar yanıltıcı.
- **Öneri:** "DOSYA KAPANDI" sonrası geri açmayı sadece admin yetkisine bağla.

### 🟡 ORTA RİSK

**3. Aşama değiştirme yetki matrisinde tanımlı değil**
- `update.php`'de aşama değişimi `dosya-duzenle` yetkisi kontrolüne bağlı.
- **Etki:** "Düzenleme yetkili" personel tüm aşamalara geçiş yapabilir (örn. personel "DOSYA KAPANDI" yapabilir).
- **Öneri:** Ayrı `dosya-asama-degistir` yetkisi ekle. Belirli aşamalar için yetkilendirme matrisi (örn. sadece avukat "HUKUK DAVASI AÇILDI" yapabilir).

**4. Audit log yetersiz**
- `update.php` sadece "dosya_guncelle" olarak loglar; **hangi alanların değiştiği yazılmaz**.
- **Etki:** "Komisyon oranı kim tarafından %20'den %30'a çekildi?" sorusu cevapsız kalır.
- **Öneri:** `log_action()`'ı genişlet — değişen alanların eski/yeni değerlerini JSON olarak `detay` alanına yaz.

**5. Edit conflict tespiti yok (optimistic locking)**
- İki kullanıcı aynı anda dosyayı düzenlerse → son kaydeden kazanır, ilkin değişiklikleri sessizce ezilir.
- **Etki:** Birden çok kullanıcının aynı dosya üzerinde çalıştığı senaryolarda veri kaybı.
- **Öneri:** `dosyalar.updated_at` field'ını frontend'e gönder, PUT isteğinde geri al, eşleşmiyorsa 409 dön.

**6. Düzenle modal'ında alan kilidi yok**
- Hiçbir alan immutable işaretlenmemiş. dosya_no bile teorik olarak değiştirilebilir (backend kontrolüne göre).
- **Etki:** Kritik alanların (dosya_no, kaza_tarihi) yanlışlıkla değişmesi.
- **Öneri:** Backend'de bir whitelist olarak yalnız izin verilen alanları güncelle. Frontend'de kritik alanları `readOnly` yap.

**7. Dosya kapatma sonrası komisyon ödeme otomasyonu eksik/belirsiz**
- Dosya kapatıldığında: gelir kaydı + aşama set + (?) komisyon hesabı.
- Komisyon ödemesinin **otomatik tetiklenip tetiklenmediği update.php'de görülmüyor** (`paydas_komisyonlari.durum='odendi'` ne zaman set ediliyor?).
- **Etki:** Avukat/paydaşa otomatik komisyon ödemesi mi ödememi mi karışık.
- **Öneri:** Dosya kapatma akışında açıkça komisyon ödeme tetikleyicisini ekle — kasa seçimi + onay isteyebilir.

### 🟢 KOZMETİK

**8. Avukat rolü düzenleme modal'ında atama bölümünü görüyor**
- get.php'de avukat için `ortak_id` gizleniyor ama `editForm`'da atama bölümü gösteriliyor.
- **Çözüm:** Modal içinde `if (user.rol === 'avukat') hide AVUKAT ATAMASI`.

**9. Evrak yükleme yetki kontrolü zayıf**
- `evrak/upload.php`'de `auth_required(['admin', 'uzman', 'personel', 'avukat'])` var ama `dosya-evrak-yukle` gibi spesifik yetki yok.
- **Etki:** Avukat dahi tüm dosyalara evrak yükleyebilir.

**10. İl-ilçe doğrulaması frontend'e bırakılmış**
- Backend `kaza_il` ve `kaza_ilce` çift kontrolü yok. Frontend `ILCELER` sabitine güvenir.

---

## D. KENDİ FİKİRLERİM (mimari öneriler)

1. **Aşama matrisini DB'ye taşı** — Kod içinde sabit liste yerine `dosya_asama_tanimlari` tablosu (id, ad, sira, kapaniş_aşaması_mi, hangi_rol_değiştirebilir). Yeni aşama eklemek için kod değişikliği gerekmez.

2. **Dosya geçmişi sayfası ekle** — `dosya_surecler` zaten geçmişi tutuyor; detay sayfasına 5. sekme olarak "GEÇMİŞ" ekle. Kim, ne zaman, hangi alanı, neden değiştirdi (notlar) görsün.

3. **Kapanmış dosya — sadece okuma modu** — DOSYA KAPANDI olduğunda detay sayfası read-only olsun. Tek istisna: admin "yeniden aç" butonu (audit log + neden zorunlu).

4. **"İşlem akışı" wizard önerisi** — Yeni dosya açan personel "ADK dosyası açtım, şimdi ne yapmalıyım?" sorusuna yanıt arıyor. Aşama bazlı wizard: "DOSYA AÇIK aşamasındasınız → şu evrakları yüklemeniz gerekiyor: ruhsat, ehliyet, sigorta poliçesi" tipi rehberlik. `tanimlamalar` tablosunda zaten evrak türleri var, eşleştirme kolay.

5. **Edit conflict UI** — Optimistic locking eklenirse "Bu dosya başkası tarafından güncellendi, sayfa yenilensin mi?" mesajı kullanıcı dostu.

---

**Parça 2 tamam. Parça 3 (masraflar + AI + komisyon + KRİTİK bug'lar + öncelikli eylem listesi) yazılıyor.**
