# MR HASAR v2.24 — KADEMELİ PRİM + REAL-TIME CARİ + ÖZLÜK EVRAKI

**Tarih:** 17.05.2026
**Kapsam:** Personel modülünün eksik kalan 3 sütununun (otomatik cari, kademeli prim, özlük evrakı) tamamlanması ve **muhasebe + dosyalar** ile sıkı entegrasyonu.

---

## 🎯 NEYE YANIT VERİYOR

Kullanıcı geri bildirimi:
> "Tanımlı personelin dosya sorumlusu olarak eklendiği dosyalar neden personelin carisine işlenmiyor? Çalışma modeli konusu MAAŞ + dosya sayısına göre KADEMELİ PRİM SİSTEMİ olarak olmalı. Kişi kartında sözleşme vb. özlük evraklarının yüklenmesi gerek. Muhasebe ile dosyalar ile otomatik prim hakediş vs. mantıklı şekilde HATASIZ entegre edilmiş olsun."

### Mutabık kalınan kararlar
| Soru | Karar |
|---|---|
| Kademe hesabı | **PARÇALI (vergi gibi)** — 10 dosya kademe1'den, sonraki 15 kademe2'den |
| Barem kapsamı | **KİŞİ BAŞINA** — her personelin kendi kademe tablosu |
| Cari mantığı | **REAL-TIME** — her bakışta dosyalardan canlı hesap |
| Evrak tipi | **STANDART LİSTE + SERBEST** (Sözleşme, Kimlik, SGK, Diploma, ...) |

---

## 🏗️ MİMARİ

### 1. SQL Migration (idempotent)
`SQL/01_v224_kademeli_prim_evrak_migration.sql` — v2.4'te tanımlı tabloları sağlama alır + backfill:

- `personel_kazanc_modelleri` — kişi başına kademe JSON
  - `saha_kademe_json` (kademeli_saha) — toplam dosya kademeleri
  - `ofis_kota_json` (kademeli_ofis) — ADK + BH AYRI kademeleri
  - `prim_adk`/`prim_bh` (sabit_prim — geriye uyum)
- `personel_prim_kayitlari` — dosya bazlı otomatik prim (bekliyor/sayildi/iptal/iptal_mahsup)
- `personel_odemeler` — atomik ödeme + kasa_hareket_id (yeni kolon eklendi)
- `personel_evraklari` — özlük evrakı + dekont
- **BACKFILL:** mevcut personel için "sabit_prim" modeli üretilir
- **BACKFILL:** mevcut açık dosyalar için prim_kayitlari üretilir

### 2. Backend Endpoint'ler (10 dosya)
```
api/v1/personel/_kademe_lib.php          — paylaşılan parçalı kademe hesap helper
api/v1/personel/_dosya_prim_hook.php     — dosya/create+update hook'u
api/v1/personel/cari-ozet.php            — GET, REAL-TIME cari özet
api/v1/personel/kazanc-model.php         — GET aktif modeli, POST kaydet
api/v1/personel/odeme-yap.php            — POST, kasa hareketi ile atomik
api/v1/personel/evrak-yukle.php          — POST multipart, max 10 MB
api/v1/personel/evrak-liste.php          — GET, özlük evrakları
api/v1/personel/evrak-indir.php          — GET, auth zorunlu indirme
api/v1/personel/evrak-sil.php            — POST, disk + DB sil
api/v1/personel/dosya-listesi.php        — (v2.19'dan korunur)
```

### 3. Dosya Hook (otomatik prim senkronu)
`api/v1/dosya/create.php` ve `api/v1/dosya/update.php` sonuna **tek satır include** + fonksiyon çağrısı eklendi:
```php
require_once __DIR__ . '/../personel/_dosya_prim_hook.php';
sync_dosya_prim($db, (int)$dosyaId, 'create');  // veya 'update'
```
Bu çağrı:
- Sorumlu personel atanıp atanmadığını yakalar
- Sorumlu değiştiğinde **eski personelden mahsup** + **yeniye prim ekle**
- Dosya iptal/silindi olursa **prim_kaydını iptal eder**
- UNIQUE KEY `(personel_id, dosya_id)` ile çift kayıt önlenir

