<?php
/**
 * MR HASAR DANIŞMANLIK - NetGSM SMS Modülü Kullanım Örnekleri
 *
 * Bu dosya doğrudan çalıştırılmak için değildir.
 * API endpoint'lerinden veya iş mantığı kodundan nasıl
 * kullanılacağını gösterir.
 */

require_once __DIR__ . '/../extracted/api/config/database.php';
require_once __DIR__ . '/NetgsmSms.php';

// ═══════════════════════════════════════════════════════════
// 1) TEKİL SMS GÖNDERME
// ═══════════════════════════════════════════════════════════

$sms = new NetgsmSms();  // Veritabanından ayarları otomatik yükler

$sonuc = $sms->gonder('05321234567', 'Dosyanız güncellendi.');
if ($sonuc['basarili']) {
    echo "SMS gönderildi! Bulk ID: " . $sonuc['bulk_id'] . "\n";
} else {
    echo "SMS gönderilemedi: " . $sonuc['mesaj'] . "\n";
}

// ═══════════════════════════════════════════════════════════
// 2) DOSYA İLE İLİŞKİLENDİRİLMİŞ SMS
// ═══════════════════════════════════════════════════════════

$dosyaId = 42;
$kullaniciId = 1;
$sonuc = $sms->gonder('05321234567', 'Dosyanız hakkında bilgi.', $dosyaId, $kullaniciId);

// ═══════════════════════════════════════════════════════════
// 3) TOPLU SMS GÖNDERME
// ═══════════════════════════════════════════════════════════

$telefonlar = [
    '05321234567',
    '05339876543',
    '05441112233',
];

$sonuc = $sms->topluGonder($telefonlar, 'Toplu bilgilendirme mesajı.', $kullaniciId);
echo "Başarılı: {$sonuc['basarili']}, Başarısız: {$sonuc['basarisiz']}\n";

// ═══════════════════════════════════════════════════════════
// 4) KREDİ SORGULAMA
// ═══════════════════════════════════════════════════════════

$kredi = $sms->krediSorgula();
if ($kredi['basarili']) {
    echo "Kalan SMS kredisi: " . $kredi['kredi'] . "\n";
}

// ═══════════════════════════════════════════════════════════
// 5) İLETİM RAPORU SORGULAMA
// ═══════════════════════════════════════════════════════════

$bulkId = '1234567890'; // Önceki gönderimden dönen bulk_id
$rapor = $sms->raporSorgula($bulkId);
if ($rapor['basarili']) {
    foreach ($rapor['raporlar'] as $r) {
        echo "{$r['telefon']}: {$r['durum']}\n";
    }
}

// ═══════════════════════════════════════════════════════════
// 6) BAŞLIK LİSTELEME
// ═══════════════════════════════════════════════════════════

$basliklar = $sms->baslikListele();
if ($basliklar['basarili']) {
    echo "Tanımlı başlıklar: " . implode(', ', $basliklar['basliklar']) . "\n";
}

// ═══════════════════════════════════════════════════════════
// 7) ZAMANLANMIŞ SMS İPTAL
// ═══════════════════════════════════════════════════════════

$iptal = $sms->smsIptal('1234567890');
echo $iptal['mesaj'] . "\n";

// ═══════════════════════════════════════════════════════════
// 8) DOSYA DURUM DEĞİŞİKLİĞİ OTOMATİK SMS
// ═══════════════════════════════════════════════════════════

$sonuc = $sms->durumDegisikligiSms(42, 'Başvuru Alındı', 'Eksper Atandı', $kullaniciId);
if ($sonuc && $sonuc['basarili']) {
    echo "Durum değişikliği SMS'i gönderildi.\n";
}

// ═══════════════════════════════════════════════════════════
// 9) VERİTABANISIZ KULLANIM (Manuel Ayar)
// ═══════════════════════════════════════════════════════════

$smsManuel = new NetgsmSms(null);
$smsManuel->kimlikAyarla('KULLANICI_KODU', 'SIFRE', 'BASLIK');
$sonuc = $smsManuel->gonder('05321234567', 'Manuel ayarla gönderim.');
