const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useRef} = React;

/* ═══════════════════════════════════════════
   CRM ANALİZ - ARAMA GEÇMİŞİ / İSTATİSTİK
   ═══════════════════════════════════════════ */
MR.AramaGecmisPage = ({setPage, user}) => {
  const {C, S, LIcon, Badge, StatCard, Loading, EmptyState, api} = MR;

  /* TABS */
  const [tab, setTab] = useState('gecmis');
  const tabs = [
    {id:'gecmis', label:'ARAMA GEÇMİŞİ', icon:'PhoneCall'},
    {id:'istatistik', label:'İSTATİSTİKLER', icon:'BarChart3'},
    {id:'cevapsiz', label:'CEVAPSIZ ÇAĞRILAR', icon:'PhoneMissed'},
    {id:'kayitlar', label:'GÖRÜŞME KAYITLARI', icon:'Mic'}
  ];

  /* İSTATİSTİKLER - Backend genel.toplam_arama formatında döner */
  const [stats, setStats] = useState({toplam_arama:0, gelen_arama:0, giden_arama:0, cevaplanan:0, cevapsiz:0, reddedilen:0, ort_sure:0, en_uzun_gorusme:0, toplam_sure:0, kayitli_gorusme:0});
  const [statsLoading, setStatsLoading] = useState(true);
  const [grafik, setGrafik] = useState([]);
  const [enCokAranan, setEnCokAranan] = useState([]);

  /* ARAMA LİSTESİ */
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [yonF, setYonF] = useState('');
  const [durumF, setDurumF] = useState('');
  const [tarihBas, setTarihBas] = useState('');
  const [tarihBit, setTarihBit] = useState('');
  const [sayfa, setSayfa] = useState(1);
  const [toplamSayfa, setToplamSayfa] = useState(1);
  const [toplamKayit, setToplamKayit] = useState(0);

  /* İSTATİSTİK YÜKLE */
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const p = {};
    if (tarihBas) p.tarih_bas = tarihBas;
    if (tarihBit) p.tarih_son = tarihBit;
    const r = await api.aramaLogIstatistik(p);
    if (r?.success && r.data) {
      const g = r.data.genel || r.data;
      setStats({
        toplam_arama: g.toplam_arama || g.toplam || 0,
        gelen_arama: g.gelen_arama || g.gelen || 0,
        giden_arama: g.giden_arama || g.giden || 0,
        cevaplanan: g.cevaplanan || 0,
        cevapsiz: g.cevapsiz || 0,
        reddedilen: g.reddedilen || 0,
        ort_sure: g.ort_sure || 0,
        en_uzun_gorusme: g.en_uzun_gorusme || 0,
        toplam_sure: g.toplam_sure || 0,
        kayitli_gorusme: g.kayitli_gorusme || g.kayitli || 0
      });
      if (r.data.grafik) setGrafik(r.data.grafik);
      if (r.data.en_cok_aranan) setEnCokAranan(r.data.en_cok_aranan);
    }
    setStatsLoading(false);
  }, [tarihBas, tarihBit]);

  /* LİSTE YÜKLE */
  const loadList = useCallback(async (durumOverride) => {
    setLoading(true);
    const p = {sayfa: sayfa, limit: 50};
    if (search) p.q = search;
    if (yonF) p.yon = yonF;
    const d = durumOverride !== undefined ? durumOverride : durumF;
    if (d) p.durum = d;
    if (tarihBas) p.tarih_bas = tarihBas;
    if (tarihBit) p.tarih_son = tarihBit;
    const r = await api.aramaLogList(p);
    if (r?.success && r.data) {
      /* Backend kolon adlarını frontend formatına dönüştür */
      const rawItems = r.data?.items || r.data?.aramalar || [];
      setData(rawItems.map(item => ({
        ...item,
        arama_tarihi: item.arama_tarihi || item.baslangic_zamani || item.created_at || '-',
        arayan: item.arayan || item.numara || '-',
        arayan_adi: item.arayan_adi || item.musteri_adi || '',
        sure: item.sure ?? item.sure_saniye ?? 0,
      })));
      /* Pagination: hem {pagination:{totalPages}} hem de {toplam_sayfa} formatı destekle */
      if (r.data?.pagination) {
        setToplamSayfa(r.data.pagination.totalPages || r.data.pagination.toplam_sayfa || 1);
        setToplamKayit(r.data.pagination.total || r.data.pagination.toplam || 0);
      } else {
        setToplamSayfa(r.data.toplam_sayfa || 1);
        setToplamKayit(r.data.toplam || 0);
      }
    }
    setLoading(false);
  }, [search, yonF, durumF, tarihBas, tarihBit, sayfa]);

  /* İLK YÜKLEME */
  const ilkRef = useRef(true);
  useEffect(() => {
    if (ilkRef.current) { ilkRef.current = false; loadStats(); loadList(); return; }
    const t = setTimeout(() => { loadStats(); loadList(); }, 400);
    return () => clearTimeout(t);
  }, [search, yonF, durumF, tarihBas, tarihBit, sayfa]);

  /* TAB DEĞİŞTİĞİNDE */
  useEffect(() => {
    if (tab === 'cevapsiz') loadList('cevapsiz');
    else if (tab === 'gecmis') loadList();
  }, [tab]);

  /* SÜRE FORMAT */
  const sureFmt = (s) => {
    if (!s || s === 0) return '-';
    const dk = Math.floor(s / 60);
    const sn = s % 60;
    return dk > 0 ? dk + 'dk ' + sn + 'sn' : sn + 'sn';
  };

  /* TEMİZLE */
  const temizle = () => {
    setSearch(''); setYonF(''); setDurumF('');
    setTarihBas(''); setTarihBit('');
    setSayfa(1);
  };

  /* YÖN RENK */
  const yonRenk = (y) => y === 'gelen' ? C.success : y === 'giden' ? C.accent : C.textSec;
  const durumRenk = (d) => {
    if (!d) return C.textSec;
    if (d === 'cevaplandi' || d === 'gorusme') return C.success;
    if (d === 'cevapsiz' || d === 'mesgul' || d === 'iptal') return C.danger;
    if (d === 'calıyor' || d === 'caliyor') return C.warning;
    return C.textSec;
  };

  const thSt = {padding:'10px 8px', textAlign:'left', color: MR.tema==='koyu' ? '#cbd5e1' : C.textMuted, fontWeight:800, fontSize:11, borderBottom:`2px solid ${C.border}`, whiteSpace:'nowrap', letterSpacing:0.3};
  const tdSt = {padding:'8px 8px', fontSize:12, fontWeight:600, borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap'};

  return (
    <div className="fade-in">
      {/* İSTATİSTİK KARTLARI */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10, marginBottom:16}}>
        <StatCard icon="Phone" label="TOPLAM ARAMA" value={stats.toplam_arama} color={C.accent}/>
        <StatCard icon="PhoneIncoming" label="GELEN" value={stats.gelen_arama} color={C.success}/>
        <StatCard icon="PhoneOutgoing" label="GİDEN" value={stats.giden_arama} color={C.accent}/>
        <StatCard icon="PhoneMissed" label="CEVAPSIZ" value={stats.cevapsiz} color={C.danger}/>
        <StatCard icon="Clock" label="ORT. SÜRE" value={sureFmt(stats.ort_sure)} color={C.warning}/>
        <StatCard icon="UserCheck" label="KAYITLI" value={stats.kayitli_gorusme} color={C.cyan}/>
      </div>

      {/* TABS */}
      <div style={{display:'flex', gap:6, marginBottom:16}}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              ...S.btn, fontSize:11, padding:'8px 16px', borderRadius:10,
              background: tab === t.id ? C.accent : `${C.accent}10`,
              color: tab === t.id ? '#fff' : C.textSec,
              border: `1px solid ${tab === t.id ? C.accent : C.border}`,
              fontWeight: tab === t.id ? 700 : 500,
              display:'flex', alignItems:'center', gap:6
            }}>
            <LIcon name={t.icon} size={14} color={tab === t.id ? '#fff' : C.textSec}/> {t.label}
          </button>
        ))}
      </div>

      {/* ANA İÇERİK */}
      <div style={S.card}>

        {/* FİLTRE BAR */}
        <div style={{padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
          <span style={{fontSize:10, fontWeight:700, color:C.textMuted}}>ARAMA</span>
          <input placeholder="NUMARA VEYA İSİM..." value={search} onChange={e => {setSearch(e.target.value); setSayfa(1);}}
            style={{...S.input, width:220, fontSize:11, padding:'7px 12px'}}/>

          <span style={{fontSize:10, fontWeight:700, color:C.textMuted}}>YÖN</span>
          <select value={yonF} onChange={e => {setYonF(e.target.value); setSayfa(1);}}
            style={{...S.select, width:110, fontSize:11, padding:'7px 10px'}}>
            <option value="">TÜMÜ</option>
            <option value="gelen">GELEN</option>
            <option value="giden">GİDEN</option>
          </select>

          <span style={{fontSize:10, fontWeight:700, color:C.textMuted}}>DURUM</span>
          <select value={durumF} onChange={e => {setDurumF(e.target.value); setSayfa(1);}}
            style={{...S.select, width:110, fontSize:11, padding:'7px 10px'}}>
            <option value="">TÜMÜ</option>
            <option value="cevaplandi">CEVAPLANDI</option>
            <option value="cevapsiz">CEVAPSIZ</option>
            <option value="mesgul">MEŞGUL</option>
          </select>

          <span style={{fontSize:10, fontWeight:700, color:C.textMuted}}>BAŞLANGIÇ TARİHİ</span>
          <input type="date" value={tarihBas} onChange={e => {setTarihBas(e.target.value); setSayfa(1);}}
            style={{...S.input, width:140, fontSize:11, padding:'7px 10px'}}/>

          <span style={{fontSize:10, fontWeight:700, color:C.textMuted}}>BİTİŞ TARİHİ</span>
          <input type="date" value={tarihBit} onChange={e => {setTarihBit(e.target.value); setSayfa(1);}}
            style={{...S.input, width:140, fontSize:11, padding:'7px 10px'}}/>

          <button style={{...S.btn, ...S.btnG, fontSize:10, padding:'7px 12px', display:'flex', alignItems:'center', gap:4}} onClick={temizle}>
            <LIcon name="RotateCcw" size={12} color={C.textSec}/> TEMİZLE
          </button>
        </div>

        {/* ARAMA GEÇMİŞİ TAB */}
        {(tab === 'gecmis' || tab === 'cevapsiz') && (
          <>
            <div style={{...S.cardHead, padding:'10px 16px', justifyContent:'space-between'}}>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <LIcon name={tab === 'cevapsiz' ? 'PhoneMissed' : 'PhoneCall'} size={14} color={C.accent}/>
                <span style={{fontSize:12, fontWeight:700}}>{tab === 'cevapsiz' ? 'CEVAPSIZ ÇAĞRILAR' : 'ARAMA GEÇMİŞİ'}</span>
                <Badge text={toplamKayit + ' KAYIT'} color={C.accent}/>
              </div>
              <button style={{...S.btn, ...S.btnG, fontSize:10, padding:'6px 12px'}} onClick={() => loadList()}>
                <LIcon name="RefreshCw" size={12} color={C.textSec}/> YENİLE
              </button>
            </div>

            {loading ? <Loading/> : data.length === 0 ? (
              <EmptyState icon="PhoneCall" title={tab === 'cevapsiz' ? 'CEVAPSIZ ÇAĞRI YOK' : 'ARAMA KAYDI BULUNAMADI'}
                desc="ARAMA GEÇMİŞİ VERİSİ HENÜZ BULUNMAMAKTADIR"/>
            ) : (
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:11, minWidth:900}}>
                  <thead>
                    <tr style={{background:C.bgHover}}>
                      {['TARİH', 'YÖN', 'ARAYAN', 'ARANAN', 'DURUM', 'SÜRE', 'KULLANICI', 'NOT'].map(h =>
                        <th key={h} style={thSt}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, i) => (
                      <tr key={item.id || i} style={{borderBottom:`1px solid ${C.border}`}}
                        onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{...tdSt, color:C.textMuted, fontSize:11}}>{item.arama_tarihi || '-'}</td>
                        <td style={tdSt}>
                          <span style={{
                            padding:'2px 8px', borderRadius:6, fontSize:9, fontWeight:700,
                            background:`${yonRenk(item.yon)}15`, color:yonRenk(item.yon)
                          }}>
                            {item.yon === 'gelen' ? 'GELEN' : 'GİDEN'}
                          </span>
                        </td>
                        <td style={{...tdSt, fontWeight:600}}>
                          {item.arayan_adi && <div style={{fontSize:11, fontWeight:700}}>{item.arayan_adi}</div>}
                          <div style={{fontSize:10, color:C.textMuted}}>{item.arayan || '-'}</div>
                        </td>
                        <td style={{...tdSt, fontWeight:600}}>{item.aranan || '-'}</td>
                        <td style={tdSt}>
                          <span style={{
                            padding:'2px 8px', borderRadius:6, fontSize:9, fontWeight:700,
                            background:`${durumRenk(item.durum)}15`, color:durumRenk(item.durum)
                          }}>
                            {(item.durum || 'BİLİNMİYOR').toUpperCase()}
                          </span>
                        </td>
                        <td style={{...tdSt, color:C.textSec}}>{sureFmt(item.sure)}</td>
                        <td style={{...tdSt, color:C.textMuted, fontSize:10}}>{item.kullanici_adi || '-'}</td>
                        <td style={{...tdSt, color:C.textMuted, fontSize:10, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis'}}>{item.notlar || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* SAYFALAMA */}
            {data.length > 0 && toplamSayfa > 1 && (
              <div style={{padding:'12px 16px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'center', alignItems:'center', gap:4}}>
                <button disabled={sayfa <= 1} onClick={() => setSayfa(1)}
                  style={{...S.btn, ...S.btnG, fontSize:10, padding:'4px 8px', opacity: sayfa <= 1 ? 0.4 : 1}}>&laquo;</button>
                <button disabled={sayfa <= 1} onClick={() => setSayfa(s => Math.max(1, s - 1))}
                  style={{...S.btn, ...S.btnG, fontSize:10, padding:'4px 8px', opacity: sayfa <= 1 ? 0.4 : 1}}>&lsaquo;</button>

                {Array.from({length: Math.min(5, toplamSayfa)}, (_, i) => {
                  let p = sayfa - 2 + i;
                  if (p < 1) p = i + 1;
                  if (p > toplamSayfa) p = toplamSayfa - (4 - i);
                  if (p < 1) p = i + 1;
                  return p;
                }).filter((v, i, a) => v >= 1 && v <= toplamSayfa && a.indexOf(v) === i).map(p => (
                  <button key={p} onClick={() => setSayfa(p)}
                    style={{
                      width:28, height:28, borderRadius:6, border:`1px solid ${p === sayfa ? C.accent : C.borderLight}`,
                      background: p === sayfa ? C.accent : 'transparent', color: p === sayfa ? '#fff' : C.textSec,
                      cursor:'pointer', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center'
                    }}>{p}</button>
                ))}

                <button disabled={sayfa >= toplamSayfa} onClick={() => setSayfa(s => Math.min(toplamSayfa, s + 1))}
                  style={{...S.btn, ...S.btnG, fontSize:10, padding:'4px 8px', opacity: sayfa >= toplamSayfa ? 0.4 : 1}}>&rsaquo;</button>
                <button disabled={sayfa >= toplamSayfa} onClick={() => setSayfa(toplamSayfa)}
                  style={{...S.btn, ...S.btnG, fontSize:10, padding:'4px 8px', opacity: sayfa >= toplamSayfa ? 0.4 : 1}}>&raquo;</button>

                <span style={{fontSize:9, color:C.textMuted, marginLeft:8}}>SAYFA {sayfa} / {toplamSayfa} ({toplamKayit} KAYIT)</span>
              </div>
            )}
          </>
        )}

        {/* İSTATİSTİK TAB */}
        {tab === 'istatistik' && (
          <div style={{padding:20}}>
            {statsLoading ? <Loading/> : (
              <>
                <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20}}>
                  {[
                    {label:'TOPLAM ARAMA', value:stats.toplam_arama, icon:'Phone', c:C.accent},
                    {label:'GELEN ÇAĞRI', value:stats.gelen_arama, icon:'PhoneIncoming', c:C.success},
                    {label:'GİDEN ÇAĞRI', value:stats.giden_arama, icon:'PhoneOutgoing', c:C.accent},
                    {label:'CEVAPLANAN', value:stats.cevaplanan, icon:'PhoneCall', c:C.success},
                    {label:'CEVAPSIZ', value:stats.cevapsiz, icon:'PhoneMissed', c:C.danger},
                    {label:'REDDEDİLEN', value:stats.reddedilen, icon:'PhoneOff', c:C.warning},
                    {label:'ORT. GÖRÜŞME SÜRESİ', value:sureFmt(stats.ort_sure), icon:'Clock', c:C.warning},
                    {label:'EN UZUN GÖRÜŞME', value:sureFmt(stats.en_uzun_gorusme), icon:'Timer', c:C.purple},
                    {label:'KAYITLI GÖRÜŞME', value:stats.kayitli_gorusme, icon:'UserCheck', c:C.cyan},
                    {label:'CEVAPLANMA ORANI', value: stats.toplam_arama > 0 ? '%' + ((stats.cevaplanan / stats.toplam_arama) * 100).toFixed(1) : '%0', icon:'TrendingUp', c:C.success},
                    {label:'TOPLAM SÜRE', value:sureFmt(stats.toplam_sure), icon:'Hourglass', c:C.accent},
                    {label:'GELEN / GİDEN', value: stats.giden_arama > 0 ? (stats.gelen_arama / stats.giden_arama).toFixed(2) : '-', icon:'ArrowLeftRight', c:C.purple}
                  ].map((item, i) => (
                    <div key={i} style={{
                      background:`${item.c}08`, border:`1px solid ${item.c}20`,
                      borderRadius:14, padding:20, textAlign:'center'
                    }}>
                      <LIcon name={item.icon} size={24} color={item.c} style={{opacity:0.7, marginBottom:8}}/>
                      <div style={{fontSize:28, fontWeight:800, color:item.c}}>{item.value}</div>
                      <div style={{fontSize:10, color:C.textMuted, marginTop:6, fontWeight:600, letterSpacing:0.5}}>{item.label}</div>
                    </div>
                  ))}
                </div>

                {/* EN ÇOK ARANAN NUMARALAR */}
                {enCokAranan.length > 0 && (
                  <div style={{...S.card, marginTop:16}}>
                    <div style={{...S.cardHead, padding:'10px 16px'}}>
                      <LIcon name="TrendingUp" size={14} color={C.accent}/>
                      <span style={{fontSize:12, fontWeight:700}}>EN ÇOK ARANAN NUMARALAR</span>
                    </div>
                    <div style={{padding:16}}>
                      {enCokAranan.map((n, i) => (
                        <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: i < enCokAranan.length - 1 ? `1px solid ${C.border}` : 'none'}}>
                          <div>
                            <span style={{fontWeight:700, fontSize:12}}>{n.numara || n.arayan || n.aranan || '-'}</span>
                            {(n.ad || n.musteri_adi) && <span style={{fontSize:10, color:C.textMuted, marginLeft:8}}>{n.ad || n.musteri_adi}</span>}
                          </div>
                          <Badge text={(n.adet || n.arama_sayisi || n.sayi || 0) + ' ARAMA'} color={C.accent}/>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* GÖRÜŞME KAYITLARI TAB */}
        {tab === 'kayitlar' && (
          <div style={{padding:20}}>
            <EmptyState icon="Mic" title="GÖRÜŞME KAYDI BULUNAMADI"
              desc="SES KAYDI SİSTEMİ AKTİF EDİLDİĞİNDE BURADA LİSTELENECEKTİR"/>
          </div>
        )}
      </div>
    </div>
  );
};
