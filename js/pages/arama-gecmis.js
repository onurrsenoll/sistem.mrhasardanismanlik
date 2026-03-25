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

  /* NETSANTRAL DAHİLİ BİLGİSİ */
  const santralNo = localStorage.getItem('mr_netsantral_no') || (MR._netsantralVarsayilan && MR._netsantralVarsayilan.santralNo) || '3625026502';
  const dahili = localStorage.getItem('mr_netsantral_dahili') || (MR._netsantralVarsayilan && MR._netsantralVarsayilan.dahili) || '102';
  const netsantralGosterim = '0' + santralNo + ' - ' + dahili;

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
                          {/* ARAYAN: Giden aramada Netsantral/dahili, Gelen aramada karşı taraf */}
                          {item.yon === 'giden' ? (
                            <div>
                              <div style={{fontSize:10, color:C.textMuted}}>{netsantralGosterim}</div>
                            </div>
                          ) : (
                            <div>
                              {item.arayan_adi && <div style={{fontSize:11, fontWeight:700}}>{item.arayan_adi}</div>}
                              <div style={{fontSize:10, color:C.textMuted}}>{item.arayan || '-'}</div>
                            </div>
                          )}
                        </td>
                        <td style={{...tdSt, fontWeight:600}}>
                          {/* ARANAN: Giden aramada karşı taraf numara, Gelen aramada Netsantral/dahili */}
                          {item.yon === 'giden' ? (
                            <div>
                              {item.arayan_adi && <div style={{fontSize:11, fontWeight:700}}>{item.arayan_adi}</div>}
                              <div style={{fontSize:11, fontWeight:700}}>{item.aranan || item.arayan || '-'}</div>
                            </div>
                          ) : (
                            <div style={{fontSize:10, color:C.textMuted}}>{netsantralGosterim}</div>
                          )}
                        </td>
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
                {/* SADECE ÜSTTEKİ KARTLARDA OLMAYAN EK İSTATİSTİKLER - KÜÇÜK BOYUT */}
                <div style={{display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10, marginBottom:20}}>
                  {[
                    {label:'CEVAPLANAN', value:stats.cevaplanan, icon:'PhoneCall', c:C.success},
                    {label:'REDDEDİLEN', value:stats.reddedilen, icon:'PhoneOff', c:C.warning},
                    {label:'EN UZUN GÖRÜŞME', value:sureFmt(stats.en_uzun_gorusme), icon:'Clock', c:C.purple},
                    {label:'CEVAPLANMA ORANI', value: stats.toplam_arama > 0 ? '%' + ((stats.cevaplanan / stats.toplam_arama) * 100).toFixed(1) : '%0', icon:'TrendingUp', c:C.success},
                    {label:'TOPLAM SÜRE', value:sureFmt(stats.toplam_sure), icon:'Clock', c:C.accent},
                    {label:'GELEN / GİDEN', value: stats.giden_arama > 0 ? (stats.gelen_arama / stats.giden_arama).toFixed(2) : '-', icon:'ArrowLeftRight', c:C.purple}
                  ].map((item, i) => (
                    <div key={i} style={{
                      background:`${item.c}08`, border:`1px solid ${item.c}20`, borderRadius:10,
                      display:'flex', alignItems:'center', gap:12, padding:'10px 16px'
                    }}>
                      <div style={{width:34,height:34,minWidth:34,borderRadius:8,background:`${item.c}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <LIcon name={item.icon} size={16} color={item.c}/>
                      </div>
                      <div style={{fontSize:20, fontWeight:800, lineHeight:1}}>{item.value}</div>
                      <div style={{fontSize:11, color:C.textMuted, fontWeight:600}}>{item.label}</div>
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
          <KayitlarTab api={api} C={C} S={S} LIcon={LIcon} Badge={Badge} Loading={Loading} EmptyState={EmptyState} sureFmt={sureFmt} yonRenk={yonRenk} durumRenk={durumRenk} tarihBas={tarihBas} tarihBit={tarihBit} search={search}/>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   GLOBAL SES YÖNETİCİSİ
   Aynı anda sadece 1 ses çalmasını sağlar
   ═══════════════════════════════════════════ */
if (!window._mrAktifAudio) window._mrAktifAudio = null;
if (!window._mrAktifAudioDurdur) window._mrAktifAudioDurdur = null;

/* ═══════════════════════════════════════════
   GELİŞMİŞ SES OYNATICI BİLEŞENİ v2.0
   Play/Pause, 10sn İleri/Geri, Süre Slider (seek), İndirme
   Tek seferde sadece 1 kayıt çalar (önceki otomatik durur)
   ═══════════════════════════════════════════ */
const SesOynatici = ({kayitId, kayitDosya, C, LIcon, api}) => {
  const audioRef = useRef(null);
  const sliderRef = useRef(null);
  const [caliniyor, setCaliniyor] = useState(false);
  const [sure, setSure] = useState(0);
  const [toplamSure, setToplamSure] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [buffered, setBuffered] = useState(0);
  const isSeeking = useRef(false);

  const kaynakUrl = '/api/v1/arama-log/kayit-indir.php?id=' + kayitId + (api.token ? '&auth=' + api.token : '');

  /* CLEANUP */
  useEffect(() => {
    /* Başka kayıt oynatıldığında bu bileşeni durdur */
    const globalStopHandler = (e) => {
      if (e.detail && e.detail.kayitId !== kayitId && audioRef.current) {
        audioRef.current.pause();
        setCaliniyor(false);
      }
    };
    window.addEventListener('mr-ses-oynat', globalStopHandler);
    return () => {
      window.removeEventListener('mr-ses-oynat', globalStopHandler);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [kayitId]);

  const audioOlustur = () => {
    if (audioRef.current) return audioRef.current;
    const a = new Audio();
    a.preload = 'metadata';
    a.src = kaynakUrl;

    a.addEventListener('loadedmetadata', () => {
      if (a.duration && isFinite(a.duration)) setToplamSure(a.duration);
    });
    a.addEventListener('durationchange', () => {
      if (a.duration && isFinite(a.duration)) setToplamSure(a.duration);
    });
    a.addEventListener('timeupdate', () => {
      if (!isSeeking.current) setSure(a.currentTime || 0);
      /* Buffer durumu */
      if (a.buffered.length > 0) {
        setBuffered(a.buffered.end(a.buffered.length - 1));
      }
    });
    a.addEventListener('ended', () => {
      setCaliniyor(false);
      setSure(0);
      window._mrAktifAudio = null;
    });
    a.addEventListener('error', () => {
      setHata('SES DOSYASI YÜKLENEMEDİ');
      setYukleniyor(false);
      setCaliniyor(false);
    });
    a.addEventListener('waiting', () => setYukleniyor(true));
    a.addEventListener('canplay', () => setYukleniyor(false));
    a.addEventListener('playing', () => setYukleniyor(false));

    audioRef.current = a;
    return a;
  };

  const oynatDurdur = () => {
    const a = audioOlustur();
    if (caliniyor) {
      a.pause();
      setCaliniyor(false);
      window._mrAktifAudio = null;
    } else {
      /* ÖNCEKİ KAYDI DURDUR - GLOBAL */
      window.dispatchEvent(new CustomEvent('mr-ses-oynat', { detail: { kayitId: kayitId } }));
      if (window._mrAktifAudio && window._mrAktifAudio !== a) {
        try { window._mrAktifAudio.pause(); } catch(e) {}
      }
      window._mrAktifAudio = a;

      setHata('');
      setYukleniyor(true);
      a.play().then(() => {
        setCaliniyor(true);
        setYukleniyor(false);
      }).catch(e => {
        setHata('OYNATMA HATASI');
        setYukleniyor(false);
      });
    }
  };

  const ileriSar = (sn) => {
    const a = audioRef.current;
    if (a && isFinite(a.duration)) {
      const yeniZaman = Math.min(a.duration, Math.max(0, a.currentTime + sn));
      a.currentTime = yeniZaman;
      setSure(yeniZaman);
    }
  };

  /* SLIDER SEEK - mousedown/touchstart sırasında timeupdate'i durdur */
  const sliderBasla = () => { isSeeking.current = true; };
  const sliderDegisti = (e) => {
    const val = parseFloat(e.target.value);
    setSure(val);
  };
  const sliderBirakti = (e) => {
    isSeeking.current = false;
    const val = parseFloat(e.target.value);
    const a = audioRef.current;
    if (a && isFinite(a.duration)) {
      a.currentTime = val;
    }
  };

  /* PROGRESS BAR CLICK İLE SEEK */
  const progressClick = (e) => {
    const a = audioRef.current;
    if (!a || !isFinite(a.duration) || a.duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const yeniZaman = pct * a.duration;
    a.currentTime = yeniZaman;
    setSure(yeniZaman);
  };

  const indir = () => {
    const link = document.createElement('a');
    link.href = kaynakUrl + '&mode=download';
    link.download = kayitDosya || ('kayit_' + kayitId + '.webm');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sureFmtDetay = (s) => {
    if (!s || !isFinite(s)) return '00:00';
    const dk = Math.floor(s / 60);
    const sn = Math.floor(s % 60);
    return (dk < 10 ? '0' : '') + dk + ':' + (sn < 10 ? '0' : '') + sn;
  };

  const pct = toplamSure > 0 ? (sure / toplamSure) * 100 : 0;
  const bufPct = toplamSure > 0 ? (buffered / toplamSure) * 100 : 0;

  return (
    <div style={{display:'flex', alignItems:'center', gap:4, minWidth:320}}>
      {/* 10sn GERİ */}
      <button onClick={() => ileriSar(-10)} title="10 SANİYE GERİ" style={{
        width:28, height:28, borderRadius:8, border:'1px solid ' + C.accent + '30', cursor:'pointer',
        background:`${C.accent}0a`, display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all .2s', position:'relative'
      }}
        onMouseEnter={e => e.currentTarget.style.background = C.accent + '22'}
        onMouseLeave={e => e.currentTarget.style.background = C.accent + '0a'}>
        <LIcon name="RotateCcw" size={13} color={C.accent}/>
        <span style={{position:'absolute', bottom:-1, right:1, fontSize:7, fontWeight:800, color:C.accent}}>10</span>
      </button>

      {/* OYNAT / DURDUR */}
      <button onClick={oynatDurdur} disabled={yukleniyor} title={caliniyor ? 'DURDUR' : 'OYNAT'} style={{
        width:36, height:36, borderRadius:10, border:'none', cursor:'pointer',
        background: caliniyor
          ? 'linear-gradient(135deg, #ef4444, #dc2626)'
          : 'linear-gradient(135deg, #34d399, #10b981)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow: caliniyor
          ? '0 3px 10px rgba(239,68,68,0.35)'
          : '0 3px 10px rgba(16,185,129,0.35)',
        opacity: yukleniyor ? 0.7 : 1,
        transition:'all .2s', flexShrink:0
      }}>
        <LIcon name={yukleniyor ? 'Loader' : caliniyor ? 'Pause' : 'Play'} size={16} color="#fff"/>
      </button>

      {/* 10sn İLERİ */}
      <button onClick={() => ileriSar(10)} title="10 SANİYE İLERİ" style={{
        width:28, height:28, borderRadius:8, border:'1px solid ' + C.accent + '30', cursor:'pointer',
        background:`${C.accent}0a`, display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all .2s', position:'relative'
      }}
        onMouseEnter={e => e.currentTarget.style.background = C.accent + '22'}
        onMouseLeave={e => e.currentTarget.style.background = C.accent + '0a'}>
        <LIcon name="RotateCw" size={13} color={C.accent}/>
        <span style={{position:'absolute', bottom:-1, right:1, fontSize:7, fontWeight:800, color:C.accent}}>10</span>
      </button>

      {/* SÜRE + CUSTOM PROGRESS BAR */}
      <div style={{flex:1, display:'flex', alignItems:'center', gap:6, minWidth:140}}>
        <span style={{fontSize:9, fontWeight:700, color: caliniyor ? C.accent : C.textMuted, minWidth:36, textAlign:'right', fontFamily:'monospace'}}>{sureFmtDetay(sure)}</span>
        <div ref={sliderRef} onClick={progressClick} style={{
          flex:1, height:16, borderRadius:3, background:'transparent', cursor:'pointer',
          position:'relative', display:'flex', alignItems:'center'
        }}>
          {/* PROGRESS TRACK */}
          <div style={{position:'absolute', left:0, width:'100%', height:6, borderRadius:3, background:C.border, overflow:'hidden'}}>
            {/* BUFFER */}
            <div style={{position:'absolute', top:0, left:0, height:'100%', borderRadius:3,
              width: bufPct + '%', background: C.textMuted + '30', transition:'width .3s'}}/>
            {/* PROGRESS */}
            <div style={{position:'absolute', top:0, left:0, height:'100%', borderRadius:3,
              width: pct + '%', background: caliniyor ? 'linear-gradient(90deg, #10b981, #06b6d4)' : C.accent,
              transition: isSeeking.current ? 'none' : 'width .15s', boxShadow: caliniyor ? '0 0 6px rgba(16,185,129,0.4)' : 'none'}}/>
          </div>
          {/* THUMB */}
          <div style={{position:'absolute', top:'50%', transform:'translate(-50%,-50%)',
            left: pct + '%', width:12, height:12, borderRadius:'50%',
            background:'#fff', border:'2px solid ' + (caliniyor ? '#10b981' : C.accent),
            boxShadow:'0 1px 4px rgba(0,0,0,0.25)', transition: isSeeking.current ? 'none' : 'left .15s',
            opacity: toplamSure > 0 ? 1 : 0, zIndex:1}}/>
          {/* RANGE INPUT - SEEK İÇİN (şeffaf overlay) */}
          <input type="range" min="0" max={toplamSure || 1} step="0.01" value={sure}
            onMouseDown={sliderBasla} onTouchStart={sliderBasla}
            onChange={sliderDegisti}
            onMouseUp={sliderBirakti} onTouchEnd={sliderBirakti}
            style={{position:'absolute', left:0, top:0, width:'100%', height:'100%', opacity:0, cursor:'pointer', margin:0, padding:0, zIndex:2}}/>
        </div>
        <span style={{fontSize:9, fontWeight:700, color:C.textMuted, minWidth:36, fontFamily:'monospace'}}>{sureFmtDetay(toplamSure)}</span>
      </div>

      {/* İNDİR */}
      <button onClick={indir} title="İNDİR" style={{
        width:28, height:28, borderRadius:8, border:'1px solid ' + C.cyan + '30', cursor:'pointer',
        background:`${C.cyan}0a`, display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all .2s'
      }}
        onMouseEnter={e => e.currentTarget.style.background = C.cyan + '22'}
        onMouseLeave={e => e.currentTarget.style.background = C.cyan + '0a'}>
        <LIcon name="Download" size={13} color={C.cyan}/>
      </button>

      {hata && <span style={{fontSize:8, color:C.danger, maxWidth:80, overflow:'hidden', textOverflow:'ellipsis'}}>{hata}</span>}
    </div>
  );
};

/* ═══════════════════════════════════════════
   GÖRÜŞME KAYITLARI TAB BİLEŞENİ
   Kayıtlı görüşmeleri listeler + ses oynatıcı
   ═══════════════════════════════════════════ */
const KayitlarTab = ({api, C, S, LIcon, Badge, Loading, EmptyState, sureFmt, yonRenk, durumRenk, tarihBas, tarihBit, search}) => {
  const [kayitlar, setKayitlar] = useState([]);
  const [kayitLoading, setKayitLoading] = useState(true);
  const [kayitSayfa, setKayitSayfa] = useState(1);
  const [kayitToplamSayfa, setKayitToplamSayfa] = useState(1);
  const [kayitToplam, setKayitToplam] = useState(0);
  const [kayitYonF, setKayitYonF] = useState('');
  const [kayitSearch, setKayitSearch] = useState('');

  const kayitlariYukle = useCallback(async () => {
    setKayitLoading(true);
    const p = {sayfa: kayitSayfa, limit: 30, durum: 'cevaplandi'};
    if (kayitSearch) p.q = kayitSearch;
    if (kayitYonF) p.yon = kayitYonF;
    if (tarihBas) p.tarih_bas = tarihBas;
    if (tarihBit) p.tarih_son = tarihBit;
    const r = await api.aramaLogList(p);
    if (r?.success && r.data) {
      const rawItems = r.data?.items || [];
      /* Sadece kayit_dosya olan kayıtları filtrele */
      const filtered = rawItems.filter(item => item.kayit_dosya && item.kayit_dosya.trim() !== '');
      setKayitlar(filtered);
      if (r.data?.toplam_sayfa) {
        setKayitToplamSayfa(r.data.toplam_sayfa || 1);
        setKayitToplam(r.data.toplam || 0);
      } else if (r.data?.pagination) {
        setKayitToplamSayfa(r.data.pagination.totalPages || r.data.pagination.toplam_sayfa || 1);
        setKayitToplam(r.data.pagination.total || r.data.pagination.toplam || 0);
      }
    }
    setKayitLoading(false);
  }, [kayitSayfa, kayitYonF, kayitSearch, tarihBas, tarihBit]);

  const ilkRef2 = useRef(true);
  useEffect(() => {
    if (ilkRef2.current) { ilkRef2.current = false; kayitlariYukle(); return; }
    const t = setTimeout(kayitlariYukle, 400);
    return () => clearTimeout(t);
  }, [kayitSayfa, kayitYonF, kayitSearch, tarihBas, tarihBit]);

  const boyutFmt = (b) => {
    if (!b) return '-';
    b = parseInt(b);
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  };

  const thSt2 = {padding:'10px 8px', textAlign:'left', color: MR.tema==='koyu' ? '#cbd5e1' : C.textMuted, fontWeight:800, fontSize:11, borderBottom:`2px solid ${C.border}`, whiteSpace:'nowrap', letterSpacing:0.3};
  const tdSt2 = {padding:'8px 8px', fontSize:12, fontWeight:600, borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap'};

  return (
    <div>
      {/* KAYITLAR BAŞLIK + FİLTRE */}
      <div style={{...S.cardHead, padding:'10px 16px', justifyContent:'space-between'}}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <LIcon name="Mic" size={14} color={C.cyan}/>
          <span style={{fontSize:12, fontWeight:700}}>GÖRÜŞME KAYITLARI</span>
          <Badge text={kayitToplam + ' KAYIT'} color={C.cyan}/>
        </div>
        <div style={{display:'flex', gap:6, alignItems:'center'}}>
          <input placeholder="NUMARA / İSİM ARA..." value={kayitSearch} onChange={e => {setKayitSearch(e.target.value); setKayitSayfa(1);}}
            style={{...S.input, width:180, fontSize:10, padding:'6px 10px'}}/>
          <select value={kayitYonF} onChange={e => {setKayitYonF(e.target.value); setKayitSayfa(1);}}
            style={{...S.select, width:100, fontSize:10, padding:'6px 8px'}}>
            <option value="">TÜMÜ</option>
            <option value="gelen">GELEN</option>
            <option value="giden">GİDEN</option>
          </select>
          <button style={{...S.btn, ...S.btnG, fontSize:10, padding:'6px 12px'}} onClick={kayitlariYukle}>
            <LIcon name="RefreshCw" size={12} color={C.textSec}/> YENİLE
          </button>
        </div>
      </div>

      {kayitLoading ? <Loading/> : kayitlar.length === 0 ? (
        <EmptyState icon="Mic" title="GÖRÜŞME KAYDI BULUNAMADI"
          desc="KAYITLI GÖRÜŞME BULUNMAMAKTADIR. ARAMALAR GERÇEKLEŞTİKÇE SES KAYITLARI BURADA LİSTELENECEKTİR."/>
      ) : (
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:11, minWidth:1100}}>
            <thead>
              <tr style={{background:C.bgHover}}>
                {['TARİH', 'YÖN', 'NUMARA', 'MÜŞTERİ', 'SÜRE', 'BOYUT', 'KULLANICI', 'SES KAYDI'].map(h =>
                  <th key={h} style={thSt2}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {kayitlar.map((item, i) => (
                <tr key={item.id || i} style={{borderBottom:`1px solid ${C.border}`}}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{...tdSt2, color:C.textMuted, fontSize:11}}>{item.baslangic_zamani || item.created_at || '-'}</td>
                  <td style={tdSt2}>
                    <span style={{
                      padding:'2px 8px', borderRadius:6, fontSize:9, fontWeight:700,
                      background:`${yonRenk(item.yon)}15`, color:yonRenk(item.yon)
                    }}>
                      {item.yon === 'gelen' ? 'GELEN' : 'GİDEN'}
                    </span>
                  </td>
                  <td style={{...tdSt2, fontWeight:700}}>{item.numara || item.arayan || '-'}</td>
                  <td style={{...tdSt2, color:C.textSec}}>{item.musteri_adi || '-'}</td>
                  <td style={{...tdSt2, color:C.textSec}}>{sureFmt(item.sure_saniye || 0)}</td>
                  <td style={{...tdSt2, color:C.textMuted, fontSize:10}}>{boyutFmt(item.kayit_boyut)}</td>
                  <td style={{...tdSt2, color:C.textMuted, fontSize:10}}>{item.kullanici_adi || '-'}</td>
                  <td style={{...tdSt2, minWidth:350}}>
                    <SesOynatici kayitId={item.id} kayitDosya={item.kayit_dosya} C={C} LIcon={LIcon} api={api}/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SAYFALAMA */}
      {kayitlar.length > 0 && kayitToplamSayfa > 1 && (
        <div style={{padding:'12px 16px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'center', alignItems:'center', gap:4}}>
          <button disabled={kayitSayfa <= 1} onClick={() => setKayitSayfa(1)}
            style={{...S.btn, ...S.btnG, fontSize:10, padding:'4px 8px', opacity: kayitSayfa <= 1 ? 0.4 : 1}}>&laquo;</button>
          <button disabled={kayitSayfa <= 1} onClick={() => setKayitSayfa(s => Math.max(1, s - 1))}
            style={{...S.btn, ...S.btnG, fontSize:10, padding:'4px 8px', opacity: kayitSayfa <= 1 ? 0.4 : 1}}>&lsaquo;</button>

          {Array.from({length: Math.min(5, kayitToplamSayfa)}, (_, i) => {
            let p = kayitSayfa - 2 + i;
            if (p < 1) p = i + 1;
            if (p > kayitToplamSayfa) p = kayitToplamSayfa - (4 - i);
            if (p < 1) p = i + 1;
            return p;
          }).filter((v, i, a) => v >= 1 && v <= kayitToplamSayfa && a.indexOf(v) === i).map(p => (
            <button key={p} onClick={() => setKayitSayfa(p)}
              style={{
                width:28, height:28, borderRadius:6, border:`1px solid ${p === kayitSayfa ? C.accent : C.borderLight}`,
                background: p === kayitSayfa ? C.accent : 'transparent', color: p === kayitSayfa ? '#fff' : C.textSec,
                cursor:'pointer', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center'
              }}>{p}</button>
          ))}

          <button disabled={kayitSayfa >= kayitToplamSayfa} onClick={() => setKayitSayfa(s => Math.min(kayitToplamSayfa, s + 1))}
            style={{...S.btn, ...S.btnG, fontSize:10, padding:'4px 8px', opacity: kayitSayfa >= kayitToplamSayfa ? 0.4 : 1}}>&rsaquo;</button>
          <button disabled={kayitSayfa >= kayitToplamSayfa} onClick={() => setKayitSayfa(kayitToplamSayfa)}
            style={{...S.btn, ...S.btnG, fontSize:10, padding:'4px 8px', opacity: kayitSayfa >= kayitToplamSayfa ? 0.4 : 1}}>&raquo;</button>

          <span style={{fontSize:9, color:C.textMuted, marginLeft:8}}>SAYFA {kayitSayfa} / {kayitToplamSayfa} ({kayitToplam} KAYIT)</span>
        </div>
      )}
    </div>
  );
};
