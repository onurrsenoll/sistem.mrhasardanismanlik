/* ════════════════════════════════════════════════════════════════
   MR HASAR DANIŞMANLIK - TANIMLAMALAR SAYFASI
   DOSYA | EVRAK | FİNANSAL | MATBU EVRAK / SÖZLEŞME | GENEL
   ════════════════════════════════════════════════════════════════ */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useMemo, useCallback, useRef} = React;

/* ─── SEKME KATEGORİ HARİTALARI ─── */
const SEKME_KATEGORILER = {
  dosya: [
    {key:'dosya_turu',     label:'DOSYA TÜRÜ',      icon:'Folder',       color: MR.C.accent},
    {key:'musteri_kaynak', label:'MÜŞTERİ KAYNAK',   icon:'Globe',        color: MR.C.cyan}
  ],
  evrak: [
    {key:'evrak_turu',     label:'EVRAK TÜRÜ',       icon:'FileText',     color: MR.C.purple},
    {key:'masraf_turu',    label:'MASRAF TÜRÜ',       icon:'Receipt',      color: MR.C.warning}
  ],
  finansal: [
    {key:'gelir_turu',     label:'GELİR TÜRÜ',       icon:'TrendingUp',   color: MR.C.success},
    {key:'gider_turu',     label:'GİDER TÜRÜ',       icon:'TrendingDown',  color: MR.C.danger},
    {key:'komisyon_turu',  label:'KOMİSYON TÜRÜ',    icon:'Percent',      color: MR.C.gold}
  ],
  genel: [
    {key:'hizmet_turu',     label:'HİZMET TÜRÜ',       icon:'Briefcase',  color: MR.C.pink},
    {key:'sablon_kategori', label:'ŞABLON KATEGORİSİ', icon:'Tag',        color: MR.C.cyan}
  ]
};

/* ─── ŞABLON KATEGORİ ETİKETLERİ ─── */
const SABLON_KAT_RENK = {
  matbu_evrak: {label:'MATBU EVRAK', color: MR.C.accent},
  sozlesme:    {label:'SÖZLEŞME',    color: MR.C.success},
  mektup:      {label:'MEKTUP',      color: MR.C.purple},
  diger:       {label:'DİĞER',       color: MR.C.warning}
};

/* ─── ŞABLON DEĞİŞKENLERİ ─── */
const SABLON_DEGISKENLER = [
  {key:'{{MUSTERI_ADI}}',       label:'MÜŞTERİ ADI',         group:'MÜŞTERİ'},
  {key:'{{TC_NO}}',             label:'TC KİMLİK NO',        group:'MÜŞTERİ'},
  {key:'{{TELEFON}}',           label:'TELEFON',              group:'MÜŞTERİ'},
  {key:'{{ADRES}}',             label:'ADRES',                group:'MÜŞTERİ'},
  {key:'{{DOSYA_NO}}',          label:'DOSYA NO',             group:'DOSYA'},
  {key:'{{TARIH}}',             label:'TARİH',                group:'DOSYA'},
  {key:'{{PLAKA}}',             label:'PLAKA',                group:'DOSYA'},
  {key:'{{HASAR_TUTARI}}',      label:'HASAR TUTARI',         group:'DOSYA'},
  {key:'{{SİGORTA_ŞİRKETİ}}',  label:'SİGORTA ŞİRKETİ',     group:'SİGORTA'},
  {key:'{{POLİÇE_NO}}',        label:'POLİÇE NO',            group:'SİGORTA'}
];

/* ─── ÖRNEK VERİLER (ÖNİZLEME İÇİN) ─── */
const ORNEK_VERILER = {
  '{{MUSTERI_ADI}}':      'AHMET YILMAZ',
  '{{TC_NO}}':            '12345678901',
  '{{TELEFON}}':          '0532 123 45 67',
  '{{ADRES}}':            'ATATÜRK MAH. CUMHURİYET CAD. NO:12 ANKARA',
  '{{DOSYA_NO}}':         'MR-2025-0042',
  '{{TARIH}}':            '10.02.2026',
  '{{PLAKA}}':            '06 ABC 123',
  '{{HASAR_TUTARI}}':     '45.000,00 TL',
  '{{SİGORTA_ŞİRKETİ}}': 'ANADOLU SİGORTA',
  '{{POLİÇE_NO}}':       'PLÇ-987654321'
};

/* ─── ORTAK STİLLER ─── */
const TH_STYLE = {padding:'12px 14px', fontSize:13, fontWeight:800, color:'#FFFFFF', textAlign:'left', borderBottom:`2px solid ${MR.C.border}`, letterSpacing:0.5, background: MR.tema==='koyu'?'#0f2342':'#1e40af'};
const TD_STYLE = {padding:'12px 14px', fontSize:13, fontWeight:600, color: MR.tema==='koyu' ? '#e2e8f0' : '#1e293b', borderBottom:MR.tema==='koyu'?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)'};
const BTN_KUCUK = {padding:'5px 8px', borderRadius:7, border:'none', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4, transition:'all .15s', position:'relative', textShadow:'0 1px 1px rgba(0,0,0,0.12)'};


/* ════════════════════════════════════════════════════════════════
   TANIM GRUBU BİLEŞENİ (TEKRAR KULLANILIR - SEKME 1, 2, 3, 5)
   KATEGORİ SEÇİMİ + TABLO + CRUD + SIRALAMA + AKTİF/PASİF
   ════════════════════════════════════════════════════════════════ */
