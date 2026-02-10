const MR = window.MR || (window.MR = {});
const {useState, useEffect} = React;

const ASAMALAR = ['DOSYA AÇIK','EVRAK BEKLENİYOR','BAŞVURU HAZIRLANIYOR','SİGORTA BAŞVURUSU','TAHKİM BAŞVURUSU','DAVA AÇILDI','BİLİRKİŞİ AŞAMASI','KARAR BEKLENİYOR','ÖDEME BEKLENİYOR','ÖDEME ALINDI','DOSYA KAPANDI'];

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

  return (
    <div className="fade-in">
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:16}}>
        <StatCard icon="Folder" label="TOPLAM DOSYA" value={toplamDosya} color={C.accent}/>
        <StatCard icon="Shield" label="ADK DOSYA" value={adkDosya} color={C.cyan}/>
        <StatCard icon="Heart" label="BH DOSYA" value={bhDosya} color={C.purple}/>
        <StatCard icon="FolderOpen" label="AÇIK DOSYA" value={acikDosya} color={C.success}/>
      </div>

      <div style={S.card}>
        <div style={{...S.cardHead, justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <LIcon name="List" size={16} color={C.accent}/>
            <div style={{fontSize:14,fontWeight:700}}>DOSYA LİSTESİ</div>
            <Badge text={`${data.length} DOSYA`} color={C.accent}/>
          </div>
          <div style={{display:'flex',gap:8}}>
            <input placeholder="ARA (TC, İSİM, DOSYA NO, PLAKA)" value={search} onChange={e => setSearch(e.target.value)}
              style={{...S.input, width:260, fontSize:11}}/>
            <select value={turF} onChange={e => setTurF(e.target.value)} style={{...S.select, width:120, fontSize:11}}>
              <option value="">TÜR: TÜMÜ</option>
              <option value="ADK">ADK</option>
              <option value="BH">BH</option>
            </select>
            <select value={asamaF} onChange={e => setAsamaF(e.target.value)} style={{...S.select, width:180, fontSize:11}}>
              <option value="">AŞAMA: TÜMÜ</option>
              {ASAMALAR.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button style={{...S.btn,...S.btnP,fontSize:11}} onClick={() => setPage('dosya-yeni')}>
              <LIcon name="Plus" size={14} color="#fff"/> YENİ
            </button>
          </div>
        </div>
        {loading ? <Loading/> : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:900}}>
              <thead>
                <tr style={{background:C.bgHover}}>
                  {['DOSYA NO','MAĞDUR','TÜR','SİGORTA','AŞAMA','AÇILIŞ','İŞLEM'].map(h =>
                    <th key={h} style={{padding:'10px 8px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:9,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState icon="FolderOpen" title="DOSYA BULUNAMADI" desc="YENİ DOSYA OLUŞTURUN"/></td></tr>
                ) : data.map((d, i) => (
                  <tr key={i} style={{borderBottom:`1px solid ${C.border}`,cursor:'pointer'}}
                    onClick={() => onSelect(d.dosya_id || d.id)}
                    onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{padding:'10px 8px',fontWeight:700,color:C.accent}}>{d.dosya_no}</td>
                    <td style={{padding:'10px 8px'}}>{d.magdur_adi || '-'}</td>
                    <td style={{padding:'10px 8px'}}><Badge text={d.dosya_turu} color={d.dosya_turu === 'ADK' ? C.accent : C.purple}/></td>
                    <td style={{padding:'10px 8px',color:C.textSec}}>{d.sigorta_sirket || '-'}</td>
                    <td style={{padding:'10px 8px'}}><Badge text={d.asama || 'AÇIK'} color={C.cyan}/></td>
                    <td style={{padding:'10px 8px',color:C.textMuted}}>{d.acilis_tarihi || d.created_at?.split(' ')[0] || '-'}</td>
                    <td style={{padding:'10px 8px'}}>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <LIcon name="Eye" size={14} color={C.accent}/>
                        <span onClick={(e) => { e.stopPropagation(); setDeleteConfirm({id: d.dosya_id || d.id, text: d.dosya_no}); }}
                          style={{cursor:'pointer',display:'flex',alignItems:'center'}}>
                          <LIcon name="Trash2" size={14} color={C.danger}/>
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
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
