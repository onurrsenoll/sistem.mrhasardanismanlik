# DOSYA KAPANIŞ MODÜLÜ — TASARIM BELGESİ
## Mevcut Durum + Eksikler + Tam Çözüm Tasarımı

> **Amaç:** Excel'in (Onur Şenol Kazanç Tablosu + 50 dosya hesap tablosu) yerini tamamen sistem alır.
> Her kapanan dosya otomatik tablo üretir; ay sonu raporu otomatik konsolide eder.

---

# I. MEVCUT DURUM ANALİZİ

## A. Çalışan kısım — sistemde zaten var
✅ **Dosya detay sayfasında "DOSYA KAPAT" modal'ı var** (`js/pages/dosya-detay.js:1059-1210`)

Modal'da kullanıcının girdiği alanlar:
- Sigorta tazminatı (çıkan ödeme)
- Sözleşme oranı (%20 default)
- Karşı vekalet ücreti
- Faiz
- Stopaj
- KDV oranı (%20 default)
- Kasa seçimi (hangi kasaya gelir kaydı düşecek)
- Dosya başı ödenen *(form var ama aktif kullanılmıyor)*

**Otomatik hesaplanan:**
- Sözleşme tutarı = Sigorta × Sözleşme oranı / 100
- Müvekkile havale = Sigorta − Sözleşme
- KDV = Sözleşme × KDV oranı / 100
- Toplam kazanç = Sözleşme + Vekalet + Faiz
- Net kazanç = Toplam − Dosya masrafları (sistemden çekiyor!)
- **Avukat hakediş = Net × %50**
- **MR hakediş = Net × %50**

✅ **"DOSYA KAPAT" tıklandığında:**
1. `gelirCreate` → kasaya gelir kaydı
2. `dosyaUpdate` → asama="DOSYA KAPANDI", kapanma_tarihi=bugün

✅ **Ay sonu raporu** (`api/v1/muhasebe/ay-sonu-rapor.php`) zaten kapanan dosyaları topluyor:
```sql
WHERE asama LIKE '%KAPANDI%' AND DATE(updated_at) BETWEEN ? AND ?
```
Pozitif toplam, mahsup toplam, net kazanç hesaplanıyor.

## B. Eksik kısım — şu an yapılmıyor

### ❌ Eksik #1: Excel'deki tüm alanlar saklanmıyor
Modal'daki hesap özeti **sadece ekranda** gösteriliyor. "Kapat" tıklandığında:
- Sigorta, sözleşme, vekalet, faiz, stopaj, KDV → **kaydedilmiyor**
- Sadece NET KAZANÇ tek bir gelir kaydı olarak yazılıyor
- `gelirler.aciklama` alanına tek satır metin: `"DOSYA NO X — TAZMİNAT: ..., NET: ..., AVUKAT %50: ..."` (yapılandırılmamış)

**Sonuç:** Sonradan "Bu dosyada noter ne kadardı?" sorusu cevapsız.

### ❌ Eksik #2: Dosya başı + mahsup alanları çalışmıyor
Modal'da `dosya_basi_odenen` form alanı var ama **hesaba dahil edilmiyor.**
Excel'deki **mahsup edilecek rakam** alanı modal'da hiç yok.

**Sonuç:** Avukatın peşin aldığı 5K/10K, kapatma akışında görmezden geliniyor. Manuel Excel ile takip ediliyor.

### ❌ Eksik #3: Ay sonu raporunda kapanışlar "basit özet"
Ay sonu raporu kapanan dosyaları **net kar olarak** topluyor, ama Excel'in detayını (sigorta → sözleşme → noter → vekalet → %50 pay → dosya başı → mahsup) **göstermiyor**.

**Sonuç:** PDF/print çıkışında müvekkil bazında tek satır görünüyor; Excel'deki gibi "her müvekkil için ayrı kart" yok.

