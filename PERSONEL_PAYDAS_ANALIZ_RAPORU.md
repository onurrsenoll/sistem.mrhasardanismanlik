# PERSONEL + PAYDAŞ MODÜLLERİ — DERİN ANALİZ RAPORU
**Tarih:** 03 Mayıs 2026
**Kapsam:** Kullanıcı taleplerine göre kod incelemesi + çözüm önerisi
**Durum:** 🔴 Birden fazla kritik mantık uyumsuzluğu tespit edildi

---

## 📋 KULLANICININ NET TALEPLERİ

### A. Personel Modülü
1. ✅ Dosya açılırken sorumlu personel seçilirse → personelin tanımlı **prim_adk/prim_bh** otomatik hakedişe yazılsın
2. ✅ Ay sonunda: **toplam prim + sabit maaş** otomatik hesaplansın
3. ✅ Personel listesinde tıklayınca **kişi kartı** açılsın (şu an direkt düzenlemeye gidiyor)
4. ✅ Kartta:
   - Genel bilgiler
   - **CARİ HESAP DÖKÜMÜ** butonu (dönem filtreli sayfa)
   - **ÖDEME YAP** butonu (maaş/avans/diğer)
   - Her ödemeye PDF evrak yüklenebilsin
5. ✅ Muhasebe ile otomatik entegrasyon (+/- otomatik düşülsün)

### B. Paydaş Modülü
1. ✅ Dosya açılırken paydaş seçilirse → **yönlendiren ücreti zaten ödenmiş** kabul edilsin
2. ✅ Şu an: masraf "ödenmedi" olarak ekleniyor → **OTOMATİK ÖDENDİ** olarak işaretlensin
3. ✅ Paydaş listesinde satıra tıklayınca **kişi kartı** açılsın
4. ✅ Kartta:
   - Gerekli butonlar
   - **PDF evrak yükleme**
   - Sayfa içinde **tüm evraklar önizleme butonu** ile görüntülenebilsin

---

## 🔴 BULGULAR — TESPİT EDİLEN UYUMSUZLUKLAR

### BULGU 1 — Personel Primi DB'YE YAZILMIYOR (kritik)

**Konum:** `api/v1/dosya/create.php` satır 240-258

**Mevcut kod:**
```php
$sorumluId = !empty($body['sorumlu_id']) ? (int)$body['sorumlu_id'] : null;
if ($sorumluId) {
    $stmtP = $db->prepare('SELECT id, ad_soyad, prim_adk, prim_bh FROM personel WHERE user_id = ? OR id = ?');
    // ...
    if ($sorumluPersonel) {
        $primTutar = (float)($sorumluPersonel[$primField] ?? 0);
        if ($primTutar > 0) {
            $otoPrimBilgi['personel_prim'] = $primTutar;
            $otoPrimBilgi['personel_adi'] = $sorumluPersonel['ad_soyad'];
            $otoPrimBilgi['personel_bilgi'] = 'HAKEDİŞE YAZILACAK (AYLIK HESAPLAMA)';
        }
    }
}
```

**Sorun:**
- Personel primi sadece **JSON response'una bilgi olarak** dönüyor
- **Hiçbir DB kaydına yazılmıyor**
- "HAKEDİŞE YAZILACAK (AYLIK HESAPLAMA)" yorumu var ama akış yok
- Ay sonu hakedişi `personel/hakedis-hesapla.php` MANUEL çağrılırsa hesaplanıyor

**Sonuç:** Sen dosya açtığında personelin priminin sisteme işlendiğini sanıyorsun ama **işlenmiyor**. Sadece o ay manuel "Hakediş Hesapla" tetiklenirse `dosyalar` tablosundan SAYI saymakla yapılıyor.

**Etki:** Kullanıcının dediği "**çalışmıyor**" tespiti **kesin doğru**.

---

### BULGU 2 — Paydaş Yönlendiren Ücreti "Bekleyen" Olarak Yazılıyor

**Konum:** `api/v1/dosya/create.php` satır 261-316

**Mevcut kod:**
```php
// 1) MASRAFLAR'a "yönlendiren ücreti" eklenir
INSERT INTO masraflar (...) VALUES (..., 'odenmedi');  // ← ÖDENMEDİ

// 2) PAYDAS_KOMISYONLARI'na ekle
INSERT INTO paydas_komisyonlari (... durum ...) VALUES (..., 'bekliyor');  // ← BEKLİYOR

// 3) KOMISYONLAR (muhasebe) tablosuna ekle
INSERT INTO komisyonlar (... odendi ...) VALUES (..., 0);  // ← ÖDENMEDİ
```

