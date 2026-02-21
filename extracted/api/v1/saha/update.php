<?php
/**
 * PUT /api/v1/saha/update.php
 * SAHA DOSYASI GÜNCELLE (TASLAK VEYA BEKLEMEDE DURUMUNDA)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required(['admin', 'personel']);
$body = get_json_body();

if (empty($body['id'])) json_error('ID GEREKLİ', 400);

$id = (int)$body['id'];
$db = getDB();

// Mevcut kaydı al
$stmt = $db->prepare("SELECT * FROM saha_dosyalar WHERE id = ?");
$stmt->execute([$id]);
$kayit = $stmt->fetch();

if (!$kayit) json_error('KAYIT BULUNAMADI', 404);

// Personel sadece kendi kaydını güncelleyebilir
if ($user['rol'] === 'personel' && (int)$kayit['personel_id'] !== (int)$user['id']) {
    json_error('BU KAYDI GÜNCELLEME YETKİNİZ YOK', 403);
}

// Sadece taslak veya beklemede durumundaki kayıtlar güncellenebilir
if (!in_array($kayit['durum'], ['taslak', 'beklemede'])) {
    json_error('SADECE TASLAK VEYA BEKLEMEDE DURUMUNDAKI KAYITLAR GÜNCELLENEBİLİR', 400);
}

// Güncellenebilir alanlar
$alanlar = [
    'musteri_adi', 'musteri_telefon', 'musteri_tc',
    'hasar_tipi', 'hasar_tarihi', 'hasar_yeri', 'hasar_aciklama',
    'hasar_durumu', 'gecmis_hasar', 'dosya_kaynagi',
    'arac_plaka', 'arac_marka', 'arac_model', 'arac_model_yili', 'arac_km',
    'arac_ruhsat_sahibi', 'arac_kusur_durumu', 'arac_renk', 'arac_sasi_no',
    'karsi_plaka', 'karsi_sigorta'
];

$setClauses = [];
$params = [];

foreach ($alanlar as $alan) {
    if (isset($body[$alan])) {
        $setClauses[] = "$alan = ?";
        if ($alan === 'hasar_tarihi') {
            $params[] = !empty($body[$alan]) ? $body[$alan] : null;
        } elseif (in_array($alan, ['arac_model_yili', 'arac_km'])) {
            $params[] = !empty($body[$alan]) ? (int)$body[$alan] : null;
        } else {
            $params[] = clean($body[$alan]);
        }
    }
}

if (empty($setClauses)) json_error('GÜNCELLENECEK ALAN BELİRTİLMEDİ', 400);

$setClauses[] = "updated_at = NOW()";
$params[] = $id;

try {
    $sql = "UPDATE saha_dosyalar SET " . implode(', ', $setClauses) . " WHERE id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    log_action($user['id'], 'saha_guncelle', "Saha dosya güncellendi", 'saha_dosyalar', $id);

    json_success(null, 'SAHA DOSYASI GÜNCELLENDİ');

} catch (\Exception $e) {
    json_error('GÜNCELLEME HATASI: ' . $e->getMessage(), 500);
}
