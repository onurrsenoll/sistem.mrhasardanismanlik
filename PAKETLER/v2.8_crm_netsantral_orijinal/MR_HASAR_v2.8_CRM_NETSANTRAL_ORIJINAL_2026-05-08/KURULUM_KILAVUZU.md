# MR HASAR — v2.8 CRM + NETSANTRAL ORİJİNAL Yaması

**Tarih:** 2026-05-08
**Branch:** `claude/view-all-branches-qZ0JW`
**Amaç:** CRM ve NETSANTRAL sistemini **önceki sağlıklı çalışır haline** geri döndür.

---

## NE İÇERİYOR

Bu paket, CRM ve NETSANTRAL ile ilgili **tüm dosyaların ORİJİNAL sürümlerini** içerir. **Hiçbir kafadan değişiklik YOKTUR.** Sadece:
- v2.1 GUVENLIK (29 Nisan 08:53) — CRM frontend + CRM/arama-log/yonlendirme backend
- v2.1.1 ÇAĞRI SES (29 Nisan 09:27) — webrtc-phone + webrtc-widget (en yeni orijinal)
- api.zip (Şubat 2026) — Netsantral backend (proxy/webhook/test-webhook/bekleyen/arama-list/arama-log)

## DOSYA LİSTESİ (37 dosya)

### Frontend (6 dosya)
| Dosya | Boyut | Kaynak |
|---|---|---|
| `js/pages/crm.js` | 90040 B | v2.1 GUVENLIK |
| `js/pages/crm-arama.js` | 80965 B | v2.1 GUVENLIK |
| `js/pages/arama-gecmis.js` | 42170 B | v2.1 GUVENLIK |
| `js/pages/gorusme-kayitlari.js` | 18936 B | v2.1 GUVENLIK |
| `js/webrtc-phone.js` | 46007 B | **v2.1.1 ÇAĞRI SES** |
| `js/webrtc-widget.js` | 45187 B | **v2.1.1 ÇAĞRI SES** |

### Backend — CRM (10 dosya)
`api/v1/crm/`: list, get, create, update, delete, bulk-delete, donustur, dosya-yukle, not-ekle, unified-get

### Backend — Arama Log (8 dosya)
`api/v1/arama-log/`: list, create, update, delete, istatistik, kayit-yukle, kayit-indir, setup

### Backend — Yönlendirme (8 dosya)
`api/v1/yonlendirme/`: list, get, create, update, delete, import, toplu-islem, not-ekle

### Backend — Netsantral (6 dosya)
`api/v1/netsantral/`: arama-list, arama-log, bekleyen, proxy, webhook, test-webhook

---

## STATİK TEST ✅
- 32/32 PHP dosyası `php -l` syntax check geçti
- 6/6 JS/JSX dosyası `@babel/parser` parse geçti

---

## YÜKLEME

**Yedekleme önerilir** (kendi sürümünü korumak için).
Sonra `YUKLENECEK_DOSYALAR/` içindeki tüm dosyaları sunucuya kopyala (klasör yapısını koru).

**Hard reload** (Ctrl+Shift+R).

**SQL gerekmiyor.**

---

## DAVRANIŞ — OLMASI GEREKEN ŞEKİL

### CRM — kişi kartı akışı
- Listeden tıklanır → kişi kartına geçilir
- Sol panelde çağrı kontrolü (callActive)
- Görüşme esnasında not alınır
- Bitince kaydet → kişi kartında saklanır

### NETSANTRAL — gelen çağrı widget
- Sağ üstte popup açılır (sadece **gelen** arama)
- REDDET / SESSİZ / CEVAPLA butonları
- CEVAPLA → `setPage('crm-yeni')` → kişi kartına geçer + widget kapanır
- Yetki: admin doğrudan görür; diğer roller için **SİSTEM > YETKİ YÖNETİMİ**'nden `netsantral_*` veya `cagri_*` izin ver

### NETSANTRAL — giden arama
- Kişi kartından "ARA" butonu → arama başlar
- Görüşme UI'ı sol panelde (callActive)
- **Widget AÇILMAZ** (giden arama için yok)

---

## ROLLBACK

Yedeklediğin sürümleri geri yükle. SQL değişikliği yok — geri alma gerekmez.

---

**Hazırlayan:** Claude (Onur Şenol için)
**Önemli:** Bu paket **yalnızca orijinal sürümleri içerir**. Ben hiçbir özelleştirme/iyileştirme/varsayım eklemedim.
