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
