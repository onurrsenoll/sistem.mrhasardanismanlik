<?php
/**
 * v2.24 — DOSYA → PERSONEL PRİM KAYDI HOOK
 *
 * dosya/create.php, update.php, delete.php sonunda çağrılır.
 * Bu sayede bir dosyaya sorumlu atandığında / değiştirildiğinde /
 * silindiğinde personel_prim_kayitlari otomatik senkronize olur ve
 * personel carisi REAL-TIME güncel kalır.
 *
 * Kurallar:
 *  - dosyalar.sorumlu_id (user_id) → personel.user_id eşlemesiyle bulunur
 *  - Eski personel ≠ yeni personel ise eski kayıt 'iptal_mahsup' yapılır
 *  - Aynı (personel_id, dosya_id) için UNIQUE KEY: çakışırsa durum sıfırlanır
 *  - donem = dosyanın acilis_tarihi'nin YYYY-MM'i (yoksa created_at)
 *  - dosya iptal/silindi olursa durum 'iptal' olur
 */

if (!function_exists('sync_dosya_prim')) {
function sync_dosya_prim(PDO $db, int $dosyaId, $event = 'change'): void {
    if ($dosyaId <= 0) return;

    /* Dosyayı oku */
    $stmt = $db->prepare('
        SELECT id, dosya_no, dosya_turu, sorumlu_id, asama, acilis_tarihi, created_at,
               (CASE WHEN silindi IS NOT NULL AND silindi = 1 THEN 1 ELSE 0 END) AS silindi_mi
        FROM dosyalar WHERE id = ? LIMIT 1
    ');
    $stmt->execute([$dosyaId]);
    $d = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$d) return;

    $donem = substr((string)($d['acilis_tarihi'] ?: $d['created_at']), 0, 7);
    if (!preg_match('/^\d{4}-\d{2}$/', $donem)) $donem = date('Y-m');

    $iptalMi = ($event === 'delete') || (int)$d['silindi_mi'] === 1
            || in_array(strtolower((string)$d['asama']), ['iptal','iptal_edildi','kapali_iptal'], true);

    /* Mevcut kayıtları çek (genelde 1 satır) */
    $stmt = $db->prepare('SELECT id, personel_id, durum FROM personel_prim_kayitlari WHERE dosya_id = ?');
    $stmt->execute([$dosyaId]);
    $mevcut = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    /* Yeni sorumluya karşılık gelen personel */
    $yeniPersonelId = 0;
    if (!$iptalMi && !empty($d['sorumlu_id'])) {
        $s = $db->prepare('SELECT id FROM personel WHERE user_id = ? LIMIT 1');
        $s->execute([(int)$d['sorumlu_id']]);
        $yeniPersonelId = (int)$s->fetchColumn();
    }

    /* Önce iptal/mahsup işle: dosya silindi/iptal ya da sorumlu değişti */
    foreach ($mevcut as $m) {
        $mPid = (int)$m['personel_id'];
        if ($iptalMi || ($yeniPersonelId > 0 && $mPid !== $yeniPersonelId) || $yeniPersonelId === 0) {
            $yeniDurum = ($m['durum'] === 'sayildi') ? 'iptal_mahsup' : 'iptal';
            $neden = $iptalMi ? 'Dosya iptal/silindi' :
                     ($yeniPersonelId === 0 ? 'Sorumlu kaldırıldı' : 'Sorumlu personel değişti');
            $u = $db->prepare('
                UPDATE personel_prim_kayitlari
                SET durum = ?, iptal_tarihi = NOW(), iptal_nedeni = ?
                WHERE id = ?
            ');
            $u->execute([$yeniDurum, $neden, (int)$m['id']]);
        }
    }

    /* Yeni sorumlu varsa kayıt aç (veya mevcut iptal'i yeniden aktif et) */
    if (!$iptalMi && $yeniPersonelId > 0) {
        $u = $db->prepare('
            INSERT INTO personel_prim_kayitlari
              (personel_id, dosya_id, dosya_no, dosya_turu, donem, durum)
            VALUES (?, ?, ?, ?, ?, "bekliyor")
            ON DUPLICATE KEY UPDATE
              dosya_no = VALUES(dosya_no),
              dosya_turu = VALUES(dosya_turu),
              donem = VALUES(donem),
              durum = "bekliyor",
              iptal_tarihi = NULL,
              iptal_nedeni = NULL
        ');
        $u->execute([
            $yeniPersonelId, $dosyaId, $d['dosya_no'], $d['dosya_turu'], $donem
        ]);
    }
}
}
