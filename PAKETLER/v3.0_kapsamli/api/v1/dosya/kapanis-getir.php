<?php
/**
 * GET /api/v1/dosya/kapanis-getir.php?id=<dosya_id>
 * Bir dosyanın kapanış snapshot'ını döndürür.
 * Yoksa 404.
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$dosyaId = (int)($_GET['id'] ?? 0);
if (!$dosyaId) json_error('Dosya id gerekli', 422);

// Dosya kontrolü
$stmt = $db->prepare('SELECT id, dosya_no, asama FROM dosyalar WHERE id = ?');
$stmt->execute([$dosyaId]);
$dosya = $stmt->fetch();
if (!$dosya) json_error('Dosya bulunamadı', 404);

try {
    $stmt = $db->prepare("SELECT k.*, u.ad_soyad as kapatan_adi, p.ad as yonlendiren_paydas_adi
        FROM dosya_kapanis_kayitlari k
        LEFT JOIN users u ON u.id = k.kapatan_kullanici_id
        LEFT JOIN paydaslar p ON p.id = k.yonlendiren_paydas_id
        WHERE k.dosya_id = ?
        LIMIT 1");
    $stmt->execute([$dosyaId]);
    $kayit = $stmt->fetch();

    if (!$kayit) json_error('Bu dosyanın kapanış kaydı yok', 404);

    // Mahsup kaynak dosya bilgisi
    if (!empty($kayit['mahsup_kaynak_dosya_id'])) {
        $stmtMK = $db->prepare("SELECT dosya_no FROM dosyalar WHERE id = ?");
        $stmtMK->execute([$kayit['mahsup_kaynak_dosya_id']]);
        $kayit['mahsup_kaynak_dosya_no'] = $stmtMK->fetchColumn() ?: null;
    }

    json_success([
        'dosya_id' => $dosyaId,
        'dosya_no' => $dosya['dosya_no'],
        'kapanis' => $kayit
    ]);

} catch (\Exception $e) {
    json_error('Kapanış getirilirken hata: ' . $e->getMessage(), 500);
}
