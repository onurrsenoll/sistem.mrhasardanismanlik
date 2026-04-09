# MR HASAR DANIŞMANLIK
## DOSYA TAKİP SİSTEMİ — TEKNİK ŞARTNAME v1.0

> **"HER ZAMAN FARK EDER"**

---

## 1. GENEL BİLGİLER

**Amaç:** Sigorta hasar danışmanlığı operasyonlarının dijital ortamda uçtan uca yönetimi.

**Kapsam:** Dosya yönetimi, CRM, hasar hesaplama motorları (ADK+BH), muhasebe/kasa, evrak yönetimi, ajanda, bildirim, sistem yönetimi, VoIP entegrasyonu.

---

## 2. TEKNİK MİMARİ

```
┌─────────────────────────────────────────────────┐
│            İSTEMCİ (BROWSER)                    │
│   React 18 SPA + Babel | Dark Theme UI          │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS / REST API / JWT Bearer
┌──────────────────▼──────────────────────────────┐
│            API KATMANI (PHP 8.4)                │
│  /api/v1/auth | /dosya | /crm | /muhasebe ...   │
└──────────────────┬──────────────────────────────┘
                   │ PDO (UTF-8)
┌──────────────────▼──────────────────────────────┐
│          VERİTABANI (MariaDB 10.6+)             │
│   16 Tablo | 2 Trigger | 1 View | InnoDB        │
└─────────────────────────────────────────────────┘
```

### Teknoloji Yığını

| Bileşen | Teknoloji | Versiyon |
|---------|-----------|----------|
| Frontend | React (CDN) | 18.x |
| Transpiler | Babel Standalone | Latest |
| Backend | PHP | 8.4+ |
| Veritabanı | MariaDB | 10.6+ |
| Web Sunucu | Apache (cPanel) | 2.4+ |
| Auth | JWT | Custom |
| Şifreleme | bcrypt | PHP native |
| VoIP | Netsantral API | REST |

### Sunucu Gereksinimleri

| Gereksinim | Değer |
|------------|-------|
| PHP | 8.0+ (önerilen 8.4) |
| MariaDB/MySQL | 10.6+ / 8.0+ |
| PHP Eklentileri | PDO, mbstring, fileinfo, json |
| upload_max_filesize | 20M |
| post_max_size | 25M |
| max_execution_time | 120s |
| memory_limit | 256M |
| SSL | Zorunlu |

---

## 3. VERİTABANI ŞEMASI — 16 TABLO

| # | Tablo | Açıklama | İlişkiler |
|---|-------|----------|-----------|
| 1 | `users` | Kullanıcılar (6 rol) | — |
| 2 | `dosyalar` | Ana dosya (ADK/BH) | FK: avukat_id, sorumlu_id → users |
| 3 | `magdurlar` | Mağdur bilgileri | FK: dosya_id → dosyalar CASCADE |
| 4 | `araclar` | Araçlar (mağdur/karşı) | FK: dosya_id → dosyalar CASCADE |
| 5 | `kasalar` | Kasa/banka hesapları | — |
| 6 | `masraflar` | Dosya masrafları | FK: dosya_id, kasa_id, kullanici_id |
| 7 | `evraklar` | PDF evraklar | FK: dosya_id, kullanici_id |
| 8 | `kasa_hareketleri` | Mali hareketler | FK: kasa_id, dosya_id, kullanici_id |
| 9 | `crm` | Potansiyel müşteriler | FK: atanan_id, donusen_dosya_id |
| 10 | `crm_notlari` | CRM notları | FK: crm_id CASCADE |
| 11 | `hesaplamalar` | Hesaplama sonuçları (JSON) | FK: dosya_id, kullanici_id |
| 12 | `tanimlamalar` | Sistem tanımlamaları | UNIQUE: kategori+deger |
| 13 | `bildirimler` | Bildirim/mesajlar | FK: gonderen_id, alici_id |
| 14 | `ajanda` | Görev/etkinlikler | FK: kullanici_id, dosya_id |
| 15 | `log_kayitlari` | Denetim kaydı | FK: kullanici_id |
| 16 | `oturumlar` | JWT oturum takibi | FK: kullanici_id CASCADE |

### Kritik Tablolar

**users:** id, ad_soyad, email (UNIQUE), sifre_hash, rol ENUM('admin','avukat','uzman','personel','muhasebe','portal'), telefon, aktif, son_giris

