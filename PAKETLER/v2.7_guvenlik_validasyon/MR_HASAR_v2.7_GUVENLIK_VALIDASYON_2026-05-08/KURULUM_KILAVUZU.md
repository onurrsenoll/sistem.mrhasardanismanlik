# MR HASAR — v2.7 GÜVENLİK & VALİDASYON Yaması

**Tarih:** 2026-05-08
**Branch:** `claude/view-all-branches-qZ0JW`
**Kapsam:** 6 madde — MASTER_YAPILACAKLAR'dan kanıtlanmış açık olanlar

---

## ALTIN KURALLAR

- **Sadece 5 dosya değişti** — başka hiçbir yere dokunulmadı.
- **Hepsi PHP, frontend dokunulmadı** — UI değişmiyor, davranış arka planda düzelir.
- **Mevcut DB şemasına bağımlı** — yeni kolon eklenmiyor, sadece var olan kolonlar kullanılıyor.
- **Statik PHP syntax check ✅** — 5/5 dosya `php -l` testinden geçti.

---

## YAPILAN DEĞİŞİKLİKLER

### #017 — `masraf/delete.php` (KASA OTOMATİK ROLLBACK)

**Önceki durum:** Masraf silindiğinde `SET FOREIGN_KEY_CHECKS=0` ile DELETE çalıştırılıyordu → DB trigger bypass → kasa bakiyesi geri yüklenmiyordu (mali tutarsızlık).

**Yeni davranış:**
1. Masraf ödenmişse (`odeme_durumu = 'odendi'` ve `kasa_id` varsa):
   - Kasaya `tutar` atomik olarak geri eklenir (`UPDATE kasalar SET bakiye = bakiye + ?`)
   - `kasa_hareketleri` tablosuna `islem_turu = 'iade'` kayıt yazılır (yeni bakiye, açıklama dahil)
2. Bağlı `paydas_komisyonu` da ödendi ise → ayrıca kasa rollback yapılır
3. `FOREIGN_KEY_CHECKS=0` BYPASS KALDIRILDI → FK RESTRICT korumalı
4. Tüm işlem TEK transaction içinde — atomik (kısmi rollback olmaz)

### #026 — `bildirim/create.php` (OKUNDU KOLONU EXPLICIT)

**Önceki durum:** INSERT'e `okundu` kolonu dahil değildi → bazı DB konfigürasyonlarında NULL kalabiliyordu, `WHERE okundu = 0` filtresi NULL satırları atlıyordu.

**Yeni davranış:** INSERT'e `okundu = 0` ve `created_at = NOW()` açıkça eklendi.

### #028 — `dosya/create.php` (TC KİMLİK ALGORİTMİK DOĞRULAMA)

**Yeni davranış:** TC kimlik girilirse:
- 11 hane kontrolü
- İlk hane sıfır olamaz
- TR algoritmik kontrolü (10. ve 11. hane checksum)

Boş bırakılırsa atlanır (zorunlu değil).

### #029 — `dosya/create.php` (PLAKA REGEX)

**Yeni davranış:** `ma_plaka`, `ka_plaka`, `bh_arac_plaka` alanlarına TR plaka regex doğrulaması:
`/^[0-9]{2}\s?[A-ZÇĞIİÖŞÜ]{1,3}\s?[0-9]{2,4}$/u`

Boş bırakılırsa atlanır.

### #031 — `dosya/create.php` (GELECEK TARİHLİ KAZA ENGELLEME)

**Yeni davranış:** `kaza_tarihi` bugünün sonundan ileri olamaz. Bugünün tarihi izinli.

### #034 — `masraf/list.php` + `evrak/list.php` (SOFT-DELETE CASCADE)

**Önceki durum:** Dosya silindiğinde (`silindi = 1`) bağlı masraf/evrak kayıtları list endpoint'lerinde görünmeye devam ediyordu (zombie kayıtlar).

**Yeni davranış:** Her iki list endpoint'inde de WHERE'e şu filtre eklendi:
```
(m.dosya_id IS NULL OR d.silindi = 0 OR d.silindi IS NULL)
```

Bağlı dosyası olmayan masraflar/evraklar (genel sistem kayıtları) korunur. Silinmiş dosyaların kayıtları artık listede yok.

---

## YÜKLEME

### Yedek (önerilir)

Bu 5 dosyanın mevcut sürümlerini yedekle:

```
api/v1/masraf/delete.php
api/v1/masraf/list.php
api/v1/bildirim/create.php
api/v1/evrak/list.php
api/v1/dosya/create.php
```

### Yükleme

`YUKLENECEK_DOSYALAR/` klasörünün içeriğini sunucuya kopyala (klasör yapısını koruyarak):

| Kaynak | Hedef |
|---|---|
| `YUKLENECEK_DOSYALAR/api/v1/masraf/delete.php` | `<root>/api/v1/masraf/delete.php` |
| `YUKLENECEK_DOSYALAR/api/v1/masraf/list.php` | `<root>/api/v1/masraf/list.php` |
| `YUKLENECEK_DOSYALAR/api/v1/bildirim/create.php` | `<root>/api/v1/bildirim/create.php` |
| `YUKLENECEK_DOSYALAR/api/v1/evrak/list.php` | `<root>/api/v1/evrak/list.php` |
| `YUKLENECEK_DOSYALAR/api/v1/dosya/create.php` | `<root>/api/v1/dosya/create.php` |

**SQL gerekmiyor.** Frontend dokunulmadı — tarayıcı reload bile gerek yok.

---

## DOĞRULAMA

1. **#017 test:** Bir test masrafı oluştur → öde (kasadan düşsün) → sil → kasa bakiyesi geri yüklendi mi? `kasa_hareketleri`'nde `iade` kaydı var mı?
2. **#026 test:** Bildirim gönder → DB'de yeni satırın `okundu` değeri 0, `created_at` dolu mu?
3. **#028 test:** Yeni dosya açarken hatalı TC gir (örn `12345678901`) → "algoritma kontrolü başarısız" hatası
4. **#029 test:** Hatalı plaka gir (örn `XYZ`) → "Geçersiz plaka formatı" hatası
5. **#031 test:** Yarının tarihini kaza tarihi olarak gir → "Kaza tarihi gelecekte olamaz" hatası
6. **#034 test:** Bir test dosyasını sil (silindi=1 olur) → masraf listesinde o dosyanın masrafları görünmemeli

---

## ROLLBACK

Yedeklediğin 5 dosyayı geri yükle. SQL değişikliği yok — geri alma gerekmez.

---

**Hazırlayan:** Claude (Onur Şenol için)
**Önceki paketler:** v2.5.6 BÜTÜNLEŞIK, KASA_BUTUNLUGU 04.05
**Kapsam:** Sadece 6 master maddesi — diğer modüller dokunulmadı
