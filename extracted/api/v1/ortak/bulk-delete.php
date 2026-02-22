<?php
/**
 * POST /api/v1/ortak/bulk-delete.php
 * Toplu ortak sil/pasife al (sadece admin)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$db = getDB();

$body = json_decode(file_get_contents('php://input'), true);
$ids = $body['ids'] ?? [];

if (empty($ids) || !is_array($ids)) json_error('SİLİNECEK ORTAK SEÇİLMEDİ', 422);
if (count($ids) > 500) json_error('EN FAZLA 500 KAYIT SİLİNEBİLİR', 422);

$ids = array_map('intval', $ids);
$ids = array_filter($ids, fn($id) => $id > 0);

$silinen = 0;
$pasif = 0;
$hatalar = [];

foreach ($ids as $id) {
    try {
        $stmt = $db->prepare('SELECT id, ad_soyad FROM ortaklar WHERE id = ?');
        $stmt->execute([$id]);
        $ortak = $stmt->fetch();
        if (!$ortak) { $hatalar[] = "ID $id bulunamadı"; continue; }

        $stmt = $db->prepare('SELECT COUNT(*) as total FROM ortak_hareketleri WHERE ortak_id = ?');
        $stmt->execute([$id]);
        $hareketSayisi = (int)$stmt->fetch()['total'];

        if ($hareketSayisi > 0) {
            $stmt = $db->prepare("UPDATE ortaklar SET durum = 'pasif' WHERE id = ?");
            $stmt->execute([$id]);
            $pasif++;
            log_action($user['id'], 'ortak_toplu_pasif', "Toplu pasife alma: {$ortak['ad_soyad']}", 'ortaklar', $id);
        } else {
            $stmt = $db->prepare('DELETE FROM ortaklar WHERE id = ?');
            $stmt->execute([$id]);
            $silinen++;
            log_action($user['id'], 'ortak_toplu_sil', "Toplu silme: {$ortak['ad_soyad']}", 'ortaklar', $id);
        }
    } catch (Exception $e) {
        $hatalar[] = "ID $id: " . $e->getMessage();
    }
}

$mesaj = [];
if ($silinen > 0) $mesaj[] = "$silinen ORTAK SİLİNDİ";
if ($pasif > 0) $mesaj[] = "$pasif ORTAK PASİFE ALINDI";
json_success(['silinen' => $silinen, 'pasif' => $pasif, 'hatalar' => $hatalar], implode(', ', $mesaj) ?: 'İŞLEM TAMAMLANDI');