### ❌ Eksik #4: Mahsup zinciri yok
Bir dosyada mahsup yazılırsa, sonraki dosyada otomatik düşmüyor. Manuel takip gerekiyor.

### ❌ Eksik #5: Noter masrafı ayrı kalem değil
Excel'de "noter masrafı" ayrı satır. Sistemde `masraflar` tablosunda toplam var ama "noter" diye türlenmemiş.

---

# II. ÇÖZÜM TASARIMI

## A. Yeni tablo: `dosya_kapanis_kayitlari`

Her dosya kapatıldığında **bir kalıcı snapshot** oluşturulur — Excel hesap tablosunun birebir karşılığı.

```sql
CREATE TABLE dosya_kapanis_kayitlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_id INT NOT NULL,
    kapatma_tarihi DATE NOT NULL,
    kapatan_kullanici_id INT NOT NULL,

    -- Excel'in birebir karşılığı (TL)
    sigorta_tahsilat       DECIMAL(12,2) NOT NULL DEFAULT 0,
    sozlesme_orani         DECIMAL(5,2)  NOT NULL DEFAULT 20.00,
    sozlesme_tutar         DECIMAL(12,2) NOT NULL DEFAULT 0,
    noter_masrafi          DECIMAL(12,2) NOT NULL DEFAULT 0,
    muvekkile_havale       DECIMAL(12,2) NOT NULL DEFAULT 0,
    yonlendiren_ucreti     DECIMAL(12,2) NOT NULL DEFAULT 0,
    yonlendiren_kaynak     VARCHAR(100)  DEFAULT NULL,  -- 'CRM OFİS', 'ALTUNBİLEK' vb.
    net_vekalet_ucreti     DECIMAL(12,2) NOT NULL DEFAULT 0,
    faiz                   DECIMAL(12,2) NOT NULL DEFAULT 0,
    stopaj                 DECIMAL(12,2) NOT NULL DEFAULT 0,
    kdv_orani              DECIMAL(5,2)  NOT NULL DEFAULT 20.00,
    kdv_tutar              DECIMAL(12,2) NOT NULL DEFAULT 0,
    azil_masrafi           DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Hesaplananlar
    toplam_kazanc          DECIMAL(12,2) NOT NULL DEFAULT 0,
    dosya_masraflari       DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_toplam_kazanc      DECIMAL(12,2) NOT NULL DEFAULT 0,
    yari_pay_yuzde         DECIMAL(5,2)  NOT NULL DEFAULT 50.00,
    onur_payi              DECIMAL(12,2) NOT NULL DEFAULT 0,
    avukat_payi            DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Mahsup ve ödeme akışı
    dosya_basi_odenen      DECIMAL(12,2) NOT NULL DEFAULT 0,
    dosya_sonunda_odenen   DECIMAL(12,2) NOT NULL DEFAULT 0,
    mahsup_edilecek        DECIMAL(12,2) NOT NULL DEFAULT 0,
    mahsup_durumu          ENUM('beklemede','tamamlandi') DEFAULT 'beklemede',
    mahsup_kaynak_dosya_id INT DEFAULT NULL,  -- bu dosyaya hangi dosyadan mahsup geldi
    
    -- Notlar (sözel anlaşmalar için)
    not_metni              TEXT DEFAULT NULL,  -- "Nazar boncuğu" vb. özel notlar
    
    -- İlişkiler
    avukat_ortak_id        INT DEFAULT NULL,   -- ortaklar.id (paylaşılan avukat)
    
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uq_dosya_kapanis (dosya_id),
    INDEX idx_kapatma_tarihi (kapatma_tarihi),
    INDEX idx_avukat_ortak (avukat_ortak_id),
    
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE RESTRICT,
    FOREIGN KEY (kapatan_kullanici_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (avukat_ortak_id) REFERENCES ortaklar(id) ON DELETE SET NULL,
    FOREIGN KEY (mahsup_kaynak_dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
```

