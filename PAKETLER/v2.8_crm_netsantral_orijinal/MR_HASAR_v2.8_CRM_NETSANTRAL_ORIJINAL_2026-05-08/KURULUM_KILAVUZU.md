# MR HASAR — v2.8.1 CRM + NETSANTRAL ORİJİNAL Yaması

**Tarih:** 2026-05-08 (düzeltme: netsantral klasörü kaldırıldı)
**Branch:** `claude/view-all-branches-qZ0JW`

---

## ÖNEMLİ — NETSANTRAL KLASÖRÜ HAKKINDA

**v2.1 sürümünden itibaren `/api/v1/netsantral/` klasörü KULLANILMIYOR.**

config.js'in 165. satırında açık yorum var:
> `// NETSANTRAL — Mevcut endpoint'leri kullanir, yeni klasor YOK`

Tüm Netsantral işleri başka endpoint'lere taşındı:
- **Çağrı eşleştirme** → `/api/v1/crm/list.php`
- **Çağrı notu** → `/api/v1/arama-log/update.php`
- **Timeline** → `/api/v1/crm/get.php`
- **Ayarlar** → `/api/v1/sistem/ayarlar-list.php` (`netsantral_*` prefix'li anahtarlar)

Yani sunucuda `/api/v1/netsantral/` klasörü **olmaması NORMAL ve DOĞRU**. Klasör oluşturmana gerek YOK.

---

## DOSYA LİSTESİ (31 dosya)

### Frontend (6 dosya)
| Dosya | Boyut | Kaynak |
|---|---|---|
| `js/pages/crm.js` | 90040 B | v2.1 GUVENLIK (29 Nisan) |
| `js/pages/crm-arama.js` | 80965 B | v2.1 GUVENLIK |
| `js/pages/arama-gecmis.js` | 42170 B | v2.1 GUVENLIK |
| `js/pages/gorusme-kayitlari.js` | 18936 B | v2.1 GUVENLIK |
| `js/webrtc-phone.js` | 46007 B | **v2.1.1 ÇAĞRI SES** |
| `js/webrtc-widget.js` | 45187 B | **v2.1.1 ÇAĞRI SES** ⭐ kritik |

### Backend — CRM (10 dosya)
`api/v1/crm/`: list, get, create, update, delete, bulk-delete, donustur, dosya-yukle, not-ekle, unified-get

### Backend — Arama Log (8 dosya)
`api/v1/arama-log/`: list, create, update, delete, istatistik, kayit-yukle, kayit-indir, setup

### Backend — Yönlendirme (8 dosya)
`api/v1/yonlendirme/`: list, get, create, update, delete, import, toplu-islem, not-ekle

> **NOT:** `/api/v1/netsantral/` klasörü pakete dahil DEĞİL — bilinçli olarak kaldırıldı (yukarıdaki açıklamaya göre).

---

## YÜKLEME

1. `YUKLENECEK_DOSYALAR/` içindeki dosyaları sunucuya kopyala (klasör yapısını koruyarak)
2. **Hard reload** (Ctrl+Shift+R)
3. SQL gerekmiyor

### En kritik dosya
**`js/webrtc-widget.js`** (v2.1.1 orijinal) — bu dosya bizim son müdahalelerimizin geri alınmasını sağlar. Diğer 30 dosya muhtemelen sunucuda zaten var, üzerine yazsa da bozmaz (sigorta gibi).

---

## ROLLBACK
Yedeklediğin sürümleri geri yükle.

---

**Hazırlayan:** Claude (Onur Şenol için)
**Önemli:** Bu paket **yalnızca orijinal v2.1 + v2.1.1 sürümlerini** içerir. Hiçbir kafadan değişiklik yok.
