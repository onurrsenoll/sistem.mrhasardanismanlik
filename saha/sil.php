<?php
/**
 * DELETE /api/v1/saha/sil.php?id=X
 * SAHA DOSYASINI VE İLGİLİ MEDYALARINI SİL
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/database.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin', 'personel']);

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('ID GEREKLİ', 400);

$db = getDB();

// Kayıt kontrol
$stmt = $db->prepare("SELECT * FROM saha_dosyalar WHERE id = ?");
$stmt->execute([$id]);
$kayit = $stmt->fetch();

if (!$kayit) json_error('KAYIT BULUNAMADI', 404);

// Personel sadece kendi kaydını silebilir
if ($user['rol'] === 'personel' && (int)$kayit['personel_id'] !== (int)$user['id']) {
    json_error('BU KAYDI SİLME YETKİNİZ YOK', 403);
}

// Dosyaya dönüşmüş kayıtlar silinemez
if ($kayit['durum'] === 'dosyaya_donustu') {
    json_error('DOSYAYA DÖNÜŞMÜŞ KAYITLAR SİLİNEMEZ', 400);
}

try {
    $db->beginTransaction();

    // Medya dosyalarını sil (fiziksel + DB)
    $stmt = $db->prepare("SELECT dosya_yolu FROM saha_dosya_medya WHERE saha_dosya_id = ?");
    $stmt->execute([$id]);
    $medyalar = $stmt->fetchAll();

    foreach ($medyalar as $m) {
        $path = UPLOAD_DIR . '/' . $m['dosya_yolu'];
        if (file_exists($path)) @unlink($path);
    }

    $db->prepare("DELETE FROM saha_dosya_medya WHERE saha_dosya_id = ?")->execute([$id]);

    // Saha kaydını sil
    $db->prepare("DELETE FROM saha_dosyalar WHERE id = ?")->execute([$id]);

    $db->commit();

    log_action($user['id'], 'saha_sil', "Saha dosya silindi: " . ($kayit['musteri_adi'] ?? ''), 'saha_dosyalar', $id);

    json_success(null, 'SAHA DOSYASI SİLİNDİ');

} catch (\Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    json_error('SİLME HATASI: ' . $e->getMessage(), 500);
}