**Sorun:**
- Paydaş seçilince 3 tabloya kayıt **doğru atılıyor**
- AMA **hepsi "bekleyen/ödenmedi"** durumunda
- Kullanıcı diyor: "Paydaş seçildiyse zaten ödendi (peşin verildi)"
- Mevcut sistemde "Komisyon Öde" butonuna basılması gerek

**Etki:** Her dosya açılışında bekleyen komisyon biriktiriyor — kafası karışıyor, "öde" butonuna basmak gerekiyor → işin hızı yavaşlıyor.

---

### BULGU 3 — Personel Listesi: Tıklama Direkt Düzenlemeye Gidiyor

**Konum:** `js/pages/personel.js` satır 343

**Mevcut kod:**
```jsx
<tr onClick={() => duzenleAc(d)} ...>  // ← TIKLAYINCA DÜZENLE MODAL
```

**Sorun:** Kullanıcı satıra tıkladığında **kişi kartı açılması beklerken düzenleme modal'ı açılıyor**.

**Etki:** UX bozuk. Kullanıcı sadece bilgi görmek isterken yanlışlıkla düzenleme moduna giriyor.

---

### BULGU 4 — Personel: Cari Hesap Dökümü ve Ödeme Sistemi Yetersiz

**Mevcut yapı:**
- ✅ `personel/list.php` — listele
- ✅ `personel/get.php` — detay
- ✅ `personel/hakedis-hesapla.php` — manuel hakediş
- ✅ `personel/hakedis-list.php` — hakediş listesi
- ✅ `personel/hakedis-ode.php` — hakediş öde
- ❌ **Cari hesap dökümü endpoint YOK**
- ❌ **Ödeme türü ayrımı YOK** (maaş/avans/diğer karışık)
- ❌ **PDF evrak yükleme YOK**
- ❌ **Personel evrakları tablosu YOK**

---

### BULGU 5 — Paydaş Listesi: Aynı Sorun

**Konum:** `js/pages/ortaklar.js` satır 1117-1123

**Mevcut kod:** Satıra tıklama yok, sadece sağdaki ikonlara tıklanabiliyor:
- 🟡 Komisyon takip
- 🔵 Düzenle
- 🔴 Sil

**Sorun:**
- Kişi kartı diye bir konsept yok
- Satıra tıklamak hiçbir şey yapmıyor
- Detay görmek için "düzenle" açmak gerekiyor

---

### BULGU 6 — Paydaş: PDF Evrak Yükleme Yok

**Mevcut yapı:**
- ❌ `paydas_evraklari` tablosu yok
- ❌ `paydas/evrak-yukle.php` endpoint yok
- ❌ Frontend'de evrak yükleme/önizleme yok

---

## 🛠️ ÇÖZÜM ÖNERİSİ

### KAPSAM: 2 yeni tablo + 8 yeni endpoint + 2 frontend revizyonu + 1 dosya/create.php güncellemesi

---

### A. PERSONEL ÇÖZÜMÜ

#### A.1. Yeni Tablo: `personel_prim_kayitlari` (dosya bazlı prim takibi)

```sql
CREATE TABLE personel_prim_kayitlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    personel_id INT NOT NULL,
    dosya_id INT NOT NULL,
    dosya_no VARCHAR(20),
    dosya_turu VARCHAR(20),                -- ADK / BH
    prim_tutar DECIMAL(10,2) NOT NULL,
    donem VARCHAR(7),                      -- 2026-05
    durum ENUM('bekliyor','odendi','iptal') DEFAULT 'bekliyor',
    odeme_tarihi DATETIME DEFAULT NULL,
    hakedis_id INT DEFAULT NULL,           -- ay sonu hakediş kaydına bağlanır
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_personel_donem (personel_id, donem),
    INDEX idx_dosya (dosya_id),

    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE RESTRICT,
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE RESTRICT
);
```

#### A.2. `dosya/create.php` Güncelleme

Sorumlu_id geldiğinde personel kontrolü → varsa **`personel_prim_kayitlari`'na otomatik kayıt**:

```php
if ($sorumluPersonel && $primTutar > 0) {
    $stmt = $db->prepare("INSERT INTO personel_prim_kayitlari
        (personel_id, dosya_id, dosya_no, dosya_turu, prim_tutar, donem, durum)
        VALUES (?, ?, ?, ?, ?, ?, 'bekliyor')");
    $stmt->execute([
        $sorumluPersonel['id'], $dosyaId, $dosyaNo, $dosyaTuru,
        $primTutar, date('Y-m')
    ]);
}
```

#### A.3. Yeni Tablo: `personel_evraklari`

