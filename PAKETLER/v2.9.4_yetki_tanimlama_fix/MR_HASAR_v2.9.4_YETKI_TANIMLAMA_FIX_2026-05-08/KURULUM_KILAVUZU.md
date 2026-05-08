# MR HASAR — v2.9.4 YETKİ TANIMLAMA UYUMSUZLUK FIX

**Tarih:** 2026-05-08

## SORUN
Yetki Yönetimi sayfasında yeni route'lar (v2.5 ile gelen) listelenmiyordu:
- `is-ortaklari`, `is-paydaslari`, `paydaslar-eksper-sigorta` (PAYDAŞLAR menüsü)
- `muhasebe-mahsup` (MUHASEBE menüsü)

Bu yetkiler tanımlı olmadığı için kullanıcılara verilemiyordu → menüde gözükmüyordu (admin hariç).

## DÜZELTME
`js/pages/sistem.js` MODUL_YETKILERI listesi güncellendi:

### PAYDAŞLAR modülüne 3 yeni işlem eklendi
- `is-ortaklari` → İŞ ORTAKLARI (PERSONEL + AVUKAT)
- `is-paydaslari` → İŞ PAYDAŞLARI (SERVİS/KAPORTACI/ACENTE/PASİF/DİĞER)
- `paydaslar-eksper-sigorta` → EKSPER & SİGORTA

Eski işlemler (ortaklar-ortaklar, ortaklar-paydaslar vb.) **geri uyumluluk için korundu**.

### MUHASEBE modülüne 1 yeni işlem eklendi
- `muhasebe-mahsup` → MAHSUP ZİNCİRİ

## YÜKLEME

| Kaynak | Hedef |
|---|---|
| `YUKLENECEK_DOSYALAR/js/pages/sistem.js` | `<root>/js/pages/sistem.js` |

**Hard reload** (Ctrl+Shift+R). SQL gerekmez.

## TEST
1. Sisteme admin olarak gir
2. SİSTEM > YETKİ YÖNETİMİ
3. Bir kullanıcı seç (örn. Gizem)
4. PAYDAŞLAR kategorisinde **3 yeni işlem** listelenmeli (İŞ ORTAKLARI, İŞ PAYDAŞLARI, EKSPER & SİGORTA)
5. MUHASEBE kategorisinde **MAHSUP ZİNCİRİ** listelenmeli
6. Bunları işaretle, kaydet
7. Gizem'e giriş yap → PAYDAŞLAR menüsü göründü mü?

## DOKUNULMAYAN
app.js, mesajlar.js, ihbar-foyu.js, muhasebe.js, helpers.php, dosya-yeni.js, dosya-detay.js, ortaklar.js, crm.js, webrtc-* — **hepsi aynı**.