### 4. Frontend — 5 Sekmeli Bilgi Kartı
```
SEKME 1 GENEL BİLGİLER      — Kişisel + İş bilgileri 2 kolon + Notlar
SEKME 2 CARİ HESAP          — 4 metrik kart + DÖNEM BAZLI tablo (ÖDE butonlu) + son ödemeler
SEKME 3 PRİM HAKEDİŞ        — Dönem accordion — açılınca o ay ADK+BH dosya listesi
SEKME 4 ÇALIŞMA MODELİ      — Model tipi seçici + KademeEditor (min/max/birim/etiket)
SEKME 5 ÖZLÜK EVRAKLARI     — Upload formu (tip + etiket + dosya) + tablo (indir + sil)
```

---

## 🔁 ENTEGRASYON AKIŞI (uçtan uca)

```
1) Dosya açılır                          → dosya/create.php
   └─ sorumlu_id varsa                   → _dosya_prim_hook.php
      └─ personel_prim_kayitlari INSERT  → durum=bekliyor

2) Personel kartı açılır                 → cari-ozet.php
   └─ aktif modeli oku                   → personel_kazanc_modelleri
   └─ donem prim sayıları topla          → personel_prim_kayitlari
   └─ kademe parçalı hesap               → _kademe_lib.php
   └─ ödenen tutarları çıkar             → personel_odemeler
   └─ DÖNEM BAZLI cari tablo hazır       → ÖDEME YAP butonu hazır

3) ÖDEME YAP                             → odeme-yap.php (transaction)
   └─ kasalar.bakiye düş                 (FOR UPDATE — race koruması)
   └─ kasa_hareketleri INSERT 'gider'
   └─ personel_odemeler INSERT
   └─ prim_kayitlari durum='sayildi'    (maaş/prim ödemesinde)

4) Sorumlu değişirse                     → dosya/update.php
   └─ _dosya_prim_hook.php
      └─ eski personel: durum='iptal_mahsup' veya 'iptal'
      └─ yeni personel: durum='bekliyor' (UNIQUE — ON DUPLICATE)

5) Dosya iptal/silindi                   → update.php (silindi=1 veya asama=iptal)
   └─ _dosya_prim_hook.php
      └─ tüm prim_kayitları durum='iptal'
```

---

## 📦 PAKET İÇERİĞİ

```
v2.24_kademeli_prim_cari_evrak/
├── KURULUM_KILAVUZU.md
├── MR_HASAR_v2.24_KADEMELI_PRIM_CARI_EVRAK_2026-05-17.zip
└── MR_HASAR_v2.24_KADEMELI_PRIM_CARI_EVRAK_2026-05-17/
    ├── SQL/
    │   └── 01_v224_kademeli_prim_evrak_migration.sql
    ├── uploads/personel_evraklari/             (boş klasör — sunucuda oluşacak)
    └── YUKLENECEK_DOSYALAR/
        ├── api/v1/personel/
        │   ├── _kademe_lib.php                  (yeni helper)
        │   ├── _dosya_prim_hook.php             (yeni hook)
        │   ├── cari-ozet.php                    (yeni)
        │   ├── kazanc-model.php                 (yeni)
        │   ├── odeme-yap.php                    (yeni)
        │   ├── evrak-yukle.php                  (yeni)
        │   ├── evrak-liste.php                  (yeni)
        │   ├── evrak-indir.php                  (yeni)
        │   └── evrak-sil.php                    (yeni)
        ├── api/v1/dosya/
        │   ├── create.php                       (v2.20 + hook satırı)
        │   └── update.php                       (v2.20 + hook satırı)
        └── js/pages/
            └── personel.js                      (5 sekmeli zenginleştirilmiş)
```

---

## 🚀 YÜKLEME ADIMI

