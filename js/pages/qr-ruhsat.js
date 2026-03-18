/**
 * MR HASAR DANIŞMANLIK - QR RUHSAT OKUYUCU
 * Araç ruhsatı QR kodundan bilgi çıkarma
 * Toplu yükleme destekli
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useRef, useMemo} = React;

/* ═══ YARDIMCI FONKSİYONLAR ═══ */

// QR kod verisinden ruhsat bilgilerini parse et
const parseQrData = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const d = raw.trim();

  // Türk araç ruhsatı QR formatları:
  // Format 1: Pipe/virgül ayrık: TC|PLAKA|SERİ NO vs.
  // Format 2: Satır bazlı
  // Format 3: URL formatı (egm.gov.tr vs.)
  // Format 4: Structured text

  let tc = '', plaka = '', belgeSeri = '', sase = '';

  // URL formatı kontrolü (egm veya tescil sistemi)
  if (d.includes('http') || d.includes('egm.gov.tr') || d.includes('tescil')) {
    const params = new URLSearchParams(d.split('?')[1] || '');
    tc = params.get('tc') || params.get('vkn') || params.get('kimlikno') || '';
    plaka = params.get('plaka') || params.get('pl') || '';
    belgeSeri = params.get('seri') || params.get('belge') || params.get('belgeno') || '';
    sase = params.get('sase') || params.get('saseno') || '';
  }

  // Pipe/virgül ayrık format
  if (!tc && !plaka) {
    const sep = d.includes('|') ? '|' : d.includes(';') ? ';' : null;
    if (sep) {
      const parts = d.split(sep).map(s => s.trim());
      // QR genellikle: TC, PLAKA, BELGE SERİ, ŞASE vs. sıralı
      parts.forEach(p => {
        const clean = p.replace(/[^A-Za-z0-9ÇçĞğİıÖöŞşÜü\s\-\/]/g, '').trim();
        if (!tc && /^\d{11}$/.test(clean)) tc = clean;
        if (!tc && /^\d{10}$/.test(clean)) tc = clean;
        if (!plaka && /^\d{2}\s?[A-ZÇĞİÖŞÜ]{1,4}\s?\d{1,4}$/.test(clean.toUpperCase())) plaka = clean.toUpperCase();
        if (!belgeSeri && /^[A-Z]{2}\s?\d{5,7}$/.test(clean.toUpperCase())) belgeSeri = clean.toUpperCase();
        if (!sase && /^[A-Z0-9]{17}$/i.test(clean)) sase = clean.toUpperCase();
      });
    }
  }

  // Satır bazlı veya tek blok metin
  if (!tc && !plaka) {
    const lines = d.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
    const fullText = d.toUpperCase();

    // TC / Vergi No bul (10 veya 11 haneli sayı)
    const tcMatch = fullText.match(/(?:TC|VERGİ|VERGI|KİMLİK|KIMLIK|VKN)[^\d]*(\d{10,11})/i)
      || fullText.match(/(\d{11})/);
    if (tcMatch) tc = tcMatch[1];
    if (!tc) {
      const vknMatch = fullText.match(/(\d{10})/);
      if (vknMatch) tc = vknMatch[1];
    }

    // Plaka bul
    const plakaMatch = fullText.match(/(?:PLAKA)[^\d]*(\d{2}\s?[A-ZÇĞİÖŞÜ]{1,4}\s?\d{1,4})/i)
      || fullText.match(/(\d{2}\s?[A-ZÇĞİÖŞÜ]{1,4}\s?\d{1,4})/);
    if (plakaMatch) plaka = plakaMatch[1].replace(/\s+/g, '');

    // Belge Seri No bul (2 harf + 6 rakam)
    const seriMatch = fullText.match(/(?:SERİ|SERI|BELGE)[^\w]*([A-Z]{2})\s*(?:NO|№)?\s*(\d{5,7})/i)
      || fullText.match(/([A-Z]{2})\s*(\d{6})/);
    if (seriMatch) belgeSeri = seriMatch[1] + ' ' + seriMatch[2];

    // Şase No bul (17 karakter alfanümerik)
    const saseMatch = fullText.match(/(?:ŞASE|SASE)[^\w]*([A-Z0-9]{17})/i)
      || fullText.match(/([A-HJ-NPR-Z0-9]{17})/i);
    if (saseMatch) sase = saseMatch[1].toUpperCase();
  }

  return {
    tc: tc || '',
    plaka: plaka || '',
    belgeSeri: belgeSeri || '',
    sase: sase || '',
    raw: d
  };
};