const TanimGrubu = ({kategoriler, user}) => {
  const {C, S, LIcon, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, Confirm, api} = MR;
  const [seciliKat, setSeciliKat] = useState(kategoriler[0]?.key || '');
  const [degerler, setDegerler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalAcik, setModalAcik] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({kod:'', deger:'', aciklama:'', sira:0});
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [confirm, setConfirm] = useState({open:false, id:null});
  const [arama, setArama] = useState('');
  /* ── TOPLU YÜKLEME STATE ── */
  const [bulkModalAcik, setBulkModalAcik] = useState(false);
  const [bulkData, setBulkData] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSonuc, setBulkSonuc] = useState(null);
  const bulkFileRef = useRef(null);

  const seciliInfo = kategoriler.find(k => k.key === seciliKat) || kategoriler[0] || {};

  /* ── VERİ YÜKLEME ── */
  const yukle = useCallback(async () => {
    setLoading(true);
    const r = await api.tanimList({kategori: seciliKat});
    if (r?.success) {
      const items = r.data?.items || r.data || [];
      setDegerler(Array.isArray(items) ? items : []);
    } else {
      setDegerler([]);
    }
    setLoading(false);
  }, [seciliKat]);

  useEffect(() => { if (seciliKat) yukle(); }, [seciliKat, yukle]);

  /* ── FİLTRELENMİŞ LİSTE ── */
  const filtrelenmis = useMemo(() => {
    if (!arama.trim()) return degerler;
    const q = arama.toUpperCase();
    return degerler.filter(d =>
      (d.deger || '').toUpperCase().includes(q) ||
      (d.kod || '').toUpperCase().includes(q) ||
      (d.aciklama || '').toUpperCase().includes(q)
    );
  }, [degerler, arama]);

  /* ── İSTATİSTİKLER ── */
  const istatistik = useMemo(() => ({
    toplam: degerler.length,
    aktif: degerler.filter(d => d.aktif == 1).length,
    pasif: degerler.filter(d => d.aktif == 0).length
  }), [degerler]);

  /* ── YENİ KAYIT MODAL AÇ ── */
  const yeniKayit = () => {
    setEditItem(null);
    setForm({kod:'', deger:'', aciklama:'', sira: degerler.length + 1});
    setHata('');
    setModalAcik(true);
  };

  /* ── DÜZENLE MODAL AÇ ── */
  const duzenleAc = (item) => {
    setEditItem(item);
    setForm({
      kod: item.kod || '',
      deger: item.deger || '',
      aciklama: item.aciklama || '',
      sira: item.sira || 0
    });
    setHata('');
    setModalAcik(true);
  };

  /* ── KAYDET ── */
  const kaydet = async () => {
    if (!form.deger.trim()) { setHata('DEĞER ALANI ZORUNLUDUR'); return; }
    setKayitLoading(true);
    setHata('');
    try {
      let r;
      if (editItem) {
        r = await api.tanimUpdate({id: editItem.id, kategori: seciliKat, ...form});
      } else {
        r = await api.tanimCreate({kategori: seciliKat, ...form});
      }
      if (r?.success) {
        setModalAcik(false);
        setEditItem(null);
        yukle();
      } else {
        setHata(r?.error || 'KAYIT BAŞARISIZ OLDU');
      }
    } catch (e) {
      setHata('BAĞLANTI HATASI OLUŞTU');
    }
    setKayitLoading(false);
  };

  /* ── SİL ── */
  const sil = async () => {
    if (!confirm.id) return;
    const r = await api.tanimDelete(confirm.id);
    if (r?.success) yukle();
    setConfirm({open:false, id:null});
  };

  /* ── AKTİF/PASİF TOGGLE ── */
  const toggleAktif = async (item) => {
    const yeniDurum = item.aktif == 1 ? 0 : 1;
    const r = await api.tanimUpdate({id: item.id, kategori: seciliKat, aktif: yeniDurum});
    if (r?.success) yukle();
  };

  /* ── SIRA DEĞİŞTİR (YUKARI / AŞAĞI) ── */
  const siraDegistir = async (item, yon) => {
    const yeniSira = (parseInt(item.sira) || 0) + yon;
    if (yeniSira < 0) return;
    const r = await api.tanimUpdate({id: item.id, kategori: seciliKat, sira: yeniSira});
    if (r?.success) yukle();
  };

  /* ── EXCEL ŞABLON İNDİR ── */
  const excelSablonIndir = () => {
    const ws_data = [
      ['DEĞER'],
      ['ÖRNEK TANIMLAMA 1'],
      ['ÖRNEK TANIMLAMA 2'],
      ['ÖRNEK TANIMLAMA 3']
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!cols'] = [{wch: 50}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, seciliInfo.label || 'TANIMLAMALAR');
    XLSX.writeFile(wb, `${(seciliInfo.label || 'TANIMLAMALAR').replace(/\s+/g, '_')}_SABLON.xlsx`);
  };

  /* ── MEVCUT VERİLERİ EXCEL OLARAK İNDİR ── */
  const mevcutExcelIndir = () => {
    if (degerler.length === 0) return;
    const ws_data = [['#', 'KOD', 'DEĞER', 'AÇIKLAMA', 'SIRA', 'DURUM']];
    degerler.forEach((d, i) => {
      ws_data.push([i + 1, d.kod || '', d.deger || '', d.aciklama || '', d.sira || 0, d.aktif == 1 ? 'AKTİF' : 'PASİF']);
    });
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!cols'] = [{wch:6},{wch:15},{wch:50},{wch:30},{wch:8},{wch:10}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, seciliInfo.label || 'TANIMLAMALAR');
    XLSX.writeFile(wb, `${(seciliInfo.label || 'TANIMLAMALAR').replace(/\s+/g, '_')}_LISTE.xlsx`);
  };

  /* ── EXCEL DOSYASI OKU ── */
  const excelOku = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, {type:'array'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, {header:1});
        // İlk satır başlık, kalanlar veri
        const degerListesi = [];
        for (let i = 1; i < rows.length; i++) {
          const val = (rows[i][0] || '').toString().trim();
          if (val) degerListesi.push(val.toUpperCase());
        }
        setBulkData(degerListesi);
        setBulkSonuc(null);
        setBulkModalAcik(true);
      } catch (err) {
        alert('EXCEL DOSYASI OKUNAMADI. LÜTFEN GEÇERLİ BİR .XLSX DOSYASI SEÇİN.');
      }
    };
    reader.readAsArrayBuffer(file);
    if (bulkFileRef.current) bulkFileRef.current.value = '';
  };

  /* ── TOPLU YÜKLE (API) ── */
  const topluYukle = async () => {
    if (bulkData.length === 0) return;
    setBulkLoading(true);
    setBulkSonuc(null);
    const r = await api.tanimBulkCreate({kategori: seciliKat, degerler: bulkData});
    setBulkLoading(false);
    if (r?.success) {
      setBulkSonuc({
        basarili: true,
        eklenen: r.data?.eklenen || 0,
        atlanan: r.data?.atlanan || 0,
        mesaj: r.message || `${r.data?.eklenen || 0} KAYIT EKLENDİ`
      });
      yukle(); // Listeyi yenile
    } else {
      setBulkSonuc({basarili: false, mesaj: r?.error || 'TOPLU YÜKLEME BAŞARISIZ OLDU'});
    }
  };

  return (
    <div>
      {/* ── KATEGORİ SEÇİM KARTLARI ── */}
      <div style={{display:'grid', gridTemplateColumns:`repeat(${Math.min(kategoriler.length, 4)}, 1fr)`, gap:12, marginBottom:20}}>
        {kategoriler.map(k => {
          const aktif = seciliKat === k.key;
          return (
            <div key={k.key} onClick={() => { setSeciliKat(k.key); setArama(''); }}
              style={{
                padding:'16px 14px', borderRadius:12, cursor:'pointer', textAlign:'center',
                background: aktif ? `${k.color}15` : C.bgCard,
                border: `1px solid ${aktif ? k.color + '44' : C.border}`,
                transition:'all .2s',
                boxShadow: aktif ? `0 4px 12px ${k.color}22` : 'none'
              }}
              onMouseEnter={e => { if(!aktif) e.currentTarget.style.background = C.bgHover; }}
              onMouseLeave={e => { if(!aktif) e.currentTarget.style.background = aktif ? `${k.color}15` : C.bgCard; }}>
              <LIcon name={k.icon} size={22} color={aktif ? k.color : C.textMuted} style={{marginBottom:8}}/>
              <div style={{fontSize:11, fontWeight:aktif?700:500, color:aktif?k.color:C.textSec, letterSpacing:0.5}}>{k.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── İSTATİSTİK SATIRI ── */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20}}>
        <MR.StatCard icon="Database" label="TOPLAM KAYIT" value={istatistik.toplam} color={seciliInfo.color || C.accent}/>
        <MR.StatCard icon="CheckCircle" label="AKTİF KAYIT" value={istatistik.aktif} color={C.success}/>
        <MR.StatCard icon="XCircle" label="PASİF KAYIT" value={istatistik.pasif} color={C.danger}/>
      </div>

      {/* ── TABLO KARTI ── */}
      <div style={S.card}>
        <SectionTitle icon={seciliInfo.icon || 'List'} title={seciliInfo.label || 'TANIMLAMALAR'}
          sub={`${istatistik.toplam} KAYIT LİSTELENİYOR`}
          right={
            <div style={{display:'flex', gap:6, alignItems:'center', flexWrap:'wrap'}}>
              {/* MEVCUT LİSTEYİ EXCEL İNDİR */}
              {degerler.length > 0 && (
                <button style={{...S.btn,...S.btnG, fontSize:10, padding:'6px 10px'}} onClick={mevcutExcelIndir} title="MEVCUT LİSTEYİ EXCEL OLARAK İNDİR">
                  <LIcon name="Download" size={12} color={C.success}/> EXCEL İNDİR
                </button>
              )}
              {/* EXCEL ŞABLON İNDİR */}
              <button style={{...S.btn,...S.btnG, fontSize:10, padding:'6px 10px'}} onClick={excelSablonIndir} title="BOŞ EXCEL ŞABLONU İNDİR">
                <LIcon name="FileSpreadsheet" size={12} color={C.accent}/> ŞABLON
              </button>
              {/* EXCEL TOPLU YÜKLE */}
              <label style={{...S.btn,...S.btnG, fontSize:10, padding:'6px 10px', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4, margin:0}} title="EXCEL DOSYASINDAN TOPLU YÜKLE">
                <LIcon name="Upload" size={12} color={C.warning}/> TOPLU YÜKLE
                <input ref={bulkFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={excelOku} style={{display:'none'}}/>
              </label>
              {/* TEK TEK EKLE */}
              {MR.hasYetki(user,'sistem','tanimlamalar-ekle') && <button style={{...S.btn,...S.btnP, fontSize:10, padding:'6px 12px'}} onClick={yeniKayit}>
                <LIcon name="Plus" size={12} color="#fff"/> YENİ EKLE
              </button>}
            </div>
          }
        />

        {/* ── ARAMA BARI ── */}
        <div style={{padding:'12px 20px', borderBottom:`1px solid ${C.border}`}}>
          <div style={{position:'relative'}}>
            <LIcon name="Search" size={14} color={C.textMuted} style={{position:'absolute', left:12, top:11}}/>
            <input value={arama} onChange={e => setArama(e.target.value)}
              placeholder="KOD, DEĞER VEYA AÇIKLAMADA ARAMA YAPIN..." style={{...S.input, paddingLeft:36}}/>
          </div>
        </div>

        <div style={S.cardBody}>
          {loading ? <Loading/> : filtrelenmis.length === 0 ? (
            <EmptyState icon="Database" title="KAYIT BULUNAMADI"
              desc={arama ? 'ARAMA KRİTERLERİNE UYGUN KAYIT YOK' : 'BU KATEGORİDE HENÜZ TANIMLAMA YAPILMAMIŞ'}/>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse', minWidth:700}}>
                <thead>
                  <tr>
                    <th style={{...TH_STYLE, width:40}}>#</th>
                    <th style={{...TH_STYLE, width:100}}>KOD</th>
                    <th style={TH_STYLE}>DEĞER</th>
                    <th style={TH_STYLE}>AÇIKLAMA</th>
                    <th style={{...TH_STYLE, width:80, textAlign:'center'}}>SIRA</th>
                    <th style={{...TH_STYLE, width:80, textAlign:'center'}}>DURUM</th>
                    <th style={{...TH_STYLE, width:140, textAlign:'center'}}>İŞLEMLER</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrelenmis.map((d, idx) => (
                    <tr key={d.id} style={{transition:'all .2s', opacity: d.aktif == 0 ? 0.55 : 1, backgroundColor:MR.tema==='koyu'?(idx%2===0?'#111827':'#0d1321'):(idx%2===0?'#ffffff':'#f0f4ff'), borderBottom:MR.tema==='koyu'?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)', borderLeft:MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)', boxShadow:MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)':'0 1px 4px rgba(99,102,241,0.08)', borderRadius:8}}
                      onMouseEnter={e => {if(MR.tema==='koyu'){e.currentTarget.style.borderLeft='3px solid rgba(6,182,212,0.8)';e.currentTarget.style.boxShadow='0 4px 16px rgba(6,182,212,0.15)';}else{e.currentTarget.style.borderLeft='3px solid rgba(99,102,241,0.6)';e.currentTarget.style.boxShadow='0 4px 12px rgba(99,102,241,0.15)';}e.currentTarget.style.transform='translateY(-1px)';}}
                      onMouseLeave={e => {e.currentTarget.style.backgroundColor=MR.tema==='koyu'?(idx%2===0?'#111827':'#0d1321'):(idx%2===0?'#ffffff':'#f0f4ff');e.currentTarget.style.borderLeft=MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)';e.currentTarget.style.boxShadow=MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)':'0 1px 4px rgba(99,102,241,0.08)';e.currentTarget.style.transform='translateY(0)';}}>
                      <td style={{...TD_STYLE, color:C.textMuted, fontSize:11}}>{idx + 1}</td>
                      <td style={TD_STYLE}>
                        {d.kod ? (
                          <span style={{...S.badge(seciliInfo.color || C.accent), fontSize:10}}>{d.kod}</span>
                        ) : (
                          <span style={{color:C.textMuted, fontSize:11}}>-</span>
                        )}
                      </td>
                      <td style={{...TD_STYLE, fontWeight:600}}>{d.deger}</td>
                      <td style={{...TD_STYLE, color:C.textSec, fontSize:11, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                        {d.aciklama || '-'}
                      </td>
                      <td style={{...TD_STYLE, textAlign:'center'}}>
                        <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:2}}>
                          <div onClick={() => siraDegistir(d, -1)}
                            style={{...BTN_KUCUK, background:'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)', boxShadow:'0 2px 8px -1px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.2)', borderBottom:'1px solid #1d4ed8'}} title="YUKARI TAŞI">
                            <LIcon name="ChevronUp" size={12} color="#fff"/>
                          </div>
                          <span style={{fontSize:11, fontWeight:600, minWidth:22, textAlign:'center'}}>{d.sira || 0}</span>
                          <div onClick={() => siraDegistir(d, 1)}
                            style={{...BTN_KUCUK, background:'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)', boxShadow:'0 2px 8px -1px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.2)', borderBottom:'1px solid #1d4ed8'}} title="AŞAĞI TAŞI">
                            <LIcon name="ChevronDown" size={12} color="#fff"/>
                          </div>
                        </div>
                      </td>
                      <td style={{...TD_STYLE, textAlign:'center'}}>
                        <div onClick={() => toggleAktif(d)} style={{cursor:'pointer', display:'inline-block'}}>
                          <Badge text={d.aktif == 1 ? 'AKTİF' : 'PASİF'} color={d.aktif == 1 ? C.success : C.danger}/>
                        </div>
                      </td>
                      <td style={{...TD_STYLE, textAlign:'center'}}>
                        <div style={{display:'flex', justifyContent:'center', gap:6}}>
                          {MR.hasYetki(user,'sistem','tanimlamalar-duzenle') && <div onClick={() => duzenleAc(d)} style={{...BTN_KUCUK, background:'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)', boxShadow:'0 2px 8px -1px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.2)', borderBottom:'1px solid #1d4ed8'}} title="DÜZENLE">
                            <LIcon name="Pencil" size={12} color="#fff"/>
                          </div>}
                          {MR.hasYetki(user,'sistem','tanimlamalar-sil') && <div onClick={() => setConfirm({open:true, id:d.id})} style={{...BTN_KUCUK, background:'linear-gradient(180deg, #f87171 0%, #ef4444 40%, #dc2626 100%)', boxShadow:'0 2px 8px -1px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.2)', borderBottom:'1px solid #b91c1c'}} title="SİL">
                            <LIcon name="Trash2" size={12} color="#fff"/>
                          </div>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── EKLE / DÜZENLE MODAL ── */}
      <Modal open={modalAcik} onClose={() => setModalAcik(false)}
        title={editItem ? `${seciliInfo.label} DÜZENLE` : `YENİ ${seciliInfo.label} EKLE`} width="520px">
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
          <FormGroup label="KOD">
            <input style={S.input} value={form.kod} onChange={e => setForm({...form, kod:e.target.value})}
              placeholder="ÖRNEK: KOD-001"/>
          </FormGroup>
          <FormGroup label="SIRA NUMARASI">
            <input type="number" style={S.input} value={form.sira}
              onChange={e => setForm({...form, sira:parseInt(e.target.value) || 0})}
              placeholder="0"/>
          </FormGroup>
          <FormGroup label="DEĞER *" full>
            <input style={S.input} value={form.deger} onChange={e => setForm({...form, deger:e.target.value})}
              placeholder="TANIMLAMA DEĞERİNİ GİRİN" autoFocus
              onKeyDown={e => { if (e.key === 'Enter') kaydet(); }}/>
          </FormGroup>
          <FormGroup label="AÇIKLAMA" full>
            <textarea style={{...S.input, minHeight:80, resize:'vertical'}} value={form.aciklama}
              onChange={e => setForm({...form, aciklama:e.target.value})}
              placeholder="AÇIKLAMA (İSTEĞE BAĞLI)"/>
          </FormGroup>
        </div>

        {/* KATEGORİ BİLGİSİ */}
        <div style={{display:'flex', alignItems:'center', gap:8, marginTop:14, padding:'8px 12px',
          background:`${seciliInfo.color || C.accent}08`, borderRadius:8, border:`1px solid ${seciliInfo.color || C.accent}15`}}>
          <LIcon name="Info" size={12} color={seciliInfo.color || C.accent}/>
          <span style={{fontSize:10, color:C.textSec}}>KATEGORİ: <strong style={{color:seciliInfo.color || C.accent}}>{seciliInfo.label}</strong></span>
        </div>

        {hata && (
          <div style={{padding:'10px 14px', background:`${C.danger}22`, border:`1px solid ${C.danger}44`, borderRadius:8, marginTop:14, fontSize:12, color:C.danger}}>
            <LIcon name="AlertTriangle" size={13} color={C.danger} style={{marginRight:6}}/> {hata}
          </div>
        )}

        <div style={{display:'flex', justifyContent:'flex-end', gap:10, marginTop:20, paddingTop:16, borderTop:`1px solid ${C.border}`}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnP, opacity:kayitLoading?0.7:1}} disabled={kayitLoading} onClick={kaydet}>
            <LIcon name={editItem ? 'Save' : 'Plus'} size={14} color="#fff"/>
            {kayitLoading ? 'KAYDEDİLİYOR...' : (editItem ? 'GÜNCELLE' : 'KAYDET')}
          </button>
        </div>
      </Modal>

      {/* ── TOPLU YÜKLEME MODAL ── */}
      <Modal open={bulkModalAcik} onClose={() => { setBulkModalAcik(false); setBulkData([]); setBulkSonuc(null); }}
        title={`TOPLU YÜKLEME - ${seciliInfo.label}`} width="640px">
        <div>
          {/* BİLGİ BARI */}
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16, padding:'10px 14px',
            background:`${C.accent}08`, borderRadius:8, border:`1px solid ${C.accent}15`}}>
            <LIcon name="Info" size={14} color={C.accent}/>
            <span style={{fontSize:11, color:C.textSec}}>
              EXCEL DOSYASINDAN <strong style={{color:C.accent}}>{bulkData.length}</strong> ADET KAYIT OKUNDU.
              MEVCUT KAYITLARLA AYNI OLANLAR OTOMATİK ATLANACAKTIR.
            </span>
          </div>

          {/* ÖNİZLEME LİSTESİ */}
          <div style={{maxHeight:350, overflow:'auto', border:`1px solid ${C.border}`, borderRadius:8, marginBottom:16}}>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th style={{...TH_STYLE, width:40, position:'sticky', top:0, zIndex:1}}>#</th>
                  <th style={{...TH_STYLE, position:'sticky', top:0, zIndex:1}}>DEĞER</th>
                  <th style={{...TH_STYLE, width:60, textAlign:'center', position:'sticky', top:0, zIndex:1}}>
                    <div onClick={() => setBulkData([])} style={{cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4}} title="TÜMÜNÜ TEMİZLE">
                      <LIcon name="Trash2" size={11} color={C.danger}/>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {bulkData.map((d, i) => (
                  <tr key={i} style={{backgroundColor:MR.tema==='koyu'?(i%2===0?'#111827':'#0d1321'):(i%2===0?'#ffffff':'#f0f4ff'), borderBottom:MR.tema==='koyu'?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)', borderLeft:MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)', boxShadow:MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)':'0 1px 4px rgba(99,102,241,0.08)', transition:'all .2s', borderRadius:8}}
                    onMouseEnter={e => {if(MR.tema==='koyu'){e.currentTarget.style.borderLeft='3px solid rgba(6,182,212,0.8)';e.currentTarget.style.boxShadow='0 4px 16px rgba(6,182,212,0.15)';}else{e.currentTarget.style.borderLeft='3px solid rgba(99,102,241,0.6)';e.currentTarget.style.boxShadow='0 4px 12px rgba(99,102,241,0.15)';}e.currentTarget.style.transform='translateY(-1px)';}}
                    onMouseLeave={e => {e.currentTarget.style.backgroundColor=MR.tema==='koyu'?(i%2===0?'#111827':'#0d1321'):(i%2===0?'#ffffff':'#f0f4ff');e.currentTarget.style.borderLeft=MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)';e.currentTarget.style.boxShadow=MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)':'0 1px 4px rgba(99,102,241,0.08)';e.currentTarget.style.transform='translateY(0)';}}>
                    <td style={{...TD_STYLE, color:C.textMuted, fontSize:11}}>{i + 1}</td>
                    <td style={{...TD_STYLE, fontWeight:600, fontSize:12}}>{d}</td>
                    <td style={{...TD_STYLE, textAlign:'center'}}>
                      <div onClick={() => setBulkData(prev => prev.filter((_, idx) => idx !== i))}
                        style={{...BTN_KUCUK, background:'linear-gradient(180deg, #f87171 0%, #ef4444 40%, #dc2626 100%)', boxShadow:'0 2px 8px -1px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.2)', borderBottom:'1px solid #b91c1c', cursor:'pointer', display:'inline-flex'}} title="KALDIR">
                        <LIcon name="X" size={11} color="#fff"/>
                      </div>
                    </td>
                  </tr>
                ))}
                {bulkData.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{...TD_STYLE, textAlign:'center', color:C.textMuted, padding:30}}>
                      YÜKLENECEK KAYIT BULUNMUYOR
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* SONUÇ MESAJI */}
          {bulkSonuc && (
            <div style={{padding:'12px 16px', borderRadius:8, marginBottom:16,
              background: bulkSonuc.basarili ? `${C.success}15` : `${C.danger}15`,
              border: `1px solid ${bulkSonuc.basarili ? C.success : C.danger}33`}}>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <LIcon name={bulkSonuc.basarili ? 'CheckCircle' : 'AlertTriangle'} size={16}
                  color={bulkSonuc.basarili ? C.success : C.danger}/>
                <div>
                  <div style={{fontSize:12, fontWeight:700, color:bulkSonuc.basarili ? C.success : C.danger}}>
                    {bulkSonuc.basarili ? 'TOPLU YÜKLEME TAMAMLANDI' : 'TOPLU YÜKLEME BAŞARISIZ'}
                  </div>
                  <div style={{fontSize:11, color:C.textSec, marginTop:4}}>{bulkSonuc.mesaj}</div>
                  {bulkSonuc.basarili && (
                    <div style={{fontSize:10, color:C.textMuted, marginTop:4}}>
                      EKLENDİ: <strong style={{color:C.success}}>{bulkSonuc.eklenen}</strong> |
                      ATLANDI: <strong style={{color:C.warning}}>{bulkSonuc.atlanan}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BUTONLAR */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:`1px solid ${C.border}`, paddingTop:16}}>
            <div style={{fontSize:10, color:C.textMuted}}>
              <LIcon name="FileSpreadsheet" size={11} color={C.textMuted} style={{marginRight:4}}/>
              KATEGORİ: <strong style={{color:seciliInfo.color || C.accent}}>{seciliInfo.label}</strong>
            </div>
            <div style={{display:'flex', gap:10}}>
              <button style={{...S.btn,...S.btnG}} onClick={() => { setBulkModalAcik(false); setBulkData([]); setBulkSonuc(null); }}>
                {bulkSonuc?.basarili ? 'KAPAT' : 'İPTAL'}
              </button>
              {!bulkSonuc?.basarili && bulkData.length > 0 && (
                <button style={{...S.btn,...S.btnP, opacity:bulkLoading?0.7:1}} disabled={bulkLoading} onClick={topluYukle}>
                  <LIcon name="Upload" size={14} color="#fff"/>
                  {bulkLoading ? 'YÜKLENİYOR...' : `${bulkData.length} KAYIT YÜKLE`}
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ── SİLME ONAY ── */}
      <Confirm open={confirm.open}
        message="BU TANIMIN SİLİNMESİNİ ONAYLIYOR MUSUNUZ? BU İŞLEM GERİ ALINAMAZ."
        onConfirm={sil} onCancel={() => setConfirm({open:false, id:null})}/>
    </div>
  );
};


/* ════════════════════════════════════════════════════════════════
   ŞABLON YÖNETİMİ BİLEŞENİ (SEKME 4)
   MATBU EVRAK, SÖZLEŞME, MEKTUP ŞABLON EDİTÖRÜ
   DEĞİŞKEN PANELİ + ÖNİZLEME İŞLEVİ
   ════════════════════════════════════════════════════════════════ */
const SablonYonetimi = ({user}) => {
  const {C, S, LIcon, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, Confirm, api} = MR;
  const [sablonlar, setSablonlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [editSablon, setEditSablon] = useState(null);
  const [form, setForm] = useState({ad:'', kategori:'matbu_evrak', icerik:'', degiskenler:[]});
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [confirm, setConfirm] = useState({open:false, id:null});
  const [onizlemeAcik, setOnizlemeAcik] = useState(false);
  const [onizlemeIcerik, setOnizlemeIcerik] = useState('');
  const [onizlemeBaslik, setOnizlemeBaslik] = useState('');
  const [arama, setArama] = useState('');
  const [katFiltre, setKatFiltre] = useState('');
  const icerikRef = useRef(null);

  /* ── VERİ YÜKLEME ── */
  const yukle = useCallback(async () => {
    setLoading(true);
    const r = await api.sablonList();
    if (r?.success) {
      const items = r.data?.items || r.data || [];
      setSablonlar(Array.isArray(items) ? items : []);
    } else {
      setSablonlar([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  /* ── FİLTRELENMİŞ LİSTE ── */
  const filtrelenmis = useMemo(() => {
    let sonuc = sablonlar;
    if (katFiltre) sonuc = sonuc.filter(s => s.kategori === katFiltre);
    if (arama.trim()) {
      const q = arama.toUpperCase();
      sonuc = sonuc.filter(s =>
        (s.ad || '').toUpperCase().includes(q) ||
        (s.icerik || '').toUpperCase().includes(q)
      );
    }
    return sonuc;
  }, [sablonlar, katFiltre, arama]);

  /* ── İSTATİSTİKLER ── */
  const istatistik = useMemo(() => ({
    toplam: sablonlar.length,
    matbu: sablonlar.filter(s => s.kategori === 'matbu_evrak').length,
    sozlesme: sablonlar.filter(s => s.kategori === 'sozlesme').length,
    mektup: sablonlar.filter(s => s.kategori === 'mektup').length,
    diger: sablonlar.filter(s => s.kategori === 'diger').length,
    aktif: sablonlar.filter(s => s.aktif == 1).length
  }), [sablonlar]);

  /* ── YENİ ŞABLON ── */
  const yeniSablon = () => {
    setEditSablon(null);
    setForm({ad:'', kategori:'matbu_evrak', icerik:'', degiskenler:[]});
    setHata('');
    setModalAcik(true);
  };

  /* ── DÜZENLE ── */
  const duzenleAc = async (sablon) => {
    const r = await api.sablonGet(sablon.id);
    if (r?.success) {
      const d = r.data || sablon;
      setEditSablon(d);
      let degiskenler = [];
      try { degiskenler = typeof d.degiskenler === 'string' ? JSON.parse(d.degiskenler) : (d.degiskenler || []); } catch(e) {}
      setForm({
        ad: d.ad || '',
        kategori: d.kategori || 'matbu_evrak',
        icerik: d.icerik || '',
        degiskenler: Array.isArray(degiskenler) ? degiskenler : []
      });
    } else {
      setEditSablon(sablon);
      setForm({ad: sablon.ad || '', kategori: sablon.kategori || 'matbu_evrak', icerik: sablon.icerik || '', degiskenler:[]});
    }
    setHata('');
    setModalAcik(true);
  };

  /* ── KAYDET ── */
  const kaydet = async () => {
    if (!form.ad.trim()) { setHata('ŞABLON ADI ZORUNLUDUR'); return; }
    if (!form.icerik.trim()) { setHata('ŞABLON İÇERİĞİ ZORUNLUDUR'); return; }
    setKayitLoading(true);
    setHata('');

    /* İÇERİKTE KULLANILAN DEĞİŞKENLERİ OTOMATİK TESPİT ET */
    const kullanilan = SABLON_DEGISKENLER.filter(v => form.icerik.includes(v.key)).map(v => v.key);
    const gonderilecek = {...form, degiskenler: JSON.stringify(kullanilan)};

    try {
      let r;
      if (editSablon) {
        r = await api.sablonUpdate({id: editSablon.id, ...gonderilecek});
      } else {
        r = await api.sablonCreate(gonderilecek);
      }
      if (r?.success) {
        setModalAcik(false);
        setEditSablon(null);
        yukle();
      } else {
        setHata(r?.error || 'KAYIT BAŞARISIZ OLDU');
      }
    } catch (e) {
      setHata('BAĞLANTI HATASI OLUŞTU');
    }
    setKayitLoading(false);
  };

  /* ── SİL ── */
  const sil = async () => {
    if (!confirm.id) return;
    const r = await api.sablonDelete(confirm.id);
    if (r?.success) yukle();
    setConfirm({open:false, id:null});
  };

  /* ── AKTİF/PASİF TOGGLE ── */
  const toggleAktif = async (sablon) => {
    const yeniDurum = sablon.aktif == 1 ? 0 : 1;
    const r = await api.sablonUpdate({id: sablon.id, aktif: yeniDurum});
    if (r?.success) yukle();
  };

  /* ── ÖNİZLEME (ÖRNEK VERİLERLE) ── */
  const onizlemeGoster = (sablon) => {
    let icerik = sablon?.icerik || form.icerik || '';
    let baslik = sablon?.ad || form.ad || 'ŞABLON ÖNİZLEME';
    SABLON_DEGISKENLER.forEach(v => {
      icerik = icerik.split(v.key).join(ORNEK_VERILER[v.key] || v.key);
    });
    setOnizlemeIcerik(icerik);
    setOnizlemeBaslik(baslik);
    setOnizlemeAcik(true);
  };

  /* ── DEĞİŞKEN İÇERİĞE EKLE (İMLEÇ POZİSYONUNA) ── */
  const degiskenEkle = (key) => {
    const ta = icerikRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const text = form.icerik;
      const yeni = text.substring(0, start) + key + text.substring(end);
      setForm({...form, icerik: yeni});
      setTimeout(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + key.length;
      }, 50);
    } else {
      setForm({...form, icerik: form.icerik + key});
    }
  };

  /* ── İÇERİKTEKİ DEĞİŞKENLERİ RENKLİ GÖSTER (ÖNİZLEMEDE) ── */
  const renderRenkliIcerik = (icerik) => {
    if (!icerik) return null;
    const parcalar = icerik.split(/(\{\{[^}]+\}\})/g);
    return parcalar.map((parca, i) => {
      if (parca.match(/^\{\{[^}]+\}\}$/)) {
        return (
          <span key={i} style={{
            background:`${C.accent}22`, color:C.accent, padding:'2px 6px',
            borderRadius:4, fontWeight:700, fontSize:12, border:`1px solid ${C.accent}33`
          }}>
            {parca}
          </span>
        );
      }
      return <span key={i}>{parca}</span>;
    });
  };

  return (
    <div>
      {/* ── İSTATİSTİK KARTLARI ── */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20}}>
        <MR.StatCard icon="FileSignature" label="TOPLAM ŞABLON" value={istatistik.toplam} color={C.accent}/>
        <MR.StatCard icon="FileText" label="MATBU EVRAK" value={istatistik.matbu} color={C.accent}/>
        <MR.StatCard icon="FileCheck" label="SÖZLEŞME" value={istatistik.sozlesme} color={C.success}/>
        <MR.StatCard icon="Mail" label="MEKTUP / DİĞER" value={istatistik.mektup + istatistik.diger} color={C.purple}/>
      </div>

      {/* ── KATEGORİ FİLTRE BUTONLARI ── */}
      <div style={{display:'flex', gap:8, marginBottom:16, flexWrap:'wrap'}}>
        <div onClick={() => setKatFiltre('')}
          style={{
            ...BTN_KUCUK, padding:'8px 16px', borderRadius:20, fontSize:11, fontWeight:600,
            background: !katFiltre ? `${C.accent}22` : C.bgCard,
            color: !katFiltre ? C.accent : C.textSec,
            border: `1px solid ${!katFiltre ? C.accent+'44' : C.border}`
          }}>TÜMÜ ({istatistik.toplam})</div>
        {Object.entries(SABLON_KAT_RENK).map(([key, val]) => {
          const sayi = sablonlar.filter(s => s.kategori === key).length;
          const aktif = katFiltre === key;
          return (
            <div key={key} onClick={() => setKatFiltre(aktif ? '' : key)}
              style={{
                ...BTN_KUCUK, padding:'8px 16px', borderRadius:20, fontSize:11, fontWeight:600,
                background: aktif ? `${val.color}22` : C.bgCard,
                color: aktif ? val.color : C.textSec,
                border: `1px solid ${aktif ? val.color+'44' : C.border}`
              }}>{val.label} ({sayi})</div>
          );
        })}
      </div>

      {/* ── ŞABLON LİSTE TABLOSU ── */}
      <div style={S.card}>
        <SectionTitle icon="FileSignature" title="ŞABLON LİSTESİ"
          sub={`${filtrelenmis.length} ŞABLON LİSTELENİYOR`}
          right={
            MR.hasYetki(user,'sistem','tanimlamalar-sablon-ekle') ? <button style={{...S.btn,...S.btnP}} onClick={yeniSablon}>
              <LIcon name="Plus" size={14} color="#fff"/> YENİ ŞABLON
            </button> : null
          }
        />

        {/* ARAMA */}
        <div style={{padding:'12px 20px', borderBottom:`1px solid ${C.border}`}}>
          <div style={{position:'relative'}}>
            <LIcon name="Search" size={14} color={C.textMuted} style={{position:'absolute', left:12, top:11}}/>
            <input value={arama} onChange={e => setArama(e.target.value)}
              placeholder="ŞABLON ADI VEYA İÇERİĞİNDE ARAMA YAPIN..." style={{...S.input, paddingLeft:36}}/>
          </div>
        </div>

        <div style={S.cardBody}>
          {loading ? <Loading/> : filtrelenmis.length === 0 ? (
            <EmptyState icon="FileSignature" title="ŞABLON BULUNAMADI"
              desc={arama || katFiltre ? 'FİLTRE KRİTERLERİNE UYGUN ŞABLON YOK' : 'HENÜZ ŞABLON OLUŞTURULMAMIŞ'}/>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse', minWidth:750}}>
                <thead>
                  <tr>
                    <th style={{...TH_STYLE, width:40}}>#</th>
                    <th style={TH_STYLE}>ŞABLON ADI</th>
                    <th style={{...TH_STYLE, width:130}}>KATEGORİ</th>
                    <th style={{...TH_STYLE, width:110, textAlign:'center'}}>DEĞİŞKENLER</th>
                    <th style={{...TH_STYLE, width:80, textAlign:'center'}}>DURUM</th>
                    <th style={{...TH_STYLE, width:120, textAlign:'center'}}>GÜNCELLEME</th>
                    <th style={{...TH_STYLE, width:150, textAlign:'center'}}>İŞLEMLER</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrelenmis.map((s, idx) => {
                    const katInfo = SABLON_KAT_RENK[s.kategori] || {label: (s.kategori || '').toUpperCase(), color: C.textMuted};
                    let degiskenSayisi = 0;
                    try {
                      const d = typeof s.degiskenler === 'string' ? JSON.parse(s.degiskenler) : (s.degiskenler || []);
                      degiskenSayisi = Array.isArray(d) ? d.length : 0;
                    } catch(e) {}
                    return (
                      <tr key={s.id} style={{transition:'all .2s', opacity: s.aktif == 0 ? 0.55 : 1, backgroundColor:MR.tema==='koyu'?(idx%2===0?'#111827':'#0d1321'):(idx%2===0?'#ffffff':'#f0f4ff'), borderBottom:MR.tema==='koyu'?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)', borderLeft:MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)', boxShadow:MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)':'0 1px 4px rgba(99,102,241,0.08)', borderRadius:8}}
                        onMouseEnter={e => {if(MR.tema==='koyu'){e.currentTarget.style.borderLeft='3px solid rgba(6,182,212,0.8)';e.currentTarget.style.boxShadow='0 4px 16px rgba(6,182,212,0.15)';}else{e.currentTarget.style.borderLeft='3px solid rgba(99,102,241,0.6)';e.currentTarget.style.boxShadow='0 4px 12px rgba(99,102,241,0.15)';}e.currentTarget.style.transform='translateY(-1px)';}}
                        onMouseLeave={e => {e.currentTarget.style.backgroundColor=MR.tema==='koyu'?(idx%2===0?'#111827':'#0d1321'):(idx%2===0?'#ffffff':'#f0f4ff');e.currentTarget.style.borderLeft=MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)';e.currentTarget.style.boxShadow=MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)':'0 1px 4px rgba(99,102,241,0.08)';e.currentTarget.style.transform='translateY(0)';}}>
                        <td style={{...TD_STYLE, color:C.textMuted, fontSize:11}}>{idx + 1}</td>
                        <td style={{...TD_STYLE, fontWeight:600}}>
                          <div style={{display:'flex', alignItems:'center', gap:10}}>
                            <div style={{width:32, height:32, borderRadius:8, background:`${katInfo.color}18`,
                              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                              <LIcon name="FileText" size={14} color={katInfo.color}/>
                            </div>
                            <div>
                              <div>{s.ad}</div>
                              <div style={{fontSize:10, color:C.textMuted, marginTop:2, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                {(s.icerik || '').substring(0, 60)}{(s.icerik || '').length > 60 ? '...' : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={TD_STYLE}>
                          <Badge text={katInfo.label} color={katInfo.color}/>
                        </td>
                        <td style={{...TD_STYLE, textAlign:'center'}}>
                          {degiskenSayisi > 0 ? (
                            <span style={{...S.badge(C.cyan), fontSize:10}}>{degiskenSayisi} DEĞİŞKEN</span>
                          ) : (
                            <span style={{fontSize:10, color:C.textMuted}}>YOK</span>
                          )}
                        </td>
                        <td style={{...TD_STYLE, textAlign:'center'}}>
                          <div onClick={() => toggleAktif(s)} style={{cursor:'pointer', display:'inline-block'}}>
                            <Badge text={s.aktif == 1 ? 'AKTİF' : 'PASİF'} color={s.aktif == 1 ? C.success : C.danger}/>
                          </div>
                        </td>
                        <td style={{...TD_STYLE, textAlign:'center', fontSize:10, color:C.textMuted}}>
                          {s.updated_at ? new Date(s.updated_at).toLocaleDateString('tr-TR') : (s.created_at ? new Date(s.created_at).toLocaleDateString('tr-TR') : '-')}
                        </td>
                        <td style={{...TD_STYLE, textAlign:'center'}}>
                          <div style={{display:'flex', justifyContent:'center', gap:6}}>
                            <div onClick={() => onizlemeGoster(s)} style={{...BTN_KUCUK, background:'linear-gradient(180deg, #22d3ee 0%, #06b6d4 40%, #0891b2 100%)', boxShadow:'0 2px 8px -1px rgba(6,182,212,0.45), inset 0 1px 0 rgba(255,255,255,0.2)', borderBottom:'1px solid #0e7490'}} title="ÖNİZLEME">
                              <LIcon name="Eye" size={12} color="#fff"/>
                            </div>
                            {MR.hasYetki(user,'sistem','tanimlamalar-sablon-duzenle') && <div onClick={() => duzenleAc(s)} style={{...BTN_KUCUK, background:'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)', boxShadow:'0 2px 8px -1px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.2)', borderBottom:'1px solid #1d4ed8'}} title="DÜZENLE">
                              <LIcon name="Pencil" size={12} color="#fff"/>
                            </div>}
                            {MR.hasYetki(user,'sistem','tanimlamalar-sil') && <div onClick={() => setConfirm({open:true, id:s.id})} style={{...BTN_KUCUK, background:'linear-gradient(180deg, #f87171 0%, #ef4444 40%, #dc2626 100%)', boxShadow:'0 2px 8px -1px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.2)', borderBottom:'1px solid #b91c1c'}} title="SİL">
                              <LIcon name="Trash2" size={12} color="#fff"/>
                            </div>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
         ŞABLON EKLE / DÜZENLE MODAL (2 SÜTUN: EDİTÖR + DEĞİŞKENLER)
         ════════════════════════════════════════════════════════════ */}
      <Modal open={modalAcik} onClose={() => setModalAcik(false)}
        title={editSablon ? 'ŞABLON DÜZENLE' : 'YENİ ŞABLON OLUŞTUR'} width="82vw">
        <div style={{display:'grid', gridTemplateColumns:'1fr 280px', gap:20}}>

          {/* ═══ SOL: FORM ALANLARI ═══ */}
          <div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16}}>
              <FormGroup label="ŞABLON ADI *">
                <input style={S.input} value={form.ad} onChange={e => setForm({...form, ad:e.target.value})}
                  placeholder="ŞABLON ADINI GİRİN" autoFocus/>
              </FormGroup>
              <FormGroup label="KATEGORİ *">
                <select style={S.select} value={form.kategori} onChange={e => setForm({...form, kategori:e.target.value})}>
                  <option value="matbu_evrak">MATBU EVRAK</option>
                  <option value="sozlesme">SÖZLEŞME</option>
                  <option value="mektup">MEKTUP</option>
                  <option value="diger">DİĞER</option>
                </select>
              </FormGroup>
            </div>

            {/* İÇERİK EDİTÖRÜ */}
            <FormGroup label="ŞABLON İÇERİĞİ *" full>
              <textarea ref={icerikRef}
                style={{
                  ...S.input, minHeight:320, resize:'vertical',
                  fontFamily:'Consolas, "Courier New", monospace', fontSize:12, lineHeight:1.8
                }}
                value={form.icerik} onChange={e => setForm({...form, icerik:e.target.value})}
                placeholder={'ŞABLON İÇERİĞİNİ BURAYA YAZIN...\n\nDEĞİŞKENLERİ SAĞDAKİ PANELDEN EKLEYEBİLİRSİNİZ.\nÖRNEK: SAYIN {{MUSTERI_ADI}},\n\n{{DOSYA_NO}} NUMARALI DOSYANIZ İLE İLGİLİ...\n\nSAYGILARIMIZLA,\nMR HASAR DANIŞMANLIK'}/>
            </FormGroup>

            {/* HIZLI AKSİYONLAR */}
            <div style={{display:'flex', gap:8, marginTop:12}}>
              <button style={{...S.btn,...S.btnG, fontSize:11, padding:'8px 14px'}} onClick={() => onizlemeGoster(null)}>
                <LIcon name="Eye" size={13} color={C.textSec}/> ÖNİZLEME
              </button>
              <button style={{...S.btn,...S.btnG, fontSize:11, padding:'8px 14px'}}
                onClick={() => setForm({...form, icerik:''})}>
                <LIcon name="RotateCcw" size={13} color={C.textSec}/> İÇERİĞİ TEMİZLE
              </button>
              <div style={{flex:1}}/>
              <div style={{display:'flex', alignItems:'center', gap:6, fontSize:10, color:C.textMuted}}>
                <LIcon name="Type" size={12} color={C.textMuted}/>
                {form.icerik.length} KARAKTER
              </div>
            </div>
          </div>

          {/* ═══ SAĞ: DEĞİŞKEN PANELİ ═══ */}
          <div style={{background:C.bg, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden', display:'flex', flexDirection:'column'}}>
            {/* PANEL BAŞLIĞI */}
            <div style={{padding:'12px 16px', borderBottom:`1px solid ${C.border}`, background:'rgba(37,99,235,0.05)'}}>
              <div style={{fontSize:12, fontWeight:700, color:C.accent, display:'flex', alignItems:'center', gap:6}}>
                <LIcon name="Code" size={14} color={C.accent}/> DEĞİŞKENLER
              </div>
              <div style={{fontSize:10, color:C.textMuted, marginTop:4}}>TIKLAYIN, İMLEÇ POZİSYONUNA EKLENSİN</div>
            </div>

            {/* DEĞİŞKEN LİSTESİ (GRUPLARA GÖRE) */}
            <div style={{flex:1, padding:12, overflow:'auto'}}>
              {['MÜŞTERİ', 'DOSYA', 'SİGORTA'].map(group => (
                <div key={group} style={{marginBottom:14}}>
                  <div style={{fontSize:10, fontWeight:700, color:C.textMuted, marginBottom:6, letterSpacing:1,
                    display:'flex', alignItems:'center', gap:4}}>
                    <LIcon name={group === 'MÜŞTERİ' ? 'User' : group === 'DOSYA' ? 'Folder' : 'Shield'} size={10} color={C.textMuted}/>
                    {group}
                  </div>
                  {SABLON_DEGISKENLER.filter(v => v.group === group).map(v => {
                    const kullaniliyor = form.icerik.includes(v.key);
                    return (
                      <div key={v.key} onClick={() => degiskenEkle(v.key)}
                        style={{
                          padding:'8px 10px', marginBottom:4, borderRadius:6, cursor:'pointer',
                          background: kullaniliyor ? `${C.success}10` : C.bgCard,
                          border: `1px solid ${kullaniliyor ? C.success+'33' : C.border}`,
                          transition:'all .15s', fontSize:11
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${C.accent}15`; e.currentTarget.style.borderColor = C.accent+'44'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = kullaniliyor ? `${C.success}10` : C.bgCard; e.currentTarget.style.borderColor = kullaniliyor ? C.success+'33' : C.border; }}>
                        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                          <div style={{fontFamily:'monospace', fontSize:10, color:C.accent, fontWeight:600}}>{v.key}</div>
                          {kullaniliyor && <LIcon name="Check" size={10} color={C.success}/>}
                        </div>
                        <div style={{fontSize:10, color:C.textMuted, marginTop:2}}>{v.label}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* KULLANILAN DEĞİŞKENLER ÖZET */}
            <div style={{padding:'10px 12px', borderTop:`1px solid ${C.border}`, background:'rgba(59,130,246,0.05)'}}>
              <div style={{fontSize:10, fontWeight:700, color:C.success, marginBottom:6, display:'flex', alignItems:'center', gap:4}}>
                <LIcon name="CheckCircle" size={10} color={C.success}/> KULLANILAN DEĞİŞKENLER
              </div>
              <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
                {SABLON_DEGISKENLER.filter(v => form.icerik.includes(v.key)).map(v => (
                  <span key={v.key} style={{...S.badge(C.success), fontSize:9}}>{v.label}</span>
                ))}
                {SABLON_DEGISKENLER.filter(v => form.icerik.includes(v.key)).length === 0 && (
                  <span style={{fontSize:10, color:C.textMuted}}>HENÜZ DEĞİŞKEN KULLANILMADI</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* HATA MESAJI */}
        {hata && (
          <div style={{padding:'10px 14px', background:`${C.danger}22`, border:`1px solid ${C.danger}44`, borderRadius:8, marginTop:16, fontSize:12, color:C.danger}}>
            <LIcon name="AlertTriangle" size={13} color={C.danger} style={{marginRight:6}}/> {hata}
          </div>
        )}

        {/* MODAL ALT BUTONLAR */}
        <div style={{display:'flex', justifyContent:'flex-end', gap:10, marginTop:20, borderTop:`1px solid ${C.border}`, paddingTop:16}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnP, opacity:kayitLoading?0.7:1}} disabled={kayitLoading} onClick={kaydet}>
            <LIcon name={editSablon ? 'Save' : 'Plus'} size={14} color="#fff"/>
            {kayitLoading ? 'KAYDEDİLİYOR...' : (editSablon ? 'GÜNCELLE' : 'KAYDET')}
          </button>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════
         ÖNİZLEME MODAL
         ════════════════════════════════════════════════════════════ */}
      <Modal open={onizlemeAcik} onClose={() => setOnizlemeAcik(false)}
        title={`ÖNİZLEME: ${onizlemeBaslik}`} width="720px">
        <div style={{marginBottom:16}}>
          {/* BİLGİ BARI */}
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:14, padding:'10px 14px',
            background:`${C.warning}08`, borderRadius:8, border:`1px solid ${C.warning}15`}}>
            <LIcon name="Info" size={14} color={C.warning}/>
            <span style={{fontSize:11, color:C.warning}}>ÖRNEK VERİLER İLE ÖNİZLEME GÖSTERİLMEKTEDİR. GERÇEK VERİLER FARKLI OLACAKTIR.</span>
          </div>

          {/* ÖNİZLEME ALANI */}
          <div style={{
            padding:28, background:'#fff', borderRadius:12, border:`1px solid ${C.border}`,
            fontSize:13, lineHeight:2, color:'#1a1a1a', whiteSpace:'pre-wrap',
            fontFamily:'Georgia, "Times New Roman", serif',
            minHeight:240, maxHeight:500, overflow:'auto',
            boxShadow:'0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {onizlemeIcerik || 'İÇERİK BULUNMUYOR'}
          </div>

          {/* YAZDIRMA BİLGİSİ */}
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12}}>
            <div style={{fontSize:10, color:C.textMuted}}>
              <LIcon name="Printer" size={11} color={C.textMuted} style={{marginRight:4}}/> YAZICIYA GÖNDERMEK İÇİN TARAYICI YAZDIR FONKSİYONUNU KULLANIN
            </div>
            <div style={{fontSize:10, color:C.textMuted}}>
              {onizlemeIcerik.length} KARAKTER
            </div>
          </div>
        </div>

        <div style={{display:'flex', justifyContent:'flex-end', gap:10, borderTop:`1px solid ${C.border}`, paddingTop:14}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setOnizlemeAcik(false)}>KAPAT</button>
        </div>
      </Modal>

      {/* ── SİLME ONAY ── */}
      <Confirm open={confirm.open}
        message="BU ŞABLONUN SİLİNMESİNİ ONAYLIYOR MUSUNUZ? BU İŞLEM GERİ ALINAMAZ."
        onConfirm={sil} onCancel={() => setConfirm({open:false, id:null})}/>
    </div>
  );
};


/* ════════════════════════════════════════════════════════════════
   ANA SAYFA BİLEŞENİ - MR.TanimlamalarPage
   5 SEKME: DOSYA | EVRAK | FİNANSAL | ŞABLON | GENEL
   ════════════════════════════════════════════════════════════════ */
MR.TanimlamalarPage = ({setPage, user, subPage}) => {
  const {C, S, LIcon} = MR;
  const aktifSekme = subPage || 'dosya';

  /* ── SEKME TANIMLARI ── */
  const sekmeler = [
    {key:'dosya',    label:'DOSYA TANIMLAMALARI',    icon:'Folder'},
    {key:'evrak',    label:'EVRAK TANIMLAMALARI',    icon:'FileText'},
    {key:'finansal', label:'FİNANSAL TANIMLAMALAR',  icon:'Wallet'},
    {key:'sablon',   label:'MATBU EVRAK / SÖZLEŞME', icon:'FileSignature'},
    {key:'genel',    label:'GENEL TANIMLAMALAR',      icon:'Settings'}
  ];

  /* ── BAŞLIK BİLGİLERİ ── */
  const baslikBilgi = {
    dosya:    {title:'DOSYA TANIMLAMALARI',    desc:'DOSYA TÜRÜ VE MÜŞTERİ KAYNAK TANIMLARINI YÖNETİN',   icon:'Folder'},
    evrak:    {title:'EVRAK TANIMLAMALARI',    desc:'EVRAK TÜRÜ VE MASRAF TÜRÜ TANIMLARINI YÖNETİN',                     icon:'FileText'},
    finansal: {title:'FİNANSAL TANIMLAMALAR',  desc:'GELİR, GİDER VE KOMİSYON TÜRÜ TANIMLARINI YÖNETİN',               icon:'Wallet'},
    sablon:   {title:'MATBU EVRAK / SÖZLEŞME', desc:'ŞABLON OLUŞTURUN, DÜZENLEYİN VE DEĞİŞKEN YÖNETİMİ YAPIN',       icon:'FileSignature'},
    genel:    {title:'GENEL TANIMLAMALAR',      desc:'HİZMET TÜRÜ VE DİĞER GENEL TANIMLAMALARI YÖNETİN',                icon:'Settings'}
  };

  const aktifBaslik = baslikBilgi[aktifSekme] || baslikBilgi.dosya;

  return (
    <div className="fade-in">
      {/* ── SAYFA BAŞLIĞI ── */}
      <div style={{marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{display:'flex', alignItems:'center', gap:14}}>
          <div style={{width:48, height:48, borderRadius:14, background:`${C.accent}22`, display:'flex', alignItems:'center', justifyContent:'center'}}>
            <LIcon name={aktifBaslik.icon} size={22} color={C.accent}/>
          </div>
          <div>
            <div style={{fontSize:18, fontWeight:800, letterSpacing:0.5}}>{aktifBaslik.title}</div>
            <div style={{fontSize:12, color:C.textMuted, marginTop:2}}>{aktifBaslik.desc}</div>
          </div>
        </div>
        {user && (
          <div style={{display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8,
            background:C.bgCard, border:`1px solid ${C.border}`}}>
            <LIcon name="User" size={12} color={C.textMuted}/>
            <span style={{fontSize:10, color:C.textSec, fontWeight:500}}>{user.ad_soyad || user.email}</span>
          </div>
        )}
      </div>

      {/* ── SEKME BARI ── */}
      <div style={{display:'flex',gap:4,marginBottom:20,background:C.bgCard,borderRadius:12,padding:6,border:`1px solid ${C.border}`}}>
        {sekmeler.map(s => {
          const aktif = aktifSekme === s.key;
          return (
            <div key={s.key} onClick={() => setPage('tanimlamalar-' + s.key)}
              style={{
                flex:1, padding:'12px 8px', borderRadius:8, cursor:'pointer', textAlign:'center',
                background: aktif ? `${C.accent}22` : 'transparent',
                border: `1px solid ${aktif ? C.accent + '44' : 'transparent'}`,
                transition:'all .2s'
              }}
              onMouseEnter={e => { if(!aktif) e.currentTarget.style.background = C.bgHover; }}
              onMouseLeave={e => { if(!aktif) e.currentTarget.style.background = 'transparent'; }}>
              <LIcon name={s.icon} size={16} color={aktif ? C.accent : C.textMuted} style={{marginBottom:4}}/>
              <div style={{fontSize:11,fontWeight:aktif?700:500,color:aktif?C.accent:C.textSec,marginTop:4,letterSpacing:0.5}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── SEKME İÇERİKLERİ ── */}
      {aktifSekme === 'dosya'    && <TanimGrubu kategoriler={SEKME_KATEGORILER.dosya} user={user}/>}
      {aktifSekme === 'evrak'    && <TanimGrubu kategoriler={SEKME_KATEGORILER.evrak} user={user}/>}
      {aktifSekme === 'finansal' && <TanimGrubu kategoriler={SEKME_KATEGORILER.finansal} user={user}/>}
      {aktifSekme === 'sablon'   && <SablonYonetimi user={user}/>}
      {aktifSekme === 'genel'    && <TanimGrubu kategoriler={SEKME_KATEGORILER.genel} user={user}/>}
    </div>
  );
};
