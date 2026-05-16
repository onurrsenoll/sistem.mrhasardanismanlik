# MR HASAR v2.19 — AVUKAT / FİNANSAL ÖZET / HAKEDİŞ DOSYA LİSTESİ

**Tarih:** 15.05.2026
**Kapsam:** 4 talep birlikte uygulandı

---

## ✅ NE YAPILDI

### 1️⃣ YENİ DOSYA AÇ — AVUKAT görsel kartı kaldırıldı
- "AVUKAT (OTOMATİK)" mor kart artık görünmüyor
- Backend mantığı korundu: `otoAvukat` arka planda hala çalışıyor
  - ADK / MDK → "Demirhan" isimli avukat otomatik atanır
  - BH → "Emre" isimli avukat otomatik atanır
- `form.ortak_id` API çağrısında otomatik gönderilmeye devam eder

### 2️⃣ DOSYA DETAY (BİLGİ) — AVUKAT ÖDEME ORANI satırı kaldırıldı
- "AVUKAT" satırı durur (kim olduğu görünür)
- "%50.00" gibi ödeme oranı satırı **gizlendi**
- Ödeme oranı yine arka planda mevcut; sadece DOSYA HESABI sekmesinde paylaşım hesaplamasında kullanılır

### 3️⃣ FİNANSAL ÖZET → DOSYA HESABI sekmesine taşındı
- BİLGİ sekmesinin sağ kolonundan tamamen çıkarıldı
- DOSYA HESABI sekmesinin **en üst kısmına** zenginleştirilmiş şekilde eklendi:
  - 4 kartlı grid: **TOPLAM TAHSİLAT** / **TOPLAM MASRAF** / **TOPLAM GELİR** / **NET KAR**
  - Alt blok: **%50-%50 PAYLAŞIM** — BENİM PAYIM + AVUKAT PAYI
  - Footer: Masraf Sayısı + Evrak Sayısı

### 4️⃣ DOSYA DETAY → BİLGİ teması iyileştirildi
- DOSYA BİLGİLERİ kart başlığı:
  - İkon **kutulu** (32×32, arka plan), önceden flat'tı
  - Başlık **bold ve renkli** (C.accent)
  - 1px border yerine **2px alt çizgi** + gradient
  - Hafif **shadow** eklendi (boxShadow accent rengi)
- Görsel hiyerarşi güçlendi, ana başlıklar net ayırt edilir

### 5️⃣ DOSYA SORUMLUSU → Hakediş'te dosya satır satır
- **HAKEDİŞ TAKİBİ** tablosunda her satıra tıklanabilir
- Tıklayınca **alt-satırda** o personelin o dönem **sorumlu olduğu dosyalar listelenir**:
  - DOSYA NO | MÜŞTERİ | TÜR (ADK/BH) | AŞAMA | AÇILIŞ | PRİM (₺)
  - Üstte özet: ADK adet, BH adet, toplam prim
  - Altta footer: TOPLAM PRİM
- Yeni backend endpoint: `GET /api/v1/personel/dosya-listesi.php?personel_id=X&donem=YYYY-MM`
- Mantık: `dosyalar.sorumlu_id = personel.user_id` + `acilis_tarihi BETWEEN donem_baslangic AND donem_bitis`

---

## 📦 PAKET İÇERİĞİ

```
MR_HASAR_v2.19_AVUKAT_FINANSAL_HAKEDIS_2026-05-15.zip
│
├── KURULUM_KILAVUZU.md
│
├── SQL/
│   └── 01_v217_arac_kolon_backfill.sql   (v2.17 miras, idempotent)
│
└── YUKLENECEK_DOSYALAR/
    ├── api/v1/dosya/
    │   ├── create.php       (v2.18'den)
    │   └── update.php       (v2.18'den)
    ├── api/v1/personel/
    │   └── dosya-listesi.php  ← YENİ ENDPOINT (v2.19)
    └── js/pages/
        ├── dosya-yeni.js    ← AVUKAT görsel kartı kaldırıldı
        ├── dosya-detay.js   ← AVUKAT ÖDEME ORANI gizlendi + FİNANSAL ÖZET DOSYA HESABI'na taşındı + tema
        └── personel.js      ← Hakediş'te expand-row dosya listesi
```

---

## 🚀 SIRALI YÜKLEME

