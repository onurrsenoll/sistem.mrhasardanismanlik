const MR = window.MR || (window.MR = {});
const {useState, useEffect, useRef, useCallback} = React;

const ASAMALAR = MR.ASAMALAR || [];

const asamaRenk = (a) => {
  if (!a) return '#6b7280';
  const s = a.toUpperCase();
  if (s.includes('KAPANDI') || s.includes('TAHSİL KABİLİYETİ YOK')) return '#6b7280';
  if (s.includes('ÖDEME ALINDI')) return '#22c55e';
  if (s.includes('ÖDEME BEKLEN')) return '#84cc16';
  if (s.includes('AÇIK') || s.includes('EVRAK BEKLEN')) return '#3b82f6';
  if (s.includes('TAHKİM') || s.includes('HAKEM')) return '#6366f1';
  if (s.includes('DAVA') || s.includes('HUKUK')) return '#ef4444';
  if (s.includes('BİLİRKİŞİ') || s.includes('HESAP') || s.includes('AKTÜER')) return '#d97706';
  if (s.includes('KARAR') || s.includes('TEMYİZ') || s.includes('İSTİNAF')) return '#ec4899';
  if (s.includes('ADLİ TIP') || s.includes('MALULİYET') || s.includes('KUSUR') || s.includes('SAKATLIK')) return '#a855f7';
  if (s.includes('ARABULUCULUK')) return '#14b8a6';
  if (s.includes('BAŞVURU') || s.includes('SİGORTA')) return '#06b6d4';
  if (s.includes('İCRA') || s.includes('TAKİP') || s.includes('AZİLNAME')) return '#f97316';
  if (s.includes('İTİRAZ')) return '#e11d48';
  if (s.includes('KEŞİF') || s.includes('SEVK') || s.includes('ÖN İNCELEME')) return '#8b5cf6';
  return '#6b7280';
};

/* ── RAPOR SÜTUNLARI ── */
const RAPOR_SUTUNLAR = [
  {key:'dosya_no',       label:'DOSYA NO',             width:10},
  {key:'tc_kimlik',      label:'T.C. NO',              width:10},
  {key:'magdur_adi',     label:'ADI SOYADI',           width:12},
  {key:'dosya_kaynagi',  label:'DOSYA KAYNAĞI',        width:8},
  {key:'avukat_adi',     label:'AVUKATI',              width:10},
  {key:'dosya_turu',     label:'DOSYA TÜRÜ',           width:5},
  {key:'sigorta_sirket', label:'DAVALI ŞİRKET',       width:10},
  {key:'hasar_no',       label:'SİGORTA HASAR NO',    width:9},
  {key:'kaza_tarihi',    label:'KAZA TARİHİ',          width:8},
  {key:'acilis_tarihi',  label:'AÇILIŞ TARİHİ',        width:8},
  {key:'asama',          label:'DOSYA AŞAMA DURUMU',    width:14}
];

