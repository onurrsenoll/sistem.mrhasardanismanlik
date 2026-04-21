/**
 * ═══════════════════════════════════════════════════════════════
 *   İHBAR FÖYÜ + HASAR PARÇA LİSTESİ YÖNETİMİ — POLİÇE MODÜLÜ
 * ═══════════════════════════════════════════════════════════════
 *
 * Tam entegre React bileşeni. Sistem temasıyla (koyu/açık) uyumlu.
 *
 * Özellikler:
 *  - 2 SEKME: İhbar Föyü formu + Parça Listesi
 *  - Araç, sahip, dosya, eksper, servis, kaza bilgileri
 *  - Evrak/işlem kontrol listesi
 *  - Parça tablo: ekle/sil, KDV %20 dahil/hariç, işçilik bedeli
 *  - Excel import/export (XLSX kütüphanesi)
 *  - Şablon Excel indirme
 *  - Metin yapıştır ile hızlı doldurma
 *  - JSON dosyası yükleme
 *  - Ruhsat OCR (Claude AI + Tesseract — qr-ruhsat.js ile AYNI)
 *  - Dosya arama (localStorage CRUD)
 *  - Yazdır (print) + PDF
 *
 * Yetki: 'police' modülü / 'police-ihbar-foyu' anahtarı.
 */

const { useState, useEffect, useRef, useMemo } = React;