## B. Yeni endpoint'ler (3 adet)

### B.1. `POST /api/v1/dosya/kapanis-olustur.php` — kapanış snapshot yaz
```
Body: {
  dosya_id, sigorta_tahsilat, sozlesme_orani, noter_masrafi,
  yonlendiren_ucreti, yonlendiren_kaynak, vekalet, faiz, stopaj,
  kdv_orani, azil_masrafi, dosya_basi_odenen, mahsup_edilecek,
  not_metni
}
Yaptığı:
  1. Hesaplamaları yap (toplam_kazanc, net, %50 pay vb.)
  2. dosya_kapanis_kayitlari'na INSERT
  3. gelirler'e kayıt (zaten var, mevcut akış)
  4. dosyalar.asama = 'DOSYA KAPANDI' (mevcut akış)
  5. Bekleyen mahsup varsa onur_payi'ndan otomatik düş
  6. Yeni mahsup varsa "bekleyen mahsuplar"a yaz
  7. avukat_ortak_id varsa o ortağa bildirim gönder (v2.1.2)
```

### B.2. `GET /api/v1/dosya/kapanis-getir.php?dosya_id=X` — kapanış detayını oku
Excel snapshot'ını JSON olarak döner. PDF/yazdırma için kullanılır.

### B.3. `GET /api/v1/muhasebe/kapanan-dosyalar-detay.php?ay=2026-04` — ay sonu listesi
Belirli ay içinde kapanan tüm dosyaların **detaylı snapshot listesi**. Ay sonu raporunda 3. tablo olarak gösterilir.

## C. Modal güncellemesi (frontend)

### Eklenecek alanlar
```jsx
<FormGroup label="NOTER MASRAFI">
  <input type="number" value={kapatForm.noter_masrafi} ... />
</FormGroup>

<FormGroup label="YÖNLENDİREN ÜCRETİ">
  <input type="number" value={kapatForm.yonlendiren_ucreti} ... />
</FormGroup>

<FormGroup label="YÖNLENDİREN KAYNAK">
  <select>
    <option>CRM OFİS</option>
    <option>ALTUNBİLEK</option>
    <option>(serbest yaz)</option>
  </select>
</FormGroup>

<FormGroup label="DOSYA BAŞI ÖDENEN (peşin)">
  <input type="number" value={kapatForm.dosya_basi_odenen} ... />
  {/* otomatik öneri: avukatın CRM OFİS dosyasıysa 10.000, diğer 5.000 */}
</FormGroup>

<FormGroup label="MAHSUP EDİLECEK (varsa)">
  <input type="number" value={kapatForm.mahsup_edilecek} readOnly />
  {/* Otomatik hesaplanır: dosya_basi - %50 pay > 0 ise fark */}
</FormGroup>

<FormGroup label="ÖZEL NOT (sözel anlaşma vs.)">
  <textarea value={kapatForm.not_metni} 
    placeholder="Örn: Zarar yarı yarıya paylaşıldı (nazar boncuğu)" />
</FormGroup>
```

### Otomatik öneri mantığı
```js
// Modal açıldığında otomatik doldur
useEffect(() => {
  if (dosya.ortak_id) {
    // Ortağın varsayılan dosya başı ücreti (yeni alan: ortaklar.dosya_basi_ucreti)
    setKapatForm(prev => ({
      ...prev,
      dosya_basi_odenen: dosya.ortak.dosya_basi_ucreti || 10000,
      sozlesme_orani: 20,
      kdv_orani: 20
    }));
  }
}, [dosya]);

// Mahsup otomatik hesabı
useEffect(() => {
  const onurPayi = netKazanc * 0.5;
  const fark = (kapatForm.dosya_basi_odenen || 0) - onurPayi;
  if (fark > 0) {
    setKapatForm(prev => ({...prev, mahsup_edilecek: fark, dosya_sonunda_odenen: 0}));
  } else {
    setKapatForm(prev => ({...prev, mahsup_edilecek: 0, dosya_sonunda_odenen: -fark}));
  }
}, [netKazanc, kapatForm.dosya_basi_odenen]);
```

