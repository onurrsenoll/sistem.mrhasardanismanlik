<?php
/**
 * PUT /api/v1/muhasebe/hareket-update.php
 * Kasa hareketi düzenle (Sadece Sistem Yöneticisi)
 * Body: { "id": 1, "tutar": 5000, "aciklama": "Yeni açıklama", "islem_turu": "gelir" }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required(['admin']);
$body = get_json_body();

$id = (int)($body['id'] ?? 0);
if (!$id) json_error('Hareket ID gerekli', 422);

$db = getDB();

// Mevcut hareketi al
$stmt = $db->prepare('SELECT kh.*, k.ad as kasa_adi FROM kasa_hareketleri kh LEFT JOIN kasalar k ON k.id = kh.kasa_id WHERE kh.id = ?');
$stmt->execute([$id]);
$hareket = $stmt->fetch();
if (!$hareket) json_error('Hareket bulunamadı', 404);

$eskiTutar = (float)$hareket['tutar'];
$yeniTutar = isset($body['tutar']) ? (float)$body['tutar'] : $eskiTutar;
$yeniAciklama = isset($body['aciklama']) ? clean($body['aciklama']) : $hareket['aciklama'];
$eskiIslemTuru = $hareket['islem_turu'] ?? '';
$yeniIslemTuru = isset($body['islem_turu']) ? clean($body['islem_turu']) : $eskiIslemTuru;
$kasaId = (int)$hareket['kasa_id'];

// Kasa bakiyesini güncelle
// Önce eski hareketi geri al
$girisler = ['gelir', 'giris', 'komisyon'];
if (in_array($eskiIslemTuru, $girisler)) {
    $db->prepare('UPDATE kasalar SET bakiye = bakiye - ? WHERE id = ?')->execute([$eskiTutar, $kasaId]);
} else {
    $db->prepare('UPDATE kasalar SET bakiye = bakiye + ? WHERE id = ?')->execute([$eskiTutar, $kasaId]);
}

// Sonra yeni hareketi uygula
if (in_array($yeniIslemTuru, $girisler)) {
    $db->prepare('UPDATE kasalar SET bakiye = bakiye + ? WHERE id = ?')->execute([$yeniTutar, $kasaId]);
} else {
    $db->prepare('UPDATE kasalar SET bakiye = bakiye - ? WHERE id = ?')->execute([$yeniTutar, $kasaId]);
}

// Yeni bakiye al
$stmt = $db->prepare('SELECT bakiye FROM kasalar WHERE id = ?');
$stmt->execute([$kasaId]);
$yeniBakiye = (float)$stmt->fetchColumn();

// Hareketi güncelle
$stmt = $db->prepare('UPDATE kasa_hareketleri SET tutar = ?, aciklama = ?, islem_turu = ?, bakiye_sonrasi = ? WHERE id = ?');
$stmt->execute([$yeniTutar, $yeniAciklama, $yeniIslemTuru, $yeniBakiye, $id]);

log_action($user['id'], 'hareket_guncelle', "Kasa hareketi güncellendi: " . ($hareket['kasa_adi'] ?? '') . " - Eski: $eskiTutar TL ($eskiIslemTuru) → Yeni: $yeniTutar TL ($yeniIslemTuru) (ID: $id)", 'kasa_hareketleri', $id);

json_success(null, 'Hareket başarıyla güncellendi');
