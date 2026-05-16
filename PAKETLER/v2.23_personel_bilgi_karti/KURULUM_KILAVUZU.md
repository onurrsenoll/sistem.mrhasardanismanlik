# MR HASAR v2.23 — PERSONEL BİLGİ KARTI (GERİ EKLENDİ)

**Tarih:** 16.05.2026
**Kapsam:** Personel listesinde tıklayınca açılan **modal popup** — 4 sekmeli bilgi kartı
**Tek dosya:** `js/pages/personel.js`

---

## 🎯 NEYE YANIT VERİYOR

Kullanıcı geri bildirimi:
> "PERSONEL BİLGİ KARTI NEDEN KAYBOLDU? BEN DOSYA İSİMLERİ DE GÖRÜNTÜLENSİN DEDİM KOMPLE GİTMİŞ!"
> "GENEL BİLGİLER + CARİ HESAP (MAAŞ, AVANS, PRİM, BORÇ, BAKİYE, ÖDEME YAP BUTONU) + PRİM HAKEDİŞ (DÖNEM BAZLI) + ÇALIŞMA MODELİ"

Sorun: v2.19'da `personel.js`'i yeniden yazarken eski "Personel Bilgi Kartı"nı koymadım (eski sürüm repo'da yoktu, sadece sunucunuzda kalmıştı). v2.19 yüklenince üzerine yazıldı ve kayboldu.

**Şimdi geri ekledim ve genişlettim.**

---

## 📋 PERSONEL BİLGİ KARTI — YAPI

**Açılış:** PERSONEL LİSTESİ tablosunda **herhangi bir satıra tıklayın** → modal açılır (`width: 90vw`)

### Üst Kart (her sekmede sabit)
- Renkli avatar (ad soyad baş harfleri, kişi başına farklı renk)
- Ad soyad + pozisyon + departman + AKTİF/PASİF badge
- Sağda **ÖDEME YAP** ve **DÜZENLE** butonları

### Sekme 1: GENEL BİLGİLER
- **Kişisel:** Ad Soyad, TC Kimlik, Telefon, E-posta, İl, Adres
- **İş:** Departman, Pozisyon, İşe Başlama, SGK No, IBAN, Durum
- **Notlar** (varsa, alt full-width kart)

### Sekme 2: CARİ HESAP
4 metrik kart:
- 💰 **AYLIK MAAŞ**
- 📈 **TOPLAM HAKEDİŞ**
- ✅ **ÖDENEN HAKEDİŞ**
- ⏱ **BEKLEYEN BAKİYE** (>0 ise sarı uyarı)

Altında **HAKEDİŞ HAREKETLERİ tablosu** (dönem/dosya/maaş/prim/toplam/durum) + bekleyen varsa **ÖDEME YAP** butonu (köşede)

### Sekme 3: PRİM HAKEDİŞ (DÖNEM BAZLI)
- Üstte **DÖNEM SEÇİCİ** (`<input type="month">`) — varsayılan bugünün ayı
- O dönemin hakediş satırları (her birine **tıklayınca aşağıda dosya listesi açılır**)
- Dosya listesi: **DOSYA NO | MÜŞTERİ | TÜR | AŞAMA | AÇILIŞ | PRİM**
- Veriler `GET /api/v1/personel/dosya-listesi.php?personel_id=X&donem=YYYY-MM` ile çekilir (mevcut endpoint)

### Sekme 4: ÇALIŞMA MODELİ
3 büyük kart:
- 💰 **AYLIK SABİT MAAŞ** (yeşil)
- 🚗 **ADK/MDK PRİM** /dosya (cyan)
- ❤️ **BH PRİM** /dosya (mor)

Altta **HAKEDİŞ HESAPLAMA MANTIĞI** kutusu:
```
• Her dönem için AYLIK SABİT MAAŞ ödenir
• Her ADK/MDK dosyası için ek {prim_adk} prim
• Her BH dosyası için ek {prim_bh} prim
Toplam = Maaş + (ADK × {prim_adk}) + (BH × {prim_bh})
```

Sayfa altında **ÇALIŞMA MODELİNİ DÜZENLE** butonu (mevcut edit modal'ı açar)

---

## 🔗 ENTEGRASYON

| Kaynak | Endpoint | Kullanım |
|---|---|---|
| Personel verisi | `api.personelList` (zaten yüklü) | Tablo verisinden gelen `p` objesi |
| Hakediş listesi | `api.hakedisList({personel_id: X})` | CARİ HESAP + PRİM HAKEDİŞ sekmeleri |
| Dosya listesi | `GET /personel/dosya-listesi.php` | PRİM HAKEDİŞ'te hakediş satırı açılınca |
| Ödeme | `api.hakedisOde` (mevcut `maasOdeAc`) | ÖDEME YAP butonları |
| Düzenleme | mevcut `duzenleAc` + `editModal` | DÜZENLE butonları |

**Yeni backend gerekmez.** Tüm endpoint'ler v2.19'da zaten vardı.

---

## 📦 PAKET İÇERİĞİ

```
v2.23_personel_bilgi_karti/
├── KURULUM_KILAVUZU.md
├── MR_HASAR_v2.23_PERSONEL_BILGI_KARTI_2026-05-16.zip
└── MR_HASAR_v2.23_PERSONEL_BILGI_KARTI_2026-05-16/
    └── YUKLENECEK_DOSYALAR/
        └── js/pages/
            └── personel.js   ← TEK DOSYA
```

---

## 🚀 YÜKLEME

```
js/pages/personel.js → <sunucu>/js/pages/personel.js
```

**Ctrl+F5** ile cache temizle. **Backend/DB dokunulmadı.**

---

## 🧪 TEST AKIŞI

1. **PERSONEL → LİSTE** sekmesine git
2. **Herhangi bir personel satırına tıkla** → BİLGİ KARTI modal açılır
3. **Avatar** kişinin baş harflerini göstermeli (renk personele göre farklı)
4. **GENEL BİLGİLER** sekmesi → 2 kolon (kişisel + iş)
5. **CARİ HESAP** → 4 metrik kart + altta hakediş hareketleri tablosu
6. **PRİM HAKEDİŞ** → Dönem değiştir, hakediş satırına tıkla → dosya listesi açılır
7. **ÇALIŞMA MODELİ** → Maaş + ADK + BH prim kartları, hesaplama mantığı
8. **ÖDEME YAP** butonu → mevcut ödeme modal'ı açılmalı
9. **DÜZENLE** butonu → mevcut düzenleme modal'ı açılmalı

---

## 🛡️ RİSK
- 🟢 **YOK** — frontend-only, mevcut API'lara bağlı
- DB, backend, diğer modüller dokunulmadı
- Geri alma: v2.22'nin (v2.19'la aynı) `personel.js`'i üzerine yaz
