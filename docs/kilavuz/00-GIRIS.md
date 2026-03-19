# 🏛️ MR HASAR DANIŞMANLIK SİSTEMİ — KULLANIM KILAVUZU

## GİRİŞ & GENEL KULLANIM

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   Bu kılavuz, MR Hasar Danışmanlık Sistemini kullanan avukatlar,     ║
║   uzmanlar ve ofis personeli için hazırlanmıştır.                    ║
║                                                                      ║
║   Amaç: Hasar danışmanlık süreçlerinin (dosya açma, takip, hesap,   ║
║   muhasebe, evrak, müvekkil iletişimi) tek bir yerden yönetilmesi.   ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 📋 SİSTEMİN GENEL YAPISI — AKIŞ DİYAGRAMI

```
                          ┌─────────────────┐
                          │   SİSTEME GİRİŞ  │
                          │  (Kullanıcı Adı   │
                          │   + Şifre + 2FA)  │
                          └────────┬──────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │    ANA SAYFA      │
                          │   (Dashboard)     │
                          └────────┬──────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
   ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
   │  DOSYA İŞLEMLERİ │ │   CRM / SAHA     │ │   HESAPLAMALAR   │
   │  Hasar dosyası   │ │   Müşteri adayı  │ │   ADK / BH       │
   │  açma & takip    │ │   arama & saha   │ │   değer hesabı   │
   └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
            │                    │                    │
            │     ┌──────────────┼──────────────┐     │
            │     │              │              │     │
            ▼     ▼              ▼              ▼     ▼
   ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
   │   PAYDAŞLAR      │ │    POLİÇE        │ │    MUHASEBE      │
   │   Ortak/Paydaş/  │ │    Sigorta       │ │    Gelir/Gider/  │
   │   Personel       │ │    poliçe takibi  │ │    Kasa/Rapor    │
   └──────────────────┘ └──────────────────┘ └──────────────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
   ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
   │    İÇTİHAT       │ │     AJANDA       │ │  SİSTEM YÖNETİMİ │
   │    Emsal karar   │ │     Görev &      │ │  Kullanıcı/Yetki │
   │    araştırma     │ │     takvim       │ │  Ayar/Log        │
   └──────────────────┘ └──────────────────┘ └──────────────────┘
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
   ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
   │ MÜVEKKİL PORTALI │ │ MESAJLAR / SMS   │ │   BİLDİRİMLER    │
   │ Dış erişim &     │ │ İç mesajlaşma &  │ │   Sistem uyarı   │
   │ evrak paylaşım   │ │ SMS entegrasyon  │ │   bildirimleri   │
   └──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## 🔐 SİSTEME GİRİŞ

### Giriş Adımları

| Adım | İşlem | Açıklama |
|------|-------|----------|
| 1 | Tarayıcıyı açın | Chrome, Firefox veya Edge önerilir |
| 2 | Sistem adresine gidin | Size verilen web adresini tarayıcının adres çubuğuna yazın |
| 3 | Kullanıcı adınızı girin | Sistem yöneticisinin size verdiği kullanıcı adı |
| 4 | Şifrenizi girin | Size tanımlanan şifre |
| 5 | 2FA kodunu girin (varsa) | Google Authenticator uygulamasındaki 6 haneli kod |
| 6 | "GİRİŞ" butonuna tıklayın | Başarılı girişte ana sayfaya yönlendirilirsiniz |

### İki Faktörlü Doğrulama (2FA) Nedir?

Sisteme giriş yaparken şifrenizin yanında telefonunuzdaki Google Authenticator uygulamasının ürettiği 6 haneli kodu da girmeniz gerekir. Bu, hesabınızın güvenliğini artıran ek bir koruma katmanıdır.

> ⚠️ **KRİTİK UYARI:** 2FA aktifse, Google Authenticator uygulaması olmadan sisteme giriş yapamazsınız. Telefonunuzu değiştirirseniz, sistem yöneticisinden 2FA sıfırlaması isteyin.

---

## 🧭 EKRAN DÜZENİ VE NAVİGASYON

### Üst Menü Çubuğu

```
┌──────────────────────────────────────────────────────────────────────┐
│ [LOGO]  DOSYA İŞLEMLERİ ▾  CRM/SAHA ▾  HESAPLAMALAR ▾  ...  🔔 👤 │
└──────────────────────────────────────────────────────────────────────┘
         ▲                                                    ▲    ▲
         │                                                    │    │
    Ana modüller                                    Bildirim  Profil
    (tıklayınca                                     sayacı    menüsü
     alt menü açılır)
