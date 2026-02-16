const MR = window.MR || (window.MR = {});
const {useState, useEffect} = React;

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

MR.DosyaListePage = ({setPage, user}) => {
  const onSelect = (id) => setPage('dosya-detay-' + id);
  return <MR._DosyaListesiInner setPage={setPage} onSelect={onSelect}/>;
};

MR._DosyaListesiInner = ({setPage, onSelect}) => {
  const {C, S, LIcon, Badge, StatCard, Loading, EmptyState, Confirm, api} = MR;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [turF, setTurF] = useState('');
  const [asamaF, setAsamaF] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    const p = {};
    if (search) p.q = search;
    if (turF) p.tur = turF;
    if (asamaF) p.asama = asamaF;
    const r = await api.dosyaList(p);
    if (r?.success) setData(r.data.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [search, turF, asamaF]);

  const dosyaSil = async (id) => {
    const r = await api.dosyaDelete(id);
    if (r?.success) { load(); setDeleteConfirm(null); }
  };

  const toplamDosya = data.length;
  const adkDosya = data.filter(d => d.dosya_turu === 'ADK').length;
  const bhDosya = data.filter(d => d.dosya_turu === 'BH').length;
  const acikDosya = data.filter(d => d.asama !== 'DOSYA KAPANDI').length;

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
        {/* FİLTRELER */}
        <div style={{padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`1px solid ${C.border}`,flexWrap:'wrap',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <LIcon name="List" size={14} color={C.accent}/>
            <span style={{fontSize:13,fontWeight:700}}>DOSYA LİSTESİ</span>
            <span style={{padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:600,background:`${C.accent}18`,color:C.accent}}>{data.length} DOSYA</span>
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
            <button style={{...S.btn,...S.btnP,fontSize:10,padding:'6px 14px'}} onClick={() => setPage('dosya-yeni')}>
              <LIcon name="Plus" size={12} color="#fff"/> YENİ
            </button>
          </div>
        </div>

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
                  <th style={{...thS,minWidth:90}}>BAŞVURU TÜRÜ</th>
                  <th style={{...thS,minWidth:100}}>DAVALI ŞİRKET</th>
                  <th style={{...thS,minWidth:100}}>SİGORTA HASAR NO</th>
                  <th style={{...thS,minWidth:75}}>AÇILIŞ TARİHİ</th>
                  <th style={{...thS,minWidth:110}}>DOSYA AŞAMA DURUMU</th>
                  <th style={{...thS,minWidth:75}}>KAYIT TARİHİ</th>
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
                      {/* BAŞVURU TÜRÜ */}
                      <td style={{...tdS,color:C.textSec,fontSize:9,maxWidth:100,overflow:'hidden',textOverflow:'ellipsis'}}>{d.talep_turu || '-'}</td>
                      {/* DAVALI ŞİRKET */}
                      <td style={{...tdS,fontSize:9,maxWidth:110,overflow:'hidden',textOverflow:'ellipsis'}}>{d.sigorta_sirket || '-'}</td>
                      {/* SİGORTA HASAR NO */}
                      <td style={{...tdS,fontFamily:'monospace',fontSize:9,color:C.textSec}}>{d.hasar_no || '-'}</td>
                      {/* AÇILIŞ TARİHİ */}
                      <td style={{...tdS,color:C.textMuted,fontSize:10}}>{d.acilis_tarihi || '-'}</td>
                      {/* DOSYA AŞAMA DURUMU */}
                      <td style={tdS}>
                        <span style={{display:'inline-block',padding:'2px 6px',borderRadius:4,fontSize:8,fontWeight:600,
                          background:ac+'18',color:ac,whiteSpace:'nowrap',border:`1px solid ${ac}33`}}>
                          {d.asama || '-'}
                        </span>
                      </td>
                      {/* KAYIT TARİHİ */}
                      <td style={{...tdS,color:C.textMuted,fontSize:10}}>{d.created_at?.split(' ')[0] || '-'}</td>
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
      </div>

      <Confirm open={!!deleteConfirm} message={deleteConfirm ? `"${deleteConfirm.text}" DOSYASI SİLİNSİN Mİ?` : ''}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && dosyaSil(deleteConfirm.id)}/>
    </div>
  );
};
