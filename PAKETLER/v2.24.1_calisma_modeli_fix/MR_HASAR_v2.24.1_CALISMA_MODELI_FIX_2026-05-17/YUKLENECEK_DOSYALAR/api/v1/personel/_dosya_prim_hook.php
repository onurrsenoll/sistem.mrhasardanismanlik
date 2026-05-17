<?php
/**
 * v2.24.1 — DOSYA → PERSONEL PRİM KAYDI HOOK
 *
 * dosya/create.php, update.php sonunda çağrılır.
 * Personel carisi REAL-TIME güncel kalır.
 *
 * v2.24.1 düzeltmeleri:
 *  · sorumlu_id eşleme: v2.20 dosya/create.php ile UYUMLU
 *    (users.id OR personel.id — tarihsel veri tutarsızlığını kapsar)
 *  · sorumlu_id boşsa created_by'a fallback (v2.19 dosya-listesi.php
 *    "COALESCE(sorumlu_id, created_by)" mantığıyla aynı)
 *  · Dönem = dosyanın acilis_tarihi'nin YYYY-MM'i. dosya/create.php
 *    acilis_tarihi'ni CURDATE() ile kaydeder → "dosya oluşturma tarihli"
 *    olarak personelin carisine yansır.
 *
 * Akış:
 *  - Sorumlu atanır       → bekliyor prim ekle
 *  - Sorumlu DEĞİŞTİRİLİR → eski personel: durum='iptal_mahsup', yeni: bekliyor
 *  - Sorumlu KALDIRILIR   → kayıt 'iptal'
 *  - Dosya iptal/silindi  → kayıt 'iptal'
 *  - UNIQUE (personel_id, dosya_id): ON DUPLICATE → çift sayım yok
 */

if (!function_exists('sync_dosya_prim')) {
function sync_dosya_prim(PDO $db, int $dosyaId, $event = 'change'): void {
    if ($dosyaId <= 0) return;

    /* Dosyayı oku — created_by da çekilir (sorumlu_id yokken fallback için) */
    $stmt = $db->prepare('
        SELECT id, dosya_no, dosya_turu, sorumlu_id, created_by, asama,
               acilis_tarihi, created_at,
               (CASE WHEN silindi IS NOT NULL AND silindi = 1 THEN 1 ELSE 0 END) AS silindi_mi
        FROM dosyalar WHERE id = ? LIMIT 1
    ');
    $stmt->execute([$dosyaId]);
    $d = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$d) return;

    /* DÖNEM = acilis_tarihi (CURDATE() ile yazılan) — DOSYA OLUŞTURMA AYI */
    $donem = substr((string)($d['acilis_tarihi'] ?: $d['created_at']), 0, 7);
    if (!preg_match('/^\d{4}-\d{2}$/', $donem)) $donem = date('Y-m');

    $iptalMi = ($event === 'delete') || (int)$d['silindi_mi'] === 1
            || in_array(strtolower((string)$d['asama']), ['iptal','iptal_edildi','kapali_iptal'], true);

    /* Mevcut prim kayıtları (genelde 0-1 satır) */
    $stmt = $db->prepare('SELECT id, personel_id, durum FROM personel_prim_kayitlari WHERE dosya_id = ?');
    $stmt->execute([$dosyaId]);
    $mevcut = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    /* ─────────────────────────────────────────────────────────────
     * YENİ SORUMLUYA KARŞILIK GELEN PERSONELİ BUL
     * v2.20 dosya/create.php ile UYUMLU eşleme:
     *   dosyalar.sorumlu_id, personel tablosunda hem user_id hem id
     *   olarak bulunabilir (tarihsel veri tutarsızlığı).
     *   sorumlu_id boş ise created_by'a fallback (v2.19 mantığı).
     * ──────────────────────────────────────────────────────────── */
    $yeniPersonelId = 0;
    if (!$iptalMi) {
        $hedefUserId = !empty($d['sorumlu_id']) ? (int)$d['sorumlu_id'] : (int)($d['created_by'] ?? 0);
        if ($hedefUserId > 0) {
            /* Önce user_id eşleşmesini tercih et; o yoksa id eşleşmesi */
            $s = $db->prepare('
                SELECT id FROM personel
                WHERE user_id = ? OR id = ?
                ORDER BY (user_id = ?) DESC, id ASC
                LIMIT 1
            ');
            $s->execute([$hedefUserId, $hedefUserId, $hedefUserId]);
            $yeniPersonelId = (int)$s->fetchColumn();
        }
    }

    /* ─────────────────────────────────────────────────────────────
     * MEVCUT KAYITLARI DEĞERLENDIR — iptal/mahsup kararları
     * ──────────────────────────────────────────────────────────── */
    foreach ($mevcut as $m) {
        $mPid = (int)$m['personel_id'];
        $cur  = $m['durum'];

        if ($iptalMi || $yeniPersonelId === 0 || $mPid !== $yeniPersonelId) {
            $yeniDurum = ($cur === 'sayildi') ? 'iptal_mahsup' : 'iptal';
            $neden = $iptalMi ? 'Dosya iptal/silindi' :
                     ($yeniPersonelId === 0 ? 'Sorumlu kaldırıldı / personel eşleşmedi' :
                                              'Sorumlu personel değişti');
            $u = $db->prepare('
                UPDATE personel_prim_kayitlari
                SET durum = ?, iptal_tarihi = NOW(), iptal_nedeni = ?
                WHERE id = ?
            ');
            $u->execute([$yeniDurum, $neden, (int)$m['id']]);
        }
    }

    /* ─────────────────────────────────────────────────────────────
     * YENİ SORUMLU İÇİN KAYIT AÇ — donem = dosya oluşturma ayı
     * UNIQUE(personel_id, dosya_id) → çift sayım engellenir.
     * Daha önce iptal edildiyse "bekliyor"a geri çekilir.
     * ──────────────────────────────────────────────────────────── */
    if (!$iptalMi && $yeniPersonelId > 0) {
        $u = $db->prepare('
            INSERT INTO personel_prim_kayitlari
              (personel_id, dosya_id, dosya_no, dosya_turu, donem, durum)
            VALUES (?, ?, ?, ?, ?, "bekliyor")
            ON DUPLICATE KEY UPDATE
              dosya_no     = VALUES(dosya_no),
              dosya_turu   = VALUES(dosya_turu),
              donem        = VALUES(donem),
              durum        = "bekliyor",
              iptal_tarihi = NULL,
              iptal_nedeni = NULL
        ');
        $u->execute([
            $yeniPersonelId, $dosyaId, $d['dosya_no'], $d['dosya_turu'], $donem
        ]);
    }
}
}
