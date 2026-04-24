<?php
/**
 * POST /api/v1/hesap/dosyaya-kaydet.php
 * ADK veya BH hesaplama sonucunu dosyaya EVRAK olarak kaydeder.
 *
 * Body: {
 *   dosya_id (zorunlu),
 *   hesap_turu: 'ADK' | 'BH',
 *   baslik: "...",
 *   icerik: "..." | JSON string (rapor içeriği),
 *   format: 'json' | 'text' (varsayılan json)
 * }
 *
 * Dosya:
 *   uploads/hesap/{dosya_id}_{hesap_turu}_{timestamp}.json
 *   evraklar tablosuna evrak_turu='ADK RAPORU' veya 'BH RAPORU' olarak ekler.
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();
$body = get_json_body();
require_fields($body, ['dosya_id', 'hesap_turu']);

$db = getDB();
$dosyaId = (int)$body['dosya_id'];
$hesapTuru = strtoupper(clean($body['hesap_turu']));
if (!in_array($hesapTuru, ['ADK', 'BH', 'MDK'], true)) {
    json_error('GEÇERSIZ HESAP TÜRÜ (ADK/BH/MDK)', 422);
}

// Dosya var mı?
$stmt = $db->prepare('SELECT id, dosya_no FROM dosyalar WHERE id = ?');
$stmt->execute([$dosyaId]);
$dosya = $stmt->fetch();
if (!$dosya) json_error('Dosya bulunamadı', 404);

$baslik = clean($body['baslik'] ?? ($hesapTuru . ' RAPORU'));
$icerik = $body['icerik'] ?? '';
if (is_array($icerik) || is_object($icerik)) {
    $icerik = json_encode($icerik, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
$format = strtolower(clean($body['format'] ?? 'json'));
$ext = $format === 'text' ? 'txt' : 'json';
$mime = $format === 'text' ? 'text/plain' : 'application/json';

// Dizini hazırla
$altDizin = 'hesap';
$tamDizin = rtrim(UPLOAD_DIR, '/') . '/' . $altDizin;
if (!is_dir($tamDizin)) @mkdir($tamDizin, 0755, true);

$ts = date('YmdHis');
$dosyaAdi = $baslik . '_' . $ts . '.' . $ext;
$sunucuAdi = $dosyaId . '_' . $hesapTuru . '_' . $ts . '_' . substr(md5(uniqid()), 0, 8) . '.' . $ext;
$dosyaYolu = $altDizin . '/' . $sunucuAdi;
$tamYol = $tamDizin . '/' . $sunucuAdi;

$yazilan = @file_put_contents($tamYol, (string)$icerik);
if ($yazilan === false) json_error('Dosya yazılamadı: ' . $tamYol, 500);
$boyut = (int)filesize($tamYol);

// Evrak türü sabitleri (sistem tanımlamalarından biri)
$evrakTuru = ($hesapTuru === 'BH') ? 'BH RAPORU' : ($hesapTuru === 'MDK' ? 'MDK RAPORU' : 'ADK RAPORU');

try {
    $stmt = $db->prepare('INSERT INTO evraklar (dosya_id, evrak_turu, dosya_adi, sunucu_adi, dosya_yolu, dosya_boyutu, mime_type, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $dosyaId, $evrakTuru, $dosyaAdi, $sunucuAdi, $dosyaYolu, $boyut, $mime, (int)$user['id']
    ]);
    $evrakId = (int)$db->lastInsertId();

    log_action($user['id'], 'hesap_rapor_dosyaya', "$hesapTuru raporu dosyaya evrak olarak eklendi (dosya #$dosyaId)", 'evraklar', $evrakId);

    json_success([
        'evrak_id' => $evrakId,
        'dosya_id' => $dosyaId,
        'evrak_turu' => $evrakTuru,
        'dosya_yolu' => $dosyaYolu,
        'boyut' => $boyut
    ], 'HESAP RAPORU DOSYAYA EVRAK OLARAK EKLENDİ', 201);
} catch (\Exception $e) {
    // Başarısızsa dosyayı da sil
    @unlink($tamYol);
    json_error('EVRAK KAYIT HATASI: ' . $e->getMessage(), 500);
}