// Canvas üzerinden QR kodu oku (jsQR kullanarak)
const readQrFromImage = (imgElement) => {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Yüksek çözünürlük için orijinal boyutları kullan
      canvas.width = imgElement.naturalWidth || imgElement.width;
      canvas.height = imgElement.naturalHeight || imgElement.height;
      ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (typeof jsQR === 'function') {
        // Ana tarama
        let code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });

        if (code) {
          resolve({ success: true, data: code.data, location: code.location });
          return;
        }

        // Bulunamadıysa, görüntünün sağ alt çeyreğini tara (ruhsattaki QR genelde sağ altta)
        const regions = [
          { x: Math.floor(canvas.width * 0.5), y: Math.floor(canvas.height * 0.5), w: Math.floor(canvas.width * 0.5), h: Math.floor(canvas.height * 0.5) },  // sağ alt
          { x: Math.floor(canvas.width * 0.5), y: 0, w: Math.floor(canvas.width * 0.5), h: Math.floor(canvas.height * 0.5) },  // sağ üst
          { x: 0, y: Math.floor(canvas.height * 0.5), w: Math.floor(canvas.width * 0.5), h: Math.floor(canvas.height * 0.5) },  // sol alt
          { x: 0, y: 0, w: Math.floor(canvas.width * 0.5), h: Math.floor(canvas.height * 0.5) },  // sol üst
        ];

        for (const r of regions) {
          const regionData = ctx.getImageData(r.x, r.y, r.w, r.h);
          code = jsQR(regionData.data, r.w, r.h, { inversionAttempts: 'attemptBoth' });
          if (code) {
            resolve({ success: true, data: code.data, location: code.location });
            return;
          }
        }

        // Kontrast artırarak tekrar dene
        const enhanced = enhanceImage(ctx, canvas.width, canvas.height);
        code = jsQR(enhanced.data, enhanced.width, enhanced.height, { inversionAttempts: 'attemptBoth' });
        if (code) {
          resolve({ success: true, data: code.data, location: code.location });
          return;
        }

        // Ölçeklendirip tekrar dene
        const scales = [1.5, 2, 0.75];
        for (const scale of scales) {
          const sw = Math.floor(canvas.width * scale);
          const sh = Math.floor(canvas.height * scale);
          const sCanvas = document.createElement('canvas');
          sCanvas.width = sw;
          sCanvas.height = sh;
          const sCtx = sCanvas.getContext('2d');
          sCtx.drawImage(imgElement, 0, 0, sw, sh);
          const sData = sCtx.getImageData(0, 0, sw, sh);
          code = jsQR(sData.data, sw, sh, { inversionAttempts: 'attemptBoth' });
          if (code) {
            resolve({ success: true, data: code.data, location: code.location });
            return;
          }
        }

        resolve({ success: false, error: 'QR KOD BULUNAMADI' });
      } else {
        resolve({ success: false, error: 'jsQR KÜTÜPHANESİ YÜKLENEMEDİ' });
      }
    } catch (e) {
      resolve({ success: false, error: 'GÖRÜNTÜ İŞLEME HATASI: ' + e.message });
    }
  });
};

// Görüntü kontrast artırma
const enhanceImage = (ctx, w, h) => {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  // Grayscale + kontrast artırma
  for (let i = 0; i < data.length; i += 4) {
    let gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
    // Kontrast: threshold 128
    gray = gray > 128 ? 255 : 0;
    data[i] = data[i+1] = data[i+2] = gray;
  }
  return imgData;
};

/* ═══ TESSERACT OCR FONKSİYONLARI ═══ */

// Singleton Tesseract worker (Türkçe)
let _tesseractWorker = null;
let _tesseractReady = false;

const initTesseractWorker = async (onProgress) => {
  if (_tesseractReady && _tesseractWorker) return _tesseractWorker;
  if (typeof Tesseract === 'undefined') throw new Error('TESSERACT KÜTÜPHANESİ BULUNAMADI');
  _tesseractWorker = await Tesseract.createWorker('tur', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
      if (m.status === 'loading language traineddata' && onProgress) onProgress(m.progress * 0.5);
    }
  });
  _tesseractReady = true;
  return _tesseractWorker;
};

// Görüntü üzerinde OCR çalıştır
const runOcrOnImage = async (imgElement, onProgress) => {
  const worker = await initTesseractWorker(onProgress);
  // Kontrast artırılmış canvas oluştur (OCR doğruluğu için)
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imgElement.naturalWidth || imgElement.width;
  canvas.height = imgElement.naturalHeight || imgElement.height;
  ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
  // Grayscale + kontrast artır
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    let gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
    gray = gray < 128 ? Math.max(0, gray * 0.5) : Math.min(255, gray * 1.3 + 30);
    data[i] = data[i+1] = data[i+2] = gray;
  }
  ctx.putImageData(imgData, 0, 0);
  const { data: result } = await worker.recognize(canvas);
  return { text: (result.text || '').toUpperCase(), confidence: result.confidence || 0 };
};