```sql
CREATE TABLE personel_evraklari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    personel_id INT NOT NULL,
    odeme_id INT DEFAULT NULL,             -- bağlı ödeme (varsa)
    evrak_turu VARCHAR(50),                -- maas_dekontu, avans_dekontu, sozlesme, diger
    dosya_adi VARCHAR(255),
    sunucu_adi VARCHAR(255),
    dosya_yolu VARCHAR(500),
    mime_type VARCHAR(100),
    dosya_boyutu INT,
    yukleyen_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE RESTRICT
);
```

#### A.4. Yeni Endpoint'ler (5 adet)

| Endpoint | İşlev |
|---|---|
| `GET /personel/cari-hesap.php?id=X&donem=YYYY-MM` | Cari hesap dökümü (filtreli, +primler -ödemeler) |
| `POST /personel/odeme-yap.php` | Ödeme oluştur (maaş/avans/diğer) — kasa düşür + evrak ekle |
| `POST /personel/evrak-yukle.php` | PDF/JPG evrak yükle (multipart) |
| `GET /personel/evrak-list.php?id=X` | Personel evraklarını listele |
| `DELETE /personel/evrak-sil.php?id=X` | Evrak sil |

#### A.5. Frontend `personel.js` Güncelleme

- Satır tıklama → **`kartAc(d)`** (mevcut `duzenleAc` değil)
- Yeni `KartModal` bileşeni: 4 sekme
  1. **Genel Bilgiler** (mevcut bilgiler + maas, prim_adk, prim_bh)
  2. **Cari Hesap** — buton → setPage('personel-cari?id=X') ile yeni sayfa açar
  3. **Ödeme Yap** — modal: tür seç + tutar + PDF yükle
  4. **Evraklar** — listele + önizle + sil

#### A.6. Yeni Sayfa: `personel-cari` (cari hesap dökümü)

- Dönem filtresi (ay/yıl)
- Tablo:
  - Tarih | İşlem Türü | Açıklama | + (alacak) | − (borç) | Bakiye
- Otomatik renkleme: + yeşil, − kırmızı
- Toplam: Bekleyen + Ödenen + Net Bakiye

---

### B. PAYDAŞ ÇÖZÜMÜ

#### B.1. `dosya/create.php` Güncelleme

Paydaş seçilince üretilen 3 kayıt **OTOMATİK ÖDENDİ** olarak yazılsın:

```php
// 1) masraflar — ÖDENDİ olarak
INSERT INTO masraflar (..., kasa_id, odeme_durumu)
VALUES (..., $varsayilanKasaId, 'odendi');

// 2) paydas_komisyonlari — ÖDENDİ olarak
INSERT INTO paydas_komisyonlari (..., durum, odeme_tarihi, kasa_id)
VALUES (..., 'odendi', CURDATE(), $varsayilanKasaId);

// 3) komisyonlar (muhasebe) — ÖDENDİ olarak
INSERT INTO komisyonlar (..., odendi, odeme_tarihi, kasa_id)
VALUES (..., 1, CURDATE(), $varsayilanKasaId);

// 4) Kasadan tutarı düş + kasa_hareketleri'ne yaz
UPDATE kasalar SET bakiye = bakiye - $primTutarP WHERE id = $varsayilanKasaId;
INSERT INTO kasa_hareketleri (...) VALUES (...);
```

**❓ KRİTİK SORU SANA:** Hangi kasadan otomatik ödensin?

**Üç seçenek:**

| # | Seçenek | Avantaj | Dezavantaj |
|---|---|---|---|
| **A** | Sistem ayarına `varsayilan_paydas_kasa_id` ekle | Tek seferlik tanımla, hep oradan düş | Yanlış kasaya yansıyabilir |
| **B** | Dosya açma formuna "Yönlendiren ödeme kasası" alanı ekle | Esnek, her dosyada farklı kasa | Form karmaşıklaşır |
| **C** | Sembolik "ödendi" — kasa hareketi yazma | Basit | Muhasebe kaybeder, hangi kasadan çıktı bilinmez |

**Önerim: A + B karışımı**
- Sistem ayarında varsayılan kasa tanımlı olsun
- Dosya formunda override edilebilsin (boş bırakılırsa varsayılan kullanılır)

#### B.2. Yeni Tablo: `paydas_evraklari`

```sql
CREATE TABLE paydas_evraklari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paydas_id INT NOT NULL,
    komisyon_id INT DEFAULT NULL,          -- bağlı komisyon (varsa)
    evrak_turu VARCHAR(50),                -- sozlesme, dekont, diger
    dosya_adi VARCHAR(255),
    sunucu_adi VARCHAR(255),
    dosya_yolu VARCHAR(500),
    mime_type VARCHAR(100),
    dosya_boyutu INT,
    yukleyen_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paydas_id) REFERENCES paydaslar(id) ON DELETE RESTRICT
);
```

#### B.3. Yeni Endpoint'ler (3 adet)

