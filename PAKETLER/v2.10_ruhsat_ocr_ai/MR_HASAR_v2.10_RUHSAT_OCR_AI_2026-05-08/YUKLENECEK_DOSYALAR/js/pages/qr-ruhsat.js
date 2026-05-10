/**
 * MR HASAR DANIŞMANLIK — RUHSAT OKUYUCU v2.10
 * Tesseract.js (TR OCR) + OpenRouter AI (anthropic/claude-sonnet-4-5) hibrit ruhsat okuma.
 * BİREBİR uygulanmış sürüm — apı key özellikleri "sk-or-v1-..." ve localStorage anahtarı `mrh_orkey` aynen.
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useRef, useMemo} = React;

/* ───────────────────────────────────────────────
   SABİTLER
   ─────────────────────────────────────────────── */
const KEYS_LS = { ruhsat: 'mrh_ruhsat_v2', orkey: 'mrh_orkey' };
const HISTORY_LIMIT = 200;
const ORKEY = { v: localStorage.getItem(KEYS_LS.orkey) || '' };
const RF = [
  { key: 'adiSoyadi',  label: 'ADI SOYADI',       code: 'C.1.2+1.1' },
  { key: 'tcVergiNo',  label: 'VERGİ / T.C. NO',  code: 'Y.4' },
  { key: 'plaka',      label: 'PLAKA',            code: 'A' },
  { key: 'belge',      label: 'BELGE SERİ NO',    code: 'BELGE' },
  { key: 'saseNo',     label: 'ŞASE NO',          code: 'E' },
  { key: 'marka',      label: 'MARKA',            code: 'D.1' },
  { key: 'modelYili',  label: 'MODEL YILI',       code: 'D.4' }
];

/* ───────────────────────────────────────────────
   ORTAK YARDIMCILAR
   ─────────────────────────────────────────────── */
const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const trUpper = (s) => (s || '').toString()
  .replace(/i̇/g, 'İ').replace(/ı/g, 'I').replace(/i/g, 'İ')
  .replace(/ç/g, 'Ç').replace(/ğ/g, 'Ğ').replace(/ö/g, 'Ö')
  .replace(/ş/g, 'Ş').replace(/ü/g, 'Ü').toUpperCase();

const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem(KEYS_LS.ruhsat) || '[]'); }
  catch { return []; }
};
const saveHistory = (rows) => {
  const trim = rows.slice(0, HISTORY_LIMIT);
  localStorage.setItem(KEYS_LS.ruhsat, JSON.stringify(trim));
  return trim;
};

/* ───────────────────────────────────────────────
   OPENROUTER ÇAĞRISI
   ─────────────────────────────────────────────── */