```

| Bölge | Ne İşe Yarar |
|-------|-------------|
| **Logo (sol üst)** | Tıklayınca ana sayfaya döner |
| **Modül menüleri** | Her modülün üzerine gelince alt menü açılır |
| **Bildirim simgesi (🔔)** | Okunmamış bildirim ve mesaj sayısını gösterir |
| **Profil simgesi (👤)** | Şifre değiştirme, profil düzenleme, çıkış yapma |

### Menü Yapısı

Üst menüde şu ana başlıklar yer alır:

| Menü | Alt Menüler |
|------|-------------|
| **DOSYA İŞLEMLERİ** | Dosya Listesi, Yeni Dosya |
| **CRM / SAHA** | CRM Listesi, Yeni Kayıt, Arama Listesi, Saha Dosyaları, Yeni Saha Kaydı |
| **HESAPLAMALAR** | Araç Değer Kaybı, Bedeni Hasar |
| **PAYDAŞLAR** | İş Ortakları, İş Paydaşları, Personel |
| **POLİÇE** | Poliçe Listesi, Yeni Poliçe, Yenileme Takibi, Tahsilat/Cari, Raporlar, Kazanç |
| **MUHASEBE** | Gelir, Gider, Komisyon/Prim, Kasa/Banka, Ortak Kasa, Maliyet Analizi, Finansal Raporlar, Kapanış Raporu, Ay Sonu Raporu |
| **İÇTİHAT** | Yargıtay Kararları, Tahkim Kabul Örnekleri, Poliçe Limit Tabloları, Kusur Emsal Dosyaları |
| **AJANDA** | (Tek sayfa — görev takvimi) |
| **SİSTEM** | Kullanıcı Yönetimi, Yetki Yönetimi, Firma Ayarları, SMS Bildirim, Portal Ayarları, Cihaz Güvenliği, Toplu Aktarım, Veri Yönetimi, Log Kayıtları, Sistem Bildirimleri, Dosya Tanımlamaları, Evrak Tanımlamaları, Finansal Tanımlamalar, Matbu Evrak/Sözleşme, Genel Tanımlamalar, Konum Takibi |

> ⚠️ **KRİTİK UYARI:** Menüde gördüğünüz seçenekler, size tanımlanan yetkilere göre değişir. Bir menüyü göremiyorsanız, yetkiniz yoktur. Sistem yöneticinize başvurun.

---

## 👥 KULLANICI ROLLERİ

Sistemde 6 farklı kullanıcı rolü bulunur. Her rol, farklı menü ve işlemlere erişim sağlar:

| Rol | Kimler İçin | Erişim Kapsamı |
|-----|-------------|----------------|
| **ADMİN** | Sistem yöneticisi | Tüm modüllere tam erişim, kullanıcı ve yetki yönetimi |
| **AVUKAT** | Avukatlar | Dosya işlemleri, hesaplamalar, içtihat, yetki verilmiş diğer modüller |
| **UZMAN** | Hasar uzmanları | Dosya, hesaplama, saha, yetki verilmiş diğer modüller |
| **PERSONEL** | Ofis çalışanları | Yetki verilmiş modüller (genellikle CRM, dosya, ajanda) |
| **MUHASEBE** | Muhasebe sorumlusu | Muhasebe modülü, gelir-gider, kasa, raporlar |
| **PORTAL** | Dış kullanıcılar | Sadece müvekkil portalı (sınırlı erişim) |

> ⚠️ **KRİTİK UYARI:** Rol tek başına yetki vermez. Admin rolü hariç, her kullanıcıya ayrıca detaylı yetki tanımlaması yapılmalıdır. Rolünüz "avukat" olsa bile, yetki tanımlanmadıysa hiçbir menüyü göremezsiniz.

---

## 🎨 TEMA VE GÖRÜNÜM

Sistem iki farklı tema sunar:

| Tema | Açıklama |
|------|----------|
| **Açık Tema** | Beyaz arka plan, standart renkler — gündüz kullanımı için ideal |
| **Koyu Tema** | Koyu arka plan, göz yormayan renkler — gece veya uzun süreli kullanım için ideal |

Tema değiştirmek için profil menüsündeki tema seçeneğini kullanın.

---

## 📱 GENEL KULLANIM MANTIKLARI

### Liste Sayfaları

Sistemdeki tüm liste sayfaları (dosya listesi, CRM listesi, poliçe listesi vb.) benzer şekilde çalışır:

```
┌──────────────────────────────────────────────────────────────┐
│  [🔍 Arama]  [Filtreler ▾]  [+ YENİ EKLE]  [⬇ Excel]       │
├──────────────────────────────────────────────────────────────┤
│  ☐  │ Sıra │ Ad Soyad  │ Durum    │ Tarih     │ İşlemler   │
│  ☐  │ 001  │ Ali Yılmaz│ AÇIK     │ 15.03.2026│ 👁 ✏️ 🗑   │
│  ☐  │ 002  │ Ayşe Demir│ TAHKİM   │ 12.03.2026│ 👁 ✏️ 🗑   │
├──────────────────────────────────────────────────────────────┤
│  ◀ Önceki    Sayfa 1 / 5    Sonraki ▶     Toplam: 48 kayıt │
└──────────────────────────────────────────────────────────────┘
```

| İşlem | Nasıl Yapılır |
|-------|---------------|
| **Arama** | Arama kutusuna yazın, sonuçlar otomatik filtrelenir |
| **Filtreleme** | Filtre seçeneklerinden durum, tarih aralığı vb. seçin |
| **Yeni kayıt** | "+ YENİ EKLE" butonuna tıklayın |
| **Detay görme** | Satırdaki göz (👁) simgesine tıklayın |
| **Düzenleme** | Satırdaki kalem (✏️) simgesine tıklayın |
| **Silme** | Satırdaki çöp kutusu (🗑) simgesine tıklayın |
| **Toplu işlem** | Sol taraftaki kutucukları işaretleyip üstteki toplu işlem butonunu kullanın |
| **Sayfalama** | Alt kısımdaki ok butonlarıyla sayfalar arasında gezinin |
| **Excel çıktısı** | Excel simgesine tıklayarak listeyi Excel dosyası olarak indirin |

### Form Sayfaları (Yeni Kayıt / Düzenleme)

| Kural | Açıklama |
|-------|----------|
| **Yıldızlı alanlar (*)** | Zorunlu alanlardır, boş bırakılamaz |
| **Kaydet butonu** | Formu tamamladıktan sonra en alttaki KAYDET butonuna tıklayın |
| **Hata mesajı** | Eksik veya hatalı alan varsa sayfanın üstünde kırmızı uyarı çıkar |
| **Başarı mesajı** | Kayıt başarılıysa yeşil onay mesajı görüntülenir |

> ⚠️ **KRİTİK UYARI:** Formu doldurup KAYDET butonuna basmadan sayfadan çıkarsanız, girdiğiniz tüm bilgiler kaybolur. Kaydetmeden sayfayı kapatmayın.

---

## 🔄 SİSTEMİN GENEL İŞ AKIŞI

Bir hasar dosyasının baştan sona tipik akışı şu şekildedir:

```
  ① CRM'e müşteri adayı girilir
           │
           ▼
  ② Değerlendirme yapılır (telefon görüşmesi, saha ziyareti)
           │
           ▼
  ③ Uygunsa → DOSYA AÇILIR (Yeni Dosya oluşturulur)
           │
           ▼
  ④ Evraklar yüklenir (kaza tutanağı, poliçe, ruhsat vb.)
           │
           ▼
  ⑤ Hesaplama yapılır (ADK veya BH — yapay zeka destekli)
           │
           ▼
  ⑥ Sigorta şirketine başvuru yapılır
           │
           ▼
  ⑦ Süreç takip edilir (aşama güncellenir: Başvuru → Tahkim → Ödeme)
           │
           ▼
  ⑧ Ödeme alındığında → Gelir kaydedilir (Muhasebe)
           │
           ▼
  ⑨ Komisyonlar hesaplanır (ortak, paydaş, personel payları)
           │
           ▼
  ⑩ Dosya kapatılır
