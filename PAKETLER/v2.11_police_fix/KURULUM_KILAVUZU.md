# MR HASAR v2.11 — POLİÇE FIX

**Tarih:** 10.05.2026
**Kapsam:** Sadece POLİÇE menüsü ve alt sekmeleri (LİSTE, YENİ POLİÇE, YENİLEME TAKİBİ, TAHSİLAT/CARİ, RAPORLAR, KAZANÇ).
**Dokunulmayan:** RUHSAT OKUYUCU, İHBAR FÖYÜ, ve sistemin diğer tüm modülleri.

---

## 1) NE DÜZELTİLDİ?

### Mali Tutarsızlık (KRİTİK)
| # | Sorun | Düzeltme |
|---|---|---|
| 1 | `delete.php` poliçe silindiğinde tahsilatların kasaya etkisi geri alınmıyordu | Atomik kasa rollback + `kasa_hareketleri`'ne `iade` kaydı + `gelirler` temizliği |
| 2 | `bulk-delete.php` aynı eksiklik N kat çoğaltılmış | Aynı atomik rollback toplu silme için uygulandı |

### Veri Kaybı (YÜKSEK)
| # | Sorun | Düzeltme |
|---|---|---|
| 4 | `create.php` → `belge_seri`, `dogum_tarihi`, `personel`, `sase_no` sessizce düşüyordu | INSERT'e bu 4 kolon eklendi, eksikse ALTER ile garanti |
| 5 | `update.php` → `personel` UPDATE listesinde yoktu | `personel` eklendi |
| 6 | Excel import: `sigorta_sirketi: d.personel \|\| '-'` mantık hatası → tüm import poliçeleri "-" şirketinde toplanıyordu | `sigorta_sirketi` artık `BELİRSİZ` fallback'i ile mantıklı yazılıyor |

### İş Mantığı (YÜKSEK)
| # | Sorun | Düzeltme |
|---|---|---|
| 7 | `PoliceYeni`: başlangıç tarihi her değişiminde bitişi `+1 yıl` ezerek kullanıcının manuel girdisini yok ediyordu | `bitisManuel` flag'i ile kullanıcının değiştirdiği bitiş tarihi korunur |

### Yetki Tutarlılığı (ORTA)
| # | Sorun | Düzeltme |
|---|---|---|
| 8 | Endpoint'lerde `auth_required(['admin','muhasebe',...])` kalıntı kontrolleri | Tümü `auth_required()` olarak yumuşatıldı; tek otorite yetki matrisi (sizin kuralınız) |
| 10 | `hatirlatma-kontrol.php` alıcıları rol bazlıydı (admin+muhasebe) | Alıcılar artık yetki matrisinden seçiliyor: `police-yenileme` izni olan herkes + admin'ler |

### Kod Kalitesi (DÜŞÜK)
| # | Sorun | Düzeltme |
|---|---|---|
| 11 | `PoliceTahsilat`: ölü `kullanicilar` state + gereksiz API çağrısı | Kaldırıldı |
| 12 | `PoliceKazanc`: ölü `donem` state | Kaldırıldı |
| 13 | `mForm` initial state'inde `devir_bakiye` yoktu (input warning) | Eklendi |
| 15 | `tahsilat-ekle.php` her istekte `CREATE TABLE IF NOT EXISTS gelirler` (DDL spam) | Migration'a taşındı |
| Bonus | `tahsilat-list.php` → `pt.islem_yapan_id` join (yanlış kolon adı) | `pt.olusturan_id` olarak düzeltildi + kasa join eklendi |

---

## 2) PAKET İÇERİĞİ