**dosyalar:** id, dosya_no (UNIQUE), dosya_turu ENUM('ADK','BH'), asama, hasar_no, sigorta_sirket, police_no, avukat_id FK, sorumlu_id FK, haklilik, komisyon_orani, kaza_tarihi/il/ilce, pozisyon, kusur_durumu (BH özel)

**kasalar:** id, ad, tip ENUM('Nakit','Banka'), banka_adi, iban, bakiye DECIMAL(14,2), aktif

**kasa_hareketleri:** id, kasa_id FK, dosya_id FK, islem_turu ENUM('gelir','gider','masraf','komisyon','transfer','duzeltme'), tutar, bakiye_sonrasi, aciklama, kullanici_id FK

### Trigger Mekanizmaları

- **trg_masraf_after_insert**: Masraf eklendiğinde kasa bakiyesini düşürür + hareket kaydı oluşturur
- **trg_masraf_after_delete**: Masraf silindiğinde bakiyeyi geri yükler + düzeltme kaydı oluşturur

### View
- **v_dosya_ozet**: dosyalar + magdurlar + araclar + users (avukat/sorumlu) + masraf/evrak sayısı birleşik görünümü

---

## 4. API ENDPOINT KATALOĞU

### Auth
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/v1/auth/login.php` | Giriş → JWT token |
| GET | `/api/v1/auth/me.php` | Oturum bilgisi |
| POST | `/api/v1/auth/change-password.php` | Şifre değiştir |

### Dosya
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/dosya/list.php` | Liste (filtre: q, tur, asama) |
| GET | `/api/v1/dosya/get.php?id=X` | Detay |
| POST | `/api/v1/dosya/create.php` | Oluştur |
| PUT | `/api/v1/dosya/update.php` | Güncelle |
| DELETE | `/api/v1/dosya/delete.php?id=X` | Sil |

### Masraf
| POST | `/api/v1/masraf/create.php` | Ekle (trigger aktif) |
| GET | `/api/v1/masraf/list.php` | Liste |
| DELETE | `/api/v1/masraf/delete.php?id=X` | Sil (trigger aktif) |

### Evrak
| POST | `/api/v1/evrak/upload.php` | PDF yükle (multipart) |
| GET | `/api/v1/evrak/download.php?id=X` | İndir |
| DELETE | `/api/v1/evrak/delete.php?id=X` | Sil |

### CRM
| GET | `/api/v1/crm/list.php` | Liste |
| GET | `/api/v1/crm/get.php?id=X` | Detay |
| POST | `/api/v1/crm/create.php` | Oluştur |
| PUT | `/api/v1/crm/update.php` | Güncelle |
| DELETE | `/api/v1/crm/delete.php?id=X` | Sil |
| POST | `/api/v1/crm/not-ekle.php` | Not ekle |
| POST | `/api/v1/crm/donustur.php` | Dosyaya dönüştür |

### Muhasebe
| GET | `/api/v1/muhasebe/kasa-list.php` | Kasa listesi |
| POST | `/api/v1/muhasebe/kasa-create.php` | Yeni kasa |
| PUT | `/api/v1/muhasebe/kasa-update.php` | Kasa güncelle |
| POST | `/api/v1/muhasebe/gelir-ekle.php` | Gelir girişi |
| GET | `/api/v1/muhasebe/hareketler.php` | Hareket listesi |
| POST | `/api/v1/muhasebe/transfer.php` | Transfer |
| GET | `/api/v1/muhasebe/rapor.php` | Rapor |

### Sistem
| GET | `/api/v1/sistem/dashboard.php` | Dashboard istatistik |
| GET | `/api/v1/sistem/kullanici-list.php` | Kullanıcı listesi |
| POST | `/api/v1/sistem/kullanici-create.php` | Kullanıcı oluştur |
| PUT | `/api/v1/sistem/kullanici-update.php` | Kullanıcı güncelle |
| DELETE | `/api/v1/sistem/kullanici-delete.php?id=X` | Kullanıcı sil |
| GET | `/api/v1/sistem/loglar.php` | Log kayıtları |

### Bildirim / Ajanda / Tanım / Netsantral
Bildirim: list, create, oku, delete | Ajanda: list, create, update, delete | Tanım: list, create, update, delete | Netsantral: ayarlar-getir, ayarlar-kaydet, baglanti-test, arama-kayitlari, cagri-baslat, webhook

---

## 5. FRONTEND DOSYA YAPISI

