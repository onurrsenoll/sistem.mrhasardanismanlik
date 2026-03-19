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

# 6. 📁 Dosya İşlemleri

> **Modül Özeti**
> | Özellik | Değer |
> |---------|-------|
> | Erişim | Personel, avukat ve üzeri roller |
> | Menü Yolu | Dosya İşlemleri → Liste / Yeni Dosya |
> | Amaç | Hasar dosyalarını açmak, takip etmek ve yönetmek |
> | Dosya Türleri | ADK (Araç Değer Kaybı), BH (Bedeni Hasar), MDK (Motor Değer Kaybı) |

Bu modül, sistemin **en temel ve en kapsamlı** modülüdür. Bir hasar dosyasının açılmasından kapanmasına kadar tüm süreç burada yönetilir.

## 6.1 Dosya Listesi

### İstatistik Kartları

| Kart | Açıklama |
|------|----------|
| **Toplam** | Sistemdeki tüm dosya sayısı |
| **ADK** | Araç Değer Kaybı dosyaları |
| **BH** | Bedeni Hasar dosyaları |
| **Açık** | Kapanmamış aktif dosyalar |

### Filtreleme ve Arama

| Filtre | Açıklama |
|--------|----------|
| **Arama kutusu** | Dosya no, ad soyad, T.C. no, plaka ile arama |
| **Dosya Türü** | ADK / BH / Tümü |
| **Aşama** | 53 farklı dosya aşamasından birini seçin |

### Dışa Aktarma

- 📊 **Excel** → Dosya listesini .xlsx formatında indirin
- 📄 **PDF** → Dosya listesini PDF olarak kaydedin
- 🖨️ **Yazdır** → Doğrudan yazıcıya gönderin

### Toplu Silme (Sadece Admin)

Admin rolüne sahip kullanıcılar, birden fazla dosyayı seçip **TOPLU SİL** butonu ile silebilir.

> ⚠️ **UYARI:** Toplu silme işlemi GERİ ALINAMAZ! Silinen dosyaların tüm masraf, evrak ve hesap bilgileri de silinir.

### Sayfalama

Dosya listesi **sayfa başına 25 kayıt** gösterir. Alt kısımdaki sayfa numaraları ile diğer sayfalara geçebilirsiniz.

## 6.2 Yeni Dosya Oluşturma

Yeni dosya açmak için **"+ YENİ DOSYA"** butonuna tıklayın. Form 6 ana bölümden oluşur:

### Bölüm A: Mağdur Bilgileri

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| **Ad Soyad** | ✅ Evet | Mağdurun tam adı soyadı |
| **T.C. Kimlik No** | ✅ Evet | 11 haneli T.C. kimlik numarası |
| **Telefon** | ✅ Evet | İletişim telefon numarası |
| **E-posta** | Hayır | E-posta adresi |
| **İl** | ✅ Evet | 81 ilden birini seçin |
| **İlçe** | Hayır | Seçilen ile göre ilçe listesi |
| **Adres** | Hayır | Açık adres bilgisi |

### Bölüm B: Dosya Bilgileri

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| **Dosya Türü** | ✅ Evet | ADK, BH veya MDK |
| **Kaza Tarihi** | ✅ Evet | Kazanın gerçekleştiği tarih |
| **Kaza İli** | Hayır | Kazanın olduğu il |
| **Komisyon Oranı (%)** | ✅ Evet | Danışmanlık komisyon oranı |
| **Sorumlu** | ✅ Evet | Dosyadan sorumlu kullanıcı |
| **Dosya Kaynağı** | ✅ Evet | Dosyanın geldiği kaynak |

> ⚠️ **ÖNEMLİ:** Dosya türü seçimi, formun geri kalanını etkiler! ADK seçerseniz araç bilgileri bölümü, BH seçerseniz sürücü ve tıbbi bilgiler bölümü görünür.

### Bölüm C: Paydaş / Yönlendiren

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| **Dosya Kaynağı** | ✅ Evet | "PAYDAŞ/YÖNLENDİREN" seçildiğinde paydaş alanı aktif olur |
| **Paydaş** | Koşullu ✅ | Kaynak "PAYDAŞ/YÖNLENDİREN" ise zorunlu |

> ✅ **İPUCU:** Paydaş seçildiğinde, ilgili paydaşın ADK veya BH prim oranı otomatik gösterilir.

### Bölüm D: Sigorta Bilgileri

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| **Sigorta Şirketi** | ✅ Evet | 52 sigorta şirketinden birini seçin |
| **Hasar No** | ✅ Evet | Sigorta şirketinden alınan hasar numarası |
| **Poliçe No** | Hayır | Sigorta poliçe numarası |

### Bölüm E: Araç Bilgileri (ADK/MDK Dosyaları İçin)

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| **Mağdur Plaka** | ✅ Evet (ADK/MDK) | Mağdura ait araç plakası |
| **Karşı Plaka** | Hayır | Karşı taraf araç plakası |
| **Marka** | Hayır | 24 araç markasından seçim |
| **Model** | Hayır | Markaya göre model listesi |
| **Araç Yılı** | Hayır | Model yılı |
| **Araç KM** | Hayır | Kilometre bilgisi |

### Bölüm F: Araç & Sürücü Bilgileri (BH Dosyaları İçin)

BH dosyalarında ek olarak sürücü ve tıbbi bilgi alanları görünür:

| Alan | Açıklama |
|------|----------|
| **Sürücü Adı** | Kaza anındaki sürücünün adı |
| **Sürücü T.C.** | Sürücünün T.C. kimlik numarası |
| **Araç Plaka** | Kaza yapan aracın plakası |

### Bölüm G: Notlar

| Alan | Açıklama |
|------|----------|
| **Notlar** | Dosya ile ilgili serbest metin notları |

### Dosya Kaydetme Adımları

1. **Mağdur bilgilerini** doldurun (ad, T.C., telefon, il)
2. **Dosya türünü** seçin (ADK / BH / MDK)
3. **Kaza tarihini** girin
4. **Komisyon oranını** ve **sorumluyu** belirleyin
5. **Sigorta bilgilerini** girin (şirket, hasar no)
6. Dosya türüne göre **araç/sürücü bilgilerini** doldurun
7. **KAYDET** butonuna tıklayın

> ⚠️ **KRİTİK:** Dosya kaydedildikten sonra dosya türü değiştirilemez! ADK/BH seçimini dikkatle yapın.

## 6.3 Dosya Detayı

Bir dosyaya tıkladığınızda detay sayfası açılır. Bu sayfa **4 sekmeden** oluşur:

### Sekme 1: Bilgi

Dosyanın tüm temel bilgilerini görüntüler ve düzenlemenize olanak tanır.

**Aşama Değiştirme:**
Dosyanın mevcut aşamasını değiştirebilirsiniz. Sistem **53 farklı aşama** tanımlar. Aşama değiştirildiğinde mağdura otomatik **SMS bildirimi** gönderilir.

**Portal Erişimi Oluşturma:**
Müşterinin dosya durumunu portal üzerinden takip edebilmesi için portal erişimi oluşturabilirsiniz. Bu işlem otomatik kullanıcı adı ve şifre üretir.

**Dosya Düzenleme:**
"DÜZENLE" butonuna tıklayarak dosyanın tüm bilgilerini güncelleyebilirsiniz.

**Dosya Kapatma:**
"DOSYAYI KAPAT" butonu ile dosyayı kapatabilirsiniz. Kapatma işleminde mali uzlaşma bilgileri girilir.

### Sekme 2: Masraf

Dosyaya ait masrafları yönetirsiniz.

| Alan | Açıklama |
|------|----------|
| **Masraf Türü** | 22 farklı masraf kaleminden seçim |
| **Tutar** | Masraf tutarı (₺) |
| **Açıklama** | Masrafın detayı |
| **Tarih** | Masraf tarihi |
| **Ödeme Durumu** | Ödendi / Ödenmedi |

