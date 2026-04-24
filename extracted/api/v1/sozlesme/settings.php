<?php
/**
 * GET/POST /api/v1/sozlesme/settings.php
 * Sözleşme şirket ayarları (logo hariç)
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
$user = auth_required(['admin']);
$db = getDB();

// Tablo yoksa oluştur
$db->exec("CREATE TABLE IF NOT EXISTS mr_sozlesme_ayarlar (
  id INT PRIMARY KEY AUTO_INCREMENT,
  unvan VARCHAR(500) NOT NULL DEFAULT 'MR Hasar Danışmanlık ve Filo Yönetimi Ticaret Limited Şirketi',
  adres TEXT NOT NULL,
  vergi_dairesi VARCHAR(200) NOT NULL DEFAULT 'Canik Vergi Dairesi',
  vergi_no VARCHAR(20) NOT NULL DEFAULT '6232224605',
  logo_path VARCHAR(500) NULL,
  guncelleme TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)");

$db->exec("INSERT IGNORE INTO mr_sozlesme_ayarlar (id, unvan, adres, vergi_dairesi, vergi_no)
VALUES (1, 'MR Hasar Danışmanlık ve Filo Yönetimi Ticaret Limited Şirketi',
'Kuzey Yıldızı Mahallesi Şehit Mesut Birinci Caddesi No:3 İç Kapı No:6 Canik/Samsun',
'Canik Vergi Dairesi', '6232224605')");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_method('POST');
    $body = get_json_body();
    $unvan = clean($body['unvan'] ?? '');
    $adres = clean($body['adres'] ?? '');
    $vergiDairesi = clean($body['vergi_dairesi'] ?? '');
    $vergiNo = clean($body['vergi_no'] ?? '');

    $stmt = $db->prepare('UPDATE mr_sozlesme_ayarlar SET unvan=?, adres=?, vergi_dairesi=?, vergi_no=? WHERE id=1');
    $stmt->execute([$unvan, $adres, $vergiDairesi, $vergiNo]);
    json_success(null, 'Ayarlar güncellendi');
} else {
    require_method('GET');
    $stmt = $db->query('SELECT * FROM mr_sozlesme_ayarlar WHERE id=1');
    $ayarlar = $stmt->fetch();
    json_success($ayarlar);
}
