# MR HASAR v2.20 — DOSYA DETAY TEMA YENİLEME

**Tarih:** 16.05.2026
**Kapsam:** DOSYA DETAY sayfasının görsel teması tasarımdaki referansa göre yenilendi
**Tek dosya:** `js/pages/dosya-detay.js`

---

## 🎯 NE DEĞİŞTİ — SADECE TEMA

**ÖNEMLİ:** Alan listesi, sekme yapısı, veri akışı **DEĞİŞMEDİ**. Sadece görsel düzen, renkler ve kart tasarımı tasarımdaki referansa göre yenilendi.

### 1) DOSYA HEADER KARTI (Üstte)
**Önceki:** Basit klasör ikonu + dosya no + tek satır müşteri/sigorta + butonlar
**Yeni:**
- **Sol:** Büyük gradient ikon + büyük dosya no (22px bold) + **AÇIK badge** + müşteri/sigorta/hasar alt satır
- **Orta:** 4 renkli bilgi kutusu yan yana:
  - 📅 HASAR TARİHİ (sarı/uyarı)
  - 🕐 OLUŞTURMA TARİHİ (cyan)
  - 📄 DOSYA TÜRÜ (mavi/mor/altın — türe göre)
  - 👤 DOSYA SORUMLUSU (yeşil)
- **Sağ:** Butonlar grup (DÜZENLE/PORTAL/SİL) + aşama dropdown