// OCR metninden 8 alanı çıkar
const parseOcrText = (text) => {
  if (!text) return {};
  const t = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

  let plaka = '', marka = '', modelYili = '', sase = '', tc = '', soyad = '', ad = '', belgeSeri = '';

  // PLAKA (A)
  const plakaM = t.match(/\(?A\)?\s*(?:PLAKA)?\s*[:\-]?\s*(\d{2}\s?[A-ZÇĞİÖŞÜ]{1,4}\s?\d{1,4})/i)
    || t.match(/PLAKA\s*[:\-]?\s*(\d{2}\s?[A-ZÇĞİÖŞÜ]{1,4}\s?\d{1,4})/i)
    || t.match(/(\d{2}\s?[A-ZÇĞİÖŞÜ]{1,4}\s?\d{2,4})/);
  if (plakaM) plaka = plakaM[1].replace(/\s+/g, '').toUpperCase();

  // MARKASI (D.1)
  const markaM = t.match(/\(?D[\.\s]?1\)?\s*[:\-]?\s*(?:MARKA(?:SI)?)?[:\-]?\s*([A-ZÇĞİÖŞÜa-zçğıöşü\s\-]{2,25}?)(?=\s*\(?[A-Z][\.\s]?\d|\s{2,}|\d{4}|$)/i)
    || t.match(/MARKA(?:SI)?\s*[:\-]?\s*([A-ZÇĞİÖŞÜ\s\-]{2,25}?)(?=\s*\(?[A-Z][\.\s]?\d|\s{2,}|\d{4}|$)/i);
  if (markaM) marka = markaM[1].trim().toUpperCase().replace(/\s+/g, ' ');

  // MODEL YILI (D.4)
  const modelM = t.match(/\(?D[\.\s]?4\)?\s*[:\-]?\s*(?:MODEL\s*Y[İI]L[İI]?)?\s*[:\-]?\s*((?:19|20)\d{2})/i)
    || t.match(/MODEL\s*Y[İI]L[İI]?\s*[:\-]?\s*((?:19|20)\d{2})/i);
  if (modelM) modelYili = modelM[1];

  // ŞASE NO (E) — 17 karakter VIN
  const saseM = t.match(/\(?E\)?\s*[:\-]?\s*(?:ŞASE|SASE)?\s*(?:NO|NUMARASI)?\s*[:\-]?\s*([A-HJ-NPR-Z0-9]{17})/i)
    || t.match(/(?:ŞASE|SASE)\s*(?:NO|NUMARASI)?\s*[:\-]?\s*([A-HJ-NPR-Z0-9]{17})/i)
    || t.match(/([A-HJ-NPR-Z0-9]{17})/i);
  if (saseM) {
    let vin = saseM[1].toUpperCase();
    // Yaygın OCR hataları düzelt: O->0 sayısal pozisyonlarda
    vin = vin.replace(/[OQ]/g, '0').replace(/[IL]/g, '1');
    sase = vin;
  }

  // T.C. / VERGİ NO (Y.4)
  const tcM = t.match(/\(?Y[\.\s]?4\)?\s*[:\-]?\s*(?:T\.?C\.?\s*K[İI]ML[İI]K|VERG[İI])\s*(?:NO|NUMARASI)?\s*[:\-]?\s*(\d{10,11})/i)
    || t.match(/(?:T\.?C\.?\s*(?:K[İI]ML[İI]K)?|VERG[İI])\s*(?:NO|NUMARASI)?\s*[:\-]?\s*(\d{10,11})/i)
    || t.match(/(\d{11})/);
  if (tcM) tc = tcM[1];
  if (!tc) {
    const vknM = t.match(/(\d{10})/);
    if (vknM) tc = vknM[1];
  }

  // SOYADI / TİCARİ ÜNVANI (C.1.1)
  const soyadM = t.match(/\(?C[\.\s]?1[\.\s]?1\)?\s*[:\-]?\s*(?:SOYADI?|T[İI]CAR[İI]\s*[ÜU]NVANI?)\s*[:\-]?\s*([A-ZÇĞİÖŞÜ\s]{2,50}?)(?=\s*\(?[A-Z][\.\s]?\d|\s{2,}|$)/i);
  if (soyadM) soyad = soyadM[1].trim().toUpperCase().replace(/\s+/g, ' ');

  // ADI (C.1.2)
  const adM = t.match(/\(?C[\.\s]?1[\.\s]?2\)?\s*[:\-]?\s*(?:ADI)?\s*[:\-]?\s*([A-ZÇĞİÖŞÜ\s]{2,30}?)(?=\s*\(?[A-Z][\.\s]?\d|\s{2,}|$)/i);
  if (adM) ad = adM[1].trim().toUpperCase().replace(/\s+/g, ' ');

  // BELGE SERİ NO
  const belgeM = t.match(/(?:BELGE\s*)?SER[İI]\s*(?:NO)?\s*[:\-]?\s*([A-Z]{2})\s*(?:NO|№)?\s*[:\-]?\s*(\d{5,7})/i)
    || t.match(/([A-Z]{2})\s*(\d{6})/);
  if (belgeM) belgeSeri = belgeM[1].toUpperCase() + ' ' + belgeM[2];

  return { plaka, marka, modelYili, sase, tc, soyad, ad, belgeSeri };
};

// QR + OCR sonuçlarını birleştir (QR öncelikli)
const mergeResults = (qrResult, ocrResult) => {
  const fields = ['plaka', 'sase', 'tc', 'belgeSeri'];
  const result = {
    plaka: '', marka: '', modelYili: '', sase: '', tc: '', soyad: '', ad: '', belgeSeri: '',
    raw: qrResult?.raw || '',
    ocrText: ocrResult?.rawText || '',
    ocrConfidence: ocrResult?.confidence || 0,
    source: {}
  };

  // QR alanları (QR öncelikli)
  fields.forEach(k => {
    if (qrResult?.[k]) {
      result[k] = qrResult[k];
      result.source[k] = 'qr';
    } else if (ocrResult?.[k]) {
      result[k] = ocrResult[k];
      result.source[k] = 'ocr';
    }
  });

  // Sadece OCR alanları
  ['marka', 'modelYili', 'soyad', 'ad'].forEach(k => {
    if (ocrResult?.[k]) {
      result[k] = ocrResult[k];
      result.source[k] = 'ocr';
    }
  });

  return result;
};

/* ═══ ANA SAYFA BİLEŞENİ ═══ */
MR.QrRuhsatPage = ({setPage, user}) => {
  const {C, S, toast, ICONS} = MR;
  const LIcon = ({name, size=18, color}) => {
    const p = ICONS?.[name];
    return p ? React.createElement('svg', {width:size, height:size, viewBox:'0 0 24 24', fill:'none', stroke:color||'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', dangerouslySetInnerHTML:{__html:p}}) : null;
  };

  const [files, setFiles] = useState([]);          // Yüklenen dosyalar [{file, preview, status, result}]
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Dosya yükleme işlemi
  const handleFiles = useCallback((fileList) => {
    const imgs = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (!imgs.length) {
      toast('LÜTFEN GÖRSEL DOSYA YÜKLEYİN (JPG, PNG)', 'warning');
      return;
    }

    const newFiles = imgs.map(f => ({
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      file: f,
      name: f.name,
      preview: URL.createObjectURL(f),
      status: 'pending',  // pending, processing, success, error
      result: null
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  // Drag & Drop
  const onDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // QR + OCR okuma başlat
  const processAll = useCallback(async () => {
    const pending = files.filter(f => f.status === 'pending' || f.status === 'error');
    if (!pending.length) {
      toast('İŞLENECEK RUHSAT BULUNMUYOR', 'warning');
      return;
    }

    setProcessing(true);

    for (const item of pending) {
      setFiles(prev => prev.map(f => f.id === item.id ? {...f, status: 'processing', substatus: 'qr', ocrProgress: 0} : f));

      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = item.preview;
        });

        // 1. QR Tarama (hızlı)
        const qrResult = await readQrFromImage(img);
        let qrParsed = null;
        if (qrResult.success) {
          qrParsed = parseQrData(qrResult.data);
        }

        // 2. OCR Tarama (yavaş, ama tüm alanları çıkarır)
        let ocrParsed = null;
        let ocrText = '';
        let ocrConfidence = 0;
        setFiles(prev => prev.map(f => f.id === item.id ? {...f, substatus: 'ocr', ocrProgress: 0} : f));

        try {
          const ocrResult = await Promise.race([
            runOcrOnImage(img, (progress) => {
              setFiles(prev => prev.map(f => f.id === item.id ? {...f, ocrProgress: progress} : f));
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('OCR ZAMAN AŞIMI')), 30000))
          ]);
          ocrText = ocrResult.text;
          ocrConfidence = ocrResult.confidence;
          if (ocrConfidence >= 30) {
            ocrParsed = parseOcrText(ocrText);
          }
        } catch (ocrErr) {
          console.warn('OCR HATASI:', ocrErr.message);
        }

        // 3. Birleştir
        const merged = mergeResults(qrParsed, ocrParsed ? {...ocrParsed, rawText: ocrText, confidence: ocrConfidence} : null);
        merged.qrRaw = qrResult.success ? qrResult.data : '';
        merged.ocrText = ocrText;
        merged.ocrConfidence = ocrConfidence;

        // Herhangi bir alan bulunduysa başarılı say
        const fieldCount = ['plaka','marka','modelYili','sase','tc','soyad','ad','belgeSeri'].filter(k => merged[k]).length;

        if (fieldCount > 0) {
          setFiles(prev => prev.map(f => f.id === item.id ? {
            ...f,
            status: 'success',
            substatus: null,
            ocrProgress: 1,
            result: merged
          } : f));
        } else {
          setFiles(prev => prev.map(f => f.id === item.id ? {
            ...f,
            status: 'error',
            substatus: null,
            result: { error: 'QR KOD VE OCR İLE BİLGİ ÇIKARILAMADI', ocrText, ocrConfidence }
          } : f));
        }
      } catch (e) {
        setFiles(prev => prev.map(f => f.id === item.id ? {
          ...f,
          status: 'error',
          substatus: null,
          result: { error: 'GÖRÜNTÜ YÜKLENEMEDİ: ' + e.message }
        } : f));
      }
    }

    setProcessing(false);
    const successCount2 = files.filter(f => f.status === 'success').length;
    toast('TARAMA TAMAMLANDI', 'success');
  }, [files]);

  // Tek dosya sil
  const removeFile = useCallback((id) => {
    setFiles(prev => {
      const f = prev.find(x => x.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter(x => x.id !== id);
    });
  }, []);

  // Tümünü temizle
  const clearAll = useCallback(() => {
    files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    setFiles([]);
  }, [files]);

  // Sonuçları kopyala
  const copyResults = useCallback(() => {
    const success = files.filter(f => f.status === 'success' && f.result);
    if (!success.length) { toast('KOPYALANACAK SONUÇ YOK', 'warning'); return; }

    const text = success.map((f, i) => {
      const r = f.result;
      return `${i+1}. RUHSAT\n` +
        `   (A) PLAKA                       : ${r.plaka || '-'}\n` +
        `   (D.1) MARKASI                   : ${r.marka || '-'}\n` +
        `   (D.4) MODEL YILI                : ${r.modelYili || '-'}\n` +
        `   (E) ŞASE NUMARASI               : ${r.sase || '-'}\n` +
        `   (Y.4) T.C. / VERGİ NO           : ${r.tc || '-'}\n` +
        `   (C.1.1) SOYADI / TİCARİ ÜNVANI  : ${r.soyad || '-'}\n` +
        `   (C.1.2) ADI                      : ${r.ad || '-'}\n` +
        `   BELGE SERİ NO                    : ${r.belgeSeri || '-'}`;
    }).join('\n\n');

    navigator.clipboard.writeText(text).then(() => toast('SONUÇLAR PANOYA KOPYALANDI', 'success'));
  }, [files]);

  // Excel'e aktar
  const exportExcel = useCallback(() => {
    const success = files.filter(f => f.status === 'success' && f.result);
    if (!success.length) { toast('AKTARILACAK SONUÇ YOK', 'warning'); return; }

    const data = success.map((f, i) => ({
      'SIRA': i + 1,
      '(A) PLAKA': f.result.plaka || '',
      '(D.1) MARKASI': f.result.marka || '',
      '(D.4) MODEL YILI': f.result.modelYili || '',
      '(E) ŞASE NUMARASI': f.result.sase || '',
      '(Y.4) T.C. / VERGİ NO': f.result.tc || '',
      '(C.1.1) SOYADI': f.result.soyad || '',
      '(C.1.2) ADI': f.result.ad || '',
      'BELGE SERİ NO': f.result.belgeSeri || '',
      'OCR GÜVENİLİRLİK %': f.result.ocrConfidence ? Math.round(f.result.ocrConfidence) : ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      {wch:6}, {wch:15}, {wch:18}, {wch:12}, {wch:22}, {wch:20}, {wch:25}, {wch:18}, {wch:18}, {wch:16}
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RUHSAT QR SONUÇLARI');
    XLSX.writeFile(wb, `RUHSAT_QR_SONUC_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast('EXCEL DOSYASI İNDİRİLDİ', 'success');
  }, [files]);

  // Manuel düzenleme
  const updateResult = useCallback((id, field, value) => {
    setFiles(prev => prev.map(f => f.id === id ? {
      ...f,
      result: { ...f.result, [field]: value }
    } : f));
  }, []);

  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;

  /* ═══ RENDER ═══ */
  return React.createElement('div', {style: {padding: '24px 20px', maxWidth: 1400, margin: '0 auto'}},

    /* BAŞLIK */
    React.createElement('div', {style: {display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 24, flexWrap:'wrap', gap: 12}},
      React.createElement('div', {style: {display:'flex', alignItems:'center', gap: 12}},
        React.createElement('div', {style: {
          width: 48, height: 48, borderRadius: 14,
          background: `linear-gradient(135deg, ${C.accent}, ${C.accentHover || C.accent})`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: `0 8px 24px ${C.accent}33`
        }},
          React.createElement(LIcon, {name:'QrCode', size:26, color:'#fff'})
        ),
        React.createElement('div', null,
          React.createElement('h1', {style: {fontSize: 22, fontWeight: 900, color: C.text, margin: 0}}, 'QR RUHSAT OKUYUCU'),
          React.createElement('p', {style: {fontSize: 12, color: C.textMuted, margin: 0, fontWeight: 600}}, 'ARAÇ RUHSATI QR + OCR OTOMATİK BİLGİ ÇIKARMA')
        )
      ),
      files.length > 0 && React.createElement('div', {style: {display:'flex', gap: 8, flexWrap:'wrap'}},
        React.createElement('button', {
          onClick: copyResults,
          disabled: !successCount,
          style: {...S.btn, ...(S.btnSuccess || {background: C.success || '#10b981'}), padding:'10px 18px', borderRadius:10, color:'#fff', fontSize:12, fontWeight:800, cursor: successCount ? 'pointer' : 'not-allowed', opacity: successCount ? 1 : 0.5, border:'none', display:'flex', alignItems:'center', gap:6}
        },
          React.createElement(LIcon, {name:'Copy', size:15, color:'#fff'}),
          'KOPYALA'
        ),
        React.createElement('button', {
          onClick: exportExcel,
          disabled: !successCount,
          style: {...S.btn, background: '#059669', padding:'10px 18px', borderRadius:10, color:'#fff', fontSize:12, fontWeight:800, cursor: successCount ? 'pointer' : 'not-allowed', opacity: successCount ? 1 : 0.5, border:'none', display:'flex', alignItems:'center', gap:6}
        },
          React.createElement(LIcon, {name:'FileSpreadsheet', size:15, color:'#fff'}),
          'EXCEL İNDİR'
        ),
        React.createElement('button', {
          onClick: clearAll,
          style: {...S.btn, background: C.danger || '#ef4444', padding:'10px 18px', borderRadius:10, color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer', border:'none', display:'flex', alignItems:'center', gap:6}
        },
          React.createElement(LIcon, {name:'Trash2', size:15, color:'#fff'}),
          'TEMİZLE'
        )
      )
    ),

    /* İSTATİSTİK KARTLARI */
    files.length > 0 && React.createElement('div', {style: {display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12, marginBottom:20}},
      [{label:'TOPLAM', val: files.length, color: C.accent, icon:'Image'},
       {label:'BAŞARILI', val: successCount, color: C.success || '#10b981', icon:'CheckCircle'},
       {label:'HATA', val: errorCount, color: C.danger || '#ef4444', icon:'AlertCircle'},
       {label:'BEKLEYEN', val: pendingCount, color: C.warning || '#f59e0b', icon:'Clock'}
      ].map((s, i) => React.createElement('div', {key:i, style: {
        ...S.card, padding:'16px 18px', display:'flex', alignItems:'center', gap:12
      }},
        React.createElement('div', {style: {
          width:40, height:40, borderRadius:10,
          background: s.color + '18', display:'flex', alignItems:'center', justifyContent:'center'
        }}, React.createElement(LIcon, {name:s.icon, size:20, color:s.color})),
        React.createElement('div', null,
          React.createElement('div', {style: {fontSize:22, fontWeight:900, color:s.color}}, s.val),
          React.createElement('div', {style: {fontSize:10, fontWeight:700, color:C.textMuted}}, s.label)
        )
      ))
    ),

    /* YÜKLEME ALANI */
    React.createElement('div', {
      onDragOver,
      onDragLeave,
      onDrop,
      onClick: () => fileInputRef.current?.click(),
      style: {
        ...S.card,
        padding: '40px 20px',
        textAlign: 'center',
        cursor: 'pointer',
        border: `2px dashed ${dragOver ? C.accent : C.border}`,
        background: dragOver ? (C.accent + '08') : C.bgCard,
        transition: 'all 0.3s ease',
        marginBottom: 20
      }
    },
      React.createElement('input', {
        ref: fileInputRef,
        type: 'file',
        accept: 'image/*',
        multiple: true,
        style: {display:'none'},
        onChange: (e) => { handleFiles(e.target.files); e.target.value = ''; }
      }),
      React.createElement('input', {
        ref: cameraInputRef,
        type: 'file',
        accept: 'image/*',
        capture: 'environment',
        style: {display:'none'},
        onChange: (e) => { handleFiles(e.target.files); e.target.value = ''; }
      }),
      React.createElement('div', {style: {
        width: 72, height: 72, borderRadius: '50%',
        background: C.accent + '15',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px'
      }},
        React.createElement(LIcon, {name:'Upload', size:32, color: C.accent})
      ),
      React.createElement('div', {style: {fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 6}},
        'ARAÇ RUHSATI GÖRSELLERİNİ YÜKLEYİN'
      ),
      React.createElement('div', {style: {fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 16}},
        'SÜRÜKLE & BIRAK VEYA TIKLA • TOPLU YÜKLEME DESTEKLİ • JPG, PNG, WEBP'
      ),
      React.createElement('div', {style: {display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap'}},
        React.createElement('button', {
          onClick: (e) => { e.stopPropagation(); fileInputRef.current?.click(); },
          style: {background: C.accent, color:'#fff', border:'none', borderRadius:10, padding:'12px 24px', fontSize:13, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:8}
        },
          React.createElement(LIcon, {name:'Image', size:18, color:'#fff'}),
          'DOSYA SEÇ'
        ),
        React.createElement('button', {
          onClick: (e) => { e.stopPropagation(); cameraInputRef.current?.click(); },
          style: {background: C.success || '#10b981', color:'#fff', border:'none', borderRadius:10, padding:'12px 24px', fontSize:13, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:8}
        },
          React.createElement(LIcon, {name:'Camera', size:18, color:'#fff'}),
          'KAMERA ÇEK'
        )
      )
    ),

    /* TARA BUTONU */
    files.length > 0 && pendingCount > 0 && React.createElement('div', {style: {textAlign:'center', marginBottom: 20}},
      React.createElement('button', {
        onClick: processAll,
        disabled: processing,
        style: {
          background: processing ? C.textMuted : `linear-gradient(135deg, ${C.accent}, ${C.accentHover || '#3b82f6'})`,
          color: '#fff', border: 'none', borderRadius: 14,
          padding: '16px 48px', fontSize: 15, fontWeight: 900,
          cursor: processing ? 'not-allowed' : 'pointer',
          boxShadow: `0 8px 32px ${C.accent}44`,
          display: 'inline-flex', alignItems: 'center', gap: 10,
          transition: 'all 0.3s ease'
        }
      },
        processing
          ? React.createElement('div', {style: {width:20, height:20, border:'3px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite'}})
          : React.createElement(LIcon, {name:'QrCode', size:22, color:'#fff'}),
        processing ? `QR + OCR TARANIYOR... (${files.filter(f=>f.status==='processing').length}/${pendingCount})` : `${pendingCount} RUHSATI TARA (QR + OCR)`
      )
    ),

    /* SONUÇLAR LİSTESİ */
    files.length > 0 && React.createElement('div', {style: {display:'grid', gap: 16}},
      files.map((item, idx) => React.createElement('div', {
        key: item.id,
        style: {
          ...S.card,
          border: `1px solid ${item.status === 'success' ? (C.success || '#10b981') + '40' : item.status === 'error' ? (C.danger || '#ef4444') + '40' : item.status === 'processing' ? C.accent + '40' : C.border}`,
          animation: 'fadeIn 0.3s ease'
        }
      },
        React.createElement('div', {style: {
          ...S.cardHead,
          background: item.status === 'success' ? (C.success || '#10b981') + '08' : item.status === 'error' ? (C.danger || '#ef4444') + '08' : 'transparent'
        }},
          React.createElement('div', {style: {
            width: 32, height: 32, borderRadius: 8,
            background: item.status === 'success' ? (C.success || '#10b981') + '20' : item.status === 'error' ? (C.danger || '#ef4444') + '20' : item.status === 'processing' ? C.accent + '20' : C.border + '40',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }},
            item.status === 'processing'
              ? React.createElement('div', {style: {width:16, height:16, border:`2px solid ${C.accent}40`, borderTopColor:C.accent, borderRadius:'50%', animation:'spin 0.8s linear infinite'}})
              : React.createElement(LIcon, {
                  name: item.status === 'success' ? 'CheckCircle' : item.status === 'error' ? 'AlertCircle' : 'Image',
                  size: 16,
                  color: item.status === 'success' ? (C.success || '#10b981') : item.status === 'error' ? (C.danger || '#ef4444') : C.textMuted
                })
          ),
          React.createElement('div', {style: {flex:1}},
            React.createElement('div', {style: {fontSize:13, fontWeight:800, color:C.text}}, `${idx+1}. ${item.name}`),
            React.createElement('div', {style: {fontSize:10, fontWeight:600, color:C.textMuted}},
              item.status === 'pending' ? 'TARANMAYI BEKLİYOR' :
              item.status === 'processing' ? (item.substatus === 'ocr' ? `OCR METİN TANIMA... %${Math.round((item.ocrProgress || 0) * 100)}` : 'QR KOD OKUNUYOR...') :
              item.status === 'success' ? `BAŞARILI - ${['plaka','marka','modelYili','sase','tc','soyad','ad','belgeSeri'].filter(k => item.result?.[k]).length}/8 ALAN OKUNDU` :
              'HATA - ' + (item.result?.error || 'QR KOD OKUNAMADI')
            )
          ),
          React.createElement('button', {
            onClick: () => removeFile(item.id),
            style: {background:'transparent', border:'none', cursor:'pointer', padding:4}
          }, React.createElement(LIcon, {name:'X', size:18, color: C.danger || '#ef4444'}))
        ),

        /* İÇERİK: Görsel + Sonuç */
        React.createElement('div', {style: {
          ...S.cardBody,
          display: 'grid',
          gridTemplateColumns: window.innerWidth > 768 ? '200px 1fr' : '1fr',
          gap: 20
        }},
          /* Görsel önizleme */
          React.createElement('div', {style: {
            borderRadius: 12, overflow: 'hidden',
            border: `1px solid ${C.border}`,
            background: C.bgInput || '#1e293b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 140
          }},
            React.createElement('img', {
              src: item.preview,
              style: {width:'100%', height:'auto', maxHeight: 260, objectFit:'contain', display:'block'}
            })
          ),

          /* Sonuç alanları */
          item.status === 'success' && item.result
            ? React.createElement('div', {style: {display:'grid', gap: 12}},
                /* Her alan için düzenlenebilir input (8 alan) */
                [
                  {key:'plaka',     label:'(A) PLAKA',                       icon:'Car',        placeholder:'Örn: 34ABC123'},
                  {key:'marka',     label:'(D.1) MARKASI',                   icon:'Tag',        placeholder:'Örn: TOYOTA'},
                  {key:'modelYili', label:'(D.4) MODEL YILI',                icon:'Calendar',   placeholder:'Örn: 2020'},
                  {key:'sase',      label:'(E) ŞASE NUMARASI',              icon:'Hash',       placeholder:'17 karakterli şase numarası'},
                  {key:'tc',        label:'(Y.4) T.C. / VERGİ NO',          icon:'CreditCard', placeholder:'10-11 haneli'},
                  {key:'soyad',     label:'(C.1.1) SOYADI / TİCARİ ÜNVANI', icon:'User',       placeholder:'Soyadı veya ticari ünvan'},
                  {key:'ad',        label:'(C.1.2) ADI',                     icon:'User',       placeholder:'Adı'},
                  {key:'belgeSeri', label:'BELGE SERİ NO',                   icon:'FileText',   placeholder:'Örn: HD 120077'}
                ].map(field => React.createElement('div', {key:field.key},
                  React.createElement('label', {style: {fontSize:10, fontWeight:800, color:C.textMuted, marginBottom:4, display:'flex', alignItems:'center', gap:4}},
                    React.createElement(LIcon, {name:field.icon, size:12, color:C.accent}),
                    field.label,
                    /* Kaynak rozeti (QR/OCR) */
                    item.result.source?.[field.key] === 'qr'
                      ? React.createElement('span', {style: {fontSize:8, fontWeight:900, background:(C.success||'#10b981')+'25', color:C.success||'#10b981', padding:'1px 5px', borderRadius:4, marginLeft:4}}, 'QR')
                      : item.result.source?.[field.key] === 'ocr'
                        ? React.createElement('span', {style: {fontSize:8, fontWeight:900, background:C.accent+'25', color:C.accent, padding:'1px 5px', borderRadius:4, marginLeft:4}}, 'OCR')
                        : null
                  ),
                  React.createElement('input', {
                    value: item.result[field.key] || '',
                    onChange: (e) => updateResult(item.id, field.key, e.target.value),
                    placeholder: field.placeholder,
                    style: {
                      ...S.input,
                      fontSize: 14,
                      fontWeight: 800,
                      padding: '10px 14px',
                      background: item.result[field.key] ? (C.success || '#10b981') + '08' : C.bgInput,
                      borderColor: item.result[field.key] ? (C.success || '#10b981') + '30' : C.border
                    }
                  })
                )),
                /* QR Ham Veri toggle */
                item.result.qrRaw && React.createElement('details', {style: {marginTop: 4}},
                  React.createElement('summary', {style: {fontSize:10, fontWeight:700, color:C.textMuted, cursor:'pointer', userSelect:'none'}}, 'QR HAM VERİ'),
                  React.createElement('pre', {style: {
                    fontSize: 10, color: C.textMuted, marginTop: 6,
                    padding: 10, borderRadius: 8,
                    background: C.bgInput || '#1e293b',
                    border: `1px solid ${C.border}`,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    maxHeight: 120, overflow: 'auto'
                  }}, item.result.qrRaw || '-')
                ),
                /* OCR Ham Metin toggle */
                item.result.ocrText && React.createElement('details', {style: {marginTop: 4}},
                  React.createElement('summary', {style: {fontSize:10, fontWeight:700, color:C.textMuted, cursor:'pointer', userSelect:'none'}},
                    `OCR HAM METİN (GÜVENİLİRLİK: %${Math.round(item.result.ocrConfidence || 0)})`
                  ),
                  React.createElement('pre', {style: {
                    fontSize: 10, color: C.textMuted, marginTop: 6,
                    padding: 10, borderRadius: 8,
                    background: C.bgInput || '#1e293b',
                    border: `1px solid ${C.border}`,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    maxHeight: 120, overflow: 'auto'
                  }}, item.result.ocrText || '-')
                )
              )
            : item.status === 'error'
              ? React.createElement('div', {style: {display:'flex', alignItems:'center', justifyContent:'center', color: C.danger || '#ef4444', fontSize:13, fontWeight:700, gap:8}},
                  React.createElement(LIcon, {name:'AlertTriangle', size:20, color: C.danger || '#ef4444'}),
                  React.createElement('div', null,
                    React.createElement('div', null, item.result?.error || 'QR KOD OKUNAMADI'),
                    React.createElement('div', {style: {fontSize:10, color:C.textMuted, marginTop:4, fontWeight:600}}, 'GÖRSEL KALİTESİNİ KONTROL EDİN VEYA QR KODUN NET OLDUĞUNDAN EMİN OLUN')
                  )
                )
              : item.status === 'processing'
                ? React.createElement('div', {style: {display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:20}},
                    React.createElement('div', {style: {display:'flex', alignItems:'center', gap:10}},
                      React.createElement('div', {style: {width:24, height:24, border:`3px solid ${C.accent}30`, borderTopColor:C.accent, borderRadius:'50%', animation:'spin 0.8s linear infinite'}}),
                      React.createElement('span', {style: {fontSize:13, fontWeight:700, color:C.accent}},
                        item.substatus === 'ocr' ? `OCR METİN TANIMA... %${Math.round((item.ocrProgress || 0) * 100)}` : 'QR KOD TARANIYOR...'
                      )
                    ),
                    item.substatus === 'ocr' && React.createElement('div', {style: {width:'100%', maxWidth:300, height:6, borderRadius:3, background:C.accent+'20', overflow:'hidden'}},
                      React.createElement('div', {style: {height:'100%', borderRadius:3, background:C.accent, width:`${Math.round((item.ocrProgress || 0) * 100)}%`, transition:'width 0.3s ease'}})
                    )
                  )
                : React.createElement('div', {style: {display:'flex', alignItems:'center', justifyContent:'center', color:C.textMuted, fontSize:12, fontWeight:600}},
                    '"TARA" BUTONUNA BASARAK QR OKUMA BAŞLATIN'
                  )
        )
      ))
    ),

    /* BOŞ DURUM */
    files.length === 0 && React.createElement('div', {style: {
      ...S.card, padding: '60px 20px', textAlign: 'center'
    }},
      React.createElement('div', {style: {
        width: 80, height: 80, borderRadius: '50%',
        background: C.accent + '12',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px'
      }},
        React.createElement(LIcon, {name:'QrCode', size:36, color: C.accent})
      ),
      React.createElement('div', {style: {fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 8}},
        'ARAÇ RUHSATI QR OKUYUCU'
      ),
      React.createElement('div', {style: {fontSize: 12, color: C.textMuted, fontWeight: 600, maxWidth: 500, margin: '0 auto', lineHeight: 1.8}},
        'ARAÇ RUHSATI GÖRSELLERİNİ YÜKLEYİN, QR KOD + OCR METİN TANIMA İLE PLAKA, MARKA, MODEL YILI, ŞASE NO, T.C./VERGİ NO, SOYADI, ADI VE BELGE SERİ NO BİLGİLERİ OTOMATİK ÇIKARILIR. TOPLU YÜKLEME İLE BİRDEN FAZLA RUHSATI AYNI ANDA İŞLEYEBİLİRSİNİZ.'
      ),
      React.createElement('div', {style: {display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginTop:28, maxWidth:600, margin:'28px auto 0'}},
        [
          {icon:'Upload', text:'TOPLU GÖRSEL YÜKLEME'},
          {icon:'QrCode', text:'OTOMATİK QR OKUMA'},
          {icon:'FileSearch', text:'OCR METİN TANIMA'},
          {icon:'FileSpreadsheet', text:'EXCEL AKTARIM'},
          {icon:'Camera', text:'KAMERA DESTEĞİ'}
        ].map((f, i) => React.createElement('div', {key:i, style: {
          padding:'14px 12px', borderRadius:12,
          background: C.accent + '08',
          border: `1px solid ${C.accent}15`,
          display:'flex', alignItems:'center', gap:8
        }},
          React.createElement(LIcon, {name:f.icon, size:16, color:C.accent}),
          React.createElement('span', {style: {fontSize:11, fontWeight:700, color:C.text}}, f.text)
        ))
      )
    )
  );
};