**22 Masraf Kalemi:**
Yönlendiren Ücreti, Dosya Prim Ödemesi, Vekaletname, Dosya Çıkarma, Islah Harcı, Kargo, Gider Avansı, Mahkeme, Hastane Evrakı, İcra Masrafı, Heyet ve Adli Tıp Masrafı, Yakıt, Azilname, Baro Pulu, Ceza Dava Masrafı, Fotokopi, Yol Ücreti, Mirasçılık Belgesi, Tercüman Ücreti, Dosya Masrafı, Heyet-Fotokopi, Heyet-Otopark

**Masraf İşlemleri:**
- ➕ Masraf ekleme
- 💰 Masrafı ödendi olarak işaretleme
- 🗑️ Masraf silme

### Sekme 3: Evrak

Dosyaya ait evrakları yükleyip yönetirsiniz.

**Evrak Yükleme:**
- Sürükle-bırak veya tıklayarak dosya seçin
- Desteklenen formatlar: **PDF, JPG, PNG, DOC, DOCX, XLS, XLSX**
- Maksimum boyut: **20 MB**
- Evrak türünü listeden seçin (60+ evrak türü)

**Evrak İşlemleri:**
- 👁️ **Önizleme** — Evrakı tarayıcıda görüntüleyin
- ⬇️ **İndirme** — Evrakı bilgisayarınıza kaydedin
- 🗑️ **Silme** — Evrakı dosyadan kaldırın

### Sekme 4: Hesap

Dosyanın mali özetini görüntüler:
- Toplam gelir
- Toplam gider
- Toplam masraf
- Komisyon tutarı
- Net kar/zarar

## 6.4 Dosya Aşamaları (53 Aşama)

Bir dosya açıldığında "DOSYA AÇIK" aşamasında başlar ve çeşitli süreçlerden geçerek "DOSYA KAPANDI" aşamasına ulaşır.

### Başlangıç Aşamaları

| # | Aşama |
|---|-------|
| 1 | DOSYA AÇIK |
| 2 | EVRAK BEKLENİYOR |
| 3 | BAŞVURU HAZIRLANIYOR |
| 4 | MAĞDUR İLE GÖRÜŞMELER DEVAM ETMEKTEDİR |

### Başvuru Aşamaları

| # | Aşama |
|---|-------|
| 5 | SİGORTA ŞİRKETİNE BAŞVURU YAPILMIŞTIR |
| 6 | İDARİ BAŞVURU YAPILMIŞTIR |
| 7 | SİGORTA TAHKİM KOMİSYONUNA BAŞVURU YAPILMIŞTIR |
| 8 | DOSYA TAHKİM HAKEMİNE SEVK EDİLMİŞTİR |

### Arabuluculuk Aşamaları

| # | Aşama |
|---|-------|
| 12 | ARABULUCULUK BAŞVURUSU YAPILDI |
| 13 | ARABULUCULUK — TOPLANTI GÜNÜ BEKLENMEKTEDİR |
| 14 | ARABULUCULUK — RAPOR BEKLENMEKTEDİR |
| 15 | ARABULUCULUK ANLAŞMA TUTANAĞI TUTULDU, ÖDEME BEKLENMEKTEDİR |
| 16 | ARABULUCULUK GÖRÜŞMELER OLUMSUZ SONUÇLANDI |

### Dava Aşamaları

| # | Aşama |
|---|-------|
| 18 | HUKUK DAVANIZ AÇILMIŞTIR — ÖN İNCELEME AŞAMASINDA |
| 19 | ÖN İNCELEME DURUŞMA GÜNÜ VERİLMİŞTİR |
| 20 | ÖN İNCELEME DURUŞMASI YAPILMIŞTIR |

### Bilirkişi ve Rapor Aşamaları

| # | Aşama |
|---|-------|
| 25 | ADLİ TIP KURUMUNDAN KUSUR RAPORU BEKLENİLMEKTEDİR |
| 26 | ADLİ TIP KURUMUNDAN SAKATLIK RAPORU BEKLENİLMEKTEDİR |
| 30 | MALULİYET/KUSUR RAPORU GELMİŞTİR — BİLİRKİŞİYE SEVK EDİLECEKTİR |
| 34 | DOSYANIN HESAP RAPORU GELMİŞTİR — ISLAH EDİLECEKTİR |

### Karar ve Kapanış Aşamaları

| # | Aşama |
|---|-------|
| 37 | DOSYANIZ KARARA ÇIKTI — GEREKÇELİ KARAR BEKLENMEKTEDİR |
| 38 | GEREKÇELİ KARAR YAZILDI — İCRA İŞLEMLERİ BAŞLATILMIŞTIR |
| 51 | ÖDEME BEKLENİYOR |
| 52 | ÖDEME ALINDI |
| 53 | DOSYA KAPANDI |

> ⚠️ **ÖNEMLİ:** Aşama değişikliği yapıldığında mağdura otomatik SMS gönderilir. Yanlış aşama seçmemeye dikkat edin!

> ✅ **İPUCU:** Tam aşama listesini görmek için dosya detayındaki aşama açılır menüsüne tıklayın.

---

# 7. 📋 Poliçe Takibi

> **Modül Özeti**
> | Özellik | Değer |
> |---------|-------|
> | Erişim | Personel ve üzeri roller |
> | Menü Yolu | Poliçe → Liste / Yeni / Yenileme / Tahsilat / Rapor / Kazanç |
> | Amaç | Sigorta poliçelerini yönetmek, yenileme takibi, tahsilat izleme |
> | Sekmeler | Poliçe Listesi, Yeni Poliçe, Yenileme Takibi, Tahsilat/Cari, Raporlar, Kazanç |

## 7.1 Poliçe Listesi

### İstatistik Kartları

| Kart | Açıklama |
|------|----------|
| **Toplam Poliçe** | Sistemdeki tüm poliçe sayısı |
| **Aktif Poliçe** | Süresi devam eden poliçeler |
| **Toplam Prim** | Tüm poliçelerin brüt prim toplamı |
| **Tahsil Edilen** | Müşterilerden tahsil edilen toplam |
| **Bekleyen** | Henüz tahsil edilmemiş tutarlar |

### Filtreleme

| Filtre | Seçenekler |
|--------|------------|
| **Arama** | Poliçe no, müşteri adı, plaka ile arama |
| **Durum** | Aktif, Süresi Doldu, İptal, Yenilendi |
| **Branş** | Kasko, Trafik, DASK, Konut, Sağlık, Hayat ve 7 branş daha |
| **Tahsilat** | Beklemede, Kısmi Tahsil, Tahsil Edildi |

### Branş Listesi (13 Branş)

Kasko, Trafik, DASK, Konut, İşyeri, Sağlık, Hayat, Yangın, Nakliyat, Mühendislik, Sorumluluk, Ferdi Kaza, Diğer

## 7.2 Yeni Poliçe

### Poliçe Form Alanları

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| **Poliçe No** | ✅ Evet | Sigorta şirketinden alınan poliçe numarası |
| **Müşteri Adı** | ✅ Evet | Poliçe sahibinin adı soyadı |
| **Müşteri Telefon** | Hayır | İletişim telefonu |
| **Sigorta Şirketi** | ✅ Evet | 52 sigorta şirketinden seçim |
| **Branş** | ✅ Evet | Poliçe branşı (Kasko, Trafik vb.) |
| **Poliçe Türü** | Hayır | Yeni / Yenileme / Zeyil |
| **Plaka** | Hayır | Araç plakası (varsa) |
| **Brüt Prim** | ✅ Evet | Toplam prim tutarı (₺) |
| **Net Prim** | Hayır | İndirim sonrası prim |
| **Komisyon Oranı (%)** | Hayır | Komisyon yüzdesi |
| **Komisyon Tutarı** | Hayır | Otomatik hesaplanır |
| **Tanzim Tarihi** | Hayır | Poliçenin düzenlenme tarihi |
| **Başlangıç Tarihi** | ✅ Evet | Poliçenin geçerlilik başlangıcı |
| **Bitiş Tarihi** | ✅ Evet | Poliçenin sona erme tarihi |
| **Hatırlatma (Gün)** | Hayır | Bitiş tarihinden kaç gün önce hatırlatma |

### Ödeme Şekilleri

Nakit, Havale/EFT, Kredi Kartı, Çek, Diğer

## 7.3 Yenileme Takibi