```

---

## ⌨️ GENEL İPUÇLARI

| İpucu | Açıklama |
|-------|----------|
| **Hızlı arama** | Liste sayfalarında arama kutusuna yazarak anında filtreleme yapabilirsiniz |
| **Tarih girişi** | Tarih alanlarına tıklayınca takvim açılır, elle yazmaya gerek yoktur |
| **Para birimi** | Tüm tutarlar Türk Lirası (₺) cinsindendir |
| **TC Kimlik** | 11 haneli olmalıdır, sistem otomatik kontrol eder |
| **IBAN** | TR ile başlamalı, 26 karakter olmalıdır |
| **Plaka** | Standart plaka formatında girilmelidir (örn: 34 ABC 123) |

---

## ⚠️ GENEL KRİTİK UYARILAR

> ⚠️ **ŞİFRE GÜVENLİĞİ:** Şifrenizi kimseyle paylaşmayın. Sistemdeki her işlem, sizin adınıza log kaydı oluşturur.

> ⚠️ **OTURUM SÜRESİ:** Uzun süre işlem yapmazsanız oturumunuz kapanabilir. Bu durumda tekrar giriş yapmanız gerekir.

> ⚠️ **TARAYICI UYUMLULUĞU:** Google Chrome, Mozilla Firefox veya Microsoft Edge kullanın. Internet Explorer desteklenmez.

> ⚠️ **VERİ KAYBI:** Sistemde silinen kayıtlar geri getirilemez. Silme işlemi yapmadan önce emin olun.

> ⚠️ **AYNI ANDA BİRDEN FAZLA OTURUM:** Aynı kullanıcı hesabıyla birden fazla cihazdan giriş yapılabilir, ancak bu durum veri çakışmasına neden olabilir. Mümkünse tek cihaz kullanın.

---

## 🗂️ MODÜL DİZİNİ

Bu kılavuz aşağıdaki modül dosyalarından oluşmaktadır:

| Dosya | Modül |
|-------|-------|
| `00-GIRIS.md` | Giriş & Genel Kullanım (bu dosya) |
| `01-DOSYA-ISLEMLERI.md` | Dosya İşlemleri |
| `02-CRM-SAHA.md` | CRM & Saha |
| `03-HESAPLAMALAR.md` | Hesaplamalar |
| `04-PAYDASLAR.md` | Paydaşlar (Ortaklar, Paydaşlar, Personel) |
| `05-POLICE.md` | Poliçe |
| `06-MUHASEBE.md` | Muhasebe |
| `07-ICTIHAT.md` | İçtihat |
| `08-AJANDA.md` | Ajanda |
| `09-SISTEM.md` | Sistem Yönetimi |
| `10-PORTAL.md` | Müvekkil Portalı |
| `11-MESAJLAR-BILDIRIM.md` | Mesajlar & Bildirimler |
| `12-SOZLUK.md` | Sözlük |
| `13-SIK-YAPILAN-HATALAR.md` | Sık Yapılan Hatalar |

---

## 📊 HIZLI BAŞVURU KARTI

```
╔══════════════════════════════════════════════════════════════════╗
║                    HIZLI BAŞVURU — GENEL                        ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Sisteme giriş ........... Kullanıcı adı + Şifre + 2FA (varsa) ║
║  Ana sayfaya dönüş ....... Sol üstteki logoya tıklayın          ║
║  Menüde gezinme .......... Üst çubuktaki başlıklara tıklayın    ║
║  Bildirimler ............. Sağ üstteki zil simgesine tıklayın   ║
║  Profil / Çıkış ......... Sağ üstteki profil simgesine tıklayın║
║  Tema değiştirme ......... Profil menüsünden                    ║
║  Şifre değiştirme ........ Profil menüsünden                    ║
║  Arama (listelerde) ...... Arama kutusuna yazın                 ║
║  Excel çıktısı ........... Liste sayfalarında Excel butonu      ║
║  Yeni kayıt .............. "+ YENİ EKLE" butonu                 ║
║  Toplu silme ............. Kutucukları işaretle → Toplu Sil     ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

*MR Hasar Danışmanlık Sistemi Kullanım Kılavuzu — Bölüm 00*
*Sonraki bölüm: 01-DOSYA-ISLEMLERI.md*
