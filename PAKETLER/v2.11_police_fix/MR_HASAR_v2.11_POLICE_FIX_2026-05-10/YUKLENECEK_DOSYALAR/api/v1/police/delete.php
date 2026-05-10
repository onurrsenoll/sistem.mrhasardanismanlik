<?php
/**
 * DELETE /api/v1/police/delete.php?id=1
 * Poliçe sil — v2.11: Tahsilatların kasaya etkisi atomik olarak geri alınır,
 * gelirler tablosundaki POLİÇE TAHSİLATI kayıtları temizlenir, kasa_hareketleri'ne
 * 'iade' kaydı düşülür. (Bkz. MASTER #017 mali tutarsızlık düzeltmesi.)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required();
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Poliçe ID gerekli', 422);

$stmt = $db->prepare('SELECT id, police_no FROM policeler WHERE id = ?');
$stmt->execute([$id]);
$police = $stmt->fetch();
if (!$police) json_error('Poliçe bulunamadı', 404);

$db->beginTransaction();
try {
    /* 1) Poliçeye ait tahsilatları topla */
    $stmt = $db->prepare('SELECT id, tutar, kasa_id, aciklama FROM police_tahsilatlar WHERE police_id = ?');
    $stmt->execute([$id]);
    $tahsilatlar = $stmt->fetchAll();

    /* 2) Her bir tahsilat için kasa rollback + iade hareketi + gelir temizliği */
    $iadeKasaUpd  = $db->prepare('UPDATE kasalar SET bakiye = bakiye - ? WHERE id = ?');
    $iadeKasaSel  = $db->prepare('SELECT bakiye FROM kasalar WHERE id = ?');
    $iadeKasaIns  = $db->prepare('INSERT INTO kasa_hareketleri (kasa_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) VALUES (?, \'iade\', ?, ?, ?, ?)');
    $gelirDel     = $db->prepare("DELETE FROM gelirler WHERE kaynak = 'police_tahsilat' AND kaynak_id = ?");

    foreach ($tahsilatlar as $t) {
        $kasaId = $t['kasa_id'] ? (int)$t['kasa_id'] : 0;
        $tutar  = (float)$t['tutar'];

        if ($kasaId > 0 && $tutar > 0) {
            /* Kasa bakiyesini düşür */
            $iadeKasaUpd->execute([$tutar, $kasaId]);
            $iadeKasaSel->execute([$kasaId]);
            $yeniBakiye = (float)($iadeKasaSel->fetch()['bakiye'] ?? 0);

            /* İade hareketi düş */
            $aciklamaIade = 'POLİÇE SİLİNDİ — TAHSİLAT İADESİ: ' . $police['police_no'];
            if (!empty($t['aciklama'])) $aciklamaIade .= ' (' . $t['aciklama'] . ')';
            $iadeKasaIns->execute([$kasaId, $tutar, $yeniBakiye, $aciklamaIade, $user['id']]);
        }

        /* gelirler kaydı varsa temizle (idempotent) */
        try { $gelirDel->execute([(int)$t['id']]); } catch (\Exception $ge) { /* tablo yoksa sessiz */ }
    }

    /* 3) Tahsilatları sil */
    $stmt = $db->prepare('DELETE FROM police_tahsilatlar WHERE police_id = ?');
    $stmt->execute([$id]);

    /* 4) Poliçeyi sil */
    $stmt = $db->prepare('DELETE FROM policeler WHERE id = ?');
    $stmt->execute([$id]);

    $db->commit();

    log_action(
        $user['id'],
        'police_sil',
        'Poliçe silindi: ' . $police['police_no'] . ' (' . count($tahsilatlar) . ' tahsilat iadesi)',
        'policeler',
        $id
    );

    json_success([
        'iade_edilen_tahsilat' => count($tahsilatlar),
        'iade_toplam' => array_reduce($tahsilatlar, function($t, $r) { return $t + (float)$r['tutar']; }, 0)
    ], 'Poliçe ve ilişkili tahsilatlar silindi, kasalar geri yüklendi');

} catch (Exception $e) {
    $db->rollBack();
    json_error('Silme hatası: ' . $e->getMessage(), 500);
}