| Endpoint | İşlev |
|---|---|
| `POST /paydas/evrak-yukle.php` | PDF/JPG evrak yükle |
| `GET /paydas/evrak-list.php?id=X` | Paydaş evraklarını listele |
| `DELETE /paydas/evrak-sil.php?id=X` | Evrak sil |

#### B.4. Frontend `ortaklar.js` Güncelleme

- Paydaş satırına **tıklama** ekle → `kartAc(p)`
- Yeni `PaydasKartModal` bileşeni:
  1. **Genel Bilgiler**
  2. **Komisyon Geçmişi** (mevcut komisyonAc kullanılır)
  3. **Evraklar** — yükle + listele + önizle + sil
  4. **Cari Hesap** — paydaşın tüm hareketleri

---

## 📦 ÇÖZÜM PAKETİ — v2.4 PERSONEL & PAYDAŞ DÜZELTMESİ

### Yeni Dosyalar (10 adet)

```
SQL/
└── 01_personel_paydas_tablolar.sql        (yeni 2 tablo + sütun ekleme)

api/v1/personel/
├── cari-hesap.php                         (yeni endpoint)
├── odeme-yap.php                          (yeni endpoint)
├── evrak-yukle.php                        (yeni endpoint)
├── evrak-list.php                         (yeni endpoint)
└── evrak-sil.php                          (yeni endpoint)

api/v1/paydas/
├── evrak-yukle.php                        (yeni endpoint)
├── evrak-list.php                         (yeni endpoint)
└── evrak-sil.php                          (yeni endpoint)
```

### Değişen Dosyalar (4 adet)

```
api/v1/dosya/create.php                    (personel prim kayıt + paydaş ödendi)
js/pages/personel.js                       (kart modal + cari hesap)
js/pages/ortaklar.js                       (paydaş kart modal + evrak)
js/config.js                               (yeni API endpoint'leri)
```

**Toplam:** 14 dosya

---

## ⏱️ TAHMİNİ SÜRE

| İş | Süre | Risk |
|---|---|---|
| Yeni tablolar (SQL) | 30 dk | Sıfır |
| dosya/create.php güncelleme | 1 saat | Düşük (mali akış) |
| 5 personel endpoint | 2 saat | Düşük |
| 3 paydaş endpoint | 1.5 saat | Düşük |
| Frontend personel kart + cari hesap | 2 saat | Düşük |
| Frontend paydaş kart + evrak | 1.5 saat | Düşük |
| Test + kılavuz | 1 saat | — |
| **TOPLAM** | **9.5 saat** | **Düşük** |

---

## ❓ KARARA İHTİYACIM OLAN SORULAR

Kod yazmaya başlamadan **3 kritik soruna cevap ver**:

### Soru 1 — Paydaş otomatik ödeme kasası
- **A)** Sistem ayarında `varsayilan_paydas_kasa_id` tanımlansın (tek seferlik)
- **B)** Dosya formunda kasa seçtir (her dosyada esnek)
- **C)** A + B karışımı (varsayılan + opsiyonel override)
- **D)** Hiç kasa düşürme — sadece "ödendi" etiketi (muhasebe boş kalır)

**Önerim: C**

### Soru 2 — Personel prim kaydının ay sonu akışı
Dosya açılınca `personel_prim_kayitlari`'na **bekleyen** prim kaydı atılacak. Ay sonu hakediş hesaplama nasıl olsun?
- **A)** Manuel — sen "Hakedişi Hesapla" butonuna basınca o ay birikenler toplanır
- **B)** Otomatik — her ayın 1'inde cron ile otomatik hesaplanır
- **C)** A + B — manuel her zaman, ayrıca ayın 1'inde otomatik bir kez

**Önerim: A** (basit, kontrolü sende olsun)

### Soru 3 — Personel ödeme türleri
Hangi ödeme türlerini destekleyelim?
- **A)** Sadece: maaş, avans
- **B)** Maaş, avans, prim, ikramiye, mesai, diğer
- **C)** Esnek — sen istediğin türü ekle (`tanimlamalar` tablosundan)

**Önerim: B**

---

## 🚀 ONAYLA, BAŞLAYALIM

Cevaplar gelince **v2.4 paketini** hazırlamaya başlayacağım. Tahmini süre: 9-10 saat çalışma + senin testlerin.

> **Not:** Bu paket diğer iki büyük işten (v2.3 Validasyon ve v3.0 Dosya Kapanış) **bağımsız**. Sırayla yapacağız:
> 1. **v2.4 Personel + Paydaş** ← şimdiki konu
> 2. **v2.3 Validasyon Paketi** (3 saat — daha küçük, sonra yaparız)
> 3. **v3.0 Dosya Kapanış Modülü** (8-12 saat — Demirhan toplantısından sonra)