### 2) BİLGİ SEKMESİ — 3 SÜTUN LAYOUT
**Önceki:** 2 sütun (Dosya Bilgileri | Mağdur + Araçlar)
**Yeni:** 3 sütun (tür ADK/MDK ise — BH'da 2 sütun)

#### SOL SÜTUN: DOSYA BİLGİLERİ
Mevcut alanlar olduğu gibi korundu — değişiklik yok.

#### ORTA SÜTUN: MAĞDUR ARAÇ + KAZA BİLGİSİ
- **MAĞDUR ARAÇ kartı** (yeşil tema):
  - Üst başlık: ikon + "MAĞDUR ARAÇ" + **TR plaka rozeti** (sağda, mavi/sarı stil)
  - **Araç görsel banner** (120px yükseklik):
    - Sol: 78×78 beyaz kutuda **marka logosu** (`logo.clearbit.com`)
    - Yan: Büyük MARKA + MODEL + MODEL YILI yazı
    - Logo yüklenmezse fallback Lucide Car ikonu
  - ARAÇ BİLGİLERİ section: 2 sütun grid (Şasi, Marka, Model, Yıl, Belge, Kasko, Onarım, Geçmiş Hasar)
  - ARAÇ SAHİBİ / RUHSAT SAHİBİ section (alt zemin)
- **KAZA BİLGİSİ kartı** (turuncu-kırmızı gradient):
  - ⚠ Uyarı ikonu + KAZA YERİ + HAKLILIK ORANI

#### SAĞ SÜTUN: KARŞI TARAF ARAÇ
- Aynı yapı (kırmızı tema)
- BH dosyalarında **gizli** (karşı araç yok)
- "FARKLI SÜRÜCÜ" durumunda sarı vurgu bölüm

### 3) Marka Logosu Entegrasyonu
- Kaynak: `logo.clearbit.com/${marka_domain}` (ücretsiz, CORS uyumlu)
- 30+ marka için domain eşleştirmesi:
  - VOLKSWAGEN → volkswagen.com
  - HYUNDAI → hyundai.com
  - MERCEDES → mercedes-benz.com
  - vb.
- Bilinmeyen markalar: `${marka_kucuk}.com` denenir
- Yükleme başarısızsa **Lucide Car ikonu** fallback

### 4) Plaka Rozeti
- Resmi TR plaka stili: sol mavi blok (`#003399`) + sarı yıldızlar + "TR" + beyaz arka plan + büyük plaka yazısı
- Yeşil border (mağdur araç) / kırmızı border (karşı araç)

---

## ⚠️ NEYİ ALMADIK (Tasarımdaki ama sistemde olmayan)

| Tasarımdaki | Neden Yok |
|---|---|
| Araç fotoğrafı (gerçek VW Passat resmi) | API yok; marka logosu ile değiştirildi |
| Plaka QR kodu | Kullanıcı "olmasa da olur" dedi — kaldırıldı |
| Şase No, Motor No, Yakıt Türü, Renk, Tescil Tarihi | DB'de yok (Şasi No eklendi — `arac.sase_no` veya fallback `belge_tescil_no`) |
| 7 yeni sekme (TARAFLAR/ARAÇLAR/HESAPLAMALAR/NOTLAR/GEÇMİŞ) | Mevcut 4 sekme korundu (kullanıcı isteği üzerine) |
| E-Posta, Adres (Araç Sahibi bölümünde) | v2.18'de kaldırıldı, kullanıcı "olduğu gibi kalsın" dedi |

---

## 📦 PAKET İÇERİĞİ

```
MR_HASAR_v2.20_DOSYA_DETAY_TEMA_2026-05-16.zip
│
├── KURULUM_KILAVUZU.md
│
├── SQL/
│   └── 01_v217_arac_kolon_backfill.sql   (v2.17 miras)
│
└── YUKLENECEK_DOSYALAR/
    ├── api/v1/dosya/
    │   ├── create.php    (v2.18'den, değişmedi)
    │   └── update.php    (v2.18'den, değişmedi)
    ├── api/v1/personel/
    │   └── dosya-listesi.php  (v2.19'dan)
    └── js/pages/
        ├── dosya-detay.js  ← v2.20 TEMA YENİLEME
        ├── dosya-yeni.js   (v2.19'dan)
        └── personel.js     (v2.19'dan)
```

> **Yeni şey sadece `dosya-detay.js`. Diğer dosyalar değişmedi** ama paket bütünlüğü için dahil edildi. Önceki sürümleri zaten yüklediyseniz, **sadece `dosya-detay.js`'i** üzerine yazmanız yeterli.

---

## 🚀 YÜKLEME

| # | Yer | Açıklama |
|---|---|---|
| 1️⃣ | `js/pages/dosya-detay.js` | **Sadece bu dosya** üzerine yazılırsa yeterli |
| 2️⃣ | `Ctrl+F5` | Cache temizle |

Geri kalan dosyalar v2.19'dan aynı. Daha önce yüklediyseniz tekrar yüklemeye gerek yok.

---

## ⚠️ RİSK NOTLARI

| Risk | Şiddet | Açıklama |
|---|---|---|
| Marka logosu yüklenemezse | 🟢 YOK | Fallback Lucide Car ikonu otomatik gösterilir |
| Tarayıcı `logo.clearbit.com`'a erişemezse (firewall) | 🟢 YOK | onError → fallback ikon |
| BH dosyalarında karşı araç sütunu | 🟢 YOK | Otomatik 2 sütuna düşer |
| Eski tarayıcılar (IE11) | 🟢 YOK | Sistem zaten React kullanıyor |
| Veri kaybı / DB | 🟢 YOK | Backend dokunulmadı |

---

## 🧪 TEST AKIŞI

1. **DOSYA DETAY** sayfasına git → eski dosyalardan birini aç
2. **Üstte:** Büyük dosya no görmeli, sağda 4 küçük bilgi kutusu yan yana
3. **BİLGİ sekmesinde:**
   - 3 sütun layout (ADK/MDK için)
   - Sol: DOSYA BİLGİLERİ (mevcut alanlar)
   - Orta: MAĞDUR ARAÇ + altında KAZA BİLGİSİ (turuncu-kırmızı gradient kart)
   - Sağ: KARŞI TARAF ARAÇ (kırmızı tema)
4. **Mağdur Araç kartında:**
   - Sağ üstte mavi/sarı TR plaka rozeti
   - Banner'da marka logosu (örn. RENAULT ise renault.com logosu)
   - Büyük marka adı + model + yıl
5. **BH dosyası**: 2 sütun layout, karşı araç gizli, mağdur araç ortada
6. **Logo yüklenmiyorsa**: Lucide Car ikonu gözükmeli

---

## 🔄 GERİ ALMA

Önceki `dosya-detay.js` dosyasını geri yükleyin. Hiçbir DB değişikliği yok.

---

## 🛡️ NEYE DOKUNULMADI

- DB schema
- Backend (create.php, update.php aynı)
- Sekme yapısı (BİLGİ/MASRAFLAR/EVRAKLAR/DOSYA HESABI)
- Alan listesi (E-Posta/Adres kalmadı, kullanıcı isteği)
- v2.18, v2.19 değişiklikleri
- Diğer modüller (police, ihbar-foyu, qr-ruhsat, muhasebe, CRM)