## D. Excel benzeri "kazanç tablosu" görünümü

Kapatma sonrası **dosya detay sayfasında** Excel'in birebir görünümü:

```
┌─────────────────────────────────────────┐
│  AHMET YILMAZ HESAP ÖZETİ               │
│  (REFERANS: ONUR ŞENOL — DM EMİR)       │
├─────────────────────────────────────────┤
│  SİGORTA TAHSİLATI         18.000,00 TL │
│  SÖZLEŞME (%20)             3.600,00 TL │
│  NOTER MASRAFI              1.137,00 TL │
│  MÜVEKKİLE HAVALE          13.263,00 TL │
│  YÖNLENDİREN (CRM OFİS)    10.000,00 TL │
│  ─────────────────────────              │
│  NET VEKALET ÜCRETİ        10.000,00 TL │
│  STOPAJ                     3.000,00 TL │
│  KDV %20                    3.000,00 TL │
│  ─────────────────────────              │
│  TOPLAM KAZANÇ             13.600,00 TL │
│  DOSYA MASRAFLARI         -12.000,00 TL │
│  ─────────────────────────              │
│  NET TOPLAM KAZANÇ          1.600,00 TL │
│  ─────────────────────────              │
│  ONUR ŞENOL %50               800,00 TL │
│  AV. DEMİRHAN %50             800,00 TL │
│  ─────────────────────────              │
│  DOSYA BAŞI ÖDENEN          5.000,00 TL │
│  MAHSUP EDİLECEK            4.200,00 TL │ (kırmızı)
│                                         │
│  📝 NOT: -                              │
└─────────────────────────────────────────┘
[ PDF İNDİR ] [ MÜŞTERİYE GÖNDER ] [ DM'E GÖNDER ]
```

## E. Ay sonu raporuna 3. tablo

`api/v1/muhasebe/ay-sonu-rapor.php` çıkışına eklenecek bölüm:

```
═══════════════════════════════════════════════════════
📊 AY SONU RAPORU — NİSAN 2026
═══════════════════════════════════════════════════════

🟦 BÖLÜM 1: DOSYA ÜRETİMİ                          [mevcut]
   - Açılan dosya sayısı, türleri, ortak alacağı

🟧 BÖLÜM 2: MASRAFLAR                              [mevcut]
   - Diğer giderler, tarife bazlı dosya masrafları

🟩 BÖLÜM 3: KAPANAN DOSYA KAZANÇLARI               [YENİ]
   ┌──────┬─────────────────┬─────────┬────────┬─────────┬─────────┐
   │ Tarih│ Müvekkil        │ Sigorta │ %50    │ Peşin   │ Net Akış│
   ├──────┼─────────────────┼─────────┼────────┼─────────┼─────────┤
   │ 02.04│ YÜCEL ENDES     │ 33.750  │ 11.812 │  5.000  │ +6.812  │
   │ 03.04│ MUSTAFA GÜRAL   │ 50.000  │ 16.250 │ 10.000  │ +6.250  │
   │ 03.04│ ALİ FUAT KUZGUN │ 40.000  │ 14.750 │ 10.000  │ +4.750  │
   │ 12.04│ AYŞEGÜL DUMAN   │  7.000  │  2.600 │ 10.000  │ -3.700* │
   │ ...  │ ...             │ ...     │ ...    │ ...     │ ...     │
   ├──────┴─────────────────┼─────────┼────────┼─────────┼─────────┤
   │ TOPLAM (27 dosya)      │ 750.000 │287.942 │212.000  │ +75.942 │
   └────────────────────────┴─────────┴────────┴─────────┴─────────┘
   
   * Ayşegül Duman: Sözel zarar paylaşımı uygulandı (not bağlantısı)
   
   📥 EXCEL OLARAK İNDİR    📄 PDF OLARAK ÜRET
```

