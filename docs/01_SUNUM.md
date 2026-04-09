# MR HASAR DANIŞMANLIK
## DOSYA TAKİP SİSTEMİ — KURUMSAL SUNUM

---

> **"HER ZAMAN FARK EDER"**

---

## 1. VİZYONUMUZ

MR Hasar Danışmanlık olarak, sigorta hasar danışmanlığı sektöründe dijital dönüşümün öncüsü olmayı hedefliyoruz. Geliştirdiğimiz **Dosya Takip Sistemi**, sektördeki operasyonel karmaşıklığı ortadan kaldırarak dosya yönetiminden muhasebeye, müşteri ilişkilerinden hukuki süreçlere kadar tüm iş akışlarını tek bir platformda birleştiren, uçtan uca dijital bir çözümdür.

---

## 2. SİSTEM GENEL BAKIŞ

### 2.1 Platform Mimarisi

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| **Frontend** | React 18 + Babel (SPA) | Modüler, tek sayfa uygulama |
| **Backend** | PHP 8.4 (RESTful API) | Güvenli, JWT tabanlı API katmanı |
| **Veritabanı** | MariaDB 10.6+ | İlişkisel veritabanı, Türkçe uyumlu |
| **Hosting** | cPanel / Shared Hosting | Düşük maliyetli, kolay yönetim |
| **Güvenlik** | SSL/HTTPS + JWT + Bcrypt | Endüstri standardı güvenlik |
| **Entegrasyon** | Netsantral VoIP | Bulut tabanlı santral entegrasyonu |

### 2.2 Erişim Modeli — 6 Farklı Kullanıcı Rolü

| Rol | Hedef Kullanıcı | Erişim Kapsamı |
|-----|-----------------|----------------|
| **Admin** | Sistem Yöneticisi | Tüm modüller — sınırsız erişim |
| **Avukat** | İş Ortağı Avukatlar | Dosya, CRM, Hesaplama, Ajanda, Bildirim |
| **Uzman** | Hasar Uzmanları | Dosya, Hesaplama, Ajanda, Bildirim |
| **Personel** | Ofis Çalışanları | Dosya, Ajanda, Bildirim |
| **Muhasebe** | Mali İşler | Dosya, Muhasebe, Ajanda, Bildirim |
| **Portal** | Müşteriler | Dosya (salt okunur), Bildirim |

---

## 3. 8 ANA MODÜL

### 3.1 ANA SAYFA (DASHBOARD)
Sistemin kalbi. Tek bakışta tüm operasyonel metrikleri sunar:
- **5 İstatistik Kartı**: Toplam Dosya, Açık Dosya, Bu Ay Yeni, CRM Kayıt, Toplam Bakiye
- **Son Dosyalar Tablosu**: En son 5 dosyanın anlık özeti
- **Hızlı İşlem Paneli**: Tek tıkla yeni dosya, hesaplama, CRM kaydı
- **Son Aktiviteler**: Tüm kullanıcı işlem akışı

### 3.2 DOSYA İŞLEMLERİ
Sistemin temel taşı. İki ana dosya türü:

**ADK — Araç Değer Kaybı**: Mağdur/karşı araç, sigorta, poliçe, haklılık, komisyon
**BH — Bedeni Hasar**: Maluliyet, sakatlık, tedavi, pozisyon, kusur

Ortak: Kademeli dosya oluşturma (3-4 adım sihirbaz), 11 aşamalı süreç takibi, masraf yönetimi, PDF evrak yönetimi, gelişmiş arama (TC, isim, dosya no, plaka)

### 3.3 CRM
Potansiyel müşteri takibi: 4 aşama (Yeni → Takipte → Olumlu → Olumsuz), kaynak analizi, not sistemi, dosyaya dönüştürme, personele atama

### 3.4 HESAPLAMALAR
**ADK Hesaplayıcı**: Yaş bazlı oran, hasar bölgesi katsayısı, KM faktörü, premium bonus, pert tespiti, emsal kararlar
**BH Hesaplayıcı**: PMF yaşam tabloları (TRH2010/CSO1980/PMF1931), aktif/pasif dönem gelir kaybı, progresif rant, teknik faiz, maluliyet tazminatı

### 3.5 MUHASEBE
Kasa Yönetimi (Nakit/Banka), Hareket Takibi, Gelir Ekleme, Kasalar Arası Transfer, Mali Rapor, Otomatik Bakiye (Trigger)

### 3.6 AJANDA
Takvim + Liste görünümü, 4 öncelik seviyesi, renk kodlama, dosya ilişkilendirme, hatırlatma, tamamlanma takibi

### 3.7 BİLDİRİMLER
4 tür (Bilgi/Uyarı/Başarı/Hata), okundu takibi, toplu işlem, admin bildirim gönderme, önizleme, otomatik sayaç (60sn)

### 3.8 SİSTEM YÖNETİMİ
Tanımlamalar (10 kategori, sürükle-bırak sıralama), Kullanıcı Yönetimi, Log Kayıtları (IP, user agent, eski/yeni değer), Netsantral Entegrasyonu

---

## 4. VERİTABANI — 16 TABLO

```
users ─────────┬── dosyalar ──┬── magdurlar
               │              ├── araclar
               │              ├── masraflar ──── kasalar
               │              ├── evraklar          │
               │              └── hesaplamalar       │
               │                                     │
               ├── crm ──── crm_notlari       kasa_hareketleri
               ├── ajanda
               ├── bildirimler
               ├── tanimlamalar
               ├── log_kayitlari
               └── oturumlar
```

---

## 5. GÜVENLİK

1. SSL/HTTPS şifreli iletişim
2. JWT Token oturum yönetimi
3. Bcrypt şifre hash
4. Rol bazlı erişim kontrolü (RBAC)
5. Parametrik SQL sorguları
6. PDF-only upload, UUID dosya adı
7. Tüm işlemler IP + user agent ile log

---

## 6. REKABET AVANTAJLARI

| Avantaj | Açıklama |
|---------|----------|
| **Sektöre Özel** | Hasar danışmanlığı için sıfırdan tasarlanmış |
| **Hesaplama Motorları** | ADK ve BH — emsal kararlarla destekli |
| **Entegre CRM** | Potansiyel müşteriden dosyaya tek akış |
| **Mali Kontrol** | Kasa, hareket, gelir, transfer — tam muhasebe |
| **Düşük Maliyet** | Shared hosting, lisans gerektirmez |
| **Hızlı Kurulum** | 30 dakikada tam kurulum |

---

<div align="center">

**MR HASAR DANIŞMANLIK** | Dosya Takip Sistemi v1.0 | **"HER ZAMAN FARK EDER"**

</div>
