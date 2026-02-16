<?php
/**
 * PUT /api/v1/mesaj/oku.php
 * Mesajları okundu olarak işaretle
 * Body: { "id": 1 } veya { "tumu": true }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required();
$body = get_json_body();
$db = getDB();

$simdi = date('Y-m-d H:i:s');

if (!empty($body['tumu'])) {
    // Tüm okunmamış mesajları okundu yap
    $stmt = $db->prepare('UPDATE mesajlar SET okundu = 1, okunma_tarihi = ? WHERE alici_id = ? AND okundu = 0');
    $stmt->execute([$simdi, $user['id']]);
    $etkilenen = $stmt->rowCount();

    json_success(['etkilenen' => $etkilenen], "Tüm mesajlar okundu olarak işaretlendi ($etkilenen adet)");

} else {
    // Tek mesaj okundu yap
    $id = (int)($body['id'] ?? 0);
    if (!$id) json_error('Mesaj ID veya tumu parametresi gerekli', 422);

    // Mesaj kontrolü
    $stmt = $db->prepare('SELECT id, alici_id, okundu FROM mesajlar WHERE id = ?');
    $stmt->execute([$id]);
    $mesaj = $stmt->fetch();

    if (!$mesaj) json_error('Mesaj bulunamadı', 404);
    if ($mesaj['alici_id'] != $user['id']) json_error('Bu mesajı işaretleme yetkiniz yok', 403);

    if ($mesaj['okundu']) {
        json_success(null, 'Mesaj zaten okunmuş');
    } else {
        $stmt = $db->prepare('UPDATE mesajlar SET okundu = 1, okunma_tarihi = ? WHERE id = ?');
        $stmt->execute([$simdi, $id]);

        json_success(['id' => $id, 'okunma_tarihi' => $simdi], 'Mesaj okundu olarak işaretlendi');
    }
}