Süresi dolmak üzere olan poliçelerin listesi. Hatırlatma günü ayarına göre otomatik uyarı verir.

## 7.4 Tahsilat / Cari

Poliçe tahsilatlarını takip edin:
- Tahsilat eklemek için poliçe detayında **"TAHSİLAT EKLE"** butonuna tıklayın
- **Kasa seçimi** yaparak tahsilatı ilgili kasaya kaydedin
- Tahsilat ilerleme çubuğu (%0 - %100) ile durumu izleyin

### Tahsilat Durumları

| Durum | Açıklama |
|-------|----------|
| 🔴 **Beklemede** | Henüz ödeme alınmamış |
| 🟡 **Kısmi Tahsil** | Kısmen ödenmiş |
| 🟢 **Tahsil Edildi** | Tamamı ödenmiş |

## 7.5 Raporlar ve Kazanç

Poliçe bazlı raporlar ve kazanç analizleri bu sekmelerde görüntülenir.

---

# 8. 🧮 Hesaplamalar

> **Modül Özeti**
> | Özellik | Değer |
> |---------|-------|
> | Erişim | Uzman ve avukat rolleri |
> | Menü Yolu | Hesaplamalar → ADK Hesaplama / BH Hesaplama |
> | Amaç | Tazminat tutarlarını hesaplamak |
> | Özellikler | AI destekli analiz, PDF rapor, emsal karşılaştırma |

## 8.1 Araç Değer Kaybı (ADK) Hesaplama

Araç değer kaybı hesaplaması **3 farklı yöntemle** yapılır ve sonuçlar karşılaştırmalı olarak gösterilir.

