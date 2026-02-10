const MR = window.MR || (window.MR = {});
const {useState, useEffect} = React;

MR.CrmPage = ({setPage, user, view, crmId}) => {
  if (view === 'yeni') return <MR._CRMYeniInner setPage={setPage}/>;
  return <MR._CRMListesiInner setPage={setPage}/>;
};

MR._CRMListesiInner = ({setPage}) => {
  const {C, S, LIcon, Badge, StatCard, Loading, EmptyState, api} = MR;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [durumF, setDurumF] = useState('');
  const [stats, setStats] = useState({top:0, tak:0, olu:0, neg:0});

  const load = async () => {
    setLoading(true);
    const p = {};
    if (filter) p.q = filter;
    if (durumF) p.durum = durumF;
    const r = await api.crmList(p);
    if (r?.success) {
      const items = r.data.items || [];
      setData(items);
      // Load all for stats
      if (!filter && !durumF) {
        setStats({
          top: r.data.pagination?.total || items.length,
          tak: items.filter(c => c.durum === 'Takipte').length,
          olu: items.filter(c => c.durum === 'Olumlu').length,
          neg: items.filter(c => c.durum === 'Olumsuz').length
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [filter, durumF]);

  const dC = d => d === 'Olumlu' ? C.success : d === 'Takipte' ? C.warning : d === 'Yeni' ? C.cyan : d === 'Olumsuz' ? C.danger : C.textSec;
  const durumlar = ['', 'Yeni', 'Takipte', 'Olumlu', 'Olumsuz'];
  const durumLabels = {'': 'TÜMÜ', 'Yeni': 'YENİ', 'Takipte': 'TAKİPTE', 'Olumlu': 'OLUMLU', 'Olumsuz': 'OLUMSUZ'};

  return (
    <div className="fade-in">
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        <StatCard icon="Users" label="TOPLAM KAYIT" value={stats.top} color={C.accent}/>
        <StatCard icon="Clock" label="TAKİPTE" value={stats.tak} color={C.warning}/>
        <StatCard icon="Check" label="OLUMLU" value={stats.olu} color={C.success}/>
        <StatCard icon="X" label="OLUMSUZ" value={stats.neg} color={C.danger}/>
      </div>

      <div style={S.card}>
        <div style={{...S.cardHead, justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <LIcon name="Users" size={16} color={C.accent}/>
            <span style={{fontSize:14,fontWeight:700}}>CRM - POTANSİYEL MÜŞTERİLER</span>
            <Badge text={`${data.length} KAYIT`} color={C.accent}/>
          </div>
          <div style={{display:'flex',gap:8}}>
            <input placeholder="AD VEYA TELEFON" value={filter} onChange={e => setFilter(e.target.value)}
              style={{...S.input, width:200, fontSize:11}}/>
            <button style={{...S.btn,...S.btnP,fontSize:11}} onClick={() => setPage('crm-yeni')}>
              <LIcon name="Plus" size={14} color="#fff"/> YENİ
            </button>
          </div>
        </div>

        <div style={{padding:'12px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:6}}>
          {durumlar.map(d => (
            <span key={d||'all'} onClick={() => setDurumF(d)}
              style={{padding:'5px 14px',borderRadius:20,fontSize:11,fontWeight:durumF===d?700:400,cursor:'pointer',
                background:durumF===d?`${C.accent}22`:'transparent',color:durumF===d?C.accent:C.textSec,
                border:`1px solid ${durumF===d?C.accent+'44':C.border}`}}>
              {durumLabels[d]}
            </span>
          ))}
        </div>

        {loading ? <Loading/> : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:900}}>
              <thead>
                <tr style={{background:C.bgHover}}>
                  {['AD SOYAD','TELEFON','İL','TÜR','KAYNAK','DURUM','SON İLETİŞİM','ATANAN'].map(h =>
                    <th key={h} style={{padding:'10px 8px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:9,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={8}><EmptyState icon="Users" title="CRM KAYDI BULUNAMADI" desc="YENİ CRM KAYDI OLUŞTURUN"/></td></tr>
                ) : data.map((c, i) => (
                  <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'10px 8px',fontWeight:600}}>{c.ad_soyad}</td>
                    <td style={{padding:'10px 8px',color:C.textSec}}>{c.telefon || '-'}</td>
                    <td style={{padding:'10px 8px'}}>{c.il || '-'}</td>
                    <td style={{padding:'10px 8px'}}><Badge text={c.dosya_turu || 'ADK'} color={c.dosya_turu === 'BH' ? C.purple : C.accent}/></td>
                    <td style={{padding:'10px 8px',color:C.textMuted}}>{c.kaynak || '-'}</td>
                    <td style={{padding:'10px 8px'}}><Badge text={c.durum} color={dC(c.durum)}/></td>
                    <td style={{padding:'10px 8px',color:C.textMuted}}>{c.son_iletisim || '-'}</td>
                    <td style={{padding:'10px 8px',color:C.textSec}}>{c.atanan_adi || '-'}</td>
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

MR._CRMYeniInner = ({setPage}) => {
  const {C, S, LIcon, SectionTitle, FormGroup, api, ILLER} = MR;
  const [f, sF] = useState({ad_soyad:'', telefon:'', email:'', il:'', ilce:'', dosya_turu:'ADK', kaynak:'TELEFON', not_text:''});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const up = (k, v) => sF(p => ({...p, [k]: v}));

  const kaydet = async () => {
    if (!f.ad_soyad || !f.telefon) { setError('AD VE TELEFON ZORUNLU'); return; }
    setLoading(true); setError('');
    const r = await api.crmCreate(f);
    if (r?.success) setPage('crm-liste');
    else setError(r?.error || 'HATA');
    setLoading(false);
  };

  return (
    <div style={S.card} className="fade-in">
      <SectionTitle icon="UserPlus" title="YENİ CRM KAYDI" sub="POTANSİYEL MÜŞTERİ"/>
      <div style={S.cardBody}>
        {error && <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger}}>{error}</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:700}}>
          <FormGroup label="AD SOYAD *"><input style={S.input} value={f.ad_soyad} onChange={e=>up('ad_soyad',e.target.value)} placeholder="AD SOYAD"/></FormGroup>
          <FormGroup label="TELEFON *"><input style={S.input} value={f.telefon} onChange={e=>up('telefon',e.target.value)} placeholder="05XX XXX XXXX"/></FormGroup>
          <FormGroup label="E-POSTA"><input style={S.input} value={f.email} onChange={e=>up('email',e.target.value)} placeholder="E-POSTA"/></FormGroup>
          <FormGroup label="İL">
            <select style={S.select} value={f.il} onChange={e=>up('il',e.target.value)}>
              <option value="">SEÇİNİZ</option>{ILLER.map(i=><option key={i} value={i}>{i}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="İLÇE"><input style={S.input} value={f.ilce} onChange={e=>up('ilce',e.target.value)} placeholder="İLÇE"/></FormGroup>
          <FormGroup label="TÜR">
            <select style={S.select} value={f.dosya_turu} onChange={e=>up('dosya_turu',e.target.value)}>
              <option value="ADK">ADK</option><option value="BH">BEDENİ HASAR</option>
            </select>
          </FormGroup>
          <FormGroup label="KAYNAK">
            <select style={S.select} value={f.kaynak} onChange={e=>up('kaynak',e.target.value)}>
              <option value="TELEFON">TELEFON</option><option value="WEB FORMU">WEB FORMU</option>
              <option value="SOSYAL MEDYA">SOSYAL MEDYA</option><option value="YÖNLENDİRME">YÖNLENDİRME</option>
              <option value="DİĞER">DİĞER</option>
            </select>
          </FormGroup>
          <FormGroup label="NOT" full>
            <textarea style={{...S.input,minHeight:70}} value={f.not_text} onChange={e=>up('not_text',e.target.value)} placeholder="GÖRÜŞME NOTU..."/>
          </FormGroup>
        </div>
        <div style={{marginTop:20,display:'flex',gap:8}}>
          <button style={{...S.btn,...S.btnS}} onClick={kaydet} disabled={loading}>
            <LIcon name="Save" size={14} color="#fff"/> {loading ? 'KAYDEDİLİYOR...' : 'KAYDET'}
          </button>
          <button style={{...S.btn,...S.btnG}} onClick={() => setPage('crm-liste')}>İPTAL</button>
        </div>
      </div>
    </div>
  );
};
