<?php
/**
 * POST /api/v1/ihbar-foyu/create.php
 * Yeni İhbar Föyü kaydı oluştur (+ varsa parçalar).
 * Body: { plaka, marka, sasi, ..., dosya_id (opsiyonel), parcalar: [{ad,oem,fiyat,miktar}] }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'avukat', 'personel', 'muhasebe']);
$body = get_json_body();
require_fields($body, ['plaka', 'sahip_ad']);

$db = getDB();
ensure_ihbar_foyu_tables();

$fields = ['plaka','marka','sasi','kilometre','sahip_ad','sahip_tel','iban',
    'sigorta','dosya_no','dosya_turu','police_no',
    'eksper_adi','eksper_iletisim','servis_adi','servis_yetkili','servis_tel',
    'kaza_tarihi','kaza_yeri','kaza_aciklama','notlar'];

$vals = [];
$cols = [];
$phs = [];
foreach ($fields as $f) {
    $cols[] = $f;
    $phs[] = '?';
    if ($f === 'kaza_tarihi') {
        $vals[] = !empty($body[$f]) ? $body[$f] : null;
    } else {
        $vals[] = clean($body[$f] ?? '');
    }
}

// Ekstra alanlar
$cols[] = 'dosya_id';
$phs[] = '?';
$vals[] = !empty($body['dosya_id']) ? (int)$body['dosya_id'] : null;

$cols[] = 'evraklar';
$phs[] = '?';
$vals[] = isset($body['evraklar']) ? (is_array($body['evraklar']) ? json_encode($body['evraklar'], JSON_UNESCAPED_UNICODE) : (string)$body['evraklar']) : null;

$cols[] = 'islemler';
$phs[] = '?';
$vals[] = isset($body['islemler']) ? (is_array($body['islemler']) ? json_encode($body['islemler'], JSON_UNESCAPED_UNICODE) : (string)$body['islemler']) : null;

$cols[] = 'iscilik';
$phs[] = '?';
$vals[] = (float)($body['iscilik'] ?? 0);

$cols[] = 'kdv_dahil';
$phs[] = '?';
$vals[] = !empty($body['kdv_dahil']) ? 1 : 0;

$cols[] = 'kullanici_id';
$phs[] = '?';
$vals[] = $user['id'];

try {
    $db->beginTransaction();

    $sql = 'INSERT INTO hasar_ihbar (' . implode(',', $cols) . ') VALUES (' . implode(',', $phs) . ')';
    $stmt = $db->prepare($sql);
    $stmt->execute($vals);
    $id = (int)$db->lastInsertId();

    // Parçalar
    if (!empty($body['parcalar']) && is_array($body['parcalar'])) {
        $pStmt = $db->prepare('INSERT INTO hasar_ihbar_parcalar (ihbar_id, sira, ad, oem, fiyat, miktar) VALUES (?, ?, ?, ?, ?, ?)');
        foreach ($body['parcalar'] as $i => $p) {
            $pStmt->execute([
                $id, $i + 1,
                clean($p['name'] ?? $p['ad'] ?? ''),
                clean($p['oem'] ?? ''),
                (float)($p['original'] ?? $p['fiyat'] ?? 0),
                (int)($p['quantity'] ?? $p['miktar'] ?? 1)
            ]);
        }
    }

    $db->commit();
    log_action($user['id'], 'ihbar_foyu_create', "İhbar föyü oluşturuldu: " . clean($body['plaka']), 'hasar_ihbar', $id);
    json_success(['id' => $id], 'İHBAR FÖYÜ KAYDEDİLDİ', 201);
} catch (\Exception $e) {
    $db->rollBack();
    json_error('KAYIT HATASI: ' . $e->getMessage(), 500);
}