### ADK Form Alanları

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| **Marka** | ✅ Evet | 24 araç markasından seçim |
| **Model** | ✅ Evet | Markaya göre model listesi |
| **Yıl** | ✅ Evet | Aracın model yılı (2005'ten günümüze) |
| **Kilometre** | ✅ Evet | Aracın kilometre bilgisi |
| **Kaza Tarihi** | Hayır | Kazanın gerçekleştiği tarih |
| **Onarım Bedeli** | ✅ Evet | Aracın onarım masrafı (₺) |
| **Kusur Oranı** | ✅ Evet | Karşı tarafın kusur oranı (%0-%100) |
| **Önceki Hasar** | Hayır | Daha önce kaç kez hasar görmüş (0-3+) |
| **Hasarlı Bölge** | Hayır | Ön, Yan, Arka, Tavan |
| **Plaka** | Hayır | Araç plakası (rapor için) |

### Hesaplama Adımları

1. **Araç bilgilerini** girin (marka, model, yıl, km)
2. **RAYİÇ ARAŞTIR** butonuna tıklayın → Sistem otomatik olarak piyasa rayiç değerini araştırır (sahibinden.com, araban.com ilanlarından)
3. Rayiç değer otomatik dolacaktır, gerekirse düzenleyin
4. **Onarım bedelini** girin
5. **Kusur oranını** belirleyin (%100 = kusursuz, tazminat alır)
6. **HESAPLA** butonuna tıklayın

### 3 Hesaplama Yöntemi

#### Yöntem 1: Tahkim Formülü
Sigorta Tahkim Komisyonu'nun resmi hesaplama yöntemi.

```
DK = Rayiç × Baz Oran × Yaş Katsayısı × KM Katsayısı × Bölge Katsayısı × Önceki Hasar Katsayısı
```

**Katsayılar:**
- **Yaş Katsayısı:** 1 yaş = 1.00, 5 yaş = 0.78, 10+ yaş = 0.35
- **KM Katsayısı:** <30K = 1.00, 60-100K = 0.88, 200K+ = 0.50
- **Bölge:** Ön = 1.00, Yan = 0.90, Arka = 0.85, Tavan = 0.75
- **Önceki Hasar:** 0 = 1.00, 1 = 0.85, 2 = 0.70, 3+ = 0.55

#### Yöntem 2: Yargıtay İçtihadı
Yargıtay 17. HD / 4. HD kararları bazında hesaplama.

```
DK = Rayiç × Hasar Etkisi × (1 - Yıpranma) × Bölge Katsayısı × Önceki Hasar Katsayısı
```

#### Yöntem 3: Tahkim Emsal Ortalaması
Aynı marka/model/yaş grubundaki tahkim kararlarının ortalaması.

### AI Analizi

Hesaplama tamamlandıktan sonra sistem otomatik olarak **Gemini AI** ile analiz yapar ve şunları sunar:
- Hangi yöntemin daha avantajlı olduğu
- Emsal kararlar ile karşılaştırma
- Tahmini tazminat aralığı
- Başvuru stratejisi önerisi

### PDF Rapor İndirme

Hesaplama sonuçlarını profesyonel bir **PDF rapor** olarak indirebilirsiniz. Rapor şunları içerir:
- Araç ve hasar bilgileri
- 3 yöntem karşılaştırması
- Piyasa rayiç analizi (ilanlar)
- Tahkim emsal kararları
- AI analiz yorumu

> ✅ **İPUCU:** PDF raporunu doğrudan tahkim başvurusuna veya mahkemeye sunabilirsiniz.

## 8.2 Bedeni Hasar (BH) Hesaplama

İş göremezlik tazminatı hesaplaması yapar. **Hızlı** ve **Detaylı** olmak üzere iki mod sunar.

### BH Form Alanları

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| **Mağdur Adı** | Hayır | Mağdurun adı soyadı |
| **Dava Türü** | Hayır | Trafik Kazası, İş Kazası, Malpraktis, Diğer |
| **Doğum Tarihi** | ✅ Evet | Mağdurun doğum tarihi |
| **Cinsiyet** | ✅ Evet | Erkek / Kadın |
| **Kaza Tarihi** | ✅ Evet | Kazanın gerçekleştiği tarih |
| **Hesap Tarihi** | Hayır | Hesaplama yapılacak tarih (varsayılan: bugün) |
| **Maluliyet Oranı (%)** | ✅ Evet | Sağlık kurulu raporundaki oran (1-100) |
| **Meslek** | Hayır | Mağdurun mesleği |
| **Aylık Gelir (₺)** | Koşullu | Asgari ücret kullanılmıyorsa zorunlu |
| **Asgari Ücret Kullan** | Hayır | İşaretlenirse otomatik asgari ücret kullanılır |
| **PMF Tablosu** | Hayır | TRH2010 (varsayılan), CSO1980, PMF1931 |
| **Teknik Faiz (%)** | Hayır | Varsayılan %1.8 |
| **Kusur Oranı (%)** | Hayır | Karşı taraf kusur oranı |

### Ek Hesaplama Seçenekleri

| Seçenek | Açıklama |
|---------|----------|
| **Geçici İş Göremezlik** | Aktifleştirilirse gün sayısı girilir |
| **Bakıcı Ücreti** | Aktifleştirilirse gün sayısı girilir |
| **PSD (Peşin Sermaye Değeri)** | Sigortanın ödediği tutar düşülür |
| **Tam Hayat** | İşaretlenirse aktif/pasif ayrımı yapılmaz |
| **Yaş Yuvarlama** | Yaşı tam sayıya yuvarlar |

### BH Hesaplama Formülü

```
TOPLAM = Aktif Dönem Kaybı + Pasif Dönem Kaybı + GİG + Bakıcı - PSD
```

- **Aktif Dönem:** Hesap yaşından 65 yaşına kadar (meslek geliri ile)
- **Pasif Dönem:** 65 yaşından ömür sonuna kadar (asgari ücret ile)
- **GİG:** Geçici İş Göremezlik (günlük gelir × gün sayısı)
- **Bakıcı:** Asgari ücret üzerinden günlük bakıcı × gün sayısı

### OCR ile Otomatik Form Doldurma

Sağlık kurulu raporu veya diğer belgeleri **sürükle-bırak** ile yükleyerek OCR ile otomatik form doldurabilirsiniz. Sistem AI ile belgedeki bilgileri tanıyıp forma aktarır.

### PMF Yaşam Tabloları

| Tablo | Açıklama | Kullanım |
|-------|----------|----------|
| **TRH2010** | Türk hayat tablosu (2010) | En güncel, varsayılan |
| **CSO1980** | Amerikan hayat tablosu | Bazı mahkemeler tercih eder |
| **PMF1931** | Eski hayat tablosu | Tarihsel karşılaştırma |

> ⚠️ **ÖNEMLİ:** PMF tablosu seçimi tazminat tutarını önemli ölçüde etkiler. TRH2010 daha yüksek beklenen ömür verir, dolayısıyla daha yüksek tazminat çıkar.

---

# 9. ⚖️ İçtihat

> **Modül Özeti**
> | Özellik | Değer |
> |---------|-------|
> | Erişim | Uzman ve avukat rolleri |
> | Menü Yolu | İçtihat → Yargıtay / Tahkim / Poliçe Limit / Kusur Emsal |
> | Amaç | Hukuki emsal kararları araştırmak |
> | Özellikler | AI destekli arama (Gemini), detaylı karar kartları |

## 9.1 Yargıtay Kararları

Yargıtay kararlarını anahtar kelime ile arayabilirsiniz.

### Arama Adımları

1. **Konu / Anahtar Kelime** alanına arama teriminizi yazın (ör: "araç değer kaybı", "maluliyet oranı")
2. **ARA** butonuna tıklayın
3. Sistem **Gemini AI** ile ilgili kararları arar ve listeler

### Karar Kartı Bilgileri

Her sonuç kartında şu bilgiler görünür:
- **Dosya No** — Yargıtay dosya/karar numarası
- **Tarih** — Karar tarihi
- **Kaynak** — Kararın alındığı kaynak
- **Özet** — Kararın kısa özeti
- **Tutar** — Hükmedilen tazminat tutarı
- **Detay** — Genişletildiğinde tam metin
- **Hukuki Dayanak** — İlgili kanun maddeleri
- **Daire** — Yargıtay dairesi
- **Anahtar Kelimeler** — Etiketler

## 9.2 Tahkim Kabul Örnekleri

Sigorta Tahkim Komisyonu kararlarını arayabilirsiniz. Arama sonuçlarında istatistikler gösterilir:
- **Toplam bulunan** karar sayısı
- **Ortalama tutar** / **En yüksek tutar** / **En düşük tutar**
- **Ortalama değer kaybı**

### Yerleşik Tahkim Veritabanı

Sistem **20+ güncel tahkim kararını** dahili veritabanında barındırır (2024-2025 kararları). Bu kararlar ADK hesaplamasında otomatik emsal karşılaştırma için de kullanılır.

## 9.3 Poliçe Limit Tabloları

Sigorta poliçe limitlerini araştırmak ve karşılaştırmak için kullanılır.

## 9.4 Kusur Emsal Dosyaları

Kusur oranlarına ilişkin emsal kararları arayabilirsiniz. Sonuçlarda kusur oranı bilgisi özellikle vurgulanır.

> ✅ **İPUCU:** İçtihat araması yaparken mümkün olduğunca spesifik terimler kullanın. Örneğin "değer kaybı" yerine "2024 araç değer kaybı BMW tahkim" yazarak daha isabetli sonuçlar alabilirsiniz.

---

# 📋 BÖLÜM 10: PAYDAŞLAR (İŞ ORTAKLARI VE İŞ PAYDAŞLARI)

> 📌 **MODÜL ÖZETİ**
> | Özellik | Detay |
> |---------|-------|
> | Amaç | Avukatlar, acenteler, galeriler ve diğer iş ortaklarının yönetimi |
> | Erişim | Yönetici seviyesi |
> | Alt Sekmeler | İş Ortakları, İş Paydaşları |
> | Bağlantılar | Dosyalar, Muhasebe, Komisyon |

---

## 10.1 İş Ortakları (Avukatlar / Hukuk Büroları)

İş ortakları, dosyalarınızı yürüten avukatlar ve hukuk bürolarıdır. Her ortağa ödeme oranı atanır ve finansal hareketleri takip edilir.

### Yeni İş Ortağı Ekleme

1. **İş Ortakları** sekmesine gidin
2. **"+ YENİ ORTAK"** butonuna tıklayın
3. Formu doldurun:

| Alan | Açıklama | Zorunlu |
|------|----------|---------|
| Ad Soyad | Ortağın tam adı | ✅ Evet |
| Firma / Hukuk Bürosu | Bağlı olduğu büro | Hayır |
| Baro | Kayıtlı olduğu baro (ör: İSTANBUL BAROSU) | Hayır |
| Sicil No | Baro sicil numarası | Hayır |
| Telefon | İletişim numarası | Hayır |
| E-posta | E-posta adresi | Hayır |
| İl | Bulunduğu il (81 il listesi) | Hayır |
| Vergi No | Vergi numarası | Hayır |
| Ödeme Oranı (%) | Dosya kazancından ortağa verilecek oran (ör: %25) | Hayır |
| Kasa Ataması | Ödeme yapılacak kasanın seçimi | Hayır |
| Durum | Aktif / Pasif | Hayır |
| Adres | Açık adres | Hayır |
| Notlar | Ek notlar | Hayır |

4. **"KAYDET"** butonuna tıklayın

### İş Ortağı Listesi

Listede her ortak için şu bilgiler görünür:
- **Ad Soyad** ve telefon
- **Firma** adı
- **Baro** ve **Sicil No**
- **Ödeme Oranı** (mor etiket ile)
- **İl** ve **Durum** (Aktif/Pasif)

**Filtreleme:** Ad soyad, firma veya baro ile arama yapabilirsiniz. Durum ve il filtreleri mevcuttur.

**Sayfalama:** Her sayfada 20 kayıt gösterilir.

### İş Ortağı Detay ve Finansal Hareketler

Bir ortağın detayına girmek için göz ikonuna (👁) tıklayın. Detay ekranında:

**Sol Panel — Kişisel Bilgiler:**
- Ad Soyad, Firma, Baro, Sicil No, Telefon, E-posta, İl, Vergi No, Adres, Notlar, Atanmış Kasa

**Sağ Panel — Finansal Özet:**
- **Ödeme Oranı** (büyük gösterge)
- **Toplam Ödeme** (ortağa yapılan ödemeler)
- **Toplam Tahsilat** (ortaktan gelen tahsilatlar)
- **Toplam Masraf**
- **Bakiye** = Tahsilat - Ödeme - Masraf

### Finansal Hareket Ekleme

1. Detay ekranında **"+ HAREKET EKLE"** butonuna tıklayın
2. Formu doldurun:

| Alan | Açıklama | Zorunlu |
|------|----------|---------|
| Hareket Türü | Ödeme / Tahsilat / Masraf | ✅ Evet |
| Tutar (₺) | Hareket tutarı | ✅ Evet |
| Tarih | Hareket tarihi | ✅ Evet |
| Dosya No | İlgili dosya ID (opsiyonel) | Hayır |
| Açıklama | Hareket açıklaması | Hayır |

3. **"HAREKET EKLE"** butonuna tıklayın

**Hareket türü renkleri:**
- 🔴 **Ödeme** → Kırmızı (ortağa yapılan ödeme)
- 🟢 **Tahsilat** → Yeşil (ortaktan gelen para)
- 🟡 **Masraf** → Sarı (ortak adına yapılan masraf)

### Toplu Silme

Admin yetkisi ile birden fazla ortağı seçip toplu silme yapabilirsiniz.

> ⚠️ **UYARI:** Silme işlemi geri alınamaz! Silinen ortağın tüm finansal hareketleri de kaybolur.

---

## 10.2 İş Paydaşları (Acenteler, Galeriler, Tamirciler)

İş paydaşları, size dosya yönlendiren veya iş birliği yaptığınız kuruluşlardır.

### Paydaş Türleri

| Tür | Açıklama | İkon |
|-----|----------|------|
| Sigorta Acentesi | Sigorta aracı kurumları | 🛡 |
| Oto Galeri | Araç alım-satım yerleri | 🚗 |
| Oto Kiralama | Araç kiralama firmaları | 🔑 |
| Tamirci | Araç onarım servisleri | 🔧 |
| Diğer | Yukarıdaki kategorilere uymayan paydaşlar | ⋯ |

### Yeni İş Paydaşı Ekleme

1. **İş Paydaşları** sekmesine gidin
2. **"+ YENİ PAYDAŞ"** butonuna tıklayın
3. Formu doldurun:

| Alan | Açıklama | Zorunlu |
|------|----------|---------|
| Paydaş Adı | Firma veya kişi adı | ✅ Evet |
| Tür | Sigorta Acentesi / Oto Galeri / Oto Kiralama / Tamirci / Diğer | ✅ Evet |
| Yetkili Kişi | İrtibat kişisi | Hayır |
| Telefon | İletişim numarası | Hayır |
| E-posta | E-posta adresi | Hayır |
| İl | Bulunduğu il | Hayır |
| ADK Prim (₺) | Araç değer kaybı dosyası başına prim tutarı | Hayır |
| BH Prim (₺) | Bedeni hasar dosyası başına prim tutarı | Hayır |
| Durum | Aktif / Pasif | Hayır |
| Adres | Açık adres | Hayır |
| Notlar | Ek notlar | Hayır |

4. **"KAYDET"** butonuna tıklayın

### Komisyon Takibi

Her paydaş için komisyon kayıtları tutulabilir:
- **Komisyon durumları:** Bekliyor → Onaylandı → Ödendi
- Komisyon ödemesi yapılırken kasa seçimi zorunludur
- Ödeme sonrası komisyon otomatik olarak "Ödendi" durumuna geçer

### İstatistik Kartları

| Kart | Açıklama |
|------|----------|
| Toplam Paydaş | Kayıtlı paydaş sayısı |
| Aktif | Aktif durumdaki paydaşlar |
| Bekleyen Komisyon | Henüz ödenmemiş komisyon toplamı |
| Ödenen Komisyon | Ödenmiş komisyon toplamı |

> ✅ **İPUCU:** ADK ve BH prim tutarlarını doğru girin. Bu tutarlar dosya kapandığında komisyon hesaplamasında kullanılır.

---

# 💰 BÖLÜM 11: MUHASEBE

> 📌 **MODÜL ÖZETİ**
> | Özellik | Detay |
> |---------|-------|
> | Amaç | Firmanın tüm finansal işlemlerinin yönetimi |
> | Erişim | Muhasebe ve admin rolleri |
> | Alt Sekmeler | Gelir, Gider, Komisyon/Prim, Kasa/Banka, Ortak Kasa, Maliyet Analizi, Finansal Raporlar, Kapanış Raporu, Ay Sonu Raporu |
> | Bağlantılar | Dosyalar, Paydaşlar, Personel |

> ⚠️ **ÖNEMLİ:** Muhasebe sekmelerine erişim yetki bazlıdır. Admin tüm sekmeleri görür, diğer kullanıcılar yalnızca yetkili oldukları sekmeleri görebilir.

---

## 11.1 Gelir Yönetimi

Firmaya gelen tüm gelirleri kaydetmek ve takip etmek için kullanılır.

### Gelir Türleri

| Tür | Açıklama |
|-----|----------|
| Danışmanlık Ücreti | Müşteriden alınan danışmanlık bedeli |
| Sigorta Tahsilatı | Sigorta şirketinden gelen ödeme |
| Mahkeme Tazminatı | Mahkeme kararıyla alınan tazminat |
| Komisyon | Aracılık komisyonu |
| Diğer Gelir | Yukarıdaki kategorilere uymayan gelirler |

> 💡 **NOT:** Gelir türleri Tanımlamalar modülünden özelleştirilebilir.

### Yeni Gelir Kaydı

1. **"+ YENİ GELİR"** butonuna tıklayın
2. Formu doldurun:

| Alan | Açıklama | Zorunlu |
|------|----------|---------|
| Kasa Seçimi | Gelirin yatırılacağı kasa | ✅ Evet |
| Dosya No | İlgili dosya ID (geliri dosyaya bağlar) | Hayır |
| Gelir Türü | Yukarıdaki türlerden biri | ✅ Evet |
| Tutar (₺) | Gelir tutarı | ✅ Evet |
| Tarih | Gelir tarihi | Hayır |
| Açıklama | Gelir hakkında açıklama | Hayır |

3. **"GELİR KAYDET"** butonuna tıklayın

### Filtreleme ve İstatistikler

**Filtreler:** Kasa, başlangıç-bitiş tarihi, metin araması (açıklama, dosya no, tür)

**İstatistik Kartları:**
- Toplam Gelir | Bu Ay | Geçen Ay | Ortalama

Alt kısımda filtrelenmiş kayıtların toplam tutarı gösterilir.

---

## 11.2 Gider Yönetimi

Firmadan çıkan tüm giderleri kaydetmek ve takip etmek için kullanılır.

### Gider Kategorileri

| Kategori | Açıklama |
|----------|----------|
| Ofis Gideri | Kırtasiye, temizlik vb. |
| Personel Gideri | Genel personel harcamaları |
| Personel Maaş | Aylık maaş ödemeleri |
| Ulaşım | Yol masrafları |
| Yakıt | Araç yakıt giderleri |
| Bilirkişi Ücreti | Bilirkişi hizmet bedeli |
| Avukat Ücreti | Dış avukat ücretleri |
| Kira | Ofis kirası |
| Vergi / Harç | Vergi ve resmi harçlar |
| Dosya Masrafı | Dosya bazlı masraflar |
| Diğer Gider | Diğer giderler |

### Personel Maaş Ödeme Entegrasyonu

Gider kategorisi olarak **"Personel Maaş"** seçildiğinde:
1. → Aktif personel listesi otomatik yüklenir
2. → Personel seçildiğinde maaş tutarı otomatik doldurulur
3. → Varsa bekleyen hakediş tutarı otomatik getirilir
4. → Açıklama otomatik oluşturulur: "AD SOYAD - MAAŞ/HAKEDİŞ ÖDEMESİ"

> ✅ **İPUCU:** Personel maaş ödemelerini her zaman bu yöntemle yapın, böylece hakediş takibi ve personel gideri raporları doğru çalışır.

---

## 11.3 Komisyon / Prim

Ortak ve paydaşlara ait komisyon kayıtlarını yönetir.

### Komisyon Durumları

| Durum | Renk | Açıklama |
|-------|------|----------|
| Bekliyor | 🟡 Sarı | Komisyon oluşturuldu, henüz onaylanmadı |
| Onaylandı | 🔵 Mavi | Yönetici tarafından onaylandı |
| Ödendi | 🟢 Yeşil | Kasa üzerinden ödeme yapıldı |

### Komisyon İş Akışı

1. **Yeni Komisyon Oluştur** → İlgili tip (Ortak/Paydaş), ID, tutar, oran girin
2. **Onayla** → Bekleyen komisyonu onaylayın (onay butonu ile)
3. **Öde** → Ödeme kasası seçerek ödemeyi gerçekleştirin

> ⚠️ **UYARI:** Ödeme yapıldığında seçilen kasanın bakiyesi otomatik olarak düşer. Kasada yeterli bakiye olduğundan emin olun.

### Filtreleme

- **Durum filtresi:** Bekliyor / Onaylandı / Ödendi
- **İlgili tip filtresi:** Ortak / Paydaş

---

## 11.4 Kasa / Banka

Firmanın nakit ve banka hesaplarını yönetir. Çoklu kasa desteği vardır.

### Kasa Oluşturma

1. **"+ YENİ KASA"** butonuna tıklayın
2. Formu doldurun:

| Alan | Açıklama | Zorunlu |
|------|----------|---------|
| Kasa Adı | Kasanın tanımlayıcı adı | ✅ Evet |
| Tür | Nakit / Banka | ✅ Evet |
| Banka Adı | Sadece Banka türü için | Banka ise Evet |
| IBAN | Banka IBAN numarası | Hayır |

### Kasa Kartları

Her kasa bir kart olarak gösterilir:
- **Kasa Adı** ve türü (Nakit/Banka etiketi)
- **Bakiye** (büyük yazı ile, pozitif yeşil / negatif kırmızı)
- **Banka bilgileri** (banka adı ve IBAN)
- **İşlem butonları:** Düzenle, Bakiye Düzelt, Aktif/Pasif Değiştir, Sil

### Kasalar Arası Transfer

1. **"TRANSFER"** butonuna tıklayın
2. **Kaynak Kasa** seçin (para çıkışı)
3. **Hedef Kasa** seçin (para girişi)
4. **Tutar** girin
5. **"TRANSFER YAP"** butonuna tıklayın

> ⚠️ **UYARI:** Kaynak ve hedef kasa aynı olamaz. Transfer tutarı otomatik olarak kaynak kasadan düşer, hedef kasaya eklenir.

### Bakiye Düzeltme (Sadece Admin)

Kasa bakiyesi gerçek durumu yansıtmıyorsa:
1. Kasanın **hesap makinesi** ikonuna tıklayın
2. Yeni bakiyeyi girin
3. Düzeltme nedenini yazın
4. **"BAKİYE DÜZELT"** butonuna tıklayın

### Kasa Hareketleri

Son 30 hareket listelenir. Her hareket için:
- **Tarih**, **Kasa**, **Tür** (Gelir/Gider/Masraf/Komisyon/Transfer/Düzeltme)
- **Tutar** (yeşil: giriş, kırmızı: çıkış)
- **Açıklama** ve **Dosya No** (varsa tıklanabilir)

**Admin özellikleri:** Hareket düzenleme ve hareket silme

> ⚠️ **DİKKAT:** Bakiyeleri sıfırlama özelliği tüm kasaları sıfırlar ve geri alınamaz!

---

## 11.5 Ortak Kasa

İki iş ortağının paylaştığı müşterek kasalardır.

### Ortak Kasa Oluşturma

1. **"+ YENİ ORTAK KASA"** butonuna tıklayın
2. Kasa adı ve tipini girin
3. **İki farklı iş ortağı** seçin (zorunlu)
4. **"KAYDET"** butonuna tıklayın

### Ortak Kasa Hareketleri

- **Giriş:** Gelir olarak kaydedilir (tür: ORTAK KASA GİRİŞ)
- **Çıkış:** Gider olarak kaydedilir (tür: ORTAK KASA ÇIKIŞ)

---

## 11.6 Maliyet Analizi

Dosya bazlı kar/zarar analizini gösterir.

### Analiz Tablosu

Her dosya için hesaplanan değerler:

| Sütun | Açıklama |
|-------|----------|
| Dosya No | Tıklanabilir dosya numarası |
| Müşteri | Müşteri adı |
| Gelir | Dosyadan elde edilen toplam gelir |
| Gider | Toplam gider + masraf |
| Komisyon | Ödenen komisyon toplamı |
| Net Kar | Gelir - Gider - Komisyon |
| Kar Marjı % | (Net Kar / Gelir) × 100 |

### İstatistik Kartları

- **Toplam Gelir** | **Toplam Gider** | **Net Kar** | **Kar Marjı**
- **Karlı Dosya** sayısı (yeşil) ve **Zararda Dosya** sayısı (kırmızı)

Zarardaki dosyalar tabloda kırmızı arka plan ile vurgulanır.

---

## 11.7 Finansal Raporlar

Dönem bazlı kapsamlı finansal analiz sunar.

### Rapor İçeriği

1. **Dönem Seçimi:** Başlangıç ve bitiş tarihi belirleyin → "RAPOR GETİR"
2. **Özet Kartlar:** Toplam Gelir, Toplam Gider, Net Kar/Zarar, Dosya Sayısı
3. **Aylık Trend Grafiği:** Gelir ve gider çubuk grafik karşılaştırması
4. **Kategori Dağılımı:** Halka grafik ile gelir/gider/masraf/komisyon dağılımı
5. **Detaylı Rapor Tablosu:** Dönem bazlı gelir-gider-komisyon detayı
6. **Net Sonuç Banneri:** Dönemin kar veya zarar durumu

---

## 11.8 Kapanış Raporu

Avukat bazlı ve genel kapanış raporu oluşturur.

### Kullanım

1. Dönem seçin (varsayılan: mevcut ay)
2. Görünüm seçin: **Avukat Bazlı** veya **Genel**
3. **"RAPOR GETİR"** butonuna tıklayın

### Avukat Bazlı Görünüm

Her avukat (iş ortağı) için ayrı ayrı:
- Dosya sayısı ve gelir-gider detayı
- Komisyon hesaplaması
- Net sonuç

---

## 11.9 Ay Sonu Raporu

Kapsamlı aylık finansal rapor, yazdırma desteği ile.

### Özellikler

1. **Dönem seçimi:** Ay bazında seçim
2. **Ortak filtresi:** Belirli bir ortağa ait dosyalar için filtreleme
3. **Bölüm 1:** Genel finansal özet
4. **Bölüm 2:** Detaylı dökümler
5. **Final:** Sonuç ve değerlendirme

### Yazdırma

**"YAZDIR"** butonu ile rapor beyaz arka planlı, okunabilir formatta ayrı pencerede açılır ve yazdırılabilir. Koyu tema renkleri otomatik olarak açık renge dönüştürülür.

> ✅ **İPUCU:** Ay sonu raporunu her ayın sonunda oluşturup yazdırarak arşivleyin. Bu rapor, mali denetimlerde kanıt olarak kullanılabilir.

---

# ⚙️ BÖLÜM 12: SİSTEM YÖNETİMİ

> 📌 **MODÜL ÖZETİ**
> | Özellik | Detay |
> |---------|-------|
> | Amaç | Sistem ayarları, kullanıcı ve yetki yönetimi, tanımlamalar |
> | Erişim | Yalnızca admin |
> | Alt Bölümler | Tanımlamalar, Firma Ayarları, SMS, Portal, Toplu Aktarım, Veri Yönetimi, Konum Takibi, Log Kayıtları, Kullanıcı Yönetimi, Yetki Yönetimi, Cihaz Güvenliği |

---

## 12.1 Tanımlamalar

Sistemin temel veri tanımlarını yönetir. 5 kategori altında düzenlenir:

### Dosya Tanımlamaları

| Tanım Grubu | Açıklama | Örnek Değerler |
|-------------|----------|----------------|
| Dosya Türü | Dosya sınıflandırması | ADK, BH, MDK |
| Müşteri Kaynak | Müşterinin geldiği kaynak | Web, Referans, Acente |

### Evrak Tanımlamaları

| Tanım Grubu | Açıklama |
|-------------|----------|
| Evrak Türü | Yüklenebilecek belge türleri (60+ tanımlı) |
| Masraf Türü | Dosya masraf kalemleri (22+ tanımlı) |

### Finansal Tanımlamalar

| Tanım Grubu | Açıklama |
|-------------|----------|
| Gelir Türü | Gelir kategorileri |
| Gider Türü | Gider kategorileri |
| Komisyon Türü | Komisyon kategorileri |

### Matbu Evrak / Sözleşme Şablonları

Otomatik doldurulabilir belge şablonları oluşturabilirsiniz.

**Şablon Kategorileri:** Matbu Evrak, Sözleşme, Mektup, Diğer

**Kullanılabilir Değişkenler:**

| Değişken | Açıklama |
|----------|----------|
| `{{MUSTERI_ADI}}` | Müşteri adı soyadı |
| `{{TC_NO}}` | TC Kimlik numarası |
| `{{TELEFON}}` | Telefon numarası |
| `{{ADRES}}` | Adres bilgisi |
| `{{DOSYA_NO}}` | Dosya numarası |
| `{{TARIH}}` | Tarih |
| `{{PLAKA}}` | Araç plakası |
| `{{HASAR_TUTARI}}` | Hasar tutarı |
| `{{SİGORTA_ŞİRKETİ}}` | Sigorta şirketi adı |
| `{{POLİÇE_NO}}` | Poliçe numarası |

### Genel Tanımlamalar

| Tanım Grubu | Açıklama |
|-------------|----------|
| Hizmet Türü | Sunulan hizmet kategorileri |
| Şablon Kategorisi | Şablon gruplama etiketleri |

### Tanımlama İşlemleri

Her tanım grubu için:
1. ➕ **Yeni Kayıt Ekle** — Kod, değer, açıklama, sıra numarası
2. ✏️ **Düzenle** — Mevcut kaydı güncelle
3. 🗑 **Sil** — Kaydı kalıcı olarak kaldır
4. 🔄 **Aktif/Pasif** — Kaydı geçici olarak devre dışı bırak
5. ⬆️⬇️ **Sıralama** — Listeleme sırasını değiştir
6. 📥 **Toplu Yükleme** — Excel dosyasından çoklu kayıt ekle

> ⚠️ **UYARI:** Tanımlamaları silmeden önce, bu tanımı kullanan dosya veya kayıtların olmadığından emin olun. Aksi halde ilgili kayıtlarda veri tutarsızlığı oluşabilir.

---

## 12.2 Firma Ayarları

Firmanın genel bilgilerini düzenler: firma adı, logo, iletişim bilgileri, adres vb.

## 12.3 SMS Bildirim

NetGSM entegrasyonu ile SMS bildirim ayarlarını yönetir. API anahtarı, gönderici adı ve bildirim şablonları bu bölümden yapılandırılır.

## 12.4 Portal Ayarları

Müşteri portalı yapılandırması. Portal kullanıcıları dosya durumlarını bu portal üzerinden takip edebilir.

## 12.5 Toplu Aktarım

Excel veya CSV dosyasından toplu veri aktarımı yapılabilir. Dosya, CRM ve diğer kayıtlar toplu olarak sisteme yüklenebilir.

## 12.6 Veri Yönetimi

Veritabanı bakımı, yedekleme ve veri temizleme işlemleri.

## 12.7 Konum Takibi

Saha personelinin konum bilgilerini takip eder. GPS verisi üzerinden personelin sahada olup olmadığı kontrol edilebilir.

## 12.8 Log Kayıtları

Sistemdeki tüm işlemlerin denetim kaydını tutar.

**Log türleri ve renk kodları:**
- 🟢 **Oluştur / Ekle / Yeni** — Yeşil
- 🟡 **Güncelle / Düzenle** — Sarı
- 🔴 **Sil / Kaldır** — Kırmızı
- 🔵 **Giriş (Login)** — Mavi
- 🟣 **Çıkış (Logout)** — Mor

Her log kaydında: tarih/saat, kullanıcı, işlem türü, detay bilgisi yer alır.

> ✅ **İPUCU:** Şüpheli aktivite fark ettiğinizde log kayıtlarını kontrol edin. Hangi kullanıcının ne zaman ne yaptığını görebilirsiniz.

---

## 12.9 Kullanıcı Yönetimi

Sisteme erişebilecek kullanıcıları yönetir.

### Kullanıcı Rolleri

| Rol | Renk | Açıklama |
|-----|------|----------|
| Admin | 🔴 Kırmızı | Tüm yetkilere sahip, sistem yöneticisi |
| Avukat | 🟣 Mor | Dosya işlemleri, hesaplamalar, içtihat erişimi |
| Uzman | 🔵 Mavi | Hesaplama ve analiz odaklı |
| Personel | 🔵 Açık Mavi | Genel ofis işlemleri, CRM, dosya takibi |
| Muhasebe | 🟢 Yeşil | Finansal işlemler ve raporlama |
| Portal | 🟡 Sarı | Müşteri portalı erişimi (kısıtlı) |

### Yeni Kullanıcı Ekleme

1. **"+ YENİ KULLANICI"** butonuna tıklayın
2. Formu doldurun:

| Alan | Açıklama | Zorunlu |
|------|----------|---------|
| Ad Soyad | Kullanıcının tam adı | ✅ Evet |
| E-posta | Giriş için kullanılacak e-posta | ✅ Evet |
| Şifre | Giriş şifresi (yeni kullanıcı için zorunlu) | ✅ Yeni ise |
| Telefon | İletişim numarası | Hayır |
| Rol | Yukarıdaki rollerden biri | ✅ Evet |

3. **"KAYDET"** butonuna tıklayın

### Kullanıcı İşlemleri

- ✏️ **Düzenle** — Bilgileri güncelle, şifre değiştir
- ⏸ **Aktif/Pasif** — Kullanıcıyı geçici olarak devre dışı bırak (hesabı silmeden)
- 🗑 **Kalıcı Sil** — Kullanıcıyı tamamen sil (geri alınamaz)

> ⚠️ **UYARI:** Kullanıcı silindiğinde geri getirilemez. Geçici olarak engellemek istiyorsanız "Pasif Yap" kullanın.

---

## 12.10 Yetki Yönetimi

Her kullanıcıya modül bazlı granüler yetkiler atanabilir. **13 modül** altında **69+ izin** tanımlıdır.

### Yetki Modülleri ve İzinler

#### 📁 Dosya İşlemleri (16 izin)
| İzin | Açıklama |
|------|----------|
| Dosya Listesi | Dosya listesini görüntüleme |
| Yeni Dosya | Yeni dosya oluşturma |
| Dosya Detay | Dosya detayını görüntüleme |
| Dosya Düzenle | Dosya bilgilerini değiştirme |
| Dosya Sil | Tekli dosya silme |
| Toplu Silme | Birden fazla dosyayı toplu silme |
| Aşama Değiştir | Dosya aşamasını güncelleme |
| Portal Erişimi Oluştur | Dosya için müşteri portalı oluşturma |
| Dosya Kapat | Dosyayı kapatma |
| Masraf Ekle / Sil / Öde | Masraf işlemleri (3 ayrı izin) |
| Evrak Yükle / Sil / İndir | Evrak işlemleri (3 ayrı izin) |
| Hesap Özeti Görüntüle | Finansal hesap özetini görme |

#### 👥 CRM / Saha (12 izin)
| İzin | Açıklama |
|------|----------|
| CRM Listesi / Yeni / Düzenle / Sil | CRM kayıt işlemleri |
| Toplu Silme | CRM toplu silme |
| Arama Listesi | Telefon arama listesi erişimi |
| Saha Dosyaları / Yeni / Düzenle / Sil | Saha kayıt işlemleri |
| Saha Onayla / Reddet | Saha kayıtlarını onaylama/reddetme |

#### 🧮 Hesaplamalar (4 izin)
Araç Değer Kaybı, Bedeni Hasar hesaplama ve rapor oluşturma

#### 🤝 Paydaşlar / Ortaklar (9 izin)
İş ortakları/paydaşları görüntüleme, ekleme, düzenleme, silme, toplu silme, personel

#### 📋 Poliçe (10 izin)
Liste, yeni, düzenle, sil, toplu sil, Excel ihraç, yenileme, tahsilat, rapor, kazanç

#### 💰 Muhasebe (22 izin)
Gelir/gider yönetimi ve ekleme/silme, komisyon, kasa/banka, kasa silme, transfer, hareket düzenleme/silme, ortak kasa, maliyet analizi, raporlar, kapanış, ay sonu, bakiye sıfırlama, personel işlemleri ve hakediş

#### 🧾 Masraf Yönetimi (5 izin)
Görüntüle, ekle, düzenle, sil, öde

#### 📄 Evrak Yönetimi (4 izin)
Görüntüle, yükle, sil, indir

#### 📅 Ajanda (5 izin)
Görüntüle, etkinlik ekle/düzenle/sil, toplu silme

#### 💬 Mesajlar (4 izin)
Görüntüle, gönder, sil, toplu silme

#### 🔔 Bildirimler (2 izin)
Görüntüle, sil

#### ⚖️ İçtihat (4 izin)
Yargıtay kararları, tahkim örnekleri, poliçe limit tabloları, kusur emsal dosyaları

#### 🛡 Sistem (22 izin)
Kullanıcı/yetki yönetimi, firma ayarları, SMS, portal, güvenlik, 2FA, veri yönetimi, log, bildirimler, tanımlamalar (dosya/evrak/finansal/şablon/genel + CRUD), konum takibi, toplu aktarım

### Yetki Atama

1. Kullanıcıyı seçin
2. Her modül altındaki izinleri açın/kapatın (toggle)
3. Değişiklikler anında kaydedilir

> ⚠️ **DİKKAT:** Admin rolündeki kullanıcılar otomatik olarak tüm yetkilere sahiptir, yetki ataması gerekmez. Diğer roller için yetkilerin tek tek açılması gerekir.

---

## 12.11 Cihaz Güvenliği

Sisteme erişen cihazları yönetir ve güvenlik kontrolleri sağlar. Yetkisiz cihazlardan erişimi engelleyebilirsiniz.

## 12.12 2FA (İki Faktörlü Doğrulama) Yönetimi

TOTP tabanlı iki faktörlü doğrulama ayarlarını yönetir. Google Authenticator veya benzeri uygulamalarla kullanılır.

---

# ❗ BÖLÜM 13: SIK YAPILAN HATALAR VE ÖNLEME YÖNTEMLERİ

Bu bölümde kullanıcıların en sık karşılaştığı hataları ve bunlardan kaçınma yollarını bulacaksınız.

---

## 13.1 Dosya Oluşturma Hataları

### TC Kimlik Numarası Hatalı Girilmesi

| Sorun | Çözüm |
|-------|-------|
| 11 haneden az/fazla giriliyor | Sistem otomatik 11 hane kontrolü yapar, uyarıyı dikkate alın |
| Yanlış TC ile kayıt açılıyor | Kayıt sonrası düzeltme yapılabilir ancak bağlı evraklar etkilenir |
| Aynı TC ile mükerrer dosya | Sistem uyarı verir, mevcut dosyayı kontrol edin |

> ⚠️ **UYARI:** TC Kimlik numarası birçok resmi evrak ve hesaplama ile ilişkilidir. Yanlış girildiğinde tüm belgelerin güncellenmesi gerekir.

### Dosya Türü Seçim Hatası

| Sorun | Çözüm |
|-------|-------|
| ADK yerine BH seçildi | Dosya türü araç bilgisi alanlarını etkiler — ADK'da araç alanları zorunlu, BH'de değil |
| MDK seçilmesi gerektiği halde ADK seçildi | Dosya düzenle ile türü değiştirin, eksik alanları doldurun |

> ⚠️ **UYARI:** Dosya türü değiştirildiğinde bazı alanlar sıfırlanabilir. Değiştirmeden önce mevcut bilgileri not alın.

### Sigorta Şirketi ve Poliçe Bilgileri

| Sorun | Çözüm |
|-------|-------|
| Yanlış sigorta şirketi seçildi | 52 şirket listesinden doğru olanı seçin, hasar no ile çapraz kontrol yapın |
| Hasar no girilmedi | Hasar no dosya takibinde kritik öneme sahiptir, mutlaka girin |
| Poliçe no eksik | Tahkim başvuruları için poliçe no zorunludur |

---

## 13.2 Aşama Değiştirme Hataları

### Yanlış Aşama Seçimi

Sistemde **53 farklı aşama** bulunur. En sık yapılan hatalar:

| Sorun | Çözüm |
|-------|-------|
| "Dosya Kapatıldı" aşaması yanlışlıkla seçildi | Kapatılan dosyayı tekrar açmak için admin yetkisi gerekir |
| Aşama atlama (sıra dışı ilerleme) | Sistem uyarmaz, ancak raporlarda tutarsızlık oluşur |
| Aşama notu eklenmedi | Her aşama değişikliğine açıklayıcı not ekleyin |

> ✅ **İPUCU:** Aşama değiştirmeden önce, dosyanın gerçekten o aşamaya geldiğinden emin olun. "Tahkim Başvurusu Yapıldı" seçtiyseniz, başvuruyu gerçekten yaptığınızdan emin olun.

---

## 13.3 Finansal İşlem Hataları

### Kasa Seçimi

| Sorun | Çözüm |
|-------|-------|
| Yanlış kasaya gelir/gider kaydedildi | Admin bakiye düzeltme ile düzeltilebilir, ancak hareket kaydı kalır |
| Pasif kasaya işlem yapılmaya çalışıldı | Yalnızca aktif kasalar seçilebilir |
| Transfer sırasında kaynak = hedef seçildi | Sistem bunu engeller, farklı kasalar seçin |

### Komisyon Oranları

| Sorun | Çözüm |
|-------|-------|
| İş ortağına %0 oran girildi | Komisyon hesaplanmaz, doğru oranı girin |
| ADK ve BH primleri karıştırıldı | Paydaş formunda ADK Prim ve BH Prim ayrı alanlardır |
| Komisyon onaylanmadan ödendi | Onaysız ödeme yapılabilir ancak raporlarda "Bekliyor" görünür |

> ⚠️ **UYARI:** Bakiye sıfırlama işlemi TÜM kasaları etkiler ve geri alınamaz. Bu işlemi sadece yıl sonu kapanışında kullanın.

---

## 13.4 Evrak Yükleme Hataları

| Sorun | Çözüm |
|-------|-------|
| 20 MB üzeri dosya yüklenemiyor | Dosyayı sıkıştırın veya bölün. Maksimum limit: **20 MB** |
| Desteklenmeyen format | Desteklenen: **JPG, PNG, PDF**. Word veya Excel dosyalarını önce PDF'e çevirin |
| Yanlış evrak türü seçildi | Evrak türünü düzenleyerek düzeltebilirsiniz |
| Evrak yanlışlıkla silindi | Silinen evraklar geri getirilemez, yeniden yükleyin |

---

## 13.5 CRM ve Saha Hataları

### CRM Kayıtları

| Sorun | Çözüm |
|-------|-------|
| Mükerrer CRM kaydı oluşturuldu | Telefon veya TC ile arama yaparak mevcut kaydı kontrol edin |
| CRM'den dosyaya dönüştürme unutuldu | CRM listesinde "Dosyaya Dönüştür" butonunu kullanın |

### Saha Dosyaları

| Sorun | Çözüm |
|-------|-------|
| 3 günlük onay süresi doldu | Süresi dolan kayıtlar otomatik olarak "Süresi Doldu" durumuna geçer, yeni kayıt oluşturun |
| Saha kaydı onaylanmadan dosyaya dönüştürüldü | Önce onaylayın, sonra dönüştürün |
| Fotoğraf/belge eklenmedi | Saha kaydına medya eklemeden onay verilmesi raporlarda eksikliğe neden olur |

> ✅ **İPUCU:** Saha kayıtlarını oluşturduktan sonra 3 gün içinde onaylamayı unutmayın. Geri sayım sayacını takip edin.

---

## 13.6 Hesaplama Hataları

### ADK (Araç Değer Kaybı)

| Sorun | Çözüm |
|-------|-------|
| Araç marka/model bulunamıyor | 24 marka ve modelleri dahili veritabanından seçilir, araç yoksa en yakın modeli seçin |
| Kilometre bilgisi girilmedi | Kilometre, değer kaybı hesaplamasında kritik faktördür |
| Önceki hasar sayısı yanlış | Önceki hasar varsa değer kaybı oranını düşürür, doğru girin |
| Rayiç araştırma sonucu gelmedi | İnternet bağlantısını kontrol edin, manuel rayiç girin |

### BH (Bedeni Hasar)

| Sorun | Çözüm |
|-------|-------|
| PMF tablosu yanlış seçildi | TRH2010 (güncel), CSO1980, PMF1931 arasında doğru tabloyu seçin |
| Maluliyet oranı yanlış girildi | Sağlık kurulu raporundaki oranı birebir girin |
| Aktif/pasif dönem hesaplama hatası | Doğum tarihi ve emeklilik yaşını doğru girin |

---

## 13.7 Yetki ve Erişim Hataları

| Sorun | Çözüm |
|-------|-------|
| Kullanıcı modüle erişemiyor | Admin → Yetki Yönetimi'nden ilgili izni açın |
| Yeni eklenen kullanıcı hiçbir şey göremyor | Rol ataması yapılmış ancak yetkiler verilmemiş — tüm izinleri kontrol edin |
| Portal kullanıcısı dosya düzenleyebiliyor | Portal rolü kısıtlı olmalı, yetkileri daraltın |

> ⚠️ **UYARI:** Admin rolü dışındaki kullanıcılar için yetkiler varsayılan olarak kapalıdır. Yeni kullanıcı oluşturduktan sonra mutlaka yetki ataması yapın.

---