```
index.html              → Ana HTML (React 18 CDN + Babel)
js/config.js            → API, renkler, stiller
js/icons.js             → 70+ SVG ikon
js/data.js              → Araç DB, sigorta, iller, PMF, emsal, asgari ücret
js/utils.js             → fmt, fmtK, parseNum, formatPlaka, yasHesapla, progresifRant
js/components.js        → StatCard, Badge, Modal, FormGroup, Loading, Confirm, LoginScreen
js/app.js               → Router, TopNav, Breadcrumb, Profil, Footer
js/pages/home.js        → Dashboard
js/pages/dosya-liste.js → Dosya listesi
js/pages/dosya-detay.js → Dosya detay + MasrafEkle + EvrakYukle
js/pages/dosya-yeni.js  → Yeni dosya sihirbazı (4 adım)
js/pages/crm.js         → CRM liste + yeni + detay
js/pages/hesap-adk.js   → ADK hesaplayıcı
js/pages/hesap-bh.js    → BH hesaplayıcı
js/pages/muhasebe.js    → Muhasebe (5 sekme)
js/pages/ajanda.js      → Ajanda (takvim + liste)
js/pages/bildirim.js    → Bildirimler
js/pages/sistem.js      → Sistem yönetimi (3 sekme)
js/components/softphone.js → VoIP widget
```

---

## 6. GÜVENLİK

| Katman | Uygulama |
|--------|----------|
| Kimlik Doğrulama | JWT 24 saat, Bearer header, 401 otomatik çıkış |
| Şifreleme | bcrypt ($2y$10$) |
| RBAC | 6 rol, menü + API seviyesinde |
| SQL Injection | PDO Prepared Statements |
| XSS | htmlspecialchars + sanitization |
| Upload | PDF only, 20MB max, UUID adlandırma, .htaccess engel |
| Denetim | log_kayitlari: IP, user agent, eski/yeni değer (JSON) |

---

## 7. HESAPLAMA MOTOR SPESİFİKASYONLARI

### ADK Algoritması
```
Yaş Oranı: ≤1y:%12 | ≤2:%10 | ≤3:%9 | ≤5:%7 | ≤7:%5 | ≤10:%4 | ≤15:%3 | 15+:%2
Bölge: ÖN:x1.15 | ARKA:x1.00 | YAN:x1.05 | TAVAN:x1.20 | ÇOKLU:x1.30
KM: <30K:x1.10 | <60K:x1.05 | <100K:x1.00 | <150K:x0.95 | <200K:x0.90 | 200K+:x0.85
Onarım: ≥%60:x1.35 | ≥%40:x1.20 | ≥%25:x1.10 | ≥%10:x1.00 | <%10:x0.85
Premium: x1.15 (BMW, Mercedes, Audi, Volvo, Porsche, Tesla, Lexus)
Pert: Onarım > Rayiç×0.60 → PERT TOTAL | > Rayiç×0.40 → PERT FARKI

Sonuç = Rayiç × YaşOranı × Bölge × KM × Premium × Onarım × ÖncekiHasar × (Kusur/100)
```

### BH Algoritması
```
PMF: TRH2010, CSO1980, PMF1931 (E/K) | Emeklilik: 65 yaş
Aktif Yıl = max(0, 65-Yaş) | Pasif Yıl = max(0, KalanÖmür-AktifYıl)
Aktif Gelir Kaybı = Yıllık Gelir × Maluliyet% × ProgresifRant(AktifYıl, Faiz)
Pasif Gelir Kaybı = Pasif Yıllık × Maluliyet% × ProgresifRant(PasifYıl, Faiz) × İskonto
Sonuç = (Aktif + Pasif) × Kusur%
```

---

## 8. VARSAYILAN VERİLER

- **5 Kullanıcı**: admin, 2 avukat, 1 uzman, 1 personel
- **4 Kasa**: Ana Kasa (125K), Ziraat (340K), İş Bankası (215K), Avukat Kasa (45K)
- **~70 Tanımlama**: 22 sigorta şirketi, 15 masraf kalemi, 17 evrak türü, 11 aşama, 7 CRM kaynağı

---

## 9. DOSYA DEPOLAMA

| Parametre | Değer |
|-----------|-------|
| Yol | `/uploads/YYYY/MM/` |
| Adlandırma | UUID v4 |
| Tür | Sadece PDF |
| Max Boyut | 20 MB |
| Erişim | API + JWT |
| Koruma | .htaccess direkt erişim engelli |

---

<div align="center">

**MR HASAR DANIŞMANLIK** | Teknik Şartname v1.0 | **"HER ZAMAN FARK EDER"**

</div>
