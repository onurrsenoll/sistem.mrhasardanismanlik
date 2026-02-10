const MR = window.MR || (window.MR = {});
const {useState, useEffect} = React;

MR.HomePage = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, EmptyState, Loading, api, fmt} = MR;
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ds, fl] = await Promise.all([api.dashboard(), api.dosyaList({limit:5})]);
      if (ds?.success) setStats(ds.data);
      if (fl?.success) setRecent(fl.data.items || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loading/>;

  const d = stats?.dosya || {};
  const m = stats?.mali || {};
  const k = stats?.kullanici || {};
  const crm = stats?.crm || {};

  return (
    <div className="fade-in">
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:16,marginBottom:24}}>
        <StatCard icon="FolderOpen" label="TOPLAM DOSYA" value={d.toplam || 0} color={C.accent}/>
        <StatCard icon="FileCheck" label="AÇIK DOSYA" value={d.acik || 0} color={C.success}/>
        <StatCard icon="Clock" label="BU AY YENİ" value={d.bu_ay || 0} color={C.warning}/>
        <StatCard icon="Users" label="CRM KAYIT" value={crm.toplam || 0} color={C.purple}/>
        <StatCard icon="TurkishLira" label="TOPLAM BAKİYE" value={fmt(m.toplam_bakiye || 0)} color={C.cyan}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20}}>
        <div style={S.card}>
          <SectionTitle icon="FolderOpen" title="SON DOSYALAR"/>
          <div style={S.cardBody}>
            {recent.length > 0 ? (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{borderBottom:`1px solid ${C.border}`}}>
                    {['DOSYA NO','MAĞDUR','TÜR','AŞAMA'].map(h =>
                      <th key={h} style={{padding:'8px 12px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:10}}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((d, i) => (
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}`,cursor:'pointer'}}
                        onClick={() => setPage('dosya-detay-' + (d.dosya_id || d.id))}>
                      <td style={{padding:'10px 12px',fontWeight:600,color:C.accent}}>{d.dosya_no}</td>
                      <td style={{padding:'10px 12px'}}>{d.magdur_adi || '-'}</td>
                      <td style={{padding:'10px 12px'}}><Badge text={d.dosya_turu} color={d.dosya_turu === 'ADK' ? C.accent : C.purple}/></td>
                      <td style={{padding:'10px 12px'}}><Badge text={d.asama || 'DOSYA AÇIK'} color={C.cyan}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState icon="FolderOpen" title="HENÜZ DOSYA YOK" desc="YENİ DOSYA OLUŞTURMAK İÇİN TIKLAYIN"/>}
            <div style={{marginTop:12,textAlign:'center'}}>
              <button style={{...S.btn,...S.btnP,fontSize:11}} onClick={() => setPage('dosya-liste')}>TÜM DOSYALAR →</button>
            </div>
          </div>
        </div>

        <div style={S.card}>
          <SectionTitle icon="Zap" title="HIZLI İŞLEMLER"/>
          <div style={S.cardBody}>
            {[
              {i:'Plus',l:'YENİ DOSYA OLUŞTUR',p:'dosya-yeni',c:C.accent},
              {i:'Calculator',l:'ADK HESAPLA',p:'hesap-adk',c:C.success},
              {i:'Heart',l:'BEDENİ HASAR',p:'hesap-bh',c:C.purple},
              {i:'UserPlus',l:'YENİ CRM KAYDI',p:'crm-yeni',c:C.cyan},
              {i:'CalendarDays',l:'AJANDA',p:'ajanda',c:C.warning},
              {i:'Bell',l:'BİLDİRİMLER',p:'bildirim',c:C.pink}
            ].map(({i,l,p,c}, idx) => (
              <div key={idx} onClick={() => setPage(p)}
                style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:10,cursor:'pointer',marginBottom:6,border:`1px solid ${C.border}`,transition:'all .2s'}}
                onMouseEnter={e => {e.currentTarget.style.borderColor=c;e.currentTarget.style.background=`${c}11`;}}
                onMouseLeave={e => {e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background='transparent';}}>
                <div style={{width:34,height:34,borderRadius:8,background:`${c}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <LIcon name={i} size={16} color={c}/>
                </div>
                <span style={{fontSize:13,fontWeight:600}}>{l}</span>
                <LIcon name="ChevronRight" size={14} color={C.textMuted} style={{marginLeft:'auto'}}/>
              </div>
            ))}
          </div>
        </div>
      </div>

      {stats?.son_aktiviteler?.length > 0 && (
        <div style={{...S.card, marginTop:20}}>
          <SectionTitle icon="Activity" title="SON AKTİVİTELER"/>
          <div style={S.cardBody}>
            {stats.son_aktiviteler.map((a, i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:32,height:32,borderRadius:8,background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <LIcon name="Activity" size={14} color={C.accent}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600}}>{a.islem}</div>
                  <div style={{fontSize:11,color:C.textMuted}}>{a.detay}</div>
                </div>
                <div style={{fontSize:10,color:C.textMuted}}>{a.kullanici_adi} • {a.created_at}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