1. **SQL'i çalıştırın** (phpMyAdmin / mariadb-client):
   ```
   SQL/01_v224_kademeli_prim_evrak_migration.sql
   ```
   Idempotent — daha önce v2.4 çalıştırıldıysa zarar vermez.

2. **uploads/personel_evraklari/** klasörünün web kullanıcısı tarafından yazılabilir olduğundan emin olun:
   ```bash
   mkdir -p /var/www/html/uploads/personel_evraklari
   chown -R www-data:www-data /var/www/html/uploads/personel_evraklari
   chmod -R 775 /var/www/html/uploads/personel_evraklari
   ```

3. **Dosyaları yükleyin:**
   ```
   api/v1/personel/*.php  → /api/v1/personel/
   api/v1/dosya/create.php, update.php → /api/v1/dosya/   (üzerine yaz)
   js/pages/personel.js   → /js/pages/personel.js
   ```

4. **Ctrl+F5** ile cache temizleyin.

---

## 🧪 TEST AKIŞI

### A) Çalışma modeli tanımla
1. PERSONEL LİSTESİ'nde bir personel satırına tıkla → kart açılır
2. **ÇALIŞMA MODELİ** sekmesine geç
3. Model tipi → **KADEMELİ PRİM (ADK/BH AYRI) — OFİS**
4. AYLIK SABİT MAAŞ → 25000
5. ADK kademeleri: 0-10 → 400, 11-25 → 600, 26-100 → 850
6. BH kademeleri: 0-5 → 800, 6-15 → 1200, 16-100 → 1800
7. **ÇALIŞMA MODELİNİ KAYDET**

### B) Dosya aç → cari'ye otomatik düş
1. Yeni DOSYA → SORUMLU olarak yukarıdaki personeli seç → KAYDET
2. Personel kartına dön → **CARİ HESAP** sekmesi → o dönemde **+1 ADK / +1 BH** görünür
3. Bakiye otomatik artmış olmalı

### C) Ödeme yap
1. CARİ HESAP sekmesinde dönem satırının sonundaki **ÖDE** butonuna tıkla
2. Tutar otomatik dolu, kasa seç → **ÖDEMEYİ KAYDET**
3. Kasa bakiyesi düşmeli, dönem durumu **ÖDENDİ** olmalı

### D) Özlük evrakı yükle
1. **ÖZLÜK EVRAKLARI** sekmesi
2. Tip: **SÖZLEŞME**, etiket: "2026 Yıllık Sözleşme", PDF seç → **YÜKLE**
3. Listede satır görünür → **İNDİR** ile aç, **SİL** ile kaldır

### E) Sorumlu değişiklikten cari mahsubu
1. Yukarıdaki dosyayı aç → SORUMLU'yu başka personele değiştir → KAYDET
2. Eski personelin kartında → CARİ HESAP → o dönem **mahsup oldu** (azaldı)
3. Yeni personelin kartında → +1 prim eklendi

---

## 🛡️ RİSK

- 🟢 **Migration idempotent** — birden fazla çalıştırılabilir
- 🟢 **Mevcut create.php / update.php try/catch ile hook çağırıyor** — hook patlasa bile dosya işlemi devam eder
- 🟡 **uploads klasörü** yazılabilir değilse evrak yüklemesi başarısız olur (kullanıcıya net hata mesajı dönülür)
- 🟡 **users tablosu**: evrak listesinde `yukleyen_ad` için `users.ad_soyad` kullanıldı (mevcut paket pattern'i)
- 🟢 **Token authorization**: evrak yükleme native fetch ile token bearer kullanır (fallback yok ise auth_required'a takılır, 401 döner)

---

## ⏭️ İLERİDE EKLENEBİLİR (bu pakette yok)

- Personel kartından **mahsup hareketleri** raporu
- Excel/PDF dışa aktarım (hakediş bordrosu)
- Otomatik **yemek bedeli / mesai** hesaplaması
- Evrak için **expiry / yenileme tarihi** (sözleşme, ehliyet sona erme uyarıları)