## F. Mahsup zinciri otomasyonu

Yeni tablo: `bekleyen_mahsuplar`
```sql
CREATE TABLE bekleyen_mahsuplar (
    id INT PRIMARY KEY AUTO_INCREMENT,
    kaynak_dosya_id INT,         -- mahsupun çıktığı dosya
    avukat_ortak_id INT,
    tutar DECIMAL(12,2),
    olusma_tarihi DATETIME,
    durum ENUM('beklemede','dusuruldu') DEFAULT 'beklemede',
    dusuruldugu_dosya_id INT,    -- hangi dosyada düşüldü
    dusurulme_tarihi DATETIME,
    INDEX idx_avukat (avukat_ortak_id, durum)
);
```

**Akış:**
1. Dosya kapatılırken `mahsup_edilecek > 0` ise → `bekleyen_mahsuplar`'a yaz
2. Sonraki kapatmada → bu avukatın bekleyen mahsupları çekilir, otomatik düşülür
3. Sonraki kapatma modal'ında uyarı: *"AV. DEMİRHAN'a 7.700 TL bekleyen mahsup var, bu dosyadan düşülsün mü?"*

---

# III. KULLANICI SENARYOSU — uçtan uca

### Senaryo 1: Yeni dosya kapatılırken
1. Personel dosya detay sayfasında **"DOSYA KAPAT"** butonuna basar
2. Modal açılır, sistem otomatik doldurur:
   - Sözleşme oranı %20, KDV %20, dosya başı 10.000 (CRM OFİS dosyasıysa)
   - Avukat ortak bilgisi (Demirhan)
   - Bekleyen mahsup varsa uyarı banner: *"⚠ Demirhan'a 7.700 TL bekleyen mahsup, otomatik düşülecek"*
3. Personel sigorta tahsilatını, vekalet, faiz, stopaj girer
4. Sistem otomatik hesaplar:
   - Toplam kazanç = 13.600
   - Net kazanç = 1.600
   - %50 pay = 800
   - Dosya başı 5.000 - %50 800 = **4.200 TL mahsup**
5. Personel "Kapat" tıklar
6. Sistem yapar:
   - `dosya_kapanis_kayitlari`'na snapshot yazar
   - Mahsup varsa `bekleyen_mahsuplar`'a ekler
   - `gelirler`'e net kazanç gelir kaydı (kasaya düşer)
   - `dosyalar.asama = 'DOSYA KAPANDI'`
   - Avukata bildirim: *"YÜCEL ENDES dosyası kapatıldı, 6.812 TL tarafınıza ödenecek"*
7. Detay sayfasında yeni "HESAP ÖZETİ" kartı görünür (Excel klonu)

### Senaryo 2: Ay sonu raporu
1. Muhasebe **Ay Sonu Raporu** sayfasını açar
2. Dönem seçer (Nisan 2026)
3. 3 tablo görür:
   - **Açılan dosyalar** (mevcut)
   - **Masraflar** (mevcut)
   - **🆕 Kapanan Dosya Kazançları** (YENİ — 27 satır, toplamlarla)
4. Excel olarak indirir → DM'e WhatsApp ile gönderir
5. PDF olarak çıktı alır → arşivler

### Senaryo 3: Kapanış raporu (avukat bazlı)
1. Yönetici **Muhasebe → Kapanış Raporu**'na gider
2. Avukat = "Demirhan Emir", dönem = "Mart-Nisan 2026" seçer
3. Liste:
   - Toplam %50 pay: 287.942 TL
   - Toplam peşin: 212.000 TL
   - Bekleyen mahsup: 52.315 TL
   - Net Demirhan'a borç: 23.627 TL
4. Liste içinde anomalileri otomatik flag'ler (örn. dosya başı > %50 ama mahsup yok)

---