/* ── TARİH FORMAT ── */
const tarihFormat = () => {
  const n = new Date();
  const g = String(n.getDate()).padStart(2,'0');
  const a = String(n.getMonth()+1).padStart(2,'0');
  return `${g}.${a}.${n.getFullYear()} ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
};

MR.DosyaListePage = ({setPage, user}) => {
  const onSelect = (id) => setPage('dosya-detay-' + id);
  return <MR._DosyaListesiInner setPage={setPage} onSelect={onSelect} user={user}/>;
};

MR._DosyaListesiInner = ({setPage, onSelect, user}) => {
  const {C, S, LIcon, Badge, StatCard, Loading, EmptyState, Confirm, api} = MR;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [turF, setTurF] = useState('');
  const [asamaF, setAsamaF] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [raporLoading, setRaporLoading] = useState(false);
  const raporRef = useRef(null);
  const [page, setPage2] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pgInfo, setPgInfo] = useState({total:0, totalPages:0});
  const [stats, setStats] = useState({toplam:0, adk:0, bh:0, acik:0});

  const load = async (p_page, p_limit) => {
    setLoading(true);
    const cp = p_page || page;
    const cl = p_limit || limit;
    const p = {page: cp, limit: cl};
    if (search) p.q = search;
    if (turF) p.tur = turF;
    if (asamaF) p.asama = asamaF;
    const r = await api.dosyaList(p);
    if (r?.success) {
      setData(r.data.items || []);
      if (r.data.pagination) setPgInfo({total: r.data.pagination.total || 0, totalPages: r.data.pagination.totalPages || 0});
      if (r.data.stats) setStats(r.data.stats);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage2(1); const t = setTimeout(() => load(1), 400); return () => clearTimeout(t); }, [search, turF, asamaF]);
  const changePage = (np) => { setPage2(np); load(np); };
  const changeLimit = (nl) => { setLimit(nl); setPage2(1); load(1, nl); };

  const dosyaSil = async (id) => {
    const r = await api.dosyaDelete(id);
    if (r?.success) { load(); setDeleteConfirm(null); }
  };

  const toplamDosya = stats.toplam || pgInfo.total || data.length;
  const adkDosya = stats.adk;
  const bhDosya = stats.bh;
  const acikDosya = stats.acik;

  /* ═══════════════════════════════════════════════════════════
     EXCEL RAPOR OLUŞTUR
     ═══════════════════════════════════════════════════════════ */
  const excelRaporOlustur = useCallback(() => {
    if (data.length === 0) return;
    setRaporLoading(true);

    try {
      /* Başlık satırları */
      const wsData = [];
      wsData.push(['MR HASAR DANIŞMANLIK - DOSYA TAKİP SİSTEMİ']);
      wsData.push([`RAPOR TARİHİ: ${tarihFormat()}`]);
      wsData.push([`TOPLAM: ${data.length} DOSYA | ADK: ${adkDosya} | BH: ${bhDosya} | AÇIK: ${acikDosya}`]);
      if (turF || asamaF || search) {
        let filtre = 'FİLTRE:';
        if (search) filtre += ` ARAMA="${search}"`;
        if (turF) filtre += ` TÜR=${turF}`;
        if (asamaF) filtre += ` AŞAMA=${asamaF}`;
        wsData.push([filtre]);
      }
      wsData.push([]); /* Boş satır */

      /* Başlık satırı */
      const basliklar = ['#', ...RAPOR_SUTUNLAR.map(s => s.label)];
      wsData.push(basliklar);

      /* Veri satırları */
      data.forEach((d, i) => {
        wsData.push([
          i + 1,
          d.dosya_no || '-',
          d.tc_kimlik || '-',
          d.magdur_adi || '-',
          d.dosya_kaynagi || '-',
          d.avukat_adi || '-',
          d.dosya_turu || '-',
          d.sigorta_sirket || '-',
          d.hasar_no || '-',
          d.kaza_tarihi || '-',
          d.acilis_tarihi || '-',
          d.asama || '-'
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      /* Sütun genişlikleri */
      ws['!cols'] = [
        {wch:5},  /* # */
        {wch:14}, /* DOSYA NO */
        {wch:14}, /* TC NO */
        {wch:22}, /* ADI SOYADI */
        {wch:15}, /* DOSYA KAYNAĞI */
        {wch:18}, /* AVUKATI */
        {wch:8},  /* DOSYA TÜRÜ */
        {wch:25}, /* DAVALI ŞİRKET */
        {wch:18}, /* SİGORTA HASAR NO */
        {wch:14}, /* KAZA TARİHİ */
        {wch:14}, /* AÇILIŞ TARİHİ */
        {wch:45}  /* DOSYA AŞAMA DURUMU */
      ];

      /* Birleşik hücreler (başlık satırları) */
      ws['!merges'] = [
        {s:{r:0,c:0}, e:{r:0,c:10}},
        {s:{r:1,c:0}, e:{r:1,c:10}},
        {s:{r:2,c:0}, e:{r:2,c:10}}
      ];
      if (turF || asamaF || search) {
        ws['!merges'].push({s:{r:3,c:0}, e:{r:3,c:10}});
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'DOSYA LİSTESİ');
      XLSX.writeFile(wb, `MR_HASAR_DOSYA_RAPORU_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch(e) {
      console.error('EXCEL RAPOR HATASI:', e);
      alert('EXCEL RAPOR OLUŞTURULURKEN HATA OLUŞTU');
    }

    setRaporLoading(false);
  }, [data, turF, asamaF, search, adkDosya, bhDosya, acikDosya]);

  /* ═══════════════════════════════════════════════════════════
     PDF RAPOR OLUŞTUR - html2pdf ile görünür element yakalama
     (Türkçe karakter desteği için HTML render → canvas → PDF)
     ═══════════════════════════════════════════════════════════ */
  const pdfRaporOlustur = useCallback(() => {
    if (data.length === 0) return;
    if (typeof html2pdf === 'undefined') {
      alert('PDF KÜTÜPHANESİ YÜKLENEMEDİ. SAYFAYI YENİLEYİP TEKRAR DENEYİN.');
      return;
    }
    setRaporLoading(true);

    /* Filtre bilgisi */
    const filtreBilgi = [];
    if (search) filtreBilgi.push('ARAMA: "' + search + '"');
    if (turF) filtreBilgi.push('TÜR: ' + turF);
    if (asamaF) filtreBilgi.push('AŞAMA: ' + asamaF);

    /* HTML içeriği oluştur */
    const satirlar = data.map((d, i) =>
      '<tr style="' + (i % 2 === 1 ? 'background:#f8fafc;' : '') + '">' +
      '<td style="padding:3px 4px;border:1px solid #d1d5db;font-size:7px;text-align:center;">' + (i + 1) + '</td>' +
      '<td style="padding:3px 4px;border:1px solid #d1d5db;font-size:7px;font-weight:700;color:#2563eb;">' + (d.dosya_no || '-') + '</td>' +
      '<td style="padding:3px 4px;border:1px solid #d1d5db;font-size:6.5px;font-family:monospace;">' + (d.tc_kimlik || '-') + '</td>' +
      '<td style="padding:3px 4px;border:1px solid #d1d5db;font-size:7px;font-weight:600;">' + (d.magdur_adi || '-') + '</td>' +
      '<td style="padding:3px 4px;border:1px solid #d1d5db;font-size:7px;">' + (d.dosya_kaynagi || '-') + '</td>' +
      '<td style="padding:3px 4px;border:1px solid #d1d5db;font-size:7px;">' + (d.avukat_adi || '-') + '</td>' +
      '<td style="padding:3px 4px;border:1px solid #d1d5db;font-size:7px;text-align:center;font-weight:700;">' + (d.dosya_turu || '-') + '</td>' +
      '<td style="padding:3px 4px;border:1px solid #d1d5db;font-size:7px;">' + (d.sigorta_sirket || '-') + '</td>' +
      '<td style="padding:3px 4px;border:1px solid #d1d5db;font-size:6.5px;font-family:monospace;">' + (d.hasar_no || '-') + '</td>' +
      '<td style="padding:3px 4px;border:1px solid #d1d5db;font-size:7px;">' + (d.kaza_tarihi || '-') + '</td>' +
      '<td style="padding:3px 4px;border:1px solid #d1d5db;font-size:7px;">' + (d.acilis_tarihi || '-') + '</td>' +
      '<td style="padding:3px 4px;border:1px solid #d1d5db;font-size:6.5px;max-width:130px;word-wrap:break-word;">' + (d.asama || '-') + '</td>' +
      '</tr>'
    ).join('');

    const htmlIcerik = '<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;width:1100px;padding:15px;">' +
      '<div style="text-align:center;margin-bottom:10px;border-bottom:3px solid #2563eb;padding-bottom:8px;">' +
        '<div style="font-size:16px;color:#2563eb;font-weight:700;letter-spacing:1px;margin-bottom:3px;">MR HASAR DANIŞMANLIK</div>' +
        '<div style="font-size:10px;color:#666;">DOSYA TAKİP SİSTEMİ - DOSYA LİSTESİ RAPORU</div>' +
        '<div style="font-size:8px;color:#999;margin-top:2px;">RAPOR TARİHİ: ' + tarihFormat() + '</div>' +
      '</div>' +
      '<div style="text-align:center;font-size:9px;margin-bottom:6px;">' +
        '<strong>TOPLAM:</strong> ' + data.length + ' DOSYA &nbsp;|&nbsp; <strong>ADK:</strong> ' + adkDosya +
        ' &nbsp;|&nbsp; <strong>BH:</strong> ' + bhDosya + ' &nbsp;|&nbsp; <strong>AÇIK:</strong> ' + acikDosya +
      '</div>' +
      (filtreBilgi.length > 0 ? '<div style="text-align:center;font-size:8px;color:#666;margin-bottom:6px;">FİLTRE: ' + filtreBilgi.join(' | ') + '</div>' : '') +
      '<table style="width:100%;border-collapse:collapse;">' +
        '<thead><tr>' +
          '<th style="background:#2563eb;color:#fff;padding:4px 4px;border:1px solid #1d4ed8;font-size:6.5px;font-weight:700;text-align:left;">#</th>' +
          RAPOR_SUTUNLAR.map(s => '<th style="background:#2563eb;color:#fff;padding:4px 4px;border:1px solid #1d4ed8;font-size:6.5px;font-weight:700;text-align:left;">' + s.label + '</th>').join('') +
        '</tr></thead>' +
        '<tbody>' + satirlar + '</tbody>' +
      '</table>' +
      '<div style="text-align:center;margin-top:10px;padding-top:6px;border-top:1px solid #d1d5db;font-size:7px;color:#999;">' +
        'MR HASAR DANIŞMANLIK - DOSYA TAKİP SİSTEMİ | ' + tarihFormat() +
      '</div>' +
    '</div>';

    /* Geçici DOM elemanı oluştur — GÖRÜNÜR olmalı (html2canvas gizli elemanı yakalayamaz) */
    const container = document.createElement('div');
    container.id = 'mr-pdf-rapor-gecici';
    container.style.cssText = 'position:fixed;top:0;left:0;width:1100px;z-index:99999;background:#fff;overflow:visible;';
    container.innerHTML = htmlIcerik;
    document.body.appendChild(container);

    /* Tarayıcının render etmesi için bekle, sonra PDF oluştur */
    requestAnimationFrame(() => {
      setTimeout(() => {
        html2pdf().set({
          margin: [5, 5, 5, 5],
          filename: 'MR_HASAR_DOSYA_RAPORU_' + new Date().toISOString().slice(0, 10) + '.pdf',
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, logging: false, width: 1100, scrollX: 0, scrollY: 0, windowWidth: 1100 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        }).from(container).save().then(() => {
          if (container.parentNode) container.parentNode.removeChild(container);
          setRaporLoading(false);
        }).catch(function(err) {
          console.error('PDF RAPOR HATASI:', err);
          if (container.parentNode) container.parentNode.removeChild(container);
          setRaporLoading(false);
          alert('PDF OLUŞTURULURKEN HATA: ' + (err.message || err));
        });
      }, 500);
    });
  }, [data, turF, asamaF, search, adkDosya, bhDosya, acikDosya]);

  /* ═══════════════════════════════════════════════════════════
     YAZDIRMA
     ═══════════════════════════════════════════════════════════ */
  const yazdirRapor = useCallback(() => {
    if (data.length === 0) return;

    const filtreBilgi = [];
    if (search) filtreBilgi.push(`ARAMA: "${search}"`);
    if (turF) filtreBilgi.push(`TÜR: ${turF}`);
    if (asamaF) filtreBilgi.push(`AŞAMA: ${asamaF}`);

    const printHtml = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>MR HASAR DANIŞMANLIK - DOSYA LİSTESİ</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 9px; color: #1a1a1a; }
          @page { size: A4 landscape; margin: 10mm 8mm; }
          .header { text-align: center; margin-bottom: 12px; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
          .header h1 { font-size: 18px; color: #2563eb; letter-spacing: 1px; margin-bottom: 4px; }
          .header .sub { font-size: 11px; color: #666; }
          .header .date { font-size: 9px; color: #999; margin-top: 3px; }
          .ozet { display: flex; justify-content: center; gap: 25px; margin-bottom: 10px; font-size: 10px; }
          .filtre { text-align: center; font-size: 9px; color: #666; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 7.5px; }
          th { background: #2563eb; color: white; padding: 5px 4px; text-align: left; border: 1px solid #1d4ed8; font-weight: 700; font-size: 7px; }
          td { padding: 4px; border: 1px solid #d1d5db; font-size: 7.5px; }
          tr:nth-child(even) { background: #f8fafc; }
          .dosya-no { font-weight: 700; color: #2563eb; }
          .tc { font-family: monospace; font-size: 7px; }
          .adi { font-weight: 600; }
          .asama { font-size: 6.5px; max-width: 130px; word-wrap: break-word; }
          .footer { text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #d1d5db; font-size: 8px; color: #999; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MR HASAR DANIŞMANLIK</h1>
          <div class="sub">DOSYA TAKİP SİSTEMİ - DOSYA LİSTESİ RAPORU</div>
          <div class="date">RAPOR TARİHİ: ${tarihFormat()}</div>
        </div>

        <div class="ozet">
          <span><strong>TOPLAM:</strong> ${data.length} DOSYA</span>
          <span><strong>ADK:</strong> ${adkDosya}</span>
          <span><strong>BH:</strong> ${bhDosya}</span>
          <span><strong>AÇIK:</strong> ${acikDosya}</span>
        </div>

        ${filtreBilgi.length > 0 ? `<div class="filtre">FİLTRE: ${filtreBilgi.join(' | ')}</div>` : ''}

        <table>
          <thead>
            <tr>
              <th>#</th>
              ${RAPOR_SUTUNLAR.map(s => `<th>${s.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map((d, i) => `
              <tr>
                <td>${i + 1}</td>
                <td class="dosya-no">${d.dosya_no || '-'}</td>
                <td class="tc">${d.tc_kimlik || '-'}</td>
                <td class="adi">${d.magdur_adi || '-'}</td>
                <td>${d.dosya_kaynagi || '-'}</td>
                <td>${d.avukat_adi || '-'}</td>
                <td style="text-align:center; font-weight:700;">${d.dosya_turu || '-'}</td>
                <td>${d.sigorta_sirket || '-'}</td>
                <td class="tc">${d.hasar_no || '-'}</td>
                <td>${d.kaza_tarihi || '-'}</td>
                <td>${d.acilis_tarihi || '-'}</td>
                <td class="asama">${d.asama || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          MR HASAR DANIŞMANLIK - DOSYA TAKİP SİSTEMİ | ${tarihFormat()}
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
    } else {
      alert('YAZICI PENCERESİ AÇILAMADI. LÜTFEN POPUP ENGELLEYİCİYİ KONTROL EDİN.');
    }
  }, [data, turF, asamaF, search, adkDosya, bhDosya, acikDosya]);

  const thS = {padding:'8px 6px',textAlign:'left',fontWeight:600,fontSize:9,whiteSpace:'nowrap',borderBottom:`2px solid ${C.border}`,color:C.textMuted,position:'sticky',top:0,background:C.bgCard,zIndex:1};
  const tdS = {padding:'6px 6px',fontSize:10,whiteSpace:'nowrap',borderBottom:`1px solid ${C.border}22`};

  return (
    <div className="fade-in">
      {/* ÖZET KARTLAR */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
        <StatCard icon="Folder" label="TOPLAM DOSYA" value={toplamDosya} color={C.accent}/>
        <StatCard icon="Shield" label="ADK DOSYA" value={adkDosya} color={C.cyan}/>
        <StatCard icon="Heart" label="BH DOSYA" value={bhDosya} color={C.purple}/>
        <StatCard icon="FolderOpen" label="AÇIK DOSYA" value={acikDosya} color={C.success}/>
      </div>

      {/* DOSYA LİSTESİ */}
      <div style={S.card}>
        {/* FİLTRELER + RAPOR BUTONLARI */}
        <div style={{padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`1px solid ${C.border}`,flexWrap:'wrap',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <LIcon name="List" size={14} color={C.accent}/>
            <span style={{fontSize:13,fontWeight:700}}>DOSYA LİSTESİ</span>
            <span style={{padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:600,background:`${C.accent}18`,color:C.accent}}>{toplamDosya} DOSYA</span>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
            <input placeholder="ARA (TC, İSİM, DOSYA NO, PLAKA)" value={search} onChange={e => setSearch(e.target.value)}
              style={{...S.input, width:200, fontSize:10, padding:'6px 10px'}}/>
            <select value={turF} onChange={e => setTurF(e.target.value)} style={{...S.select, width:90, fontSize:10, padding:'6px 8px'}}>
              <option value="">TÜR: TÜMÜ</option>
              <option value="ADK">ADK</option>
              <option value="BH">BH</option>
            </select>
            <select value={asamaF} onChange={e => setAsamaF(e.target.value)} style={{...S.select, minWidth:155, maxWidth:400, fontSize:10, padding:'6px 8px'}}>
              <option value="">AŞAMA: TÜMÜ</option>
              {ASAMALAR.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            {/* RAPOR BUTONLARI AYIRICI */}
            {data.length > 0 && (
              <>
                <div style={{width:1, height:24, background:C.border, margin:'0 2px'}}/>
                {/* PDF RAPOR */}
                <button style={{...S.btn,...S.btnG,fontSize:9,padding:'5px 8px',display:'flex',alignItems:'center',gap:4}}
                  onClick={pdfRaporOlustur} disabled={raporLoading} title="PDF RAPOR İNDİR">
                  <LIcon name="FileText" size={11} color="#ef4444"/> PDF
                </button>
                {/* EXCEL RAPOR */}
                <button style={{...S.btn,...S.btnG,fontSize:9,padding:'5px 8px',display:'flex',alignItems:'center',gap:4}}
                  onClick={excelRaporOlustur} disabled={raporLoading} title="EXCEL RAPOR İNDİR">
                  <LIcon name="FileSpreadsheet" size={11} color="#22c55e"/> EXCEL
                </button>
                {/* YAZDIR */}
                <button style={{...S.btn,...S.btnG,fontSize:9,padding:'5px 8px',display:'flex',alignItems:'center',gap:4}}
                  onClick={yazdirRapor} disabled={raporLoading} title="YAZDIR">
                  <LIcon name="Printer" size={11} color={C.accent}/> YAZDIR
                </button>
              </>
            )}

            <button style={{...S.btn,...S.btnP,fontSize:10,padding:'6px 14px'}} onClick={() => setPage('dosya-yeni')}>
              <LIcon name="Plus" size={12} color="#fff"/> YENİ
            </button>
          </div>
        </div>

        {/* RAPOR YÜKLEME GÖSTERGESİ */}
        {raporLoading && (
          <div style={{padding:'10px 14px', background:`${C.accent}08`, borderBottom:`1px solid ${C.border}22`,
            display:'flex', alignItems:'center', gap:8}}>
            <div style={{width:14,height:14,border:'2px solid transparent',borderTopColor:C.accent,borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
            <span style={{fontSize:11, color:C.accent, fontWeight:600}}>RAPOR OLUŞTURULUYOR...</span>
          </div>
        )}

        {/* TABLO */}
        {loading ? <Loading/> : data.length === 0 ? (
          <EmptyState icon="FolderOpen" title="DOSYA BULUNAMADI" desc="FİLTRELERİ KONTROL EDİN VEYA YENİ DOSYA OLUŞTURUN"/>
        ) : (
          <div style={{overflowX:'auto',maxHeight:'calc(100vh - 300px)'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:1350}}>
              <thead>
                <tr>
                  <th style={{...thS,minWidth:80}}>DOSYA NO</th>
                  <th style={{...thS,minWidth:85}}>T.C. NO</th>
                  <th style={{...thS,minWidth:110}}>ADI SOYADI</th>
                  <th style={{...thS,minWidth:85}}>DOSYA KAYNAĞI</th>
                  <th style={{...thS,minWidth:90}}>AVUKATI</th>
                  <th style={{...thS,minWidth:55,textAlign:'center'}}>DOSYA TÜRÜ</th>
                  <th style={{...thS,minWidth:100}}>DAVALI ŞİRKET</th>
                  <th style={{...thS,minWidth:100}}>SİGORTA HASAR NO</th>
                  <th style={{...thS,minWidth:75}}>KAZA TARİHİ</th>
                  <th style={{...thS,minWidth:75}}>AÇILIŞ TARİHİ</th>
                  <th style={{...thS,minWidth:110}}>DOSYA AŞAMA DURUMU</th>
                  <th style={{...thS,minWidth:50,textAlign:'center'}}>İŞLEM</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => {
                  const ac = asamaRenk(d.asama);
                  return (
                    <tr key={d.id || i}
                      style={{cursor:'pointer',background:i%2===1?`${C.bgHover}66`:'transparent',transition:'background .15s'}}
                      onClick={() => onSelect(d.id)}
                      onMouseEnter={e => e.currentTarget.style.background=`${C.accent}0a`}
                      onMouseLeave={e => e.currentTarget.style.background=i%2===1?`${C.bgHover}66`:'transparent'}>
                      {/* DOSYA NO */}
                      <td style={{...tdS,fontWeight:700,color:C.accent}}>{d.dosya_no}</td>
                      {/* T.C. NO */}
                      <td style={{...tdS,fontFamily:'monospace',fontSize:10,color:C.textSec,letterSpacing:0.3}}>{d.tc_kimlik || '-'}</td>
                      {/* ADI SOYADI */}
                      <td style={{...tdS,fontWeight:600,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis'}}>{d.magdur_adi || '-'}</td>
                      {/* DOSYA KAYNAĞI */}
                      <td style={{...tdS,color:C.textSec,fontSize:9}}>{d.dosya_kaynagi || '-'}</td>
                      {/* AVUKATI */}
                      <td style={{...tdS,color:C.textSec,maxWidth:100,overflow:'hidden',textOverflow:'ellipsis'}}>{d.avukat_adi || '-'}</td>
                      {/* DOSYA TÜRÜ */}
                      <td style={{...tdS,textAlign:'center'}}>
                        <span style={{display:'inline-block',padding:'2px 8px',borderRadius:4,fontSize:9,fontWeight:700,
                          background:d.dosya_turu==='ADK'?`${C.accent}18`:d.dosya_turu==='BH'?`${C.purple}18`:'#6b728018',
                          color:d.dosya_turu==='ADK'?C.accent:d.dosya_turu==='BH'?C.purple:'#6b7280'}}>
                          {d.dosya_turu || '-'}
                        </span>
                      </td>
                      {/* DAVALI ŞİRKET */}
                      <td style={{...tdS,fontSize:9,maxWidth:110,overflow:'hidden',textOverflow:'ellipsis'}}>{d.sigorta_sirket || '-'}</td>
                      {/* SİGORTA HASAR NO */}
                      <td style={{...tdS,fontFamily:'monospace',fontSize:9,color:C.textSec}}>{d.hasar_no || '-'}</td>
                      {/* KAZA TARİHİ */}
                      <td style={{...tdS,color:C.textMuted,fontSize:10}}>{d.kaza_tarihi || '-'}</td>
                      {/* AÇILIŞ TARİHİ */}
                      <td style={{...tdS,color:C.textMuted,fontSize:10}}>{d.acilis_tarihi || '-'}</td>
                      {/* DOSYA AŞAMA DURUMU */}
                      <td style={tdS}>
                        <span style={{display:'inline-block',padding:'2px 6px',borderRadius:4,fontSize:8,fontWeight:600,
                          background:ac+'18',color:ac,whiteSpace:'nowrap',border:`1px solid ${ac}33`}}>
                          {d.asama || '-'}
                        </span>
                      </td>
                      {/* İŞLEM */}
                      <td style={{...tdS,textAlign:'center'}}>
                        <div style={{display:'flex',gap:6,justifyContent:'center',alignItems:'center'}}>
                          <span title="GÖRÜNTÜLE" style={{cursor:'pointer',display:'flex',padding:2,borderRadius:4,background:`${C.accent}11`}}>
                            <LIcon name="Eye" size={12} color={C.accent}/>
                          </span>
                          <span title="SİL" onClick={(e) => { e.stopPropagation(); setDeleteConfirm({id: d.id, text: d.dosya_no}); }}
                            style={{cursor:'pointer',display:'flex',padding:2,borderRadius:4,background:`${C.danger}11`}}>
                            <LIcon name="Trash2" size={12} color={C.danger}/>
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {pgInfo.totalPages > 0 && (
          <div style={{padding:'10px 14px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:10,color:C.textMuted}}>SAYFA BAŞINA:</span>
              {[25,50,100,250].map(v => (
                <button key={v} onClick={() => changeLimit(v)}
                  style={{padding:'4px 10px',borderRadius:6,fontSize:10,fontWeight:limit===v?700:500,cursor:'pointer',
                    background:limit===v?`${C.accent}18`:'transparent',color:limit===v?C.accent:C.textSec,
                    border:`1px solid ${limit===v?C.accent+'44':C.border}`}}>
                  {v}
                </button>
              ))}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:10,color:C.textMuted}}>
                {((page-1)*limit)+1}-{Math.min(page*limit, pgInfo.total)} / {pgInfo.total}
              </span>
              <button onClick={() => changePage(1)} disabled={page<=1}
                style={{padding:'4px 8px',borderRadius:4,fontSize:10,cursor:page<=1?'default':'pointer',
                  background:page<=1?C.bgInput:`${C.accent}11`,color:page<=1?C.textMuted:C.accent,border:`1px solid ${C.border}`,opacity:page<=1?0.5:1}}>
                <LIcon name="ChevronsLeft" size={12}/>
              </button>
              <button onClick={() => changePage(page-1)} disabled={page<=1}
                style={{padding:'4px 8px',borderRadius:4,fontSize:10,cursor:page<=1?'default':'pointer',
                  background:page<=1?C.bgInput:`${C.accent}11`,color:page<=1?C.textMuted:C.accent,border:`1px solid ${C.border}`,opacity:page<=1?0.5:1}}>
                <LIcon name="ChevronLeft" size={12}/>
              </button>
              <span style={{padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:700,background:`${C.accent}18`,color:C.accent}}>
                {page} / {pgInfo.totalPages}
              </span>
              <button onClick={() => changePage(page+1)} disabled={page>=pgInfo.totalPages}
                style={{padding:'4px 8px',borderRadius:4,fontSize:10,cursor:page>=pgInfo.totalPages?'default':'pointer',
                  background:page>=pgInfo.totalPages?C.bgInput:`${C.accent}11`,color:page>=pgInfo.totalPages?C.textMuted:C.accent,border:`1px solid ${C.border}`,opacity:page>=pgInfo.totalPages?0.5:1}}>
                <LIcon name="ChevronRight" size={12}/>
              </button>
              <button onClick={() => changePage(pgInfo.totalPages)} disabled={page>=pgInfo.totalPages}
                style={{padding:'4px 8px',borderRadius:4,fontSize:10,cursor:page>=pgInfo.totalPages?'default':'pointer',
                  background:page>=pgInfo.totalPages?C.bgInput:`${C.accent}11`,color:page>=pgInfo.totalPages?C.textMuted:C.accent,border:`1px solid ${C.border}`,opacity:page>=pgInfo.totalPages?0.5:1}}>
                <LIcon name="ChevronsRight" size={12}/>
              </button>
            </div>
          </div>
        )}
      </div>

      <Confirm open={!!deleteConfirm} message={deleteConfirm ? `"${deleteConfirm.text}" DOSYASI SİLİNSİN Mİ?` : ''}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && dosyaSil(deleteConfirm.id)}/>
    </div>
  );
};
