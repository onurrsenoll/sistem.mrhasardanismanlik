# MR HASAR v2.21 — DOSYA DETAY TEMA REVİZE

**Tarih:** 16.05.2026
**Kapsam:** Kullanıcı geri bildirimi üzerine v2.20 tema iyileştirmeleri
**Tek dosya:** `js/pages/dosya-detay.js`

---

## 🎯 KULLANICI FEEDBACK'İ → ÇÖZÜM

### 1) "ÜST 4 KUTU SİMETRİK / EŞİT ORTALANSIN"
**Önceki (v2.20):** Üst satırda dosya no + butonlar arasında sıkışık, dar
**Yeni (v2.21):**
- **Üst satır**: dosya no + müşteri/sigorta/hasar (sol) + butonlar (sağ)
- **Alt satır**: 4 kutu **`grid-template-columns: repeat(4, 1fr)`** ile **TAM EŞİT** dağıtıldı
- Tüm kart genişliğini eşit dolduruyor, simetrik

### 2) "ARAÇ İKONLARI AMATÖR — KALDIR + ARAÇ SAHİBİNİ MARKA/MODEL ALANINA AL"
**Önceki (v2.20):** Beyaz kutuda büyük Lucide Car ikonu (logo yüklenmediğinde fallback) — kullanıcı amatör buldu
**Yeni (v2.21):**
- **Beyaz kutu ve Car ikonu KALDIRILDI**
- Banner artık **2 kolonlu**:
  - **SOL:** ARAÇ başlığı + büyük MARKA (20px bold) + MODEL + YIL
  - **SAĞ:** ARAÇ SAHİBİ / RUHSAT SAHİBİ başlığı + Ad Soyad + T.C. kimlik
  - Ortada ince dikey ayraç (renkli gradient)
- Marka logosu **opsiyonel** olarak sağ üst köşede minik (36px) gösterilir; yüklenemezse hiç görünmez
- Ayrı "ARAÇ SAHİBİ" section'ı **kaldırıldı** (artık banner içinde)

### 3) "DOSYA BİLGİLERİ YAZILAR SOLUK / ŞEFFAFLAŞMIŞ GİBİ"
**Önceki (v2.20):** Label `textMuted` (çok soluk), font weight 500, font size 10/11
**Yeni (v2.21):**
- Label: **`textSec`** rengi (daha kontrastlı), **font weight 700**, font size 10.5, uppercase
- Value: **font weight 700** (eski 500), font size 11.5
- Padding 6→7px, letter-spacing 0.3
- **Tüm sayfada** netleşti (sadece DOSYA BİLGİLERİ değil; InfoRow global)

---

## 📦 PAKET İÇERİĞİ

```
MR_HASAR_v2.21_DETAY_TEMA_REVIZE_2026-05-16.zip
├── KURULUM_KILAVUZU.md
└── YUKLENECEK_DOSYALAR/
    └── js/pages/
        └── dosya-detay.js  ← TEK DOSYA
```

---

## 🚀 YÜKLEME

```
js/pages/dosya-detay.js → <sunucu>/js/pages/dosya-detay.js
```

`Ctrl+F5` ile cache temizle. **Backend/DB değişmedi.**

---

## ⚠️ RİSK
- 🟢 **YOK** — sadece görsel revize
- Geri alma: v2.20'nin `dosya-detay.js`'i üzerine yaz

---

## 🧪 TEST AKIŞI

1. **DOSYA DETAY** sayfasına git
2. **Üst kart:**
   - Alt satırda 4 kutu yan yana **eşit genişlikte** ve simetrik
   - Her kutu içinde ikon + label + değer
3. **MAĞDUR ARAÇ kartı:**
   - Banner içinde sol HYUNDAI/TUCSON/2023, sağ MUSTAFA AKSU/T.C. 44674833762
   - Beyaz kutuda araç ikonu **YOK**
   - Logo HYUNDAI için varsa sağ üstte minik görünür
4. **KARŞI ARAÇ kartı:**
   - Aynı yapı, kırmızı tema
   - "MG" markası clearbit'te yoksa logo gözükmez (normal)
5. **DOSYA BİLGİLERİ:**
   - Yazılar net, soluk değil
   - Label'lar büyük harfle ve daha kalın
   - Value'lar bold

---

## 🛡️ NEYE DOKUNULMADI
- Sekme yapısı (BİLGİ / MASRAFLAR / EVRAKLAR / DOSYA HESABI)
- Alan listesi (E-Posta/Adres yok — kullanıcı isteği)
- Backend, DB, diğer modüller
- v2.18, v2.19, v2.20 önceki değişiklikler
