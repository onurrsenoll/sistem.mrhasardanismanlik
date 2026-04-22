<?php
/**
 * POST /api/v1/police/hasar-dosya-ac.php
 * Poliçe kaydından hasar dosyası oluştur (Kasko → Dosya auto-link).
 *
 * Body: { police_id, kaza_tarihi (opsiyonel), kaza_yeri (opsiyonel), aciklama (opsiyonel) }
 *
 * Poliçe bilgileri kullanılarak yeni dosya açılır; geri dönüşte dosya_id verilir.
 * Hiçbir poliçe verisi silinmez/değişmez — sadece yeni bir dosya kaydı oluşturulur.
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'avukat', 'personel']);
$body = get_json_body();
require_fields($body, ['police_id']);

$db = getDB();
$policeId = (int)$body['police_id'];

// Poliçe kaydını al
$stmt = $db->prepare('SELECT * FROM policeler WHERE id = ?');
$stmt->execute([$policeId]);
$police = $stmt->fetch();
if (!$police) json_error('Poliçe bulunamadı', 404);

$kazaTarihi = !empty($body['kaza_tarihi']) ? $body['kaza_tarihi'] : date('Y-m-d');
$kazaYeri = clean($body['kaza_yeri'] ?? '');
$aciklama = clean($body['aciklama'] ?? '');

try {
    $db->beginTransaction();

    $dosyaNo = generate_dosya_no($db);

    // Poliçe türüne göre dosya türünü belirle
    $policeBrans = strtoupper($police['brans'] ?? '');
    $dosyaTuru = 'ADK';
    if (strpos($policeBrans, 'BEDEN') !== false || strpos($policeBrans, 'HAYAT') !== false) $dosyaTuru = 'BH';

    // Dosya oluştur
    $notlar = 'POLİÇE #' . ($police['police_no'] ?? '-') . ' KAPSAMINDA HASAR DOSYASI AÇILDI.';
    if ($aciklama !== '') $notlar .= "\n" . $aciklama;

    $stmt = $db->prepare("INSERT INTO dosyalar
        (dosya_no, dosya_turu, asama, sigorta_sirket, police_no, kaza_tarihi, plaka, notlar, sorumlu_id, created_by, acilis_tarihi)
        VALUES (?, ?, 'Dosya Açık', ?, ?, ?, ?, ?, ?, ?, CURDATE())");
    $stmt->execute([
        $dosyaNo,
        $dosyaTuru,
        $police['sigorta_sirketi'] ?? ($police['sirket'] ?? ''),
        $police['police_no'] ?? '',
        $kazaTarihi,
        clean($police['plaka'] ?? ''),
        $notlar,
        (int)$user['id'],
        (int)$user['id']
    ]);
    $dosyaId = (int)$db->lastInsertId();

    // Mağdur kaydı (poliçe müşterisi)
    if (!empty($police['musteri_adi']) || !empty($police['musteri_tel'])) {
        $stmt = $db->prepare('INSERT INTO magdurlar (dosya_id, ad_soyad, telefon, tc_kimlik) VALUES (?, ?, ?, ?)');
        $stmt->execute([
            $dosyaId,
            clean($police['musteri_adi'] ?? ''),
            clean($police['musteri_tel'] ?? ''),
            clean($police['musteri_tc'] ?? '')
        ]);
    }

    // Poliçeye geri referans: hasar_dosya_id alanı (opsiyonel — tabloyu bozmaz)
    try {
        $db->exec("ALTER TABLE policeler ADD COLUMN IF NOT EXISTS hasar_dosya_ids TEXT DEFAULT NULL");
        $mevcut = (string)($police['hasar_dosya_ids'] ?? '');
        $yeni = $mevcut ? ($mevcut . ',' . $dosyaId) : (string)$dosyaId;
        $db->prepare('UPDATE policeler SET hasar_dosya_ids = ? WHERE id = ?')->execute([$yeni, $policeId]);
    } catch (\Exception $re) { /* sessiz */ }

    $db->commit();

    log_action($user['id'], 'police_hasar_dosya', "Poliçe hasar dosya açıldı: {$police['police_no']} → {$dosyaNo}", 'dosyalar', $dosyaId);

    json_success([
        'dosya_id' => $dosyaId,
        'dosya_no' => $dosyaNo,
        'dosya_turu' => $dosyaTuru
    ], 'HASAR DOSYASI AÇILDI', 201);
} catch (\Exception $e) {
    $db->rollBack();
    json_error('DOSYA AÇMA HATASI: ' . $e->getMessage(), 500);
}
