<?php
/**
 * POST /api/v1/sistem/toplu-sifirla.php
 * MODÜL BAZLI TOPLU SİLME / SIFIRLAMA — SADECE ADMİN
 * Body: {modul: "dosyalar" | "muhasebe" | "kasa" | "cari" | "crm" | "police" | "personel" | "ajanda" | "mesajlar" | "ortaklar" | "paydaslar"}
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$db = getDB();

$body = get_json_body();
$modul = $body['modul'] ?? '';

if (empty($modul)) {
    json_error('MODÜL BELİRTİLMEDİ', 422);
}

$db->beginTransaction();

try {
    $silinen = 0;
    $detay = '';

    // Foreign key kontrollerini geçici olarak kapat
    $db->exec("SET FOREIGN_KEY_CHECKS = 0");

    switch ($modul) {
        case 'dosyalar':
            // Evrak dosyalarını sunucudan sil
            try {
                $stmt = $db->query('SELECT dosya_yolu FROM evraklar');
                foreach ($stmt->fetchAll() as $evrak) {
                    $filePath = UPLOAD_DIR . $evrak['dosya_yolu'];
                    if (file_exists($filePath)) @unlink($filePath);
                }
            } catch (\Exception $e) {}

            $tables = ['evraklar', 'masraflar', 'magdurlar', 'araclar', 'dosya_surecler', 'dosyalar'];
            foreach ($tables as $t) {
                try {
                    $c = $db->exec("DELETE FROM $t");
                    $silinen += $c;
                } catch (\Exception $e) {}
            }
            $detay = "TÜM DOSYALAR VE İLİŞKİLİ KAYITLAR (EVRAK, MASRAF, MAĞDUR, ARAÇ) SİLİNDİ";
            break;

        case 'muhasebe':
            // Gelir, gider, kasa hareketleri
            $tables = ['kasa_hareketleri', 'gelirler', 'giderler'];
            foreach ($tables as $t) {
                try {
                    $c = $db->exec("DELETE FROM $t");
                    $silinen += $c;
                } catch (\Exception $e) {}
            }
            // Kasa bakiyelerini sıfırla
            try {
                $db->exec('UPDATE kasalar SET bakiye = 0.00');
            } catch (\Exception $e) {}
            $detay = "TÜM GELİR/GİDER KAYITLARI VE KASA HAREKETLERİ SİLİNDİ, BAKİYELER SIFIRLANDI";
            break;

        case 'kasa':
            // Sadece kasa hareketlerini sil ve bakiyeleri sıfırla
            try {
                $c = $db->exec("DELETE FROM kasa_hareketleri");
                $silinen += $c;
            } catch (\Exception $e) {}
            try {
                $db->exec('UPDATE kasalar SET bakiye = 0.00');
            } catch (\Exception $e) {}
            $detay = "TÜM KASA HAREKETLERİ SİLİNDİ VE BAKİYELER SIFIRLANDI";
            break;

        case 'cari':
            // Paydaş komisyonları ve cari hareket kayıtları
            $tables = ['paydas_komisyonlari'];
            foreach ($tables as $t) {
                try {
                    $c = $db->exec("DELETE FROM $t");
                    $silinen += $c;
                } catch (\Exception $e) {}
            }
            $detay = "TÜM CARİ / KOMİSYON KAYITLARI SİLİNDİ";
            break;

        case 'crm':
            try {
                // CRM dosyalarını sunucudan sil
                $stmt = $db->query("SELECT dosya_yolu FROM crm_dosyalar");
                foreach ($stmt->fetchAll() as $d) {
                    $filePath = UPLOAD_DIR . $d['dosya_yolu'];
                    if (file_exists($filePath)) @unlink($filePath);
                }
            } catch (\Exception $e) {}
            $tables = ['crm_notlar', 'crm_dosyalar', 'crm_kayitlar'];
            foreach ($tables as $t) {
                try {
                    $c = $db->exec("DELETE FROM $t");
                    $silinen += $c;
                } catch (\Exception $e) {}
            }
            $detay = "TÜM CRM KAYITLARI SİLİNDİ";
            break;

        case 'police':
            $tables = ['police_tahsilatlar', 'policeler'];
            foreach ($tables as $t) {
                try {
                    $c = $db->exec("DELETE FROM $t");
                    $silinen += $c;
                } catch (\Exception $e) {}
            }
            $detay = "TÜM POLİÇE KAYITLARI SİLİNDİ";
            break;

        case 'personel':
            $tables = ['personel_hakedis', 'personel'];
            foreach ($tables as $t) {
                try {
                    $c = $db->exec("DELETE FROM $t");
                    $silinen += $c;
                } catch (\Exception $e) {}
            }
            $detay = "TÜM PERSONEL KAYITLARI SİLİNDİ";
            break;

        case 'ajanda':
            try {
                $c = $db->exec("DELETE FROM ajanda");
                $silinen += $c;
            } catch (\Exception $e) {}
            $detay = "TÜM AJANDA KAYITLARI SİLİNDİ";
            break;

        case 'mesajlar':
            try {
                $c = $db->exec("DELETE FROM mesajlar");
                $silinen += $c;
            } catch (\Exception $e) {}
            $detay = "TÜM MESAJ KAYITLARI SİLİNDİ";
            break;

        case 'ortaklar':
            $tables = ['ortak_hareketler', 'ortaklar'];
            foreach ($tables as $t) {
                try {
                    $c = $db->exec("DELETE FROM $t");
                    $silinen += $c;
                } catch (\Exception $e) {}
            }
            $detay = "TÜM İŞ ORTAĞI KAYITLARI SİLİNDİ";
            break;

        case 'paydaslar':
            $tables = ['paydas_komisyonlari', 'paydaslar'];
            foreach ($tables as $t) {
                try {
                    $c = $db->exec("DELETE FROM $t");
                    $silinen += $c;
                } catch (\Exception $e) {}
            }
            $detay = "TÜM İŞ PAYDAŞI KAYITLARI SİLİNDİ";
            break;

        case 'bildirimler':
            try {
                $c = $db->exec("DELETE FROM bildirimler");
                $silinen += $c;
            } catch (\Exception $e) {}
            $detay = "TÜM BİLDİRİM KAYITLARI SİLİNDİ";
            break;

        case 'loglar':
            try {
                $c = $db->exec("DELETE FROM loglar");
                $silinen += $c;
            } catch (\Exception $e) {}
            $detay = "TÜM LOG KAYITLARI SİLİNDİ";
            break;

        default:
            $db->exec("SET FOREIGN_KEY_CHECKS = 1");
            $db->rollBack();
            json_error('GEÇERSİZ MODÜL: ' . $modul, 422);
            return;
    }

    $db->exec("SET FOREIGN_KEY_CHECKS = 1");
    $db->commit();

    log_action($user['id'], 'TOPLU_SIFIRLA', $detay . " ($silinen kayıt)", 'SİSTEM', null);

    json_success([
        'modul' => $modul,
        'silinen' => $silinen,
        'detay' => $detay
    ], $detay);

} catch (\Exception $e) {
    try { $db->exec("SET FOREIGN_KEY_CHECKS = 1"); } catch (\Exception $ex) {}
    $db->rollBack();
    json_error('SIFIRLAMA HATASI: ' . $e->getMessage(), 500);
}
