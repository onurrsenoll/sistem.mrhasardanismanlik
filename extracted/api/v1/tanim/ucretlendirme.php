<?php
/**
 * GET/POST /api/v1/tanim/ucretlendirme.php
 * Ortak ücretlendirme tarifesi + Paydaş varsayılan tarife yönetimi
 *
 * GET: Tüm tarifeleri döndür
 * POST: Tarife güncelle/oluştur
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
$user = auth_required(['admin']);
$db = getDB();

// Tablo yoksa oluştur
$db->exec("CREATE TABLE IF NOT EXISTS mr_ucretlendirme_tarife (
  id INT PRIMARY KEY AUTO_INCREMENT,
  yil YEAR NOT NULL DEFAULT 2026,
  tip ENUM('ortak','paydas') NOT NULL DEFAULT 'ortak',
  dosya_turu VARCHAR(20) NOT NULL,
  dosya_kaynagi VARCHAR(50) NOT NULL,
  tutar DECIMAL(12,2) NOT NULL DEFAULT 0,
  onceki_tutar DECIMAL(12,2) NULL,
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  aciklama VARCHAR(200) NULL,
  guncelleme TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tarife (yil, tip, dosya_turu, dosya_kaynagi)
)");

// Varsayılan değerler yoksa ekle
$stmt = $db->query("SELECT COUNT(*) as c FROM mr_ucretlendirme_tarife WHERE yil = " . date('Y'));
if ((int)$stmt->fetch()['c'] === 0) {
    $yil = date('Y');
    $defaults = [
        // Ortak (Demirhan) tarifeleri
        ['ortak', 'ADK', 'OFİS CRM', 10000],
        ['ortak', 'ADK', 'YÖNLENDİRME', 20000],
        ['ortak', 'MDK', 'OFİS CRM', 5000],
        ['ortak', 'MDK', 'YÖNLENDİRME', 10000],
        ['ortak', 'BH', 'OFİS CRM', 12500],
        ['ortak', 'BH', 'YÖNLENDİRME', 25000],
        // Paydaş varsayılan tarifeleri
        ['paydas', 'ADK', 'YÖNLENDİRME', 8000],
        ['paydas', 'MDK', 'YÖNLENDİRME', 4000],
        ['paydas', 'BH', 'YÖNLENDİRME', 15000],
    ];
    $stmt = $db->prepare("INSERT IGNORE INTO mr_ucretlendirme_tarife (yil, tip, dosya_turu, dosya_kaynagi, tutar) VALUES (?, ?, ?, ?, ?)");
    foreach ($defaults as $d) {
        $stmt->execute([$yil, $d[0], $d[1], $d[2], $d[3]]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_method('POST');
    $body = get_json_body();

    // Tekli güncelleme
    if (!empty($body['id'])) {
        $id = (int)$body['id'];
        $tutar = (float)($body['tutar'] ?? 0);
        $aktif = isset($body['aktif']) ? (int)$body['aktif'] : 1;
        $aciklama = clean($body['aciklama'] ?? '');

        // Önceki tutarı kaydet
        $stmt = $db->prepare("SELECT tutar FROM mr_ucretlendirme_tarife WHERE id = ?");
        $stmt->execute([$id]);
        $mevcut = $stmt->fetch();
        if (!$mevcut) json_error('Tarife bulunamadı', 404);

        $stmt = $db->prepare("UPDATE mr_ucretlendirme_tarife SET tutar = ?, onceki_tutar = ?, aktif = ?, aciklama = ? WHERE id = ?");
        $stmt->execute([$tutar, $mevcut['tutar'], $aktif, $aciklama, $id]);

        log_action($user['id'], 'tarife_guncelle', "Tarife güncellendi ID:$id - $tutar TL", 'mr_ucretlendirme_tarife', $id);
        json_success(null, 'Tarife güncellendi');
    }

    // Yeni tarife ekleme
    if (!empty($body['dosya_turu']) && !empty($body['dosya_kaynagi'])) {
        $yil = (int)($body['yil'] ?? date('Y'));
        $tip = clean($body['tip'] ?? 'ortak');
        $dosyaTuru = clean($body['dosya_turu']);
        $dosyaKaynagi = clean($body['dosya_kaynagi']);
        $tutar = (float)($body['tutar'] ?? 0);
        $aciklama = clean($body['aciklama'] ?? '');

        $stmt = $db->prepare("INSERT INTO mr_ucretlendirme_tarife (yil, tip, dosya_turu, dosya_kaynagi, tutar, aciklama) VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE tutar = VALUES(tutar), aciklama = VALUES(aciklama)");
        $stmt->execute([$yil, $tip, $dosyaTuru, $dosyaKaynagi, $tutar, $aciklama]);

        $id = (int)$db->lastInsertId();
        log_action($user['id'], 'tarife_olustur', "Tarife oluşturuldu: $tip $dosyaTuru $dosyaKaynagi $tutar TL", 'mr_ucretlendirme_tarife', $id);
        json_success(['id' => $id], 'Tarife oluşturuldu');
    }

    // Toplu güncelleme
    if (!empty($body['tarifeler']) && is_array($body['tarifeler'])) {
        $db->beginTransaction();
        try {
            foreach ($body['tarifeler'] as $t) {
                if (empty($t['id'])) continue;
                $stmt = $db->prepare("UPDATE mr_ucretlendirme_tarife SET tutar = ?, aktif = ? WHERE id = ?");
                $stmt->execute([(float)($t['tutar'] ?? 0), isset($t['aktif']) ? (int)$t['aktif'] : 1, (int)$t['id']]);
            }
            $db->commit();
            json_success(null, 'Tarifeler güncellendi');
        } catch (\Exception $e) {
            $db->rollBack();
            json_error('Güncelleme hatası: ' . $e->getMessage(), 500);
        }
    }

    json_error('Geçersiz istek', 400);

} else {
    require_method('GET');
    $yil = (int)($_GET['yil'] ?? date('Y'));
    $tip = clean($_GET['tip'] ?? '');

    $where = "WHERE yil = ?";
    $params = [$yil];
    if ($tip) { $where .= " AND tip = ?"; $params[] = $tip; }

    $stmt = $db->prepare("SELECT * FROM mr_ucretlendirme_tarife $where ORDER BY tip, dosya_turu, dosya_kaynagi");
    $stmt->execute($params);
    $tarifeler = $stmt->fetchAll();

    // Yıllar listesi
    $stmt = $db->query("SELECT DISTINCT yil FROM mr_ucretlendirme_tarife ORDER BY yil DESC");
    $yillar = array_column($stmt->fetchAll(), 'yil');

    json_success([
        'tarifeler' => $tarifeler,
        'yillar' => $yillar,
        'aktif_yil' => $yil
    ]);
}