# IV. UYGULAMA YOL HARİTASI

## Faz 1 — Temel altyapı (1-2 gün)
- [ ] `dosya_kapanis_kayitlari` tablosu (migration SQL)
- [ ] `bekleyen_mahsuplar` tablosu (migration SQL)
- [ ] `POST /api/v1/dosya/kapanis-olustur.php` (yeni endpoint)
- [ ] Frontend modal'ına 5 yeni alan + otomatik hesap
- [ ] Mevcut "Kapat" butonu → yeni endpoint'i çağırsın

## Faz 2 — Görselleştirme (1 gün)
- [ ] Dosya detay sayfasında **Excel klonu kazanç kartı**
- [ ] PDF olarak indirme
- [ ] WhatsApp/Mail butonu (mağdura/avukata gönder)

## Faz 3 — Ay sonu entegrasyonu (1 gün)
- [ ] `ay-sonu-rapor.php`'a Bölüm 3 ekle
- [ ] Frontend ay sonu sayfasında 3. tabloyu göster
- [ ] Excel export butonu

## Faz 4 — Mahsup zinciri (1 gün)
- [ ] `bekleyen_mahsuplar` otomasyonu
- [ ] Modal'da uyarı banner
- [ ] Avukat raporunda "bekleyen mahsup" kolonu

## Faz 5 — Migration (geçmiş dosyalar)
- [ ] Mart-Nisan 2026 kapanan 50 dosya için Excel'den içe aktarım scripti
- [ ] Veya: yarı manuel — her dosya detayında "Hesap Özetini Doldur" butonu

**Toplam tahmini: 5 iş günü.**

---

# V. EKSTRA — sözel anlaşmaları kaybetmemek için

`dosya_kapanis_kayitlari.not_metni` alanı kullanım örnekleri:

| Senaryo | Not örneği |
|---|---|
| Zarar paylaşımı | *"Zarar 7.400 TL — yarısı (3.700) DM üstlendi, diğer yarısı Onur'dan mahsup. Nazar boncuğu 🧿 (DM 30.03.2026)"* |
| Pazarlık başarısı | *"DM karşı taraftan ek 15K kopardı (Barış Konaçoğlu)"* |
| İptal/sil kararı | *"Ayna kazası, değer kaybı çıkmadı, dosyayı sildik (DM 23.12.2025)"* |
| Müvekkil özel talebi | *"Müvekkil indirim istemedi (28.04 sesli onay var)"* |

Bu notlar **kapanış kaydında ayrı alan** olarak tutulur, ay sonu raporunda **göz dikkati** ile gösterilir (sarı uyarı ikonu).

---

# VI. SONUÇ

**Mevcut sistem zaten %85 hazır.** Excel'in formülleri sistemde, ay sonu rapor altyapısı var, dosya kapatma akışı var.

**Eksik %15 → 5 iş günlük geliştirme:**
1. Hesap detayını DB'ye yazan kalıcı snapshot tablosu
2. Modal'a 5 ek alan (noter, yönlendiren, dosya başı, mahsup, not)
3. Excel klonu görsel kart + PDF/print
4. Ay sonu raporda 3. tablo
5. Mahsup zinciri otomasyonu

**Bu 5 madde tamamlandığında:**
- ✅ WhatsApp + Excel iş akışı bitiriliyor (sistemden tek tıkla)
- ✅ Manuel hata sıfırlanıyor (Ayşegül Duman, Try Filo gibi karışıklıklar imkansız)
- ✅ Sözel anlaşmalar kayıt altına alınıyor
- ✅ Ay sonu raporu kendi kendine doluyor
- ✅ DM ile karşılaştırma için tek doğru kaynak
- ✅ KVKK/yasal denetim için kalıcı evrak zinciri

**Onayınla başlıyorum.** Faz 1'den (DB tablosu + endpoint) başlamamı ister misin? Veya tüm 5 fazı tek seferde mi paketleyelim?