async function callAI(userContent, system, maxTokens = 1800) {
  if (!ORKEY.v || !ORKEY.v.startsWith('sk-or-v1-')) {
    throw new Error('OpenRouter API anahtarı tanımlı değil. (Ayarlardan girin)');
  }
  const msgs = [];
  if (system) msgs.push({ role: 'system', content: system });
  msgs.push({ role: 'user', content: userContent });

  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ORKEY.v}`,
      'HTTP-Referer': 'https://mrhasardanismanlik.com',
      'X-Title': 'MR Hasar Platform'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-5',
      max_tokens: maxTokens,
      messages: msgs
    })
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error('AI HTTP ' + r.status + ' — ' + (t || 'hata'));
  }
  const j = await r.json();
  const txt = j?.choices?.[0]?.message?.content || '';
  return txt;
}

/* ───────────────────────────────────────────────
   OCR — Tesseract.js (TR)
   ─────────────────────────────────────────────── */
async function runOCR(file, onProgress) {
  if (typeof Tesseract === 'undefined') throw new Error('Tesseract.js yüklenemedi.');
  const r = await Tesseract.recognize(file, 'tur', {
    logger: (m) => { if (onProgress && m.status === 'recognizing text') onProgress(Math.round((m.progress || 0) * 100)); }
  });
  const text = r?.data?.text || '';
  const conf = (r?.data?.confidence || 0) / 100;
  return { text, conf };
}

/* ───────────────────────────────────────────────
   REGEX TABANLI PARSE
   ─────────────────────────────────────────────── */
function parseOCR(raw) {
  const out = { adiSoyadi: '', tcVergiNo: '', plaka: '', belge: '', saseNo: '', marka: '', modelYili: '' };
  if (!raw) return out;
  const text = raw.replace(/\s+/g, ' ').trim();
  const U = trUpper(text);

  /* PLAKA */
  const plMatch = U.match(/\b(\d{2})\s*([A-ZÇĞİÖŞÜ]{1,3})\s*(\d{2,4})\b/);
  if (plMatch) out.plaka = (plMatch[1] + ' ' + plMatch[2] + ' ' + plMatch[3]).replace(/\s+/g, ' ').trim();

  /* TC / VERGİ NO (10–11 hane) */
  const tcMatch = text.match(/\b(\d{11})\b/) || text.match(/\b(\d{10})\b/);
  if (tcMatch) out.tcVergiNo = tcMatch[1];

  /* ŞASE / VIN — 17 karakter, I/O/Q yok */
  const vinMatch = U.match(/\b([A-HJ-NPR-Z0-9]{17})\b/);
  if (vinMatch) out.saseNo = vinMatch[1];

  /* MODEL YILI */
  const yrMatch = U.match(/\b(19[8-9]\d|20[0-4]\d)\b/);
  if (yrMatch) out.modelYili = yrMatch[1];

  /* MARKA — yaygın markalar listesi */
  const markalar = ['RENAULT','FIAT','FORD','VOLKSWAGEN','VW','MERCEDES','MERCEDES-BENZ','BMW','AUDI','OPEL','PEUGEOT','CITROEN','TOYOTA','HONDA','HYUNDAI','KIA','NISSAN','MAZDA','MITSUBISHI','SKODA','SEAT','DACIA','VOLVO','CHEVROLET','SUZUKI','SUBARU','LEXUS','LAND ROVER','ROVER','MINI','PORSCHE','JEEP','DODGE','CHRYSLER','SSANGYONG','TATA','ISUZU','IVECO','MAN','SCANIA','DAF','TEMSA','BMC','OTOKAR','KARSAN','TOFAS','TOFAŞ','TESLA','CUPRA'];
  for (const m of markalar) {
    const re = new RegExp('\\b' + m.replace(/[-]/g, '[- ]') + '\\b', 'i');
    if (re.test(U)) { out.marka = m; break; }
  }

  /* BELGE SERİ — örn "AB 123456" */
  const belgeMatch = U.match(/\b([A-Z]{2})\s?(\d{5,7})\b/);
  if (belgeMatch && belgeMatch[1] !== out.plaka.split(' ')[1]) {
    out.belge = (belgeMatch[1] + ' ' + belgeMatch[2]).trim();
  }

  /* ADI SOYADI — büyük harfli ardışık 2+ kelime */
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const ln of lines) {
    const u = trUpper(ln).replace(/[^A-ZÇĞİÖŞÜ\s]/g, '').trim();
    const parts = u.split(/\s+/).filter(p => p.length >= 2);
    if (parts.length >= 2 && parts.length <= 5 && parts.every(p => /^[A-ZÇĞİÖŞÜ]+$/.test(p))) {
      const skip = ['MOTORLU','TASIT','TAŞIT','BELGESİ','BELGESI','RUHSAT','TESCİL','TESCIL','TÜRKİYE','TURKIYE','CUMHURİYETİ','CUMHURIYETI','EMNİYET','EMNIYET','GENEL','MÜDÜRLÜĞÜ','MUDURLUGU','TRAFİK','TRAFIK','ARAÇ','ARAC','BİLGİLERİ','BILGILERI'];
      if (!parts.some(p => skip.includes(p))) { out.adiSoyadi = parts.join(' '); break; }
    }
  }

  return out;
}

/* ───────────────────────────────────────────────
   AI FALLBACK — eksik alanları tamamla
   ─────────────────────────────────────────────── */
async function ruhsatAI(rawText, current) {
  const sys = `Sen Türkiye trafik tescil belgesi (ruhsat) okuyucusun. Aşağıdaki OCR çıktısından sadece JSON döndür.
