<?php
/**
 * DELETE /api/v1/muhasebe/hareket-delete.php?id=1
 * Kasa hareketi sil (Sadece Sistem Yöneticisi)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Hareket ID gerekli', 422);

// Hareket var mı kontrol et
$stmt = $db->prepare('SELECT kh.*, k.ad as kasa_adi FROM kasa_hareketleri kh LEFT JOIN kasalar k ON k.id = kh.kasa_id WHERE kh.id = ?');
$stmt->execute([$id]);
$hareket = $stmt->fetch();
if (!$hareket) json_error('Hareket bulunamadı', 404);

// Kasa bakiyesini güncelle (hareketi geri al)
$tutar = (float)$hareket['tutar'];
$kasaId = (int)$hareket['kasa_id'];
$islemTuru = $hareket['islem_turu'] ?? '';

// Giriş türleri: bakiyeden düş, çıkış türleri: bakiyeye ekle
if (in_array($islemTuru, ['gelir', 'giris', 'komisyon'])) {
    $stmt = $db->prepare('UPDATE kasalar SET bakiye = bakiye - ? WHERE id = ?');
} else {
    $stmt = $db->prepare('UPDATE kasalar SET bakiye = bakiye + ? WHERE id = ?');
}
$stmt->execute([$tutar, $kasaId]);

// Hareketi sil
$stmt = $db->prepare('DELETE FROM kasa_hareketleri WHERE id = ?');
$stmt->execute([$id]);

log_action($user['id'], 'hareket_sil', "Kasa hareketi silindi: " . ($hareket['kasa_adi'] ?? '') . " - " . $islemTuru . " - " . $tutar . " TL (ID: $id)", 'kasa_hareketleri', $id);

json_success(null, 'Hareket başarıyla silindi');