```
MR_HASAR_v2.11_POLICE_FIX_2026-05-10/
├── YUKLENECEK_DOSYALAR/
│   ├── api/v1/police/
│   │   ├── delete.php           ← yeni: kasa rollback
│   │   ├── bulk-delete.php      ← yeni: kasa rollback
│   │   ├── create.php           ← belge_seri/dogum_tarihi/sase_no/personel
│   │   ├── update.php           ← personel
│   │   ├── hatirlatma-kontrol.php ← yetki matrisi alıcılar
│   │   ├── excel-import.php     ← personel kolonu + auth softening
│   │   ├── tahsilat-ekle.php    ← DDL spam temizliği + auth softening
│   │   ├── tahsilat-list.php    ← olusturan_id kolon adı + auth softening
│   │   ├── list.php             ← auth softening
│   │   ├── get.php              ← auth softening
│   │   └── rapor.php            ← auth softening
│   └── js/pages/
│       └── police.js            ← 4 frontend bug düzeltildi
└── SQL/
    └── 01_v211_police_fix.sql   ← idempotent migration
```

> RUHSAT OKUYUCU (`qr-ruhsat.js`) ve İHBAR FÖYÜ (`ihbar-foyu.js`) **pakete dahil DEĞİL** — dokunulmadı.

---

## 3) KURULUM

### A) SQL Migration (önce bu)
```bash
mysql -u <kullanici> -p <veritabani> < SQL/01_v211_police_fix.sql
```
Migration idempotenttir, tekrar çalıştırılabilir.

### B) Dosya Yükleme
`YUKLENECEK_DOSYALAR/` klasörünün içeriğini sunucudaki **aynı yola** üzerine yazarak kopyalayın:
- `api/v1/police/*.php` → `<webroot>/api/v1/police/`
- `js/pages/police.js` → `<webroot>/js/pages/`

### C) Cache Temizleme
- Sunucu opcache (varsa) reset edin: `php -r "opcache_reset();"`
- Tarayıcıda `Ctrl+F5` ile hard refresh.

---

## 4) DOĞRULAMA TESTLERİ

### Test 1 — Yeni Poliçe alanları kaydoluyor mu?
1. POLİÇE → YENİ POLİÇE → tüm zorunluları ve `BELGE SERİ NO`, `DOĞUM TARİHİ`, `PERSONEL` doldur → KAYDET.
2. POLİÇE LİSTESİ → bu poliçenin detayını aç → 3 alanın kaydedildiğini gör.

### Test 2 — Tarih override
1. YENİ POLİÇE → BAŞLANGIÇ: 2026-05-10 → otomatik BİTİŞ: 2027-05-10.
2. BİTİŞ'i manuel 2026-12-31 yap → BAŞLANGIÇ'ı 2026-06-01 yap.
3. BİTİŞ HALA `2026-12-31` olmalı (ezilmemeli).

### Test 3 — Mali tutarsızlık
1. Bir poliçeye 1.000 TL tahsilat ekle → kasa bakiyesi +1.000 olmalı.
2. Poliçeyi sil → kasa bakiyesi -1.000 (eski hâline) gelmeli + `kasa_hareketleri`'nde `iade` türünde kayıt görülmeli.

### Test 4 — Toplu silme
1. 3 poliçe seç → TOPLU SİL → ilgili tüm tahsilatların kasa etkisi geri yüklenmeli, `iade_adet` ve `iade_toplam` döner.

### Test 5 — Hatırlatma alıcısı
1. Yetki matrisinden bir personel kullanıcısına `police_police-yenileme = 1` ver.
2. POLİÇE → YENİLEME TAKİBİ → HATIRLATMA GÖNDER → bu personel kullanıcısı bildirimi almış olmalı.

---

## 5) GERİ ALMA

Hata oluşursa:
1. Önceki `api/v1/police/*.php` dosyalarınızı geri yükleyin.
2. Önceki `js/pages/police.js` dosyanızı geri yükleyin.
3. Migration'ın eklediği kolonlar geride kalır (DROP yapmaya gerek yok, eski kod yine çalışır).

---

## 6) KAPSAM TEYİDİ

Bu pakette değişen dosyalar **sadece** POLİÇE modülünedir:
- ✅ `api/v1/police/*.php` (11 dosya)
- ✅ `js/pages/police.js`
- ✅ `SQL/01_v211_police_fix.sql` (yeni migration)

**Hiçbir başka dosyaya, modüle, menüye veya tabloya dokunulmadı.**
