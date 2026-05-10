<?php
/**
 * POST /api/v1/police/bulk-delete.php
 * Toplu poliçe sil — v2.11: Her poliçe için tahsilat kasaları geri yüklenir,
 * 'iade' kasa hareketi yazılır, gelirler temizlenir.
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();
$db = getDB();

$body = json_decode(file_get_contents('php://input'), true);
$ids = $body['ids'] ?? [];

if (empty($ids) || !is_array($ids)) json_error('SİLİNECEK POLİÇE SEÇİLMEDİ', 422);
if (count($ids) > 500) json_error('EN FAZLA 500 KAYIT SİLİNEBİLİR', 422);

$ids = array_map('intval', $ids);
$ids = array_filter($ids, fn($id) => $id > 0);

$silinen      = 0;
$iadeToplam   = 0.0;
$iadeAdet     = 0;
$hatalar      = [];

$selPolice    = $db->prepare('SELECT id, police_no FROM policeler WHERE id = ?');
$selTahsilat  = $db->prepare('SELECT id, tutar, kasa_id, aciklama FROM police_tahsilatlar WHERE police_id = ?');
$kasaUpd      = $db->prepare('UPDATE kasalar SET bakiye = bakiye - ? WHERE id = ?');
$kasaSel      = $db->prepare('SELECT bakiye FROM kasalar WHERE id = ?');
$kasaHrkIns   = $db->prepare('INSERT INTO kasa_hareketleri (kasa_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) VALUES (?, \'iade\', ?, ?, ?, ?)');
$gelirDel     = $db->prepare("DELETE FROM gelirler WHERE kaynak = 'police_tahsilat' AND kaynak_id = ?");
$delTahsilat  = $db->prepare('DELETE FROM police_tahsilatlar WHERE police_id = ?');
$delPolice    = $db->prepare('DELETE FROM policeler WHERE id = ?');

foreach ($ids as $id) {
    try {
        $selPolice->execute([$id]);
        $police = $selPolice->fetch();
        if (!$police) { $hatalar[] = "ID $id bulunamadı"; continue; }

        $db->beginTransaction();

        /* Tahsilatları çek, kasa rollback uygula */
        $selTahsilat->execute([$id]);
        $tahsilatlar = $selTahsilat->fetchAll();

        foreach ($tahsilatlar as $t) {
            $kasaId = $t['kasa_id'] ? (int)$t['kasa_id'] : 0;
            $tutar  = (float)$t['tutar'];

            if ($kasaId > 0 && $tutar > 0) {
                $kasaUpd->execute([$tutar, $kasaId]);
                $kasaSel->execute([$kasaId]);
                $yeniBakiye = (float)($kasaSel->fetch()['bakiye'] ?? 0);

                $aciklamaIade = 'POLİÇE TOPLU SİLME — İADE: ' . $police['police_no'];
                if (!empty($t['aciklama'])) $aciklamaIade .= ' (' . $t['aciklama'] . ')';
                $kasaHrkIns->execute([$kasaId, $tutar, $yeniBakiye, $aciklamaIade, $user['id']]);

                $iadeToplam += $tutar;
                $iadeAdet++;
            }
            try { $gelirDel->execute([(int)$t['id']]); } catch (\Exception $ge) {}
        }

        $delTahsilat->execute([$id]);
        $delPolice->execute([$id]);

        $db->commit();
        $silinen++;

        log_action($user['id'], 'police_toplu_sil', "Toplu silme: {$police['police_no']} (".count($tahsilatlar)." iade)", 'policeler', $id);
    } catch (Exception $e) {
        try { $db->rollBack(); } catch (Exception $e2) {}
        $hatalar[] = "ID $id: " . $e->getMessage();
    }
}

json_success([
    'silinen' => $silinen,
    'iade_adet' => $iadeAdet,
    'iade_toplam' => $iadeToplam,
    'hatalar' => $hatalar
], "$silinen POLİÇE SİLİNDİ, $iadeAdet TAHSİLAT İADE EDİLDİ");
