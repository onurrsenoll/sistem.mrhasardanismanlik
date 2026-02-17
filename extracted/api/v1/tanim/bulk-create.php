<?php
/**
 * POST /api/v1/tanim/bulk-create.php
 * Toplu tanımlama ekle (Excel import için)
 * Body: { "kategori": "evrak_turu", "degerler": ["VEKALETNAME", "EPİKRİZ", ...] }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$body = get_json_body();
require_fields($body, ['kategori', 'degerler']);

$db = getDB();

$kategori = clean($body['kategori']);
$degerler = $body['degerler'];

if (!is_array($degerler) || count($degerler) === 0) {
    json_error('DEĞER LİSTESİ BOŞ OLAMAZ', 400);
}

// Mevcut maksimum sıra
$stmt = $db->prepare('SELECT MAX(sira) as max_sira FROM tanimlamalar WHERE kategori = ?');
$stmt->execute([$kategori]);
$row = $stmt->fetch();
$sira = ($row['max_sira'] ?? 0) + 1;

$eklenen = 0;
$atlanan = 0;
$hatalar = [];

$stmtCheck = $db->prepare('SELECT id FROM tanimlamalar WHERE kategori = ? AND deger = ?');
$stmtInsert = $db->prepare('INSERT INTO tanimlamalar (kategori, deger, sira, aktif) VALUES (?, ?, ?, 1)');

$db->beginTransaction();

try {
    foreach ($degerler as $deger) {
        $deger = trim($deger);
        if (empty($deger)) continue;

        $deger = mb_strtoupper($deger, 'UTF-8');

        // Aynı kayıt var mı kontrol
        $stmtCheck->execute([$kategori, $deger]);
        if ($stmtCheck->fetch()) {
            $atlanan++;
            continue;
        }

        $stmtInsert->execute([$kategori, $deger, $sira]);
        $sira++;
        $eklenen++;
    }

    $db->commit();

    log_action($user['id'], 'toplu_tanim_ekle', "$kategori: $eklenen eklendi, $atlanan atlandı", 'tanimlamalar', 0);

    json_success([
        'eklenen' => $eklenen,
        'atlanan' => $atlanan,
        'toplam' => $eklenen + $atlanan
    ], "$eklenen KAYIT EKLENDİ, $atlanan KAYIT ZATEN MEVCUT OLDUĞU İÇİN ATLANDI");

} catch (Exception $e) {
    $db->rollBack();
    json_error('TOPLU EKLEME SIRASINDA HATA OLUŞTU: ' . $e->getMessage(), 500);
}
