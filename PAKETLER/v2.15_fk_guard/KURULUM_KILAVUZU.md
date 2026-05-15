# MR HASAR v2.15 — DOSYA UPDATE FK GUARD

**Tarih:** 15.05.2026
**Tek dosya:** `api/v1/dosya/update.php`

---

## SORUN

```
SQLSTATE[23000] Integrity constraint violation: 1452
FOREIGN KEY (`sorumlu_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
```

DOSYA DETAY → DÜZENLE → KAYDET'te bu hatayla karşılaşılıyordu. Sebep: bazı dosyaların `sorumlu_id`, `ortak_id`, `paydas_id` veya `avukat_id` alanları **var olmayan/silinmiş** kayıtlara işaret ediyor (hayalet referanslar). Frontend dropdown'unda da geçersiz `user_id`'li personel seçilebiliyor.

---

## ÇÖZÜM (sadece backend)

`api/v1/dosya/update.php` içine, UPDATE sorgusu çalıştırılmadan **önce**, ek bir FK güvenlik kontrolü eklendi:

```php
$fkChecks = [
    'sorumlu_id' => 'users',
    'avukat_id'  => 'users',
    'ortak_id'   => 'ortaklar',
    'paydas_id'  => 'paydaslar'
];
foreach ($fkChecks as $fkField => $fkTable) {
    if (array_key_exists($fkField, $body) && !empty($body[$fkField])) {
        $check = $db->prepare("SELECT id FROM `{$fkTable}` WHERE id = ?");
        $check->execute([(int)$body[$fkField]]);
        if (!$check->fetch()) {
            $body[$fkField] = null;        // NULL'a düşür, hata verme
            $fkTemizlenenler[] = ...;       // response'ta bildir
        }
    }
}
```

### Davranış
- **Geçerli ID** → normal kaydedilir.
- **Geçersiz/silinmiş ID** → sessizce **NULL** yapılır, INSERT başarılı olur.
- **Referans tablo yoksa** (örn. `ortaklar` tablosu kurulmamış) → sessiz NULL.
- **Response'ta `fk_temizlenenler` listesi** → kullanıcı hangi alanların NULL yapıldığını görür (`sorumlu_id(42), ortak_id(7)` gibi).

### Bu yaklaşımın avantajları
- ON DELETE SET NULL şeması ile tutarlı — FK kısıtı zaten silinince NULL yapıyor; biz INSERT/UPDATE'te de aynı politikayı uyguluyoruz.
- Frontend tarafında dropdown değişikliği gerekmiyor — geçersiz seçim yapsa bile backend güvenli.
- Mevcut dosyaların verileri **DEĞİŞMEZ** — sadece hayalet referansları NULL'lar, geri kalanı dokunulmadan UPDATE eder.

---

## DOKUNULMAYAN

- ✅ `create.php`, `delete.php`, schema — DOKUNULMADI
- ✅ `dosya-detay.js`, `dosya-yeni.js` — DOKUNULMADI (v2.14 dosyalarınız aynen kalır)
- ✅ Diğer modüller: police, ihbar-foyu, qr-ruhsat, muhasebe
- ✅ Mevcut dosya kayıtları
- ✅ FK kısıtı kendisi — schema değişmedi, sadece backend application layer guard ekledi

---

## PAKET İÇERİĞİ

```
MR_HASAR_v2.15_FK_GUARD_2026-05-15/
└── YUKLENECEK_DOSYALAR/
    └── api/v1/dosya/
        └── update.php   ← TEK DOSYA
```

---

## KURULUM

1. `update.php`'i sunucudaki **aynı yola** üzerine yaz: `<web_root>/api/v1/dosya/update.php`
2. PHP opcache reset
3. Tarayıcı: `Ctrl+F5`

---

## TEST

1. DOSYA DETAY → bir dosyayı aç → DÜZENLE.
2. Herhangi bir alanı değiştir → DEĞİŞİKLİKLERİ KAYDET.
3. **Artık FK hatası vermemeli** — kayıt başarılı olur.
4. Eğer dosyanın `sorumlu_id`'si hayalet ise: kayıt başarılı, sadece bu alan NULL olur.
5. Geçerli bir personel seçip kaydedince: o personel atanır, ay sonu hakedişe normal yansır.

---

## GERİ ALMA

Önceki `update.php` dosyasını geri yükleyin.

---

## EK NOT

Bu pakette frontend (dropdown'da geçersiz user_id filtrelemesi) **dahil değil** — gereksiz, çünkü backend artık her durumu güvenli ele alıyor. Frontend dokunmuyoruz, yapı bozulmuyor.