### 1️⃣ SQL Migration (v2.17 miras — daha önce çalıştırdıysanız atlayın)
phpMyAdmin → `SQL/01_v217_arac_kolon_backfill.sql` → Çalıştır

### 2️⃣ Backend
| Lokal | Sunucu |
|---|---|
| `api/v1/dosya/create.php` | `<web_root>/api/v1/dosya/create.php` |
| `api/v1/dosya/update.php` | `<web_root>/api/v1/dosya/update.php` |
| `api/v1/personel/dosya-listesi.php` | `<web_root>/api/v1/personel/dosya-listesi.php` ← **YENİ** |

### 3️⃣ Frontend
| Lokal | Sunucu |
|---|---|
| `js/pages/dosya-yeni.js` | `<web_root>/js/pages/dosya-yeni.js` |
| `js/pages/dosya-detay.js` | `<web_root>/js/pages/dosya-detay.js` |
| `js/pages/personel.js` | `<web_root>/js/pages/personel.js` |

### 4️⃣ Cache Temizle
- PHP opcache reset
- Tarayıcı `Ctrl+F5`

---

## ⚠️ RİSK NOTLARI (abartmadan)

| Risk | Şiddet | Açıklama |
|---|---|---|
| AVUKAT'ın hala otomatik atanması | 🟢 YOK | Sadece UI gizlendi, backend mantığı aynı kaldı |
| Mevcut dosyaların FİNANSAL hesapları | 🟢 YOK | Sadece sekme yer değişti, hesaplama formülü değişmedi |
| Hakediş expand-row | 🟢 DÜŞÜK | Yeni endpoint, eski hakediş listesi mantığı aynı kaldı. Endpoint çalışmazsa sadece dosya listesi açılmaz, hakediş tablosu normal görünür. |
| Personel.js değişti | 🟡 ORTA | Yeni `React.Fragment` ve state'ler eklendi. JSX parse ✓ ama önce test edilmeli. |
| Diğer modüller | 🟢 YOK | Sadece DOSYA + PERSONEL modülleri dokunuldu |

---

## 🧪 TEST AKIŞI

### Test 1 — YENİ DOSYA AÇ
1. YENİ DOSYA → Mor "AVUKAT (OTOMATİK)" kartının görünmediğini doğrula
2. Formu doldur → KAYDET
3. DOSYA DETAY → AVUKAT alanı dolu olmalı (otomatik atandı)

### Test 2 — DOSYA DETAY → BİLGİ
1. Bir dosyayı aç → BİLGİ sekmesi açık
2. "AVUKAT" satırı görünür, ama "%50.00" gibi ÖDEME ORANI satırı **görünmemeli**
3. Sağ kolonda **FİNANSAL ÖZET kart YOK** olmalı
4. Üstte DOSYA BİLGİLERİ kart başlığı **vurgulu** görünmeli (ikon kutulu, renkli)

### Test 3 — DOSYA HESABI sekmesi
1. Aynı dosyada DOSYA HESABI sekmesine geç
2. En üstte **FİNANSAL ÖZET kartı** görünmeli — 4 metrik kart + %50-%50 paylaşım

### Test 4 — Hakediş dosya listesi
1. PERSONEL → HAKEDİŞ TAKİBİ
2. Bir hakediş satırına tıkla
3. Alt satırda **DOSYA LİSTESİ** açılmalı:
   - Üstte sayım rozeti (ADK / BH / TOP PRİM)
   - Tablo: dosya_no | müşteri | tür | aşama | açılış | prim
   - Altta TOPLAM PRİM
4. Tekrar tıkla → kapanır
5. Başka satıra tıkla → yeni dosya listesi yüklenir

---

## 🛡️ NEYE DOKUNULMADI

- DB schema (sadece v2.17 miras SQL — yeni kolon ekleme idempotent)
- Backend `personel/hakedis-hesapla.php`, `hakedis-list.php`, `hakedis-ode.php` — değişmedi
- Diğer modüller: police, ihbar-foyu, qr-ruhsat, muhasebe, CRM, paydaş
- Mevcut dosya verileri
- Yetki sistemi
- Diğer hakediş hesaplama mantığı

---

## 🔄 GERİ ALMA

Önceki 5 dosyayı yedekten geri yükleyin. Yeni `dosya-listesi.php` dosyasını silebilirsiniz (kullanılmıyorsa zararsız).