MR.IhbarFoyuPage = ({ setPage, user }) => {
  const { C, S, LIcon, Badge, FormGroup, Modal, Confirm, api } = MR;
  const isKoyu = MR.tema === 'koyu';
  const hy = (k) => MR.hasYetki ? MR.hasYetki(user, 'police', k) : true;

  /* ═══ FORM STATE ═══ */
  const bosForm = {
    // Araç ve sahip
    plaka: '', marka: '', sasi: '', kilometre: '',
    sahip_ad: '', sahip_tel: '', iban: '',
    // Dosya
    sigorta: '', dosya_no: '', dosya_turu: 'KASKO', police_no: '',
    // Eksper & servis
    eksper_adi: '', eksper_iletisim: '',
    servis_adi: '', servis_yetkili: '', servis_tel: '',
    // Kaza
    kaza_tarihi: '', kaza_yeri: '', kaza_aciklama: '',
    // Evrak kontrol
    evrak_ehliyet: false, evrak_ruhsat: false, evrak_police: false,
    evrak_ktt: false, evrak_iban: false, evrak_kilometre: false,
    evrak_olay: false, evrak_hasar: false, evrak_parca: false,
    evrak_ekspertiz: false, evrak_fatura: false, evrak_vekaletname: false,
    // İşlem durumu
    islem_ihbar: false, islem_evrak: false, islem_ekspertiz: false,
    islem_basladi: false, islem_bitti: false, islem_odeme: false,
    islem_deger: false, islem_kapandi: false,
    // Notlar
    notlar: ''
  };

  const [form, setForm] = useState({ ...bosForm });
  const up = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const upCheck = (k) => setForm(p => ({ ...p, [k]: !p[k] }));

  /* ═══ PARÇA LİSTESİ STATE ═══ */
  const [partsList, setPartsList] = useState([]);
  const [newPart, setNewPart] = useState({ name: '', oem: '', original: '', quantity: 1 });
  const [kdvDahil, setKdvDahil] = useState(false);
  const [iscilik, setIscilik] = useState(0);

  /* ═══ SEKME ═══ */
  const [sekme, setSekme] = useState('dosya'); // 'dosya' veya 'parca'

  /* ═══ MODAL STATE ═══ */
  const [aramaModal, setAramaModal] = useState(false);
  const [onizlemeModal, setOnizlemeModal] = useState(false);
  const [yapistirModal, setYapistirModal] = useState(false);
  const [temizleConfirm, setTemizleConfirm] = useState(false);
  const [tempParca, setTempParca] = useState([]);

  /* ═══ OCR STATE ═══ */
  const [ocrLoading, setOcrLoading] = useState(null); // null | {msg, progress}
  const ruhsatInputRef = useRef(null);
  const parcaListInputRef = useRef(null);
  const excelInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  /* ═══ SİSTEM İÇİ BİLDİRİM (toast yerine zengin kart) ═══
   * Tipler: 'success' | 'error' | 'warning' | 'info'
   * Kullanım: bildirimGoster('success', 'Başlık', 'Detay metin veya çok satırlı');
   *           bildirimGoster('success', 'Ruhsat Okundu', [{l:'PLAKA', v:'34ABC'}, ...]);
   */
  const [bildirim, setBildirim] = useState(null);
  const bildirimTimerRef = useRef(null);

  const bildirimGoster = (tip, baslik, detay = '', sure = 5000) => {
    setBildirim({ tip, baslik, detay, ts: Date.now() });
    if (bildirimTimerRef.current) clearTimeout(bildirimTimerRef.current);
    if (sure > 0) {
      bildirimTimerRef.current = setTimeout(() => setBildirim(null), sure);
    }
  };
  const bildirimKapat = () => {
    if (bildirimTimerRef.current) clearTimeout(bildirimTimerRef.current);
    setBildirim(null);
  };
  /* Kısa yardımcılar */
  const notifOk = (b, d, s) => bildirimGoster('success', b, d, s);
  const notifErr = (b, d, s) => bildirimGoster('error', b, d, s);
  const notifWarn = (b, d, s) => bildirimGoster('warning', b, d, s);
  const notifInfo = (b, d, s) => bildirimGoster('info', b, d, s);

  /* ═══ LOCALSTORAGE KEYS ═══ */
  const LS_PARCA = 'hasarParcaListesi';
  const LS_DOSYALAR = 'hasar_dosyalar';

  /* Sayfa yüklenince localStorage'dan parça listesi yükle + animasyon CSS'i */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_PARCA);
      if (stored) setPartsList(JSON.parse(stored) || []);
    } catch (e) { /* sessiz geç */ }
    /* Toast animasyonu CSS'i (sadece 1 kez) */
    if (!document.getElementById('ihbar-foyu-anim-css')) {
      const s = document.createElement('style');
      s.id = 'ihbar-foyu-anim-css';
      s.textContent = '@keyframes slideInRight{from{transform:translateX(400px);opacity:0}to{transform:translateX(0);opacity:1}}';
      document.head.appendChild(s);
    }
  }, []);

  /* Parça listesi değişince sessiz kaydet */
  useEffect(() => {
    try { localStorage.setItem(LS_PARCA, JSON.stringify(partsList)); } catch (e) {}
  }, [partsList]);

  /* ═══ TOPLAMLAR ═══ */
  const toplamlar = useMemo(() => {
    const totalParca = partsList.reduce((s, p) => s + (Number(p.original) || 0) * (Number(p.quantity) || 1), 0);
    const totalKDV = totalParca * 0.20;
    const totalParcaKDV = totalParca + totalKDV;
    const iscilikNum = Number(iscilik) || 0;
    const genelToplam = (kdvDahil ? totalParcaKDV : totalParca) + iscilikNum;
    return { totalParca, totalKDV, totalParcaKDV, iscilik: iscilikNum, genelToplam };
  }, [partsList, kdvDahil, iscilik]);

  /* ═══ STİLLER (sistem temasına uyumlu) ═══ */
  const sectionStyle = {
    marginBottom: 16, padding: '14px 16px',
    background: isKoyu ? 'rgba(15,35,66,0.3)' : '#f8fafc',
    borderRadius: 10,
    border: `1px solid ${isKoyu ? 'rgba(6,182,212,0.15)' : '#e2e8f0'}`,
    borderLeft: `4px solid ${C.accent}`
  };
  const sectionTitleStyle = {
    fontSize: 12, fontWeight: 800, color: C.accent,
    marginBottom: 10, display: 'flex', alignItems: 'center',
    gap: 6, letterSpacing: 0.3, textTransform: 'uppercase'
  };
  const inputStyle = { ...S.input, fontSize: 12, padding: '8px 10px' };
  const labelStyle = { fontSize: 10, fontWeight: 700, color: C.textSec, marginBottom: 4, display: 'block', letterSpacing: 0.3, textTransform: 'uppercase' };

  /* ═══ PARÇA LİSTESİ FONKSİYONLARI ═══ */
  const addPart = () => {
    const name = (newPart.name || '').trim();
    const original = parseFloat(newPart.original) || 0;
    const quantity = parseInt(newPart.quantity) || 1;
    if (!name) { notifWarn('PARÇA ADI ZORUNLU'); return; }
    if (original <= 0) { notifWarn('GEÇERLİ FİYAT GİRİN'); return; }
    setPartsList(prev => [...prev, { name, oem: (newPart.oem || '').trim(), original, quantity }]);
    setNewPart({ name: '', oem: '', original: '', quantity: 1 });
  };
  const deletePart = (idx) => {
    if (confirm('Bu parçayı silmek istediğinize emin misiniz?')) {
      setPartsList(prev => prev.filter((_, i) => i !== idx));
    }
  };

  /* ═══ ŞABLON İNDİR ═══ */
  const downloadTemplate = () => {
    if (!window.XLSX) { notifErr('XLSX YÜKLENEMEDİ','Sayfayı yenileyin.'); return; }
    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();
    const ws_data = [
      ['PARÇA LİSTESİ ŞABLONU — MR HASAR DANIŞMANLIK'],
      ['Bu şablonu doldurup sisteme yükleyebilirsiniz'],
      [],
      ['Parça Adı', 'OEM Kodu', 'Orijinal Fiyat (TL)', 'Miktar'],
      ['Ön Far Komple LED', '12345-ABC', 22000, 1],
      ['Far Taşıyıcı Braketi', '67890-DEF', 3000, 1],
      ['Ön Çamurluk', '', 5200, 1],
      [],
      ['NOTLAR:'],
      ['- Parça Adı: Zorunlu alan'],
      ['- OEM Kodu: Opsiyonel'],
      ['- Orijinal Fiyat: Zorunlu (KDV hariç)'],
      ['- Miktar: Varsayılan 1'],
      [],
      ['KDV (%20) otomatik hesaplanır.']
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 18 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Parça Listesi');
    XLSX.writeFile(wb, 'Parca_Listesi_Sablonu.xlsx');
  };

  /* ═══ EXCEL'DEN PARÇA IMPORT ═══ */
  const handleExcelImport = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!window.XLSX) { notifErr('XLSX YÜKLENEMEDİ','Sayfayı yenileyin.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = window.XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1 });
        // "Parça Adı" içeren başlık satırı bul
        let headerIdx = -1;
        for (let i = 0; i < rows.length; i++) {
          const cell = rows[i]?.[0]?.toString().toLowerCase() || '';
          if (cell.includes('parça') || cell.includes('parca')) { headerIdx = i; break; }
        }
        if (headerIdx === -1) { notifWarn('EXCEL BAŞLIĞI YOK','"Parça Adı" sütun başlığı bulunamadı.'); return; }
        const imported = [];
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0]) continue;
          const firstCell = row[0].toString().toUpperCase();
          if (['NOT', 'TOPLAM', 'KDV'].some(t => firstCell.includes(t))) continue;
          const name = row[0]?.toString().trim();
          const oem = row[1]?.toString().trim() || '';
          const original = parseFloat(row[2]) || 0;
          const quantity = parseInt(row[3]) > 0 ? parseInt(row[3]) : 1;
          if (name && original > 0) imported.push({ name, oem, original, quantity });
        }
        if (imported.length === 0) { notifWarn('GEÇERLİ PARÇA YOK','Excel içinde parça bulunamadı.'); return; }
        if (partsList.length > 0 &&
            !confirm(`Mevcut ${partsList.length} parça silinecek ve ${imported.length} yeni parça eklenecek. Devam?`)) return;
        setPartsList(imported);
        setSekme('parca');
        notifOk('PARÇALAR AKTARILDI', String(imported.length)+' parça eklendi');
      } catch (err) {
        notifErr('EXCEL HATASI', err.message);
      }
      if (e.target) e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  /* ═══ JSON DOSYASI IMPORT ═══ */
  const handleJsonImport = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        // ID mapping: eski isimler → yeni form key'leri
        const map = {
          plaka: 'plaka', marka: 'marka', sasi: 'sasi', kilometre: 'kilometre',
          sahip_ad: 'sahip_ad', ruhsat_sahibi: 'sahip_ad',
          sahip_tel: 'sahip_tel', tc_vergi: 'sahip_tel',
          iban: 'iban',
          sigorta: 'sigorta', sigorta_sirketi: 'sigorta',
          dosya_no: 'dosya_no', dosya_turu: 'dosya_turu',
          hasar_tarihi: 'kaza_tarihi', kaza_tarihi: 'kaza_tarihi',
          police_no: 'police_no',
          eksper_adi: 'eksper_adi', eksper_ofis: 'eksper_adi',
          eksper_iletisim: 'eksper_iletisim',
          servis_adi: 'servis_adi', servis_yetkili: 'servis_yetkili',
          servis_tel: 'servis_tel', servis_telefon: 'servis_tel',
          kaza_yeri: 'kaza_yeri', kaza_aciklama: 'kaza_aciklama',
          notlar: 'notlar'
        };
        const yeni = { ...bosForm };
        Object.keys(map).forEach(k => {
          if (data[k] !== undefined && data[k] !== null) yeni[map[k]] = String(data[k]);
        });
        setForm(yeni);
        if (data.partsList && Array.isArray(data.partsList)) {
          setPartsList(data.partsList.map(p => ({
            name: p.name || '',
            oem: p.oem || '',
            original: Number(p.original) || 0,
            quantity: Number(p.quantity) || 1
          })));
        }
        if (data.laborCost !== undefined || data.iscilik !== undefined) {
          setIscilik(Number(data.laborCost || data.iscilik) || 0);
        }
        if (typeof data.includeKDV !== 'undefined' || typeof data.kdvDahil !== 'undefined') {
          setKdvDahil(Boolean(data.includeKDV || data.kdvDahil));
        }
        notifOk('JSON YÜKLENDİ', [
          { l: 'PLAKA', v: data.plaka || '-' },
          { l: 'SAHİBİ', v: data.ruhsat_sahibi || data.sahip_ad || '-' },
          { l: 'PARÇA SAYISI', v: String((data.partsList || []).length) }
        ]);
      } catch (err) {
        notifErr('JSON OKUMA HATASI', err.message);
      }
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  /* ═══ METİN YAPIŞTIR — HIZLI DOLDUR ═══ */
  const [yapistirText, setYapistirText] = useState('');
  const processYapistir = () => {
    const text = (yapistirText || '').trim();
    if (!text) { notifWarn('METİN GİRİN'); return; }
    // Alan eşleştirme haritası
    const fieldMap = {
      'PLAKA': 'plaka', 'MARKA': 'marka', 'MARKA_MODEL': 'marka',
      'SASI': 'sasi', 'ŞASİ': 'sasi', 'SASE': 'sasi',
      'KILOMETRE': 'kilometre', 'KM': 'kilometre',
      'RUHSAT_SAHIBI': 'sahip_ad', 'RUHSAT SAHİBİ': 'sahip_ad', 'SAHIP': 'sahip_ad', 'SAHİBİ': 'sahip_ad', 'AD': 'sahip_ad', 'AD_SOYAD': 'sahip_ad',
      'TC_VERGI': 'sahip_tel', 'TC': 'sahip_tel', 'TELEFON': 'sahip_tel', 'TEL': 'sahip_tel',
      'IBAN': 'iban',
      'SIGORTA': 'sigorta', 'SİGORTA': 'sigorta',
      'DOSYA_NO': 'dosya_no', 'DOSYA NO': 'dosya_no',
      'DOSYA_TURU': 'dosya_turu', 'DOSYA TÜRÜ': 'dosya_turu',
      'POLICE_NO': 'police_no', 'POLİÇE': 'police_no', 'POLICE': 'police_no',
      'EKSPER': 'eksper_adi', 'EKSPER_ADI': 'eksper_adi', 'EKSPER_OFIS': 'eksper_adi',
      'EKSPER_ILETISIM': 'eksper_iletisim', 'EKSPER TEL': 'eksper_iletisim',
      'SERVIS': 'servis_adi', 'SERVİS': 'servis_adi', 'SERVIS_ADI': 'servis_adi',
      'SERVIS_YETKILI': 'servis_yetkili', 'SERVİS_YETKİLİ': 'servis_yetkili',
      'SERVIS_TEL': 'servis_tel', 'SERVİS_TEL': 'servis_tel', 'SERVIS_ADRES': 'servis_tel',
      'KAZA_TARIHI': 'kaza_tarihi', 'KAZA TARİHİ': 'kaza_tarihi', 'HASAR_TARIHI': 'kaza_tarihi',
      'KAZA_YERI': 'kaza_yeri', 'KAZA YERİ': 'kaza_yeri',
      'KAZA_ACIKLAMA': 'kaza_aciklama', 'KAZA AÇIKLAMA': 'kaza_aciklama',
      'NOTLAR': 'notlar', 'NOT': 'notlar',
      'ISCILIK': 'iscilikBedeli', 'İŞÇİLİK': 'iscilikBedeli'
    };
    const yeniForm = { ...form };
    const yeniParcalar = [];
    const lines = text.split('\n');
    let inParcalar = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.includes('---PARCALAR---') || trimmed.includes('---PARÇALAR---')) {
        inParcalar = true;
        continue;
      }
      if (inParcalar) {
        const parts = trimmed.split(',');
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const price = parseFloat(parts[1].replace(/[^\d.]/g, '')) || 0;
          const qty = parts[2] ? parseInt(parts[2]) || 1 : 1;
          if (name && price > 0) {
            yeniParcalar.push({ name: name.toUpperCase(), oem: '', original: price, quantity: qty });
          }
        }
      } else {
        const idx = trimmed.indexOf(':');
        if (idx > 0) {
          const key = trimmed.substring(0, idx).trim().toUpperCase();
          const val = trimmed.substring(idx + 1).trim();
          const fid = fieldMap[key];
          if (fid === 'iscilikBedeli') {
            setIscilik(parseFloat(val.replace(/[^\d.]/g, '')) || 0);
          } else if (fid) {
            yeniForm[fid] = val;
          }
        }
      }
    }
    setForm(yeniForm);
    if (yeniParcalar.length > 0) setPartsList(yeniParcalar);
    setYapistirModal(false);
    setYapistirText('');
    notifOk('VERİLER YÜKLENDİ', [
      { l: 'PLAKA', v: yeniForm.plaka || '-' },
      { l: 'SAHİP', v: yeniForm.sahip_ad || '-' },
      { l: 'PARÇA SAYISI', v: String(yeniParcalar.length) }
    ]);
  };

  /* ═══ RUHSAT OCR — qr-ruhsat.js ile BİREBİR AYNI SİSTEM ═══
   * Strateji: (1) Claude Vision API birincil → (2) Tesseract OCR yedek.
   * qr-ruhsat.js içindeki MR._ruhsatOcr global objesi kullanılır — tek kaynak, tek kod.
   */
  const handleRuhsatUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { notifErr('DOSYA ÇOK BÜYÜK','Maksimum 10MB olmalı.'); if (e.target) e.target.value=''; return; }
    const ocr = MR._ruhsatOcr;
    if (!ocr || !ocr.runClaudeOcr) {
      notifErr('OCR MODÜLÜ YÜKLENEMEDİ','Sayfayı yenileyin.');
      if (e.target) e.target.value = '';
      return;
    }

    setOcrLoading({ msg: 'RUHSAT OKUNUYOR', detail: 'Claude AI ile analiz...', progress: 0.1 });
    try {
      /* 1) BIRINCIL: Claude Vision API */
      const claudeRes = await ocr.runClaudeOcr(file, (p) => {
        setOcrLoading(s => s ? { ...s, detail: `Claude AI: %${Math.round(p*100)}`, progress: p * 0.5 } : null);
      });

      let data = null;
      if (claudeRes && claudeRes.success) {
        data = claudeRes;
      } else {
        /* 2) YEDEK: Tesseract OCR */
        setOcrLoading(s => s ? { ...s, detail: 'Claude başarısız, Tesseract deneniyor...', progress: 0.5 } : null);
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
        const tessRes = await ocr.runEnhancedOcrOnImage(img, (p) => {
          setOcrLoading(s => s ? { ...s, detail: `Tesseract: %${Math.round(p*100)}`, progress: 0.5 + p * 0.5 } : null);
        });
        URL.revokeObjectURL(img.src);
        if (tessRes) data = tessRes;
      }

      if (data && (data.plaka || data.marka || data.sase)) {
        /* Forma otomatik yazım */
        const yeni = { ...form };
        if (data.plaka) yeni.plaka = data.plaka.toUpperCase();
        if (data.marka) {
          let markaStr = data.marka.toUpperCase();
          if (data.model) markaStr += ' ' + data.model.toUpperCase();
          if (data.modelYili) markaStr += ' (' + data.modelYili + ')';
          yeni.marka = markaStr.trim();
        }
        if (data.sase) yeni.sasi = data.sase.toUpperCase();
        if (data.ad || data.soyad) {
          yeni.sahip_ad = ((data.ad || '') + ' ' + (data.soyad || '')).trim().toUpperCase();
        }
        if (data.tc) yeni.sahip_tel = data.tc;
        setForm(yeni);

        setOcrLoading(null);
        const kaynak = data.source === 'claude' ? 'CLAUDE AI' : 'TESSERACT OCR';
        notifOk(`RUHSAT OKUNDU (${kaynak})`, [
          { l: 'PLAKA', v: data.plaka || '-' },
          { l: 'MARKA', v: (data.marka || '') + ' ' + (data.model || '') },
          { l: 'ŞASİ', v: data.sase || '-' },
          { l: 'AD SOYAD', v: ((data.ad || '') + ' ' + (data.soyad || '')).trim() || '-' },
          { l: 'TC', v: data.tc || '-' }
        ], 7000);
      } else {
        setOcrLoading(null);
        notifWarn('RUHSAT OKUNAMADI', 'Lütfen manuel girin veya daha net bir fotoğraf deneyin.');
      }
    } catch (err) {
      console.error('Ruhsat OCR hatası:', err);
      setOcrLoading(null);
      notifErr('RUHSAT HATASI', err.message);
    }
    if (e.target) e.target.value = '';
  };

  /* ═══ PARÇA LİSTESİ OCR ═══
   * Servisin gönderdiği parça listesi fotoğrafı/PDF için Tesseract + regex.
   * Basit yaklaşım: satırları oku, "parça adı + fiyat" deseniyle parse et.
   */
  const handleParcaListesiUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { notifErr('DOSYA ÇOK BÜYÜK','Maksimum 10MB olmalı.'); if (e.target) e.target.value=''; return; }
    if (typeof Tesseract === 'undefined') {
      notifErr('TESSERACT YÜKLENEMEDİ','Sayfayı yenileyin.');
      if (e.target) e.target.value = '';
      return;
    }

    setOcrLoading({ msg: 'PARÇA LİSTESİ OKUNUYOR', detail: 'Hazırlanıyor...', progress: 0.05 });
    try {
      const worker = await Tesseract.createWorker('tur', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrLoading(s => s ? { ...s, detail: `OCR: %${Math.round(m.progress*100)}`, progress: m.progress } : null);
          }
        }
      });
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      /* Satır satır parse: fiyat + parça adı */
      const parcalar = [];
      const lines = (text || '').split('\n');
      const fiyatRegex = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:TL|₺|tl)?/g;
      for (const line of lines) {
        const t = line.trim();
        if (!t || t.length < 3) continue;
        const matches = [...t.matchAll(fiyatRegex)];
        if (matches.length === 0) continue;
        // En büyük sayıyı fiyat olarak al
        const fiyatlar = matches.map(m => {
          const s = m[1].replace(/\./g, '').replace(',', '.');
          return parseFloat(s) || 0;
        });
        const fiyat = Math.max(...fiyatlar);
        if (fiyat <= 0) continue;
        // Parça adı = satırdan fiyatları ve numaralı prefix'leri çıkar
        let ad = t.replace(fiyatRegex, '').replace(/^\d+[\.\)]\s*/, '').replace(/\s+/g, ' ').trim();
        if (ad.length >= 3) {
          parcalar.push({ name: ad.toUpperCase(), oem: '', original: fiyat, quantity: 1 });
        }
      }

      setOcrLoading(null);
      if (parcalar.length > 0) {
        setTempParca(parcalar);
        setOnizlemeModal(true);
      } else {
        notifWarn('PARÇA BULUNAMADI','İPUCU: Matbaa çıktısı daha iyi sonuç verir. El yazısı zor okunabilir.');
      }
    } catch (err) {
      console.error('Parça OCR hatası:', err);
      setOcrLoading(null);
      notifErr('PARÇA OCR HATASI', err.message);
    }
    if (e.target) e.target.value = '';
  };

  const confirmParcalar = () => {
    if (!tempParca || tempParca.length === 0) return;
    setPartsList(prev => [...prev, ...tempParca]);
    setOnizlemeModal(false);
    setTempParca([]);
    setSekme('parca');
  };

  /* ═══ DOSYA KAYDET/YÜKLE/SİL (localStorage CRUD) ═══ */
  const [aramaText, setAramaText] = useState('');
  const [kaydedilenler, setKaydedilenler] = useState([]);

  const readKaydedilenler = () => {
    try {
      const raw = localStorage.getItem(LS_DOSYALAR);
      return raw ? (JSON.parse(raw) || []) : [];
    } catch (e) { return []; }
  };
  const writeKaydedilenler = (list) => {
    try { localStorage.setItem(LS_DOSYALAR, JSON.stringify(list)); } catch (e) {}
  };

  /* Modal açıldığında kayıtları oku */
  useEffect(() => {
    if (aramaModal) setKaydedilenler(readKaydedilenler());
  }, [aramaModal]);

  const filtrelenenKayitlar = useMemo(() => {
    const q = (aramaText || '').toLowerCase().trim();
    let arr = kaydedilenler.slice();
    if (q) arr = arr.filter(f =>
      (f.plaka || '').toLowerCase().includes(q) ||
      (f.sahipAd || '').toLowerCase().includes(q)
    );
    arr.sort((a, b) => parseInt(b.id) - parseInt(a.id));
    return arr;
  }, [kaydedilenler, aramaText]);

  const dosyaKaydet = () => {
    const plaka = (form.plaka || '').trim();
    const sahipAd = (form.sahip_ad || '').trim();
    if (!plaka) { notifWarn('PLAKA ZORUNLU'); return; }
    if (!sahipAd) { notifWarn('ARAÇ SAHİBİ ADI ZORUNLU'); return; }

    const fileObj = {
      id: Date.now().toString(),
      plaka,
      sahipAd,
      kayitTarihi: new Date().toLocaleString('tr-TR'),
      formData: { ...form },
      parcaListesi: JSON.parse(JSON.stringify(partsList)),
      iscilik: Number(iscilik) || 0,
      kdvDahil: kdvDahil
    };

    let files = readKaydedilenler();
    const exIdx = files.findIndex(f => f.plaka === plaka);
    if (exIdx !== -1) {
      if (!confirm(`${plaka} plakalı dosya zaten kayıtlı. Üzerine yazmak istiyor musunuz?`)) return;
      files[exIdx] = fileObj;
    } else {
      files.push(fileObj);
    }
    try {
      writeKaydedilenler(files);
      notifOk('DOSYA KAYDEDİLDİ', sahipAd + ' — ' + plaka);
      setKaydedilenler(files);
    } catch (e) {
      notifErr('KAYIT BAŞARISIZ','LocalStorage dolu olabilir.');
    }
  };

  const dosyaYukle = (id) => {
    const file = kaydedilenler.find(f => f.id === id);
    if (!file) { notifErr('DOSYA BULUNAMADI'); return; }
    if (!confirm(`${file.sahipAd} — ${file.plaka}\n\nBu dosyayı yüklemek istediğinize emin misiniz?\nMevcut form ve parça listesi silinecek!`)) return;
    setForm({ ...bosForm, ...(file.formData || {}) });
    setPartsList((file.parcaListesi || []).map(p => ({
      name: p.name || '',
      oem: p.oem || '',
      original: Number(p.original) || 0,
      quantity: Number(p.quantity) || 1
    })));
    setIscilik(Number(file.iscilik) || 0);
    setKdvDahil(Boolean(file.kdvDahil));
    setAramaModal(false);
    setSekme('dosya');
    notifOk('DOSYA YÜKLENDİ', file.sahipAd + ' — ' + file.plaka);
  };

  const dosyaSil = (id) => {
    const file = kaydedilenler.find(f => f.id === id);
    if (!file) return;
    if (!confirm(`${file.sahipAd} — ${file.plaka}\n\nBu dosyayı silmek istediğinize emin misiniz?`)) return;
    const yeni = kaydedilenler.filter(f => f.id !== id);
    writeKaydedilenler(yeni);
    setKaydedilenler(yeni);
  };

  /* ═══ EXCEL EXPORT — KOMPLE (İHBAR FÖYÜ + PARÇA LİSTESİ) ═══
   * NOT: Eski "muadil" alanı kaldırıldı — artık KDV, KDV Dahil, İşçilik gösteriliyor.
   */
  const getCheckedLabels = (prefix, labelMap) =>
    Object.keys(form).filter(k => k.startsWith(prefix + '_') && form[k])
      .map(k => labelMap[k] || k).join(', ') || 'Yok';

  const EVRAK_LABELS = {
    evrak_ehliyet: 'Ehliyet', evrak_ruhsat: 'Ruhsat', evrak_police: 'Poliçe',
    evrak_ktt: 'KTT', evrak_iban: 'IBAN', evrak_kilometre: 'Kilometre',
    evrak_olay: 'Olay Yeri Foto', evrak_hasar: 'Hasar Foto',
    evrak_parca: 'Parça Listesi', evrak_ekspertiz: 'Ekspertiz Raporu',
    evrak_fatura: 'Onarım Faturası', evrak_vekaletname: 'Vekaletname'
  };
  const ISLEM_LABELS = {
    islem_ihbar: 'İhbar Yapıldı', islem_evrak: 'Evrak Gönderildi',
    islem_ekspertiz: 'Ekspertiz Yapıldı', islem_basladi: 'Onarım Başladı',
    islem_bitti: 'Onarım Bitti', islem_odeme: 'Ödeme Alındı',
    islem_deger: 'Değer Kaybı Açıldı', islem_kapandi: 'Dosya Kapatıldı'
  };

  const exportKompleExcel = () => {
    if (!window.XLSX) { notifErr('XLSX YÜKLENEMEDİ'); return; }
    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();

    /* SAYFA 1: İHBAR FÖYÜ */
    const ws1_data = [
      ['MOTOSIKLET / ARAÇ HASAR İHBAR FÖYÜ'],
      ['MR Hasar Danışmanlık ve Filo Yönetimi'],
      [],
      ['ARAÇ VE SAHİP BİLGİLERİ'],
      ['Plaka:', form.plaka, 'Marka / Model:', form.marka],
      ['Şasi No:', form.sasi, 'Kilometre:', form.kilometre],
      ['Ruhsat Sahibi:', form.sahip_ad, 'TC / Telefon:', form.sahip_tel],
      ['IBAN:', form.iban],
      [],
      ['DOSYA BİLGİLERİ'],
      ['Sigorta Şirketi:', form.sigorta, 'Dosya No:', form.dosya_no],
      ['Dosya Türü:', form.dosya_turu, 'Poliçe No:', form.police_no],
      [],
      ['EKSPER VE SERVİS BİLGİLERİ'],
      ['Eksper Ofisi & Adı:', form.eksper_adi, 'İletişim:', form.eksper_iletisim],
      ['Servis Adı:', form.servis_adi, 'Yetkili:', form.servis_yetkili],
      ['Servis İletişim / Adres:', form.servis_tel],
      [],
      ['KAZA BİLGİLERİ'],
      ['Kaza Tarihi:', form.kaza_tarihi],
      ['Kaza Yeri:', form.kaza_yeri],
      ['Kaza Açıklaması:', form.kaza_aciklama],
      [],
      ['EVRAK KONTROL'],
      [getCheckedLabels('evrak', EVRAK_LABELS)],
      [],
      ['İŞLEM DURUMU'],
      [getCheckedLabels('islem', ISLEM_LABELS)],
      [],
      ['NOTLAR'],
      [form.notlar || 'Yok']
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(ws1_data);
    ws1['!cols'] = [{ wch: 26 }, { wch: 32 }, { wch: 22 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'İhbar Föyü');

    /* SAYFA 2: PARÇA LİSTESİ */
    if (partsList.length > 0) {
      const ws2_data = [
        ['HASAR PARÇA LİSTESİ VE FİYATLANDIRMA'],
        [`Araç: ${form.marka || '-'} — Plaka: ${form.plaka || '-'}`],
        [],
        ['Sıra', 'Parça Adı', 'OEM Kodu', 'Fiyat (TL)', 'KDV %20', 'KDV Dahil (TL)', 'Miktar', 'Ara Toplam (TL)']
      ];
      partsList.forEach((p, i) => {
        const birim = Number(p.original) || 0;
        const kdv = birim * 0.20;
        const dahil = birim + kdv;
        const ara = birim * (Number(p.quantity) || 1);
        ws2_data.push([i + 1, p.name, p.oem || '-', birim, kdv, dahil, p.quantity, ara]);
      });
      ws2_data.push([]);
      ws2_data.push(['TOPLAM PARÇA (KDV HARİÇ):', '', '', '', '', '', '', toplamlar.totalParca]);
      if (kdvDahil) {
        ws2_data.push(['TOPLAM KDV (%20):', '', '', '', '', '', '', toplamlar.totalKDV]);
        ws2_data.push(['PARÇA TOPLAMI (KDV DAHİL):', '', '', '', '', '', '', toplamlar.totalParcaKDV]);
      }
      if (toplamlar.iscilik > 0) ws2_data.push(['İŞÇİLİK (KDV YOK):', '', '', '', '', '', '', toplamlar.iscilik]);
      ws2_data.push(['GENEL TOPLAM:', '', '', '', '', '', '', toplamlar.genelToplam]);
      ws2_data.push([]);
      ws2_data.push(['NOT:', 'Orijinal parça fiyatları yetkili servis güncel fiyatlarıdır.']);
      ws2_data.push(['', 'İşçilik bedeli dahil değilse ayrı belirtilmiştir.']);
      const ws2 = XLSX.utils.aoa_to_sheet(ws2_data);
      ws2['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Parça Listesi');
    }

    const plaka = (form.plaka || 'dosya').replace(/\s+/g, '_');
    const tarih = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(wb, `Komple_Ihbar_${plaka}_${tarih}.xlsx`);
  };

  const exportParcaExcel = () => {
    if (!window.XLSX) { notifErr('XLSX YÜKLENEMEDİ'); return; }
    if (partsList.length === 0) { notifWarn('PARÇA LİSTESİ BOŞ'); return; }
    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();
    const ws_data = [
      ['HASAR PARÇA LİSTESİ VE FİYATLANDIRMA'],
      [`Araç: ${form.marka || '-'} — Plaka: ${form.plaka || '-'}`],
      [],
      ['Sıra', 'Parça Adı', 'OEM Kodu', 'Fiyat (TL)', 'KDV %20', 'KDV Dahil (TL)', 'Miktar', 'Ara Toplam (TL)']
    ];
    partsList.forEach((p, i) => {
      const birim = Number(p.original) || 0;
      const kdv = birim * 0.20;
      const dahil = birim + kdv;
      const ara = birim * (Number(p.quantity) || 1);
      ws_data.push([i + 1, p.name, p.oem || '-', birim, kdv, dahil, p.quantity, ara]);
    });
    ws_data.push([]);
    ws_data.push(['TOPLAM PARÇA (KDV HARİÇ):', '', '', '', '', '', '', toplamlar.totalParca]);
    if (kdvDahil) {
      ws_data.push(['TOPLAM KDV (%20):', '', '', '', '', '', '', toplamlar.totalKDV]);
      ws_data.push(['PARÇA TOPLAMI (KDV DAHİL):', '', '', '', '', '', '', toplamlar.totalParcaKDV]);
    }
    if (toplamlar.iscilik > 0) ws_data.push(['İŞÇİLİK (KDV YOK):', '', '', '', '', '', '', toplamlar.iscilik]);
    ws_data.push(['GENEL TOPLAM:', '', '', '', '', '', '', toplamlar.genelToplam]);
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Parça Listesi');
    const plaka = (form.plaka || 'dosya').replace(/\s+/g, '_');
    const tarih = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(wb, `Parca_Listesi_${plaka}_${tarih}.xlsx`);
  };

  /* ═══ TABLO STİLLERİ + FORMATLAMA ═══ */
  const thSt = (C) => ({
    padding: '8px 10px', textAlign: 'center', fontSize: 10,
    fontWeight: 800, color: C.accent, letterSpacing: 0.3
  });
  const tdSt = (C, isKoyu) => ({
    padding: '7px 10px', textAlign: 'center', fontSize: 11,
    color: C.text, borderTop: `1px solid ${isKoyu ? 'rgba(6,182,212,0.1)' : '#e2e8f0'}`
  });
  const fmtTL = (n) => (Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';

  const tumunuTemizle = () => {
    setForm({ ...bosForm });
    setPartsList([]);
    setIscilik(0);
    setKdvDahil(false);
    setTemizleConfirm(false);
  };

  /* ═══ RENDER — ANA YAPI ═══ */
  return (
    <div className="fade-in" style={{ padding: '12px 0' }}>
      {/* ÜST BAR */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
        padding: '12px 16px', borderRadius: 12,
        background: isKoyu ? 'rgba(15,35,66,0.5)' : '#f0f4ff',
        border: `1px solid ${isKoyu ? 'rgba(6,182,212,0.2)' : '#dbeafe'}`
      }}>
        <button style={{ ...S.btn, ...S.btnG, fontSize: 10, padding: '6px 12px', borderRadius: 8 }}
          onClick={() => setPage('police-liste')}>
          <LIcon name="ArrowLeft" size={12} /> POLİÇE LİSTESİNE DÖN
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <LIcon name="FileText" size={16} color={C.accent} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>İHBAR FÖYÜ / HASAR DOSYASI</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>
              Araç hasarı ihbar formu + parça listesi + OCR ruhsat okuma
            </div>
          </div>
        </div>
        {form.plaka && (
          <Badge text={form.plaka.toUpperCase()} color={C.accent} />
        )}
      </div>

      {/* SEKME BARI */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 14, borderRadius: 10, overflow: 'hidden',
        border: `1px solid ${C.border}`
      }}>
        {[
          { id: 'dosya', label: 'İHBAR FÖYÜ', icon: 'ClipboardList' },
          { id: 'parca', label: 'PARÇA LİSTESİ', icon: 'Wrench' }
        ].map(t => (
          <button key={t.id} onClick={() => setSekme(t.id)}
            style={{
              flex: 1, padding: '12px 18px', fontSize: 12, fontWeight: 700,
              border: 'none', cursor: 'pointer', transition: 'all .25s ease',
              background: sekme === t.id
                ? (isKoyu ? `${C.accent}22` : `${C.accent}18`)
                : (isKoyu ? 'rgba(15,35,66,0.4)' : '#fff'),
              color: sekme === t.id ? C.accent : C.textSec,
              borderBottom: sekme === t.id ? `3px solid ${C.accent}` : '3px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
            <LIcon name={t.icon} size={14} color={sekme === t.id ? C.accent : C.textMuted} />
            {t.label}
            {t.id === 'parca' && partsList.length > 0 && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 10,
                background: C.accent, color: '#fff'
              }}>{partsList.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* SEKME İÇERİKLERİ */}
      {sekme === 'dosya' && (
        <div>
          {/* ARAÇ VE SAHİP BİLGİLERİ */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <LIcon name="Car" size={13} color={C.accent} /> ARAÇ VE SAHİP BİLGİLERİ
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <FormGroup label="PLAKA">
                <input style={inputStyle} value={form.plaka}
                  onChange={e => up('plaka', e.target.value.toUpperCase())} placeholder="34 ABC 123" />
              </FormGroup>
              <FormGroup label="MARKA / MODEL">
                <input style={inputStyle} value={form.marka}
                  onChange={e => up('marka', e.target.value.toUpperCase())} placeholder="HONDA CBR" />
              </FormGroup>
              <FormGroup label="ŞASİ NO">
                <input style={inputStyle} value={form.sasi}
                  onChange={e => up('sasi', e.target.value.toUpperCase())} placeholder="17 haneli VIN" maxLength={17} />
              </FormGroup>
              <FormGroup label="KİLOMETRE">
                <input style={inputStyle} value={form.kilometre}
                  onChange={e => up('kilometre', e.target.value.replace(/\D/g, ''))} placeholder="0" />
              </FormGroup>
              <FormGroup label="RUHSAT SAHİBİ AD SOYAD">
                <input style={inputStyle} value={form.sahip_ad}
                  onChange={e => up('sahip_ad', e.target.value.toUpperCase())} />
              </FormGroup>
              <FormGroup label="TC KİMLİK NO / TELEFON">
                <input style={inputStyle} value={form.sahip_tel}
                  onChange={e => up('sahip_tel', e.target.value)} placeholder="TC veya telefon" />
              </FormGroup>
            </div>
            <div style={{ marginTop: 10 }}>
              <FormGroup label="IBAN">
                <input style={inputStyle} value={form.iban}
                  onChange={e => up('iban', e.target.value.toUpperCase())} placeholder="TR..." />
              </FormGroup>
            </div>
            {/* RUHSAT OCR BUTONLARI (Parça 6'da doldurulacak) */}
            <div style={{ marginTop: 12, padding: 10, background: `${C.purple}0A`, border: `1px dashed ${C.purple}55`, borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <LIcon name="ScanLine" size={16} color={C.purple} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>RUHSAT FOTOĞRAFI YÜKLE</div>
                <div style={{ fontSize: 9, color: C.textMuted }}>
                  Claude AI + Tesseract OCR ile plaka, marka, şasi, ad-soyad otomatik dolar
                </div>
              </div>
              <input ref={ruhsatInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                onChange={e => handleRuhsatUpload(e)} />
              <button style={{ ...S.btn, background: C.purple, color: '#fff', fontSize: 10, padding: '7px 14px', borderRadius: 7 }}
                onClick={() => ruhsatInputRef.current?.click()}>
                <LIcon name="Upload" size={12} color="#fff" /> RUHSAT YÜKLE
              </button>
            </div>
          </div>

          {/* DOSYA BİLGİLERİ */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <LIcon name="FileText" size={13} color={C.accent} /> DOSYA BİLGİLERİ
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <FormGroup label="SİGORTA ŞİRKETİ">
                <input style={inputStyle} value={form.sigorta}
                  onChange={e => up('sigorta', e.target.value.toUpperCase())} />
              </FormGroup>
              <FormGroup label="DOSYA NO">
                <input style={inputStyle} value={form.dosya_no}
                  onChange={e => up('dosya_no', e.target.value)} />
              </FormGroup>
              <FormGroup label="DOSYA TÜRÜ">
                <select style={{ ...S.select, fontSize: 12, padding: '8px 10px' }}
                  value={form.dosya_turu} onChange={e => up('dosya_turu', e.target.value)}>
                  <option value="KASKO">KASKO</option>
                  <option value="TRAFİK">TRAFİK</option>
                </select>
              </FormGroup>
              <FormGroup label="POLİÇE NO">
                <input style={inputStyle} value={form.police_no}
                  onChange={e => up('police_no', e.target.value)} />
              </FormGroup>
            </div>
          </div>

          {/* EKSPER VE SERVİS BİLGİLERİ */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <LIcon name="Search" size={13} color={C.accent} /> EKSPER VE SERVİS BİLGİLERİ
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <FormGroup label="EKSPER OFİSİ & ADI">
                <input style={inputStyle} value={form.eksper_adi}
                  onChange={e => up('eksper_adi', e.target.value.toUpperCase())} />
              </FormGroup>
              <FormGroup label="EKSPER İLETİŞİM">
                <input style={inputStyle} value={form.eksper_iletisim}
                  onChange={e => up('eksper_iletisim', e.target.value)} placeholder="Telefon / E-posta" />
              </FormGroup>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, margin: '12px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <FormGroup label="SERVİS ADI">
                <input style={inputStyle} value={form.servis_adi}
                  onChange={e => up('servis_adi', e.target.value.toUpperCase())} />
              </FormGroup>
              <FormGroup label="SERVİS YETKİLİ ADI">
                <input style={inputStyle} value={form.servis_yetkili}
                  onChange={e => up('servis_yetkili', e.target.value.toUpperCase())} />
              </FormGroup>
            </div>
            <div style={{ marginTop: 10 }}>
              <FormGroup label="SERVİS İLETİŞİM VE ADRES">
                <input style={inputStyle} value={form.servis_tel}
                  onChange={e => up('servis_tel', e.target.value)} placeholder="Telefon, adres" />
              </FormGroup>
            </div>
          </div>

          {/* KAZA BİLGİLERİ */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <LIcon name="AlertTriangle" size={13} color={C.warning} /> KAZA BİLGİLERİ
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
              <FormGroup label="KAZA TARİHİ">
                <input type="date" style={inputStyle} value={form.kaza_tarihi}
                  onChange={e => up('kaza_tarihi', e.target.value)} />
              </FormGroup>
              <FormGroup label="KAZA YERİ">
                <input style={inputStyle} value={form.kaza_yeri}
                  onChange={e => up('kaza_yeri', e.target.value.toUpperCase())} placeholder="İl / İlçe / Semt" />
              </FormGroup>
            </div>
            <div style={{ marginTop: 10 }}>
              <FormGroup label="KAZA AÇIKLAMASI">
                <textarea style={{ ...inputStyle, minHeight: 70, fontFamily: 'inherit' }}
                  value={form.kaza_aciklama} onChange={e => up('kaza_aciklama', e.target.value)} />
              </FormGroup>
            </div>
          </div>

          {/* EVRAK KONTROL */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <LIcon name="CheckSquare" size={13} color={C.success} /> EVRAK KONTROL
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
              {[
                { k: 'evrak_ehliyet', l: 'Ehliyet' },
                { k: 'evrak_ruhsat', l: 'Ruhsat' },
                { k: 'evrak_police', l: 'Poliçe' },
                { k: 'evrak_ktt', l: 'KTT' },
                { k: 'evrak_iban', l: 'IBAN' },
                { k: 'evrak_kilometre', l: 'Kilometre' },
                { k: 'evrak_olay', l: 'Olay Yeri Foto' },
                { k: 'evrak_hasar', l: 'Hasar Foto' },
                { k: 'evrak_parca', l: 'Parça Listesi' },
                { k: 'evrak_ekspertiz', l: 'Ekspertiz Raporu' },
                { k: 'evrak_fatura', l: 'Onarım Faturası' },
                { k: 'evrak_vekaletname', l: 'Vekaletname' }
              ].map(c => (
                <label key={c.k} style={{
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  padding: '6px 8px', borderRadius: 6,
                  background: form[c.k] ? `${C.success}12` : 'transparent',
                  border: `1px solid ${form[c.k] ? C.success + '55' : C.border}`,
                  transition: 'all .2s'
                }}>
                  <input type="checkbox" checked={form[c.k]} onChange={() => upCheck(c.k)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: C.success }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: form[c.k] ? C.success : C.textSec }}>{c.l}</span>
                </label>
              ))}
            </div>
          </div>

          {/* İŞLEM DURUMU */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <LIcon name="Zap" size={13} color={C.warning} /> İŞLEM DURUMU
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {[
                { k: 'islem_ihbar', l: 'İhbar Yapıldı' },
                { k: 'islem_evrak', l: 'Evrak Gönderildi' },
                { k: 'islem_ekspertiz', l: 'Ekspertiz Yapıldı' },
                { k: 'islem_basladi', l: 'Onarım Başladı' },
                { k: 'islem_bitti', l: 'Onarım Bitti' },
                { k: 'islem_odeme', l: 'Ödeme Alındı' },
                { k: 'islem_deger', l: 'Değer Kaybı Açıldı' },
                { k: 'islem_kapandi', l: 'Dosya Kapatıldı' }
              ].map(c => (
                <label key={c.k} style={{
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  padding: '6px 8px', borderRadius: 6,
                  background: form[c.k] ? `${C.warning}12` : 'transparent',
                  border: `1px solid ${form[c.k] ? C.warning + '55' : C.border}`,
                  transition: 'all .2s'
                }}>
                  <input type="checkbox" checked={form[c.k]} onChange={() => upCheck(c.k)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: C.warning }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: form[c.k] ? C.warning : C.textSec }}>{c.l}</span>
                </label>
              ))}
            </div>
          </div>

          {/* NOTLAR */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <LIcon name="Edit3" size={13} color={C.accent} /> NOTLAR
            </div>
            <textarea style={{ ...inputStyle, minHeight: 80, fontFamily: 'inherit', width: '100%' }}
              value={form.notlar} onChange={e => up('notlar', e.target.value)}
              placeholder="Ek notlarınızı buraya yazın..." />
          </div>
        </div>
      )}

      {sekme === 'parca' && (
        <div>
          {/* EXCEL & ŞABLON BÖLÜMÜ */}
          <div style={{
            padding: '14px 16px', marginBottom: 14, borderRadius: 10,
            background: isKoyu ? 'rgba(255,193,7,0.08)' : '#FFF8E1',
            border: `1px solid ${isKoyu ? 'rgba(255,193,7,0.25)' : '#FFE082'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <LIcon name="FileSpreadsheet" size={14} color={C.warning} />
              <span style={{ fontSize: 12, fontWeight: 800, color: isKoyu ? '#fbbf24' : '#856404' }}>
                EXCEL'DEN PARÇA LİSTESİ YÜKLE
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input ref={excelInputRef} type="file" accept=".xlsx,.xls"
                onChange={handleExcelImport}
                style={{ flex: '1 1 220px', padding: 8, fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, background: isKoyu ? '#0f172a' : '#fff', color: C.text }} />
              <button style={{ ...S.btn, background: C.cyan, color: '#fff', fontSize: 11, padding: '8px 14px', borderRadius: 6 }}
                onClick={() => downloadTemplate()}>
                <LIcon name="Download" size={12} color="#fff" /> ŞABLON İNDİR
              </button>
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: C.textMuted }}>
              ℹ️ Servisin gönderdiği Excel'i yükleyin — otomatik listeye eklenir.
            </div>
          </div>

          {/* AI TARAMA PANELİ */}
          <div style={{
            padding: '14px 16px', marginBottom: 14, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.accent}18 0%, ${C.purple}18 100%)`,
            border: `1px solid ${C.accent}44`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <LIcon name="Bot" size={15} color={C.accent} />
              <span style={{ fontSize: 12, fontWeight: 800, color: C.accent }}>AI İLE OTOMATİK PARÇA TARAMA</span>
            </div>
            <input ref={parcaListInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
              onChange={handleParcaListesiUpload} />
            <button style={{
              width: '100%', padding: 12, fontSize: 12, fontWeight: 700,
              background: C.purple, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer'
            }} onClick={() => parcaListInputRef.current?.click()}>
              <LIcon name="ScanLine" size={14} color="#fff" /> PARÇA LİSTESİ FOTOĞRAFI YÜKLE
            </button>
            <div style={{ marginTop: 8, fontSize: 10, color: C.textMuted, textAlign: 'center' }}>
              Servisten gelen parça listesi fotoğrafını yükleyin — Claude AI + Tesseract ile otomatik tanınır.
            </div>
          </div>

          {/* YENİ PARÇA EKLE */}
          <div style={{ ...sectionStyle, borderLeft: `4px solid ${C.success}` }}>
            <div style={{ ...sectionTitleStyle, color: C.success }}>
              <LIcon name="Plus" size={13} color={C.success} /> YENİ PARÇA EKLE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 0.7fr auto', gap: 8, alignItems: 'end' }}>
              <FormGroup label="PARÇA ADI">
                <input style={inputStyle} value={newPart.name}
                  onChange={e => setNewPart(p => ({ ...p, name: e.target.value.toUpperCase() }))}
                  placeholder="Örn: ÖN FAR LED" />
              </FormGroup>
              <FormGroup label="OEM KOD">
                <input style={inputStyle} value={newPart.oem}
                  onChange={e => setNewPart(p => ({ ...p, oem: e.target.value.toUpperCase() }))}
                  placeholder="Opsiyonel" />
              </FormGroup>
              <FormGroup label="FİYAT (TL)">
                <input type="number" style={inputStyle} value={newPart.original}
                  onChange={e => setNewPart(p => ({ ...p, original: e.target.value }))}
                  placeholder="0" min="0" step="0.01" />
              </FormGroup>
              <FormGroup label="MİKTAR">
                <input type="number" style={inputStyle} value={newPart.quantity}
                  onChange={e => setNewPart(p => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                  min="1" />
              </FormGroup>
              <button style={{ ...S.btn, background: C.success, color: '#fff', fontSize: 11, padding: '8px 14px', borderRadius: 6, height: 36 }}
                onClick={() => addPart()}>
                <LIcon name="Plus" size={13} color="#fff" /> EKLE
              </button>
            </div>
          </div>

          {/* KDV + İŞÇİLİK */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ padding: 14, background: isKoyu ? 'rgba(16,185,129,0.08)' : '#ECFDF5', borderRadius: 10, borderLeft: `4px solid ${C.success}` }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={kdvDahil} onChange={e => setKdvDahil(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: C.success, cursor: 'pointer' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.success }}>💵 KDV (%20) DAHİL HESAPLA</span>
              </label>
              <div style={{ fontSize: 10, color: C.textMuted, marginLeft: 28, marginTop: 4 }}>
                Fatura isteyen müşteriler için KDV dahil toplam
              </div>
            </div>
            <div style={{ padding: 14, background: isKoyu ? 'rgba(255,193,7,0.08)' : '#FFFBEB', borderRadius: 10, borderLeft: `4px solid ${C.warning}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.warning, marginBottom: 6 }}>
                🔧 İŞÇİLİK BEDELİ (TL)
              </div>
              <input type="number" style={{ ...inputStyle, width: '100%' }} value={iscilik}
                onChange={e => setIscilik(e.target.value)} placeholder="0" min="0" step="0.01" />
              <div style={{ fontSize: 9, color: C.textMuted, marginTop: 4 }}>
                ⚠️ İşçiliğe KDV eklenmez
              </div>
            </div>
          </div>

          {/* PARÇA LİSTESİ TABLOSU */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <LIcon name="List" size={13} color={C.accent} /> PARÇA LİSTESİ ({partsList.length})
            </div>
            {partsList.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: C.textMuted, fontSize: 11 }}>
                Henüz parça eklenmedi. Yukarıdaki formdan veya Excel/AI tarama ile ekleyin.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: isKoyu ? 'rgba(6,182,212,0.12)' : `${C.accent}18` }}>
                      <th style={thSt(C)}>#</th>
                      <th style={{ ...thSt(C), textAlign: 'left' }}>PARÇA ADI</th>
                      <th style={thSt(C)}>OEM</th>
                      <th style={{ ...thSt(C), textAlign: 'right' }}>FİYAT</th>
                      <th style={{ ...thSt(C), textAlign: 'right' }}>KDV %20</th>
                      <th style={{ ...thSt(C), textAlign: 'right' }}>KDV DAHİL</th>
                      <th style={thSt(C)}>MİKTAR</th>
                      <th style={{ ...thSt(C), textAlign: 'right' }}>ARA TOPLAM</th>
                      <th style={thSt(C)}>SİL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partsList.map((p, idx) => {
                      const birim = Number(p.original) || 0;
                      const kdv = birim * 0.20;
                      const dahil = birim + kdv;
                      const ara = birim * (Number(p.quantity) || 1);
                      return (
                        <tr key={idx} style={{ borderTop: `1px solid ${C.border}`, background: idx % 2 === 0 ? 'transparent' : (isKoyu ? 'rgba(6,182,212,0.04)' : '#f8fafc') }}>
                          <td style={tdSt(C, isKoyu)}>{idx + 1}</td>
                          <td style={{ ...tdSt(C, isKoyu), textAlign: 'left', fontWeight: 700 }}>{p.name}</td>
                          <td style={tdSt(C, isKoyu)}>{p.oem || '-'}</td>
                          <td style={{ ...tdSt(C, isKoyu), textAlign: 'right', fontWeight: 700 }}>{fmtTL(birim)}</td>
                          <td style={{ ...tdSt(C, isKoyu), textAlign: 'right', color: C.warning }}>{fmtTL(kdv)}</td>
                          <td style={{ ...tdSt(C, isKoyu), textAlign: 'right', color: C.success, fontWeight: 700 }}>{fmtTL(dahil)}</td>
                          <td style={{ ...tdSt(C, isKoyu), fontWeight: 700 }}>{p.quantity}</td>
                          <td style={{ ...tdSt(C, isKoyu), textAlign: 'right', fontWeight: 800, color: C.accent }}>{fmtTL(ara)}</td>
                          <td style={tdSt(C, isKoyu)}>
                            <button onClick={() => deletePart(idx)}
                              style={{ background: C.danger, color: '#fff', border: 'none', padding: '4px 8px', fontSize: 10, borderRadius: 4, cursor: 'pointer' }}>
                              <LIcon name="Trash2" size={10} color="#fff" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TOPLAMLAR */}
            {partsList.length > 0 && (
              <div style={{
                marginTop: 14, padding: 14, borderRadius: 10,
                background: isKoyu ? 'rgba(255,193,7,0.08)' : '#FFF8E1',
                border: `2px solid ${C.warning}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
                  <span>TOPLAM PARÇA (KDV HARİÇ):</span>
                  <span>{fmtTL(toplamlar.totalParca)}</span>
                </div>
                {kdvDahil && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12, fontWeight: 700, color: C.warning }}>
                      <span>TOPLAM KDV (%20):</span>
                      <span>{fmtTL(toplamlar.totalKDV)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12, fontWeight: 700, color: C.success }}>
                      <span>PARÇA TOPLAMI (KDV DAHİL):</span>
                      <span>{fmtTL(toplamlar.totalParcaKDV)}</span>
                    </div>
                  </>
                )}
                {toplamlar.iscilik > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
                    <span>İŞÇİLİK (KDV YOK):</span>
                    <span>{fmtTL(toplamlar.iscilik)}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 16, fontWeight: 900, color: C.accent,
                  paddingTop: 10, borderTop: `2px solid ${C.accent}`
                }}>
                  <span>GENEL TOPLAM:</span>
                  <span>{fmtTL(toplamlar.genelToplam)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ALT AKSİYON BAR */}
      <div style={{
        marginTop: 14, padding: '14px 0 4px',
        display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
        borderTop: `1px solid ${C.border}`
      }}>
        <button style={{ ...S.btn, ...S.btnP, fontSize: 12, padding: '10px 18px', borderRadius: 8 }}
          onClick={() => setYapistirModal(true)}>
          <LIcon name="Clipboard" size={14} color="#fff" /> METİN YAPIŞTIR
        </button>
        <input ref={jsonInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleJsonImport} />
        <button style={{ ...S.btn, background: C.purple, color: '#fff', fontSize: 12, padding: '10px 18px', borderRadius: 8 }}
          onClick={() => jsonInputRef.current?.click()}>
          <LIcon name="FileJson" size={14} color="#fff" /> JSON YÜKLE
        </button>
        <button style={{ ...S.btn, background: C.success, color: '#fff', fontSize: 12, padding: '10px 18px', borderRadius: 8 }}
          onClick={dosyaKaydet}>
          <LIcon name="Save" size={14} color="#fff" /> KAYDET
        </button>
        <button style={{ ...S.btn, background: C.cyan, color: '#fff', fontSize: 12, padding: '10px 18px', borderRadius: 8 }}
          onClick={() => setAramaModal(true)}>
          <LIcon name="Search" size={14} color="#fff" /> DOSYA ARA
        </button>
        <button style={{ ...S.btn, background: C.accent, color: '#fff', fontSize: 12, padding: '10px 18px', borderRadius: 8 }}
          onClick={exportKompleExcel}>
          <LIcon name="FileSpreadsheet" size={14} color="#fff" /> KOMPLE EXCEL
        </button>
        <button style={{ ...S.btn, background: C.cyan, color: '#fff', fontSize: 12, padding: '10px 18px', borderRadius: 8 }}
          onClick={exportParcaExcel}>
          <LIcon name="Wrench" size={14} color="#fff" /> SADECE PARÇA EXCEL
        </button>
        <button style={{ ...S.btn, background: C.warning, color: '#000', fontSize: 12, padding: '10px 18px', borderRadius: 8 }}
          onClick={() => window.print()}>
          <LIcon name="Printer" size={14} color="#000" /> YAZDIR / PDF
        </button>
        <button style={{ ...S.btn, ...S.btnD, fontSize: 12, padding: '10px 18px', borderRadius: 8 }}
          onClick={() => setTemizleConfirm(true)}>
          <LIcon name="Trash2" size={14} color="#fff" /> TEMİZLE
        </button>
      </div>

      {/* SİSTEM İÇİ BİLDİRİM KARTI (sağ üst, 5 sn otomatik kapanır) */}
      {bildirim && (() => {
        const renkler = {
          success: { bg: C.success, icon: 'CheckCircle' },
          error: { bg: C.danger, icon: 'AlertCircle' },
          warning: { bg: C.warning, icon: 'AlertTriangle' },
          info: { bg: C.accent, icon: 'Info' }
        };
        const r = renkler[bildirim.tip] || renkler.info;
        const isArr = Array.isArray(bildirim.detay);
        return (
          <div style={{
            position: 'fixed', top: 80, right: 20, zIndex: 100000,
            width: 360, maxWidth: 'calc(100vw - 40px)',
            background: isKoyu ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.98)',
            border: `2px solid ${r.bg}`,
            borderRadius: 12,
            boxShadow: `0 10px 40px rgba(0,0,0,0.25), 0 0 0 4px ${r.bg}22`,
            animation: 'slideInRight .3s ease',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px',
              background: `${r.bg}18`,
              borderBottom: `1px solid ${r.bg}33`
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <LIcon name={r.icon} size={18} color="#fff" />
              </div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 800, color: r.bg, letterSpacing: 0.3 }}>
                {bildirim.baslik}
              </div>
              <button onClick={bildirimKapat}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.textMuted }}>
                <LIcon name="X" size={14} color={C.textMuted} />
              </button>
            </div>
            {bildirim.detay && (
              <div style={{ padding: '12px 14px', fontSize: 11, color: C.text, lineHeight: 1.5 }}>
                {isArr ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px' }}>
                    {bildirim.detay.map((d, i) => (
                      <React.Fragment key={i}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: 0.3 }}>{d.l}:</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{d.v || '-'}</div>
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{bildirim.detay}</div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* OCR LOADING OVERLAY */}
      {ocrLoading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: isKoyu ? '#1e293b' : '#fff', padding: 30, borderRadius: 14,
            textAlign: 'center', minWidth: 280
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📸</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 8 }}>
              {ocrLoading.msg || 'Ruhsat Okunuyor'}
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>
              {ocrLoading.detail || 'Hazırlanıyor...'}
            </div>
            <div style={{ width: 240, height: 5, background: isKoyu ? '#334155' : '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.round((ocrLoading.progress || 0) * 100)}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${C.accent}, ${C.purple})`,
                transition: 'width .3s ease'
              }} />
            </div>
          </div>
        </div>
      )}

      {/* TEMİZLE ONAYI */}
      <Confirm open={temizleConfirm}
        message="TÜM FORM VE PARÇA LİSTESİNİ TEMİZLEMEK İSTEDİĞİNİZE EMİN MİSİNİZ?"
        onConfirm={tumunuTemizle} onCancel={() => setTemizleConfirm(false)} />

      {/* DOSYA ARAMA MODAL */}
      <Modal open={aramaModal} onClose={() => setAramaModal(false)} title="KAYITLI DOSYALARI ARA" width="720px">
        <div style={{ padding: 16 }}>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <LIcon name="Search" size={14} color={C.textMuted}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input style={{ ...inputStyle, width: '100%', paddingLeft: 36, fontSize: 13 }}
              value={aramaText} onChange={e => setAramaText(e.target.value)}
              placeholder="Plaka veya ad soyad ile arayın..." />
          </div>
          {filtrelenenKayitlar.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.textMuted, fontSize: 12 }}>
              📁 {aramaText ? 'Eşleşen dosya bulunamadı' : 'Henüz kaydedilmiş dosya yok'}
            </div>
          ) : (
            <div style={{ maxHeight: 420, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 8 }}>
              {filtrelenenKayitlar.map(f => (
                <div key={f.id} style={{
                  padding: 14, borderBottom: `1px solid ${C.border}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.accent, marginBottom: 4 }}>
                      {f.sahipAd} — {f.plaka}
                    </div>
                    <div style={{ fontSize: 10, color: C.textMuted }}>
                      📅 {f.kayitTarihi} &nbsp;|&nbsp;
                      🔧 {(f.parcaListesi || []).length} parça &nbsp;|&nbsp;
                      📋 {f.formData?.dosya_turu || '-'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ ...S.btn, background: C.accent, color: '#fff', fontSize: 10, padding: '6px 12px', borderRadius: 6 }}
                      onClick={() => dosyaYukle(f.id)}>
                      <LIcon name="FolderOpen" size={11} color="#fff" /> YÜKLE
                    </button>
                    <button style={{ ...S.btn, background: C.danger, color: '#fff', fontSize: 10, padding: '6px 12px', borderRadius: 6 }}
                      onClick={() => dosyaSil(f.id)}>
                      <LIcon name="Trash2" size={11} color="#fff" /> SİL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* PARÇA ÖNİZLEME MODAL (OCR sonuçları) */}
      <Modal open={onizlemeModal} onClose={() => { setOnizlemeModal(false); setTempParca([]); }}
        title={`AI ANALİZİ — ${tempParca.length} PARÇA BULUNDU`} width="750px">
        <div style={{ padding: 16 }}>
          <div style={{ padding: 10, background: `${C.success}15`, borderLeft: `4px solid ${C.success}`, borderRadius: 6, marginBottom: 12, fontSize: 11 }}>
            <strong style={{ color: C.success }}>✅ AI Analizi Tamamlandı!</strong> Aşağıdaki parçalar tespit edildi.
            Kontrol edip onaylayın; onayladığınız parçalar mevcut listeye eklenecek.
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: isKoyu ? 'rgba(6,182,212,0.12)' : `${C.accent}18`, position: 'sticky', top: 0 }}>
                  <th style={thSt(C)}>#</th>
                  <th style={{ ...thSt(C), textAlign: 'left' }}>PARÇA ADI</th>
                  <th style={{ ...thSt(C), textAlign: 'right' }}>FİYAT</th>
                  <th style={thSt(C)}>MİKTAR</th>
                </tr>
              </thead>
              <tbody>
                {tempParca.map((p, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={tdSt(C, isKoyu)}>{i + 1}</td>
                    <td style={{ ...tdSt(C, isKoyu), textAlign: 'left', fontWeight: 700 }}>{p.name}</td>
                    <td style={{ ...tdSt(C, isKoyu), textAlign: 'right', fontWeight: 700, color: C.accent }}>{fmtTL(p.original)}</td>
                    <td style={tdSt(C, isKoyu)}>{p.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
            <button style={{ ...S.btn, ...S.btnG, fontSize: 12, padding: '10px 18px', borderRadius: 8 }}
              onClick={() => { setOnizlemeModal(false); setTempParca([]); }}>
              İPTAL
            </button>
            <button style={{ ...S.btn, background: C.success, color: '#fff', fontSize: 12, padding: '10px 18px', borderRadius: 8 }}
              onClick={confirmParcalar}>
              <LIcon name="Check" size={14} color="#fff" /> ONAYLA VE EKLE
            </button>
          </div>
        </div>
      </Modal>

      {/* METİN YAPIŞTIR MODAL */}
      <Modal open={yapistirModal} onClose={() => setYapistirModal(false)} title="METİN YAPIŞTIR — HIZLI DOLDUR" width="650px">
        <div style={{ padding: 16 }}>
          <div style={{ padding: 12, background: isKoyu ? 'rgba(6,182,212,0.08)' : '#f0f9ff', borderRadius: 8, marginBottom: 14, fontSize: 11, color: C.textSec }}>
            <strong style={{ color: C.accent }}>📌 FORMAT ÖRNEĞİ:</strong>
            <pre style={{ margin: '6px 0 0', fontFamily: 'monospace', fontSize: 10, whiteSpace: 'pre-wrap', color: C.textMuted }}>
{`PLAKA: 55 ABC 123
MARKA: HONDA CBR
SAHIP: ALİ YILMAZ
TC: 12345678901
SIGORTA: ALLİANZ
DOSYA_NO: 2026-1234
KAZA_TARIHI: 2026-04-20
KAZA_YERI: İSTANBUL / KADIKÖY
---PARCALAR---
Ön Çamurluk,2300,1
Arka Stop,1500,2`}
            </pre>
          </div>
          <textarea style={{ ...inputStyle, width: '100%', minHeight: 260, fontFamily: 'monospace', fontSize: 12 }}
            value={yapistirText} onChange={e => setYapistirText(e.target.value)}
            placeholder="Metin verisini buraya yapıştırın..." />
          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
            <button style={{ ...S.btn, ...S.btnG, fontSize: 12, padding: '10px 18px', borderRadius: 8 }}
              onClick={() => setYapistirModal(false)}>
              İPTAL
            </button>
            <button style={{ ...S.btn, background: C.success, color: '#fff', fontSize: 12, padding: '10px 18px', borderRadius: 8 }}
              onClick={processYapistir}>
              <LIcon name="Check" size={14} color="#fff" /> VERİLERİ YÜKLE
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
