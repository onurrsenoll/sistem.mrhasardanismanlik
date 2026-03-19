<p align="center">
  <strong>MR HASAR DANIŞMANLIK</strong><br/>
  <em>Dosya Takip Sistemi</em>
</p>

<h1 align="center">📘 KULLANIM KILAVUZU</h1>

<p align="center">
  <em>Sürüm 1.0 — Mart 2026</em><br/>
  <em>Hedef Kitle: Avukatlar ve Ofis Personeli</em>
</p>

---

# 📑 İÇİNDEKİLER

| # | Bölüm | Sayfa |
|---|-------|-------|
| 1 | [Giriş ve Genel Bilgiler](#1--giriş-ve-genel-bilgiler) | Sisteme giriş, menü, tema |
| 2 | [Ana Sayfa (Dashboard)](#2--ana-sayfa-dashboard) | Özet istatistikler |
| 3 | [Mesajlar ve Bildirimler](#3--mesajlar-ve-bildirimler) | İç mesajlaşma, bildirimler |
| 4 | [Ajanda](#4--ajanda) | Takvim, görev takibi |
| 5 | [CRM / Saha](#5--crm--saha) | Müşteri adayları, saha dosyaları |
| 6 | [Dosya İşlemleri](#6--dosya-i̇şlemleri) | Dosya açma, takip, aşamalar |
| 7 | [Poliçe Takibi](#7--poliçe-takibi) | Poliçe yönetimi, yenileme, tahsilat |
| 8 | [Hesaplamalar](#8--hesaplamalar) | ADK ve BH tazminat hesaplama |
| 9 | [İçtihat](#9--i̇çtihat) | Yargıtay, tahkim, emsal kararlar |
| 10 | [Paydaşlar ve Ortaklar](#10--paydaşlar-ve-ortaklar) | İş ortakları, paydaşlar, personel |
| 11 | [Muhasebe](#11--muhasebe) | Gelir, gider, kasa, raporlar |
| 12 | [Sistem Yönetimi](#12--sistem-yönetimi) | Kullanıcılar, yetkiler, ayarlar |
| 13 | [Sık Yapılan Hatalar](#13--sık-yapılan-hatalar) | Yaygın sorunlar ve çözümleri |
| 14 | [Veri Bütünlüğü](#14--veri-bütünlüğü) | Dikkat edilmesi gerekenler |
| 15 | [Sözlük](#15--sözlük) | Terimler ve kısaltmalar |

---

# 1. 🚀 Giriş ve Genel Bilgiler

## 1.1 Sistem Nedir?

MR Hasar Danışmanlık Dosya Takip Sistemi, sigorta hasar danışmanlığı süreçlerinin **baştan sona dijital ortamda yönetilmesini** sağlayan web tabanlı bir uygulamadır.

Bu sistem ile şunları yapabilirsiniz:

- ✅ Araç değer kaybı (ADK) ve bedeni hasar (BH) dosyalarını açıp takip etmek
- ✅ Müşteri adaylarını CRM ile yönetmek
- ✅ Saha personelinin dosya girişlerini onaylamak
- ✅ Tazminat hesaplamalarını otomatik yapmak (AI destekli)
- ✅ Tahkim ve Yargıtay emsal kararlarını aramak
- ✅ Poliçe takibi ve yenileme hatırlatmaları almak
- ✅ Muhasebe işlemlerini (gelir, gider, kasa) yönetmek
- ✅ Personel hakediş ve maaş takibi yapmak
- ✅ İç mesajlaşma ve ajanda ile ekip koordinasyonu sağlamak

## 1.2 Sisteme Giriş

### Giriş Adımları

1. **Tarayıcınızı açın** → Sistem URL adresine gidin
2. **E-posta adresinizi** girin (size verilen kurumsal e-posta)
3. **Şifrenizi** girin
4. **"GİRİŞ YAP"** butonuna tıklayın
5. **2FA Doğrulama** (aktifse): Cep telefonunuzdaki doğrulama uygulamasından 6 haneli kodu girin

> ⚠️ **ÖNEMLİ:** Şifrenizi 3 kez yanlış girerseniz hesabınız geçici olarak kilitlenir. Bu durumda sistem yöneticinize başvurun.

### Giriş Bilgileri

| Alan | Açıklama |
|------|----------|
| **E-posta** | Sistem yöneticisinin size tanımladığı e-posta adresi |
| **Şifre** | İlk girişte size verilen geçici şifre (hemen değiştirin!) |
| **2FA Kodu** | Google Authenticator veya benzeri uygulamadan alınan 6 haneli kod |

> ✅ **İPUCU:** Tarayıcınızda "Beni Hatırla" seçeneği varsa, güvenli bir bilgisayarda işaretleyebilirsiniz. Oturum bilginiz JWT token olarak saklanır.

## 1.3 Kullanıcı Rolleri

Sistemde **6 farklı kullanıcı rolü** bulunur. Her rol farklı menülere ve işlemlere erişebilir:

| Rol | Açıklama | Erişim Seviyesi |
|-----|----------|-----------------|
| 🔴 **Admin** | Sistem yöneticisi | Tüm modüller ve ayarlar |
| 🟣 **Avukat** | Hukuki süreç yöneticisi | Dosya, hesaplama, içtihat, muhasebe |
| 🔵 **Uzman** | Hasar danışmanı | Dosya, hesaplama, içtihat |
| 🟢 **Personel** | Ofis çalışanı | CRM, dosya, poliçe, temel işlemler |
| 🟡 **Muhasebe** | Mali işler sorumlusu | Muhasebe, kasa, raporlar |
| 🟠 **Portal** | Müşteri portalı kullanıcısı | Sadece kendi dosya bilgilerini görme |

> ⚠️ **NOT:** Menüde göremediğiniz bir bölüm varsa, rolünüze o yetki tanımlanmamış demektir. Sistem yöneticinizden yetki talep edin.

## 1.4 Ana Ekran ve Menü Yapısı

Sisteme giriş yaptığınızda karşınıza **sol menü çubuğu** ve **ana içerik alanı** gelir.

### Sol Menü Grupları

| Menü | Alt Sayfalar | Açıklama |
|------|-------------|----------|
| 🏠 **Ana Sayfa** | Dashboard | Genel istatistikler |
| ✉️ **Mesajlar** | Gelen/Giden/Yeni/Bildirimler | İç mesajlaşma sistemi |
| 📅 **Ajanda** | Takvim ve görev listesi | Kişisel görev takibi |
| 👥 **CRM** | Liste, Yeni Kayıt, Arama, Saha | Müşteri aday yönetimi |
| 📁 **Dosya İşlemleri** | Liste, Yeni Dosya | Hasar dosyası yönetimi |
| 📋 **Poliçe** | Liste, Yeni, Yenileme, Tahsilat, Rapor, Kazanç | Sigorta poliçe takibi |
| 🧮 **Hesaplamalar** | ADK Hesaplama, BH Hesaplama | Tazminat hesaplama araçları |
| ⚖️ **İçtihat** | Yargıtay, Tahkim, Poliçe Limit, Kusur Emsal | Hukuki emsal araştırma |
| 🤝 **Paydaşlar** | İş Ortakları, İş Paydaşları | Ortak ve yönlendiren yönetimi |
| 💰 **Muhasebe** | Gelir, Gider, Komisyon, Kasa, Raporlar... | Mali işlemler |
| ⚙️ **Sistem** | Kullanıcılar, Yetkiler, Ayarlar, Loglar... | Yönetim paneli (Admin) |

### Üst Çubuk

Ekranın üst kısmında şu öğeler bulunur:

- **Bildirim zili** 🔔 — Okunmamış bildirim sayısını gösterir
- **Mesaj ikonu** ✉️ — Okunmamış mesaj sayısını gösterir
- **Tema değiştirme** 🌙/☀️ — Koyu mod ve açık mod arasında geçiş
- **Kullanıcı adı** — Tıklandığında profil bilgilerinizi gösterir

## 1.5 Tema Değiştirme

Sistem iki görünüm modunu destekler:

- ☀️ **Açık Mod** — Beyaz arka plan, karanlık yazılar (varsayılan)
- 🌙 **Koyu Mod** — Koyu arka plan, açık renkli yazılar (göz yorgunluğunu azaltır)

Tema değiştirmek için üst çubuktaki **ay/güneş ikonuna** tıklamanız yeterlidir.

## 1.6 Genel Kullanım Mantığı

Sistemdeki tüm modüller benzer bir akışla çalışır:

```
LİSTE SAYFASI → DETAY/DÜZENLEME → KAYDET
```

1. **Liste sayfasından** başlarsınız (tablo görünümü)
2. Bir kayda **tıklayarak** detayına gidersiniz
3. Düzenleme yapıp **KAYDET** butonuna basarsınız
4. Yeni kayıt eklemek için **"+ YENİ"** butonunu kullanırsınız

> ✅ **İPUCU:** Listelerde arama kutusuna yazdığınızda sonuçlar otomatik filtrelenir. Enter'a basmanıza gerek yoktur.

---

# 2. 🏠 Ana Sayfa (Dashboard)

> **Modül Özeti**
> | Özellik | Değer |
> |---------|-------|
> | Erişim | Tüm kullanıcılar |
> | Menü Yolu | Ana Sayfa |
> | Amaç | Sistemin genel durumunu tek bakışta görmek |

Ana sayfa, sisteme giriş yaptığınızda karşınıza çıkan ilk ekrandır. Burada dosya istatistikleri, güncel bildirimler ve hızlı erişim kısayolları bulunur.

### Gördüğünüz Bilgiler

- **Toplam dosya sayısı** — Sistemdeki tüm dosyaların sayısı
- **ADK dosya sayısı** — Araç Değer Kaybı dosyaları
- **BH dosya sayısı** — Bedeni Hasar dosyaları
- **Açık dosya sayısı** — Henüz kapanmamış dosyalar

> ✅ **İPUCU:** Dashboard'daki istatistik kartlarına tıklayarak ilgili listelere hızlıca gidebilirsiniz.

---

# 3. ✉️ Mesajlar ve Bildirimler

> **Modül Özeti**
> | Özellik | Değer |
> |---------|-------|
> | Erişim | Tüm kullanıcılar |
> | Menü Yolu | Mesajlar |
> | Amaç | Kurum içi mesajlaşma ve sistem bildirimleri |
> | Sekmeler | Gelen Kutusu, Giden Kutusu, Yeni Mesaj, Sistem Bildirimleri |

## 3.1 Gelen Kutusu

Size gönderilen tüm mesajları burada görürsünüz.

### Mesaj Listesi Alanları

| Alan | Açıklama |
|------|----------|
| **Gönderen** | Mesajı gönderen kullanıcının adı |
| **Konu** | Mesaj konusu (maksimum 200 karakter) |
| **Öncelik** | Normal, Yüksek veya Acil |
| **Tarih** | Mesajın gönderilme tarihi ve saati |
| **Durum** | Okundu / Okunmadı (kalın yazı = okunmadı) |

### Mesaj İşlemleri

- 📖 **Okumak için** → Mesaj satırına tıklayın
- ↩️ **Yanıtlamak için** → Mesaj detayında "YANITLA" butonuna tıklayın (konu otomatik "YNT:" ile başlar)
- ➡️ **İletmek için** → "İLET" butonuna tıklayın (konu "İLT:" ile başlar)
- 🗑️ **Silmek için** → Mesajı seçip "SİL" butonuna tıklayın
- ☑️ **Toplu silme** → Birden fazla mesajı seçip toplu silebilirsiniz

## 3.2 Giden Kutusu

Gönderdiğiniz mesajların listesi burada görüntülenir. Aynı alan yapısına sahiptir, ancak "Gönderen" yerine **"Alıcı"** sütunu bulunur.

## 3.3 Yeni Mesaj Gönderme

Yeni mesaj oluşturmak için **"Yeni Mesaj"** sekmesine tıklayın.

### Mesaj Formu Alanları

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| **Alıcı** | ✅ Evet | Açılır listeden kullanıcı seçin |
| **Konu** | ✅ Evet | Mesaj konusu (maks. 200 karakter) |
| **İçerik** | ✅ Evet | Mesaj metni |
| **Öncelik** | Hayır | Normal (varsayılan), Yüksek, Acil |
| **Dosya Bağlantısı** | Hayır | Mesajı bir dosya ile ilişkilendirebilirsiniz |

### Gönderme Adımları

1. **Alıcı** seçin → Açılır listeden hedef kullanıcıyı bulun
2. **Konu** yazın → Mesajın neyle ilgili olduğunu belirtin
3. **İçerik** alanına mesajınızı yazın
4. **Öncelik** seviyesini gerekirse değiştirin
5. **GÖNDER** butonuna tıklayın

> ⚠️ **DİKKAT:** Gönderilen mesajlar geri alınamaz. Göndermeden önce alıcıyı kontrol edin.

## 3.4 Sistem Bildirimleri

Sistem tarafından otomatik oluşturulan bildirimler bu sekmede listelenir.

### Bildirim Türleri

| Tür | Simge | Açıklama |
|-----|-------|----------|
| **Bilgi** | 🔵 | Genel bilgilendirme mesajları |
| **Uyarı** | 🟡 | Dikkat edilmesi gereken durumlar |
| **Hata** | 🔴 | Sistem hataları veya acil durumlar |
| **Başarı** | 🟢 | Tamamlanan işlem bildirimleri |

> ✅ **İPUCU:** Üst çubuktaki 🔔 zil ikonundaki sayı, okunmamış bildirimlerinizi gösterir. Tıklayarak doğrudan bildirimlere gidebilirsiniz.

---

# 4. 📅 Ajanda

> **Modül Özeti**
> | Özellik | Değer |
> |---------|-------|
> | Erişim | Tüm kullanıcılar |
> | Menü Yolu | Ajanda |
> | Amaç | Kişisel görev ve etkinlik takibi |
> | Görünümler | Takvim ve Liste |

## 4.1 Takvim Görünümü

Etkinliklerinizi aylık takvim üzerinde görüntüleyebilirsiniz. Her gün kutucuğunda o güne ait etkinlikler renkli etiketler halinde görünür.

### Takvim İşlemleri

- **Bir güne tıklayın** → O gün için yeni etkinlik oluşturma penceresi açılır
- **Bir etkinliğe tıklayın** → Etkinlik detayı görüntülenir
- **◀ / ▶ okları** → Önceki/sonraki aya geçiş

## 4.2 Liste Görünümü

Tüm etkinliklerinizi tarih sırasına göre liste halinde görürsünüz. Bu görünümde filtreleme yapabilirsiniz.

### Filtreleme Seçenekleri

| Filtre | Seçenekler |
|--------|------------|
| **Öncelik** | Düşük, Normal, Yüksek, Acil |
| **Durum** | Aktif (tamamlanmamış), Tamamlanmış |

## 4.3 Yeni Etkinlik Oluşturma

### Etkinlik Formu Alanları

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| **Başlık** | ✅ Evet | Etkinliğin kısa adı |
| **Açıklama** | Hayır | Detaylı açıklama |
| **Tarih** | ✅ Evet | Başlangıç tarihi |
| **Bitiş Tarihi** | Hayır | Etkinliğin bitiş tarihi |
| **Hatırlatma** | Hayır | Ne zaman hatırlatma yapılacağı |
| **Öncelik** | Hayır | Düşük / Normal / Yüksek / Acil |
| **Renk** | Hayır | 8 farklı renk seçeneği (görsel ayrım için) |
| **Dosya Bağlantısı** | Hayır | Etkinliği bir dosya ile ilişkilendirme |

### Renk Seçenekleri

Etkinliklerinizi görsel olarak ayırt etmek için 8 farklı renk kullanabilirsiniz. Örneğin:
- 🔵 **Mavi** → Genel görevler
- 🔴 **Kırmızı** → Acil işler
- 🟢 **Yeşil** → Tamamlanması kolay işler
- 🟡 **Sarı** → Dikkat gerektiren işler

## 4.4 Etkinlik Yönetimi

### Tamamlama

Bir etkinliği tamamladığınızda, etkinlik satırındaki **✓ işaretine** tıklayarak tamamlandı olarak işaretleyebilirsiniz. Tamamlanan etkinlikler üstü çizili olarak görünür.

### Toplu Silme

Birden fazla etkinliği seçip **TOPLU SİL** butonu ile silebilirsiniz.

> ⚠️ **DİKKAT:** Silinen etkinlikler geri getirilemez!

### Dosya Bağlantısı

Bir etkinliği dosya ile ilişkilendirdiğinizde, etkinlik detayında **dosya numarasına tıklayarak** doğrudan dosya detayına gidebilirsiniz. Bu özellik özellikle duruşma tarihleri ve dosya takip işleri için çok faydalıdır.

> ✅ **İPUCU:** Ajandanızı düzenli kontrol edin. Yaklaşan duruşma tarihleri, evrak teslim süreleri ve müşteri randevuları için etkinlik oluşturmayı alışkanlık haline getirin.

---

# 5. 👥 CRM / Saha

> **Modül Özeti**
> | Özellik | Değer |
> |---------|-------|
> | Erişim | Personel ve üzeri roller |
> | Menü Yolu | CRM → Liste / Yeni Kayıt / Arama / Saha |
> | Amaç | Müşteri adaylarını takip etmek, saha dosyaları yönetmek |
> | Sekmeler | CRM Listesi, Yeni Kayıt, Arama Listesi, Saha Dosyaları |

CRM (Müşteri İlişkileri Yönetimi) modülü, potansiyel müşterilerin ilk temas noktasından dosya açılmasına kadarki süreci yönetir. Saha alt modülü ise saha personelinin sahadan girdiği dosyaları onay sürecine tabi tutar.

## 5.1 CRM Listesi

Tüm müşteri adayı kayıtlarını bu sayfada görürsünüz.

### İstatistik Kartları

| Kart | Açıklama |
|------|----------|
| **Toplam Kayıt** | Sistemdeki tüm CRM kayıtlarının sayısı |
| **Yeni** | Henüz işlem yapılmamış kayıtlar |
| **Takipte** | Görüşmeleri devam eden kayıtlar |
| **Olumlu** | Dosyaya dönüşme potansiyeli olan kayıtlar |

### CRM Durumları

| Durum | Renk | Açıklama |
|-------|------|----------|
| **Yeni** | 🔵 Mavi | Yeni gelen, henüz değerlendirilmemiş |
| **Takipte** | 🟡 Sarı | Görüşmeler devam ediyor |
| **Olumlu** | 🟢 Yeşil | Dosya açılacak, olumlu sonuçlanmış |
| **Olumsuz** | 🔴 Kırmızı | Dosya açılmayacak, reddedilmiş |

### Müşteri Kaynakları

CRM kaydının nereden geldiğini belirtir:

- 📞 **TELEFON** — Telefonla arayan müşteri
- 🌐 **WEB FORMU** — İnternet sitesinden gelen başvuru
- 📱 **SOSYAL MEDYA** — Sosyal medya kanallarından gelen
- 🤝 **YÖNLENDİRME** — Başka bir müşteri veya paydaş yönlendirmesi
- ➕ **DİĞER** — Diğer kanallar

### Filtreleme ve Arama

- **Arama kutusu** → İsim, T.C. No veya plaka ile arama
- **Durum filtresi** → Yeni / Takipte / Olumlu / Olumsuz
- **Kaynak filtresi** → Telefon / Web Formu / Sosyal Medya vb.

### CRM İşlemleri

- **Durum değiştirme** → Satırdaki açılır menüden durumu güncelleyebilirsiniz
- **Düzenleme** → Kalem ikonuna tıklayarak kayıt bilgilerini düzenleyin
- **Silme** → Çöp kutusu ikonuna tıklayın (admin yetkisi gerektirir)
- **Toplu silme** → Birden fazla seçip toplu silebilirsiniz

## 5.2 Yeni CRM Kaydı

### Form Alanları

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| **Ad Soyad** | ✅ Evet | Müşteri adayının tam adı |
| **T.C. / Vergi No** | Hayır | Kimlik veya vergi numarası |
| **Telefon** | Hayır | İletişim telefonu |
| **E-posta** | Hayır | E-posta adresi |
| **İl** | Hayır | Müşterinin bulunduğu il (81 il listesi) |
| **İlçe** | Hayır | Seçilen ile göre ilçe listesi |
| **Plaka** | Hayır | Araç plakası |
| **Marka** | Hayır | Araç markası (24 marka listesi) |
| **Model** | Hayır | Seçilen markaya göre model listesi |
| **Araç Yılı** | Hayır | Aracın model yılı |
| **Araç KM** | Hayır | Kilometre bilgisi |
| **Olay Açıklama** | Hayır | Kazanın / olayın kısa açıklaması |
| **Dosya Türü** | Hayır | ADK / BH / MDK |
| **Kaynak** | Hayır | Müşterinin hangi kanaldan geldiği |
| **Durum** | Hayır | Yeni (varsayılan) / Takipte / Olumlu / Olumsuz |
| **Öncelik** | Hayır | Normal / Yüksek / Acil |

### Kayıt Adımları

1. **Ad Soyad** alanını doldurun
2. **Telefon** numarasını girin (geri arama için)
3. **Olay açıklamasını** yazın (ne olduğunu kısaca belirtin)
4. **Dosya türünü** seçin (ADK mi, BH mi?)
5. Araç bilgilerini girin (marka, model, yıl, plaka)
6. **KAYDET** butonuna tıklayın

> ✅ **İPUCU:** CRM kaydı "Olumlu" duruma geldiğinde, bu kaydı doğrudan dosyaya dönüştürebilirsiniz. Bu işlem, müşteri bilgilerini yeni dosya formuna otomatik aktarır.

## 5.3 CRM'den Dosyaya Dönüştürme

Bir CRM kaydını dosyaya dönüştürmek için:

1. CRM listesinde ilgili kaydı bulun
2. Kaydın durumunu **"Olumlu"** yapın
3. **"DOSYAYA DÖNÜŞTÜR"** butonuna tıklayın
4. Yeni dosya formu, CRM'deki bilgilerle önceden doldurulmuş olarak açılır
5. Eksik alanları doldurup dosyayı kaydedin

> ⚠️ **DİKKAT:** Dönüştürme işlemi geri alınamaz. CRM kaydı "Dosyaya Dönüştü" durumuna geçer.

## 5.4 Arama Listesi

Telefon yönlendirme ve geri arama takibi için kullanılır. CRM'deki kayıtlardan aranması gerekenleri bu listede takip edebilirsiniz.

## 5.5 Saha Dosyaları

Saha personelinin sahadan girdiği dosyaları yönetmek için kullanılır. **3 günlük onay süreci** ile çalışır.

### Saha Dosya Durumları

| Durum | Renk | Açıklama |
|-------|------|----------|
| **Taslak** | ⚪ Gri | Henüz onaya gönderilmemiş |
| **Onay Bekliyor** | 🟡 Sarı | Ofis onayı bekleniyor (3 gün süre) |
| **Onaylandı** | 🟢 Yeşil | Ofis tarafından onaylandı |
| **Reddedildi** | 🔴 Kırmızı | Ofis tarafından reddedildi |
| **Dosyaya Dönüştü** | 🟣 Mor | Gerçek dosyaya dönüştürülmüş |
| **Süresi Doldu** | ⚪ Gri | 3 gün içinde onaylanmadı |

### 3 Günlük Onay Süreci

Saha personeli bir dosya girip onaya gönderdiğinde, ofis tarafının **3 gün** içinde onaylaması veya reddetmesi gerekir. Kalan süre her dosyada geri sayım olarak gösterilir:

- 🟢 **2+ gün kalan** → Yeşil gösterge
- 🟡 **1 gün kalan** → Sarı gösterge (acele edin!)
- 🔴 **Birkaç saat kalan** → Kırmızı gösterge (son şans!)

> ⚠️ **ÖNEMLİ:** 3 gün içinde onaylanmayan saha dosyaları otomatik olarak "Süresi Doldu" durumuna geçer!

### Saha Dosyası Alanları

| Alan | Açıklama |
|------|----------|
| **Mağdur Bilgileri** | Ad soyad, T.C., telefon, adres |
| **Hasar Tipi** | Trafik Kazası, DASK, Yangın, Su Baskın, Hırsızlık, Diğer |
| **Hasar Durumu** | Dosya Açık, Dosya Kapalı, Onarım Devam Ediyor |
| **Dosya Kaynağı** | Yönlendiren, Servis, Acente, Anlaşmalı Kurum, Bireysel, Diğer |
| **Kusur Durumu** | %0, %25, %50, %75, %100 |
| **Araç Bilgileri** | Marka, model, yıl, plaka, renk, şasi, motor |
| **Sigorta Bilgileri** | Şirket, poliçe no, hasar no |
| **Medya/Evrak** | Fotoğraf ve belge yükleme (JPG, PNG, PDF — maks. 20MB) |

### Medya Yükleme

Saha dosyalarına **sürükle-bırak** veya **tıklayarak** dosya yükleyebilirsiniz:
- Desteklenen formatlar: **JPG, PNG, PDF**
- Maksimum dosya boyutu: **20 MB**
- Yüklenen dosyaları **önizleyebilir** ve **indirebilirsiniz**

---
