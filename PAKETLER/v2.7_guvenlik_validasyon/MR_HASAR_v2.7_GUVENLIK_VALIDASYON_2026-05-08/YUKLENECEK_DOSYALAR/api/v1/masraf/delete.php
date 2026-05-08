<?php
/**
 * DELETE /api/v1/masraf/delete.php?id=1
 *
 * v2.7 (#017): MASRAF SİLİNDİĞİNDE KASA BAKİYESİ ATOMIK ROLLBACK
 *   · Eğer masraf ÖDENMİŞSE → kasaya tutarı geri ekle + kasa_hareketleri'ne
 *     ters yön ('iade') kayıt yaz.
 *   · FOREIGN_KEY_CHECKS=0 BYPASS KALDIRILDI — DB'de RESTRICT FK varsa
 *     bağlı kayıtlar açıkça silinir, sessiz tutarsızlık oluşmaz.
 *   · Bağlı paydas_komisyonu da odendi ise kasa rollback dahil edilir.
 *   · Tüm işlem TEK BİR TRANSACTION içinde — atomik.
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin', 'muhasebe']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Masraf ID gerekli', 422);

$stmt = $db->prepare('SELECT m.*, d.dosya_no FROM masraflar m LEFT JOIN dosyalar d ON d.id = m.dosya_id WHERE m.id = ?');
$stmt->execute([$id]);
$masraf = $stmt->fetch();
if (!$masraf) json_error('Masraf bulunamadı', 404);

try {
    $db->beginTransaction();

    /* ─── 1) Bağlı paydaş komisyonu varsa onu da geri al ─── */
    $paydasKomisyonId = $masraf['paydas_komisyon_id'] ?? null;
    $kpRollbackTutar = 0;
    $kpRollbackKasa = null;
    if ($paydasKomisyonId) {
        $kpStmt = $db->prepare('SELECT id, tutar, kasa_id, durum FROM paydas_komisyonlari WHERE id = ?');
        $kpStmt->execute([$paydasKomisyonId]);
        $kp = $kpStmt->fetch();
        if ($kp) {
            // Komisyon ödenmişse, kasaya iade için bilgiyi tut
            if ($kp['durum'] === 'odendi' && !empty($kp['kasa_id']) && (float)$kp['tutar'] > 0) {
                $kpRollbackTutar = (float)$kp['tutar'];
                $kpRollbackKasa = (int)$kp['kasa_id'];
            }
            $db->prepare('DELETE FROM paydas_komisyonlari WHERE id = ?')->execute([$paydasKomisyonId]);
        }
    }

    /* ─── 2) Masraf ödenmişse kasaya iade kayıt + bakiyeyi geri yükle ─── */
    $masrafOdendi = (($masraf['odeme_durumu'] ?? '') === 'odendi');
    $masrafKasaId = !empty($masraf['kasa_id']) ? (int)$masraf['kasa_id'] : null;
    $masrafTutar  = (float)($masraf['tutar'] ?? 0);

    if ($masrafOdendi && $masrafKasaId && $masrafTutar > 0) {
        // Kasa bakiyesini atomik olarak geri yükle
        $db->prepare('UPDATE kasalar SET bakiye = bakiye + ? WHERE id = ?')
           ->execute([$masrafTutar, $masrafKasaId]);

        // Yeni bakiyeyi oku ve kasa_hareketleri'ne ters yön kayıt yaz
        $bakStmt = $db->prepare('SELECT bakiye FROM kasalar WHERE id = ?');
        $bakStmt->execute([$masrafKasaId]);
        $yeniBakiye = (float)$bakStmt->fetchColumn();

        $aciklama = 'MASRAF SİLİNDİ — İADE: ' . ($masraf['masraf_kalemi'] ?? '-')
            . (!empty($masraf['dosya_no']) ? ' (Dosya: ' . $masraf['dosya_no'] . ')' : '');

        $db->prepare(
            'INSERT INTO kasa_hareketleri (kasa_id, dosya_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) '
          . 'VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $masrafKasaId,
            !empty($masraf['dosya_id']) ? (int)$masraf['dosya_id'] : null,
            'iade',
            $masrafTutar,
            $yeniBakiye,
            $aciklama,
            $user['id']
        ]);
    }

    /* ─── 3) Komisyon kasa rollback (eğer ayrı kasa kullanıldıysa) ─── */
    if ($kpRollbackTutar > 0 && $kpRollbackKasa) {
        $db->prepare('UPDATE kasalar SET bakiye = bakiye + ? WHERE id = ?')
           ->execute([$kpRollbackTutar, $kpRollbackKasa]);

        $bakStmt = $db->prepare('SELECT bakiye FROM kasalar WHERE id = ?');
        $bakStmt->execute([$kpRollbackKasa]);
        $yeniBakiye = (float)$bakStmt->fetchColumn();

        $db->prepare(
            'INSERT INTO kasa_hareketleri (kasa_id, dosya_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) '
          . 'VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $kpRollbackKasa,
            !empty($masraf['dosya_id']) ? (int)$masraf['dosya_id'] : null,
            'iade',
            $kpRollbackTutar,
            $yeniBakiye,
            'PAYDAŞ KOMİSYONU SİLİNDİ — İADE',
            $user['id']
        ]);
    }

    /* ─── 4) Masraf'ı sil — FK BYPASS YOK, açık DELETE ─── */
    // FK CASCADE → RESTRICT geçişi (v2.1 güvenlik) sayesinde bağlı evrak/dosya
    // kayıtları otomatik olarak korunur. Eğer bağlı kayıt varsa DB exception fırlatır.
    $db->prepare('DELETE FROM masraflar WHERE id = ?')->execute([$id]);

    $db->commit();
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    json_error('Silme hatası: ' . $e->getMessage(), 500);
}

log_action(
    $user['id'],
    'masraf_sil',
    ($masraf['dosya_no'] ?? '-') . ' - ' . ($masraf['masraf_kalemi'] ?? '-')
        . ': ' . number_format((float)($masraf['tutar'] ?? 0), 2) . ' ₺'
        . ($masrafOdendi ? ' [KASA İADE EDİLDİ]' : ''),
    'masraflar',
    $id
);

json_success(null, 'Masraf silindi' . ($masrafOdendi ? ' ve kasaya iade edildi' : ''));