Alanlar: adiSoyadi, tcVergiNo (10 veya 11 hane), plaka (ör "34 ABC 123"), belge (BELGE SERİ NO), saseNo (17 karakter VIN), marka, modelYili (4 hane).
Bilinmeyen alanı boş string ("") yap. Sadece JSON, açıklama yok.`;
  const user = `OCR ÇIKTISI:\n${rawText}\n\nÖN PARSE:\n${JSON.stringify(current)}`;
  const txt = await callAI(user, sys, 800);
  // JSON ayıkla
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('AI JSON döndürmedi');
  let obj;
  try { obj = JSON.parse(m[0]); } catch { throw new Error('AI JSON parse hatası'); }
  const merged = { ...current };
  RF.forEach(f => { if (obj[f.key] && !merged[f.key]) merged[f.key] = String(obj[f.key]).trim(); });
  return merged;
}

/* ───────────────────────────────────────────────
   EXCEL EXPORT — turuncu (FF6B35) başlık
   ─────────────────────────────────────────────── */
function exportXLSX(rows) {
  if (typeof XLSX === 'undefined') { alert('XLSX kütüphanesi yüklenmedi.'); return; }
  const headers = ['#', ...RF.map(f => f.label), 'KAYNAK', 'TARİH'];
  const data = [headers];
  rows.forEach((r, i) => {
    data.push([
      i + 1,
      ...RF.map(f => r[f.key] || ''),
      (r.kaynak || 'OCR').toUpperCase(),
      (r.tarih || '').slice(0, 10)
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(data);
  // Stil — başlık satırı turuncu
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'FF6B35' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    };
  }
  ws['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 16 }, { wch: 13 }, { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 11 }, { wch: 9 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'RUHSAT');
  XLSX.writeFile(wb, 'RUHSAT_OCR_' + todayISO() + '.xlsx');
}

/* ───────────────────────────────────────────────
   PDF — RUHSAT ANALİZ RAPORU
   ─────────────────────────────────────────────── */
function ruhsatPDFHtml(row) {
  const css = `
    @page { size: A4; margin: 18mm 14mm; }
    body { font-family: Arial, Helvetica, sans-serif; color:#1f2937; margin:0; }
    .top { display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid #FF6B35; padding-bottom:10px; margin-bottom:14px; }
    .top h1 { color:#FF6B35; margin:0; font-size:20px; letter-spacing:.5px; }
    .top .meta { font-size:11px; color:#6b7280; text-align:right; }
    table { width:100%; border-collapse:collapse; margin-top:12px; font-size:12px; }
    th, td { border:1px solid #cbd5e1; padding:8px 10px; text-align:left; }
    th { background:#FF6B35; color:#fff; width:36%; }
    td.code { background:#fff7ed; color:#9a3412; font-weight:700; width:14%; text-align:center; }
    .src { display:inline-block; padding:3px 9px; border-radius:999px; font-size:10px; font-weight:700; }
    .src.ocr { background:#dbeafe; color:#1e40af; }
    .src.ai  { background:#ede9fe; color:#5b21b6; }
    .footer { margin-top:18px; border-top:1px solid #e5e7eb; padding-top:8px; font-size:10px; color:#6b7280; text-align:center; }
  `;
  const sourceClass = (row.kaynak === 'AI') ? 'ai' : 'ocr';
  const rows = RF.map(f => `
    <tr>
      <th>${f.label}</th>
      <td class="code">${f.code}</td>
      <td>${(row[f.key] || '').toString().replace(/[<>]/g, '')}</td>
    </tr>
  `).join('');
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>RUHSAT ANALİZ RAPORU</title><style>${css}</style></head>
<body>
  <div class="top">
    <div>
      <h1>RUHSAT ANALİZ RAPORU</h1>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">MR HASAR DANIŞMANLIK</div>
    </div>
    <div class="meta">
      <div>Rapor Tarihi: <b>${(row.tarih || todayISO()).slice(0, 10)}</b></div>
      <div>Kaynak: <span class="src ${sourceClass}">${(row.kaynak || 'OCR').toUpperCase()}</span></div>
    </div>
  </div>
  <table>
    <thead><tr><th>ALAN</th><th class="code">KOD</th><th>DEĞER</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">© MR Hasar Danışmanlık — RUHSAT OKUYUCU v2.10</div>
</body></html>`;
}

function openPDF(html) {
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, { position: 'fixed', right: 0, bottom: 0, width: 0, height: 0, border: 0, opacity: 0 });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  setTimeout(() => {
    try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) {}
    setTimeout(() => { try { document.body.removeChild(iframe); } catch (e) {} }, 800);
  }, 350);
}

/* ───────────────────────────────────────────────
   AYAR MODALİ — API KEY (sk-or-v1-...)
   ─────────────────────────────────────────────── */
const ApiKeyModal = ({ open, onClose, onSaved }) => {
  const C = MR.C, S = MR.S, LIcon = MR.LIcon;
  const [val, setVal] = useState(ORKEY.v || '');
  const [show, setShow] = useState(false);

  if (!open) return null;
  const valid = val.startsWith('sk-or-v1-') && val.length > 20;
  const kaydet = () => {
    if (!valid) { alert('Geçerli bir OpenRouter anahtarı girin (sk-or-v1-... ile başlamalı).'); return; }
    ORKEY.v = val.trim();
    localStorage.setItem(KEYS_LS.orkey, ORKEY.v);
    onSaved && onSaved();
    onClose && onClose();
  };
  const sil = () => {
    if (!confirm('API anahtarı silinsin mi?')) return;
    ORKEY.v = '';
    localStorage.removeItem(KEYS_LS.orkey);
    setVal('');
    onSaved && onSaved();
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
      <div style={{...S.card, width:520, maxWidth:'92vw'}}>
        <div style={{...S.cardHead}}>
          <LIcon name="KeyRound" size={16} color={C.accent}/> API ANAHTARI — OPENROUTER
          <button onClick={onClose} style={{marginLeft:'auto',background:'transparent',border:0,cursor:'pointer',color:C.textSec}}>
            <LIcon name="X" size={18}/>
          </button>
        </div>
        <div style={{...S.cardBody, display:'flex', flexDirection:'column', gap:12}}>
          <div style={{fontSize:12, color:C.textSec, lineHeight:1.55}}>
            Ruhsat AI tamamlama özelliği için OpenRouter anahtarı gereklidir. Anahtarınız sadece bu cihazda saklanır
            (localStorage <code>{KEYS_LS.orkey}</code>) ve OpenRouter API'sine gönderilir.
          </div>
          <div style={{position:'relative'}}>
            <input
              type={show ? 'text' : 'password'}
              value={val}
              onChange={e => setVal(e.target.value)}
              placeholder="sk-or-v1-..."
              style={{...S.input, paddingRight:46}}
            />
            <button onClick={() => setShow(s => !s)} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'transparent',border:0,cursor:'pointer',color:C.textMuted}}>
              <LIcon name={show ? 'EyeOff' : 'Eye'} size={16}/>
            </button>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            {ORKEY.v && (
              <button onClick={sil} style={{...S.btn, background:'transparent', color:C.danger, border:`1px solid ${C.danger}55`}}>
                <LIcon name="Trash2" size={14}/> SİL
              </button>
            )}
            <button onClick={onClose} style={{...S.btn, background:'transparent', color:C.textSec, border:`1px solid ${C.border}`}}>
              VAZGEÇ
            </button>
            <button onClick={kaydet} disabled={!valid} style={{...S.btn, background: valid ? C.accent : C.border, color:'#fff', opacity: valid ? 1 : 0.6}}>
              <LIcon name="Save" size={14}/> KAYDET
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────────
   GEÇMİŞ PANELİ
   ─────────────────────────────────────────────── */
const HistoryPanel = ({ rows, onClear, onDelete, onOpen, onPdf, onExport }) => {
  const C = MR.C, S = MR.S, LIcon = MR.LIcon;
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter(r => RF.some(f => (r[f.key] || '').toString().toLowerCase().includes(k)));
  }, [rows, q]);

  return (
    <div style={{...S.card}}>
      <div style={{...S.cardHead}}>
        <LIcon name="History" size={16} color={C.accent}/> GEÇMİŞ ({rows.length}/{HISTORY_LIMIT})
        <div style={{marginLeft:'auto', display:'flex', gap:8}}>
          <button onClick={onExport} disabled={!rows.length} style={{...S.btn, background:'#10b981', color:'#fff', opacity: rows.length ? 1 : 0.5}}>
            <LIcon name="FileSpreadsheet" size={13}/> EXCEL
          </button>
          <button onClick={onClear} disabled={!rows.length} style={{...S.btn, background:'transparent', color:C.danger, border:`1px solid ${C.danger}55`, opacity: rows.length ? 1 : 0.5}}>
            <LIcon name="Trash2" size={13}/> TÜMÜNÜ SİL
          </button>
        </div>
      </div>
      <div style={{...S.cardBody, paddingTop:14}}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ara: plaka, ad, şase, TC..." style={{...S.input, marginBottom:12}}/>
        {!filtered.length && (
          <div style={{padding:30, textAlign:'center', color:C.textMuted, fontSize:13}}>
            Henüz kayıt yok. Yukarıdan ruhsat görseli yükleyin.
          </div>
        )}
        {!!filtered.length && (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
              <thead>
                <tr style={{background: MR.tema === 'koyu' ? C.bgInput : '#f8fafc'}}>
                  <th style={{padding:'8px 10px', textAlign:'left', borderBottom:`1px solid ${C.border}`}}>TARİH</th>
                  <th style={{padding:'8px 10px', textAlign:'left', borderBottom:`1px solid ${C.border}`}}>PLAKA</th>
                  <th style={{padding:'8px 10px', textAlign:'left', borderBottom:`1px solid ${C.border}`}}>AD SOYAD</th>
                  <th style={{padding:'8px 10px', textAlign:'left', borderBottom:`1px solid ${C.border}`}}>MARKA</th>
                  <th style={{padding:'8px 10px', textAlign:'left', borderBottom:`1px solid ${C.border}`}}>YIL</th>
                  <th style={{padding:'8px 10px', textAlign:'center', borderBottom:`1px solid ${C.border}`}}>KAYNAK</th>
                  <th style={{padding:'8px 10px', textAlign:'right', borderBottom:`1px solid ${C.border}`}}>İŞLEM</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} style={{borderBottom:`1px solid ${C.borderLight}`}}>
                    <td style={{padding:'8px 10px'}}>{(r.tarih || '').slice(0,10)}</td>
                    <td style={{padding:'8px 10px', fontWeight:700}}>{r.plaka || '—'}</td>
                    <td style={{padding:'8px 10px'}}>{r.adiSoyadi || '—'}</td>
                    <td style={{padding:'8px 10px'}}>{r.marka || '—'}</td>
                    <td style={{padding:'8px 10px'}}>{r.modelYili || '—'}</td>
                    <td style={{padding:'8px 10px', textAlign:'center'}}>
                      <span style={{
                        padding:'3px 9px', borderRadius:999, fontSize:10, fontWeight:700,
                        background: r.kaynak === 'AI' ? '#ede9fe' : '#dbeafe',
                        color: r.kaynak === 'AI' ? '#5b21b6' : '#1e40af'
                      }}>{(r.kaynak || 'OCR').toUpperCase()}</span>
                    </td>
                    <td style={{padding:'8px 10px', textAlign:'right', whiteSpace:'nowrap'}}>
                      <button onClick={() => onOpen(r)} title="Aç" style={{...S.btn, padding:'4px 8px', fontSize:11, background:C.accent, color:'#fff', marginRight:4}}>
                        <LIcon name="Eye" size={12}/>
                      </button>
                      <button onClick={() => onPdf(r)} title="PDF" style={{...S.btn, padding:'4px 8px', fontSize:11, background:'#f59e0b', color:'#fff', marginRight:4}}>
                        <LIcon name="FileText" size={12}/>
                      </button>
                      <button onClick={() => onDelete(r)} title="Sil" style={{...S.btn, padding:'4px 8px', fontSize:11, background:'transparent', color:C.danger, border:`1px solid ${C.danger}55`}}>
                        <LIcon name="X" size={12}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────────
   ANA SAYFA — MR.QrRuhsatPage
   ─────────────────────────────────────────────── */
MR.QrRuhsatPage = ({ setPage, user }) => {
  const C = MR.C, S = MR.S, LIcon = MR.LIcon;

  const [history, setHistory] = useState(() => loadHistory());
  const [queue, setQueue] = useState([]); // [{id,file,name,status,progress,row,error}]
  const [aktif, setAktif] = useState(null); // ekrandaki sonuç satırı
  const [keyOpen, setKeyOpen] = useState(false);
  const [keyVar, setKeyVar] = useState(!!ORKEY.v);
  const [busy, setBusy] = useState(false);
  const dropRef = useRef(null);

  // Drag-and-drop
  useEffect(() => {
    const el = dropRef.current; if (!el) return;
    const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
    const over = (e) => { stop(e); el.style.background = MR.tema === 'koyu' ? '#1e3a8a33' : '#dbeafe'; };
    const leave = (e) => { stop(e); el.style.background = ''; };
    const drop = (e) => {
      stop(e); el.style.background = '';
      const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
      if (files.length) addFiles(files);
    };
    el.addEventListener('dragover', over);
    el.addEventListener('dragleave', leave);
    el.addEventListener('drop', drop);
    return () => {
      el.removeEventListener('dragover', over);
      el.removeEventListener('dragleave', leave);
      el.removeEventListener('drop', drop);
    };
    // eslint-disable-next-line
  }, []);

  const addFiles = (files) => {
    const items = files.map(f => ({ id: uid(), file: f, name: f.name, status: 'queued', progress: 0, row: null, error: null }));
    setQueue(q => [...q, ...items]);
  };

  // 2 paralel işleme
  useEffect(() => {
    if (busy) return;
    const next = queue.find(q => q.status === 'queued');
    if (!next) return;
    const inProg = queue.filter(q => q.status === 'processing').length;
    if (inProg >= 2) return;
    processOne(next);
    // eslint-disable-next-line
  }, [queue, busy]);

  const updateItem = (id, patch) => {
    setQueue(q => q.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const processOne = async (item) => {
    updateItem(item.id, { status: 'processing', progress: 0 });
    try {
      const { text, conf } = await runOCR(item.file, (p) => updateItem(item.id, { progress: p }));
      let row = parseOCR(text);
      let kaynak = 'OCR';
      const dolu = RF.filter(f => row[f.key]).length;
      const dusukGuven = conf < 0.72;
      if ((dusukGuven || dolu < 4) && ORKEY.v) {
        try {
          const ai = await ruhsatAI(text, row);
          row = ai;
          const yeniDolu = RF.filter(f => row[f.key]).length;
          if (yeniDolu > dolu) kaynak = 'AI';
        } catch (e) { /* AI başarısızsa OCR'la devam */ }
      }
      const finalRow = {
        id: uid(),
        ...row,
        kaynak,
        guven: Math.round(conf * 100),
        tarih: new Date().toISOString(),
        dosya: item.name
      };
      setHistory(h => saveHistory([finalRow, ...h]));
      setAktif(finalRow);
      updateItem(item.id, { status: 'done', row: finalRow, progress: 100 });
    } catch (e) {
      updateItem(item.id, { status: 'error', error: e.message || 'Hata' });
    }
  };

  const dosyaSec = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length) addFiles(files);
    e.target.value = '';
  };

  const aktifGuncelle = (key, val) => {
    if (!aktif) return;
    const yeni = { ...aktif, [key]: val };
    setAktif(yeni);
    setHistory(h => saveHistory(h.map(r => r.id === aktif.id ? yeni : r)));
  };

  const kayitSil = (r) => {
    if (!confirm('Bu kayıt silinsin mi?')) return;
    setHistory(h => saveHistory(h.filter(x => x.id !== r.id)));
    if (aktif?.id === r.id) setAktif(null);
  };

  const tumunuSil = () => {
    if (!confirm('Tüm geçmiş silinsin mi? Bu işlem geri alınamaz.')) return;
    saveHistory([]);
    setHistory([]);
    setAktif(null);
  };

  const kuyrukTemizle = () => {
    setQueue(q => q.filter(x => x.status === 'processing' || x.status === 'queued'));
  };

  const dolu = aktif ? RF.filter(f => aktif[f.key]).length : 0;

  return (
    <div style={{...S.page, padding:'18px 22px'}}>
      <ApiKeyModal open={keyOpen} onClose={() => setKeyOpen(false)} onSaved={() => setKeyVar(!!ORKEY.v)}/>

      {/* BAŞLIK */}
      <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:18}}>
        <div style={{width:46, height:46, borderRadius:12, background:'linear-gradient(135deg,#FF6B35 0%,#f59e0b 100%)', display:'flex', alignItems:'center', justifyContent:'center'}}>
          <LIcon name="ScanLine" size={22} color="#fff"/>
        </div>
        <div>
          <div style={{fontSize:20, fontWeight:800, color:C.text}}>RUHSAT OKUYUCU</div>
          <div style={{fontSize:12, color:C.textSec}}>Tesseract OCR + Claude Sonnet 4.5 hibrit</div>
        </div>
        <div style={{marginLeft:'auto', display:'flex', gap:8, alignItems:'center'}}>
          <span style={{
            padding:'4px 10px', borderRadius:999, fontSize:11, fontWeight:700,
            background: keyVar ? '#10b98122' : '#ef444422',
            color: keyVar ? '#10b981' : '#ef4444',
            border: `1px solid ${keyVar ? '#10b98155' : '#ef444455'}`
          }}>
            <LIcon name={keyVar ? 'CheckCircle2' : 'AlertCircle'} size={11}/> AI {keyVar ? 'AKTİF' : 'KAPALI'}
          </span>
          <button onClick={() => setKeyOpen(true)} style={{...S.btn, background:C.accent, color:'#fff'}}>
            <LIcon name="KeyRound" size={13}/> API ANAHTARI
          </button>
        </div>
      </div>

      {/* DROPZONE */}
      <div style={{...S.card, marginBottom:18}}>
        <div style={{...S.cardBody}}>
          <div ref={dropRef} style={{
            border:`2px dashed ${C.border}`, borderRadius:14, padding:'40px 20px',
            textAlign:'center', cursor:'pointer', transition:'background .15s'
          }}
          onClick={() => document.getElementById('mr-ruhsat-input').click()}>
            <LIcon name="Upload" size={36} color={C.accent}/>
            <div style={{fontSize:15, fontWeight:700, color:C.text, marginTop:10}}>
              Ruhsat görselini buraya sürükleyin <span style={{color:C.textMuted, fontWeight:400}}>veya tıklayın</span>
            </div>
            <div style={{fontSize:11, color:C.textMuted, marginTop:6}}>JPG, PNG — birden fazla seçilebilir</div>
            <input id="mr-ruhsat-input" type="file" accept="image/*" multiple onChange={dosyaSec} style={{display:'none'}}/>
          </div>

          {!!queue.length && (
            <div style={{marginTop:14, display:'flex', flexDirection:'column', gap:6}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontSize:11, fontWeight:700, color:C.textSec}}>İŞLEM KUYRUĞU ({queue.length})</span>
                <button onClick={kuyrukTemizle} style={{...S.btn, padding:'3px 8px', fontSize:10, background:'transparent', color:C.textSec, border:`1px solid ${C.border}`}}>
                  TAMAMLANANLARI TEMİZLE
                </button>
              </div>
              {queue.map(it => (
                <div key={it.id} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:MR.tema === 'koyu' ? C.bgInput : '#f8fafc', borderRadius:8, fontSize:11}}>
                  <LIcon name={it.status === 'done' ? 'CheckCircle2' : it.status === 'error' ? 'XCircle' : it.status === 'processing' ? 'Loader2' : 'Clock'}
                    size={14} color={it.status === 'done' ? '#10b981' : it.status === 'error' ? C.danger : C.accent}/>
                  <span style={{flex:1, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{it.name}</span>
                  {it.status === 'processing' && <span style={{color:C.accent}}>{it.progress}%</span>}
                  {it.status === 'error' && <span style={{color:C.danger}}>{it.error}</span>}
                  {it.status === 'done' && <span style={{color:'#10b981'}}>{it.row.plaka || '—'}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AKTİF SONUÇ */}
      {aktif && (
        <div style={{...S.card, marginBottom:18}}>
          <div style={{...S.cardHead}}>
            <LIcon name="FileCheck" size={16} color={C.accent}/> SONUÇ
            <span style={{
              marginLeft:10, padding:'3px 10px', borderRadius:999, fontSize:10, fontWeight:700,
              background: aktif.kaynak === 'AI' ? '#ede9fe' : '#dbeafe',
              color: aktif.kaynak === 'AI' ? '#5b21b6' : '#1e40af'
            }}>{aktif.kaynak}</span>
            {typeof aktif.guven === 'number' && (
              <span style={{padding:'3px 10px', borderRadius:999, fontSize:10, fontWeight:700, background:`${C.success}22`, color:C.success}}>
                GÜVEN %{aktif.guven}
              </span>
            )}
            <span style={{marginLeft:'auto', fontSize:11, color:C.textMuted}}>
              {dolu}/{RF.length} alan
            </span>
            <button onClick={() => openPDF(ruhsatPDFHtml(aktif))} style={{...S.btn, marginLeft:10, background:'#f59e0b', color:'#fff'}}>
              <LIcon name="FileText" size={13}/> PDF
            </button>
            <button onClick={() => exportXLSX([aktif])} style={{...S.btn, marginLeft:6, background:'#10b981', color:'#fff'}}>
              <LIcon name="FileSpreadsheet" size={13}/> EXCEL
            </button>
          </div>
          <div style={{...S.cardBody, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:12}}>
            {RF.map(f => (
              <div key={f.key}>
                <div style={{fontSize:10, fontWeight:700, color:C.textMuted, marginBottom:4, display:'flex', alignItems:'center', gap:6}}>
                  {f.label}
                  <span style={{padding:'1px 6px', background:'#fff7ed', color:'#9a3412', borderRadius:4, fontSize:9}}>{f.code}</span>
                </div>
                <input value={aktif[f.key] || ''} onChange={e => aktifGuncelle(f.key, e.target.value)} style={{...S.input}}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GEÇMİŞ */}
      <HistoryPanel
        rows={history}
        onClear={tumunuSil}
        onDelete={kayitSil}
        onOpen={(r) => setAktif(r)}
        onPdf={(r) => openPDF(ruhsatPDFHtml(r))}
        onExport={() => exportXLSX(history)}
      />

      <div style={{textAlign:'center', fontSize:10, color:C.textMuted, marginTop:14}}>
        © MR Hasar Danışmanlık — RUHSAT OKUYUCU v2.10
      </div>
    </div>
  );
};

/* keyframes — Loader2 icon için */
(function ensureSpinKf(){
  if (document.getElementById('mr-ruhsat-spin-kf')) return;
  const s = document.createElement('style');
  s.id = 'mr-ruhsat-spin-kf';
  s.textContent = '@keyframes mr-spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} } svg.lucide-loader-2 { animation: mr-spin 1s linear infinite; }';
  document.head.appendChild(s);
})();
