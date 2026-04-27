const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useMemo, useRef} = React;

/* MR._NetsippDurum ve MR._SesAyarlariPaneli artık webrtc-widget.js'den geliyor */

const _SesAyarlariPaneli_DEVRE_DISI = () => {
  const {C, S, LIcon} = MR;
  const [acik, setAcik] = useState(false);
  const [ayarlar, setAyarlar] = useState({});
  const [cihazlar, setCihazlar] = useState({mikrofonlar: [], hoparlorler: []});
  const [mikTest, setMikTest] = useState(false);
  const [mikLevel, setMikLevel] = useState(0);
  const mikTestRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    if (acik && MR.webrtcTelefon) {
      MR.webrtcTelefon.cihazlariListele().then(function(d) {
        setCihazlar(d || {mikrofonlar: [], hoparlorler: []});
      });
      setAyarlar(MR.webrtcTelefon.getSesAyarlari());
    }
  }, [acik]);

  const guncelle = (key, val) => {
    setAyarlar(p => ({...p, [key]: val}));
    if (MR.webrtcTelefon) MR.webrtcTelefon.sesAyarla(key, val);
  };

  /* MİKROFON TEST */
  const mikTestBaslat = async () => {
    if (mikTest) { mikTestDurdur(); return; }
    try {
      var constraints = {audio: true, video: false};
      if (ayarlar.mikrofonId) constraints.audio = {deviceId: {exact: ayarlar.mikrofonId}};
      var stream = await navigator.mediaDevices.getUserMedia(constraints);
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      var src = ac.createMediaStreamSource(stream);
      var analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      mikTestRef.current = {stream, ac};
      analyserRef.current = analyser;
      setMikTest(true);

      var dataArray = new Uint8Array(analyser.frequencyBinCount);
      var loop = function() {
        if (!mikTestRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        var sum = 0;
        for (var i = 0; i < dataArray.length; i++) sum += dataArray[i];
        var avg = sum / dataArray.length;
        setMikLevel(Math.min(100, Math.round(avg * 1.5)));
        requestAnimationFrame(loop);
      };
      loop();
    } catch(e) {
      alert('MİKROFON ERİŞİM HATASI: ' + (e.message || ''));
    }
  };

  const mikTestDurdur = () => {
    if (mikTestRef.current) {
      mikTestRef.current.stream.getTracks().forEach(t => t.stop());
      try { mikTestRef.current.ac.close(); } catch(e) {}
      mikTestRef.current = null;
    }
    analyserRef.current = null;
    setMikTest(false);
    setMikLevel(0);
  };

  useEffect(() => { return () => mikTestDurdur(); }, []);

  /* HOPARLÖR TEST */
  const hopTest = () => {
    try {
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = 440;
      gain.gain.value = ayarlar.volume || 0.5;
      gain.gain.setValueAtTime(0, ac.currentTime);
      gain.gain.linearRampToValueAtTime(ayarlar.volume || 0.5, ac.currentTime + 0.1);
      gain.gain.setValueAtTime(ayarlar.volume || 0.5, ac.currentTime + 0.4);
      gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.5);
      setTimeout(() => { try { ac.close(); } catch(e) {} }, 1000);
    } catch(e) {}
  };

  const sliderSt = {width:'100%', accentColor: C.accent, cursor:'pointer', height:6};

  return (
    <div style={{...S.card, marginBottom:16}}>
      <div style={{...S.cardHead, padding:'12px 16px', cursor:'pointer', justifyContent:'space-between'}} onClick={() => setAcik(!acik)}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <LIcon name="Volume2" size={16} color={C.cyan}/>
          <span style={{fontSize:12, fontWeight:700}}>SES & MİKROFON AYARLARI</span>
        </div>
        <LIcon name={acik ? 'ChevronUp' : 'ChevronDown'} size={14} color={C.textMuted}/>
      </div>
      {acik && (
        <div style={{padding:16}}>

          {/* HOPARLÖR SES SEVİYESİ */}
          <div style={{marginBottom:14}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
              <span style={{fontSize:10, fontWeight:700, color:C.textSec}}>
                <LIcon name="Volume2" size={12} color={C.textSec}/> HOPARLÖR SESİ
              </span>
              <span style={{fontSize:10, fontWeight:800, color:C.accent}}>{Math.round((ayarlar.volume || 1) * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={ayarlar.volume || 1}
              onChange={e => guncelle('volume', parseFloat(e.target.value))}
              style={sliderSt}/>
            <div style={{display:'flex', justifyContent:'flex-end', marginTop:4}}>
              <button onClick={hopTest} style={{...S.btnMini, ...S.btnMiniP, fontSize:8, padding:'3px 8px'}}>
                <LIcon name="Play" size={10} color="#fff"/> TEST
              </button>
            </div>
          </div>

          {/* ÇALMA SESİ SEVİYESİ */}
          <div style={{marginBottom:14}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
              <span style={{fontSize:10, fontWeight:700, color:C.textSec}}>
                <LIcon name="PhoneOutgoing" size={12} color={C.textSec}/> ÇALMA SESİ (GİDEN)
              </span>
              <span style={{fontSize:10, fontWeight:800, color:C.accent}}>{Math.round((ayarlar.ringbackVolume || 0.3) * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={ayarlar.ringbackVolume || 0.3}
              onChange={e => guncelle('ringbackVolume', parseFloat(e.target.value))}
              style={sliderSt}/>
          </div>

          {/* ZİL SESİ SEVİYESİ */}
          <div style={{marginBottom:14}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
              <span style={{fontSize:10, fontWeight:700, color:C.textSec}}>
                <LIcon name="PhoneIncoming" size={12} color={C.textSec}/> ZİL SESİ (GELEN)
              </span>
              <span style={{fontSize:10, fontWeight:800, color:C.accent}}>{Math.round((ayarlar.ringtoneVolume || 0.5) * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={ayarlar.ringtoneVolume || 0.5}
              onChange={e => guncelle('ringtoneVolume', parseFloat(e.target.value))}
              style={sliderSt}/>
          </div>

          {/* MİKROFON GAIN */}
          <div style={{marginBottom:14}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
              <span style={{fontSize:10, fontWeight:700, color:C.textSec}}>
                <LIcon name="Mic" size={12} color={C.textSec}/> MİKROFON SEVİYESİ
              </span>
              <span style={{fontSize:10, fontWeight:800, color:C.accent}}>{Math.round((ayarlar.mikrofonGain || 1) * 100)}%</span>
            </div>
            <input type="range" min="0.1" max="3.0" step="0.1" value={ayarlar.mikrofonGain || 1}
              onChange={e => guncelle('mikrofonGain', parseFloat(e.target.value))}
              style={sliderSt}/>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4}}>
              <button onClick={mikTestBaslat} style={{
                ...S.btnMini, fontSize:8, padding:'3px 8px',
                ...(mikTest ? S.btnMiniD : S.btnMiniS)
              }}>
                <LIcon name={mikTest ? 'MicOff' : 'Mic'} size={10} color="#fff"/>
                {mikTest ? 'DURDUR' : 'MİK TEST'}
              </button>
              {mikTest && (
                <div style={{flex:1, marginLeft:8, height:8, borderRadius:4, background:`${C.border}`, overflow:'hidden'}}>
                  <div style={{
                    height:'100%', borderRadius:4, transition:'width .1s',
                    width: mikLevel + '%',
                    background: mikLevel > 70 ? C.danger : mikLevel > 40 ? C.warning : C.success
                  }}/>
                </div>
              )}
            </div>
          </div>

          {/* MİKROFON SEÇİMİ */}
          {cihazlar.mikrofonlar.length > 0 && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10, fontWeight:700, color:C.textSec, marginBottom:6}}>
                <LIcon name="Mic" size={12} color={C.textSec}/> MİKROFON CİHAZI
              </div>
              <select style={{...S.select, fontSize:10, padding:'6px 10px'}}
                value={ayarlar.mikrofonId || ''}
                onChange={e => guncelle('mikrofonId', e.target.value)}>
                <option value="">VARSAYILAN MİKROFON</option>
                {cihazlar.mikrofonlar.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>{d.label || ('MİKROFON ' + (i+1))}</option>
                ))}
              </select>
            </div>
          )}

          {/* HOPARLÖR SEÇİMİ */}
          {cihazlar.hoparlorler.length > 0 && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10, fontWeight:700, color:C.textSec, marginBottom:6}}>
                <LIcon name="Speaker" size={12} color={C.textSec}/> HOPARLÖR CİHAZI
              </div>
              <select style={{...S.select, fontSize:10, padding:'6px 10px'}}
                value={ayarlar.hoparlörId || ''}
                onChange={e => guncelle('hoparlörId', e.target.value)}>
                <option value="">VARSAYILAN HOPARLÖR</option>
                {cihazlar.hoparlorler.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>{d.label || ('HOPARLÖR ' + (i+1))}</option>
                ))}
              </select>
            </div>
          )}

          {/* GELİŞMİŞ SES İŞLEME */}
          <div style={{borderTop:`1px solid ${C.border}`, paddingTop:12, marginTop:4}}>
            <div style={{fontSize:10, fontWeight:700, color:C.textSec, marginBottom:8}}>
              <LIcon name="Settings" size={12} color={C.textSec}/> GELİŞMİŞ SES İŞLEME
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:6}}>
              {[
                {key:'echoCancellation', label:'EKO İPTALİ'},
                {key:'noiseSuppression', label:'GÜRÜLTÜ AZALTMA'},
                {key:'autoGainControl', label:'OTOMATİK KAZANÇ'}
              ].map(item => (
                <div key={item.key} style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                  <span style={{fontSize:10, color:C.text}}>{item.label}</span>
                  <div onClick={() => guncelle(item.key, !ayarlar[item.key])} style={{
                    width:32, height:18, borderRadius:9, cursor:'pointer',
                    background: ayarlar[item.key] ? C.success : C.borderLight,
                    position:'relative', transition:'all .3s'
                  }}>
                    <div style={{
                      width:14, height:14, borderRadius:'50%', background:'#fff',
                      position:'absolute', top:2,
                      left: ayarlar[item.key] ? 16 : 2,
                      transition:'all .3s', boxShadow:'0 1px 3px rgba(0,0,0,.3)'
                    }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════
   CRM SAYFA YÖNLENDİRİCİ
   ═══════════════════════════════════════════ */
MR.CrmPage = ({setPage, user, view, crmId}) => {
  if (view === 'yeni') return <MR._CRMYeniInner setPage={setPage}/>;
  if (view === 'detay' && crmId) return <MR._CRMDetayInner setPage={setPage} crmId={crmId}/>;
  return <MR._CRMListesiInner setPage={setPage} user={user}/>;
};

/* ═══════════════════════════════════════════
   CRM LİSTESİ
   ═══════════════════════════════════════════ */
MR._CRMListesiInner = ({setPage, user}) => {
  const {C, S, LIcon, Badge, StatCard, Loading, EmptyState, Modal, FormGroup, Confirm, api, ILLER} = MR;
  const isKoyu = MR.tema === 'koyu';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [durumF, setDurumF] = useState('');
  const [stats, setStats] = useState({top: 0, tak: 0, olu: 0, neg: 0});

  // DÜZENLEME MODAL
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // DURUM DEĞİŞTİR DROPDOWN
  const [durumDropId, setDurumDropId] = useState(null);

  // SİL ONAY
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // TOPLU SİLME (ADMIN)
  const [secililer, setSecililer] = useState([]);
  const [topluSilConfirm, setTopluSilConfirm] = useState(false);
  const [topluSilLoading, setTopluSilLoading] = useState(false);
  const isAdmin = user?.rol === 'admin';

  const durumlar = ['', 'Yeni', 'Takipte', 'Olumlu', 'Olumsuz'];
  const durumLabels = {'': 'TÜMÜ', 'Yeni': 'YENİ', 'Takipte': 'TAKİPTE', 'Olumlu': 'OLUMLU', 'Olumsuz': 'OLUMSUZ'};
  const kaynaklar = ['TELEFON', 'WEB FORMU', 'SOSYAL MEDYA', 'YÖNLENDİRME', 'DİĞER'];

  const dC = d => d === 'Olumlu' ? C.success : d === 'Takipte' ? C.warning : d === 'Yeni' ? C.cyan : d === 'Olumsuz' ? C.danger : C.textSec;

  const load = useCallback(async () => {
    setLoading(true);
    const p = {};
    if (filter) p.q = filter;
    if (durumF) p.durum = durumF;
    const r = await api.crmList(p);
    if (r?.success) {
      const items = r.data.items || [];
      setData(items);
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
  }, [filter, durumF]);

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [filter, durumF]);

  // DÜZENLEME
  const openEdit = (crm) => {
    setEditData({
      id: crm.id,
      ad_soyad: crm.ad_soyad || '',
      tc_vergi_no: crm.tc_vergi_no || '',
      telefon: crm.telefon || '',
      email: crm.email || '',
      il: crm.il || '',
      ilce: crm.ilce || '',
      plaka: crm.plaka || '',
      marka: crm.marka || '',
      model_adi: crm.model_adi || '',
      arac_yili: crm.arac_yili || '',
      arac_km: crm.arac_km || '',
      olay_aciklama: crm.olay_aciklama || '',
      dosya_turu: crm.dosya_turu || 'ADK',
      kaynak: crm.kaynak || 'TELEFON',
      durum: crm.durum || 'Yeni',
      oncelik: crm.oncelik || 'NORMAL',
      not_text: ''
    });
    setEditError('');
    setEditModal(true);
  };

  const editUp = (k, v) => setEditData(p => ({...p, [k]: v}));

  const editKaydet = async () => {
    if (!editData.ad_soyad || !editData.telefon) {
      setEditError('AD VE TELEFON ZORUNLU');
      return;
    }
    setEditLoading(true);
    setEditError('');
    const r = await api.crmUpdate(editData);
    if (r?.success) {
      setEditModal(false);
      setEditData(null);
      load();
    } else {
      setEditError(r?.error || 'GÜNCELLEME HATASI');
    }
    setEditLoading(false);
  };

  // DURUM DEĞİŞTİR
  const durumDegistir = async (id, yeniDurum) => {
    setDurumDropId(null);
    const r = await api.crmUpdate({id, durum: yeniDurum});
    if (r?.success) load();
  };

  // SİL
  const handleSil = async () => {
    if (!deleteConfirm) return;
    const r = await api.crmDelete(deleteConfirm);
    if (r?.success) {
      setDeleteConfirm(null);
      load();
    }
  };

  // TOPLU SİLME FONKSİYONLARI
  const toggleSecim = (id) => setSecililer(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
  const tumunuSec = () => { if (secililer.length === data.length) setSecililer([]); else setSecililer(data.map(d=>d.id)); };
  const topluSil = async () => {
    if (secililer.length === 0) return;
    setTopluSilLoading(true);
    const r = await api.crmBulkDelete(secililer);
    setTopluSilLoading(false);
    setTopluSilConfirm(false);
    if (r?.success) { setSecililer([]); load(); }
    else alert(r?.error || 'TOPLU SİLME HATASI');
  };

  const cellSt = {padding: '10px 8px'};
  const thSt = {padding: '12px 10px', textAlign: 'left', color:'#FFFFFF', fontWeight: 800, fontSize: '12px', borderBottom: `2px solid ${C.border}`, letterSpacing: 0.3};
  const iconBtn = (bg) => ({
    width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: `${bg}22`, transition: 'all .2s'
  });

  return (
    <div className="fade-in">
      {/* STAT CARDS */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20}}>
        <StatCard icon="Users" label="TOPLAM KAYIT" value={stats.top} color={C.accent}/>
        <StatCard icon="Clock" label="TAKİPTE" value={stats.tak} color={C.warning}/>
        <StatCard icon="Check" label="OLUMLU" value={stats.olu} color={C.success}/>
        <StatCard icon="X" label="OLUMSUZ" value={stats.neg} color={C.danger}/>
      </div>

      <div style={S.card}>
        {/* HEADER */}
        <div style={{...S.cardHead, justifyContent: 'space-between'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <LIcon name="Users" size={16} color={C.accent}/>
            <span style={{fontSize: 14, fontWeight: 700}}>CRM - POTANSİYEL MÜŞTERİLER</span>
            <Badge text={`${data.length} KAYIT`} color={C.accent}/>
          </div>
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <input placeholder="AD VEYA TELEFON ARA..." value={filter} onChange={e => setFilter(e.target.value)}
              style={{...S.input, width: 220, fontSize: 11}}/>
            {MR.hasYetki(user,'crm','crm-toplu-sil') && secililer.length > 0 && (
              <button style={{...S.btn,...S.btnD,fontSize:9,padding:'5px 10px',display:'flex',alignItems:'center',gap:4}}
                onClick={() => setTopluSilConfirm(true)} disabled={topluSilLoading}>
                <LIcon name="Trash2" size={11} color="#fff"/> TOPLU SİL ({secililer.length})
              </button>
            )}
            <button style={{...S.btn, ...S.btnP, fontSize: 11}} onClick={() => setPage('crm-yeni')}>
              <LIcon name="Plus" size={14} color="#fff"/> YENİ KAYIT
            </button>
          </div>
        </div>

        {/* DURUM FİLTRE TABS */}
        <div style={{padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 6}}>
          {durumlar.map(d => (
            <span key={d || 'all'} onClick={() => setDurumF(d)}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: durumF === d ? 700 : 400,
                cursor: 'pointer', background: durumF === d ? `${C.accent}22` : 'transparent',
                color: durumF === d ? C.accent : C.textSec, border: `1px solid ${durumF === d ? C.accent + '44' : C.border}`
              }}>
              {durumLabels[d]}
            </span>
          ))}
        </div>

        {/* TABLO */}
        {loading ? <Loading/> : (
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 1000}}>
              <thead>
                <tr style={{background:isKoyu?'#0f2342':'#1e40af'}}>
                  {MR.hasYetki(user,'crm','crm-toplu-sil') && <th style={{...thSt,minWidth:35,textAlign:'center',padding:'8px 4px'}}>
                    <input type="checkbox" checked={data.length > 0 && secililer.length === data.length}
                      onChange={tumunuSec} style={{cursor:'pointer',width:14,height:14,accentColor:C.accent}}/>
                  </th>}
                  {['AD SOYAD', 'TELEFON', 'İL', 'TÜR', 'KAYNAK', 'DURUM', 'SON İLETİŞİM', 'İŞLEMLER'].map(h =>
                    <th key={h} style={thSt}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={MR.hasYetki(user,'crm','crm-toplu-sil') ? 9 : 8}><EmptyState icon="Users" title="CRM KAYDI BULUNAMADI" desc="YENİ CRM KAYDI OLUŞTURUN"/></td></tr>
                ) : data.map((c, i) => (
                  <tr key={c.id || i} style={{backgroundColor:isKoyu?(i%2===0?'#111827':'#0d1321'):(i%2===0?'#ffffff':'#f0f4ff'),borderBottom:isKoyu?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)',borderLeft:isKoyu?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)',boxShadow:isKoyu?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)',transition:'all .2s ease',borderRadius:8,position:'relative',color:isKoyu?'#e2e8f0':'#1e293b'}}
                    onMouseEnter={e=>{if(isKoyu){e.currentTarget.style.borderLeft='3px solid rgba(6,182,212,0.8)';e.currentTarget.style.boxShadow='0 4px 16px rgba(6,182,212,0.15)';}else{e.currentTarget.style.borderLeft='3px solid rgba(99,102,241,0.6)';e.currentTarget.style.boxShadow='0 4px 12px rgba(99,102,241,0.15)';}e.currentTarget.style.transform='translateY(-1px)';}}
                    onMouseLeave={e=>{e.currentTarget.style.backgroundColor=isKoyu?(i%2===0?'#111827':'#0d1321'):(i%2===0?'#ffffff':'#f0f4ff');e.currentTarget.style.borderLeft=isKoyu?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)';e.currentTarget.style.boxShadow=isKoyu?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)';e.currentTarget.style.transform='translateY(0)';}}>
                    {MR.hasYetki(user,'crm','crm-toplu-sil') && <td style={{...cellSt,textAlign:'center',padding:'6px 4px'}} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={secililer.includes(c.id)} onChange={() => toggleSecim(c.id)}
                        style={{cursor:'pointer',width:14,height:14,accentColor:C.accent}}/>
                    </td>}
                    <td style={{...cellSt, fontWeight: 600}}>{c.ad_soyad}</td>
                    <td style={{...cellSt, color: C.textSec, display:'flex', alignItems:'center', gap:6}}>
                      {c.telefon || '-'}
                      {c.telefon && (
                        <button style={{...iconBtn(C.success), width:24, height:24}} title="ARA"
                          onClick={(e) => { e.stopPropagation(); if (MR.webrtcAra) { MR.webrtcAra(c.telefon, {ad: c.ad_soyad || ''}); } else { MR._gelenCagriTelefon = c.telefon; MR._gelenCagriAdi = c.ad_soyad || ''; setPage('crm-yeni'); } }}>
                          <LIcon name="Phone" size={12} color={C.success}/>
                        </button>
                      )}
                    </td>
                    <td style={cellSt}>{c.il || '-'}</td>
                    <td style={cellSt}><Badge text={c.dosya_turu || 'ADK'} color={c.dosya_turu === 'BH' ? C.purple : C.accent}/></td>
                    <td style={{...cellSt, color: C.textMuted}}>{c.kaynak || '-'}</td>
                    <td style={cellSt}><Badge text={c.durum || 'YENİ'} color={dC(c.durum)}/></td>
                    <td style={{...cellSt, color: C.textMuted}}>{c.son_iletisim || '-'}</td>
                    <td style={{...cellSt, position: 'relative'}}>
                      <div style={{display: 'flex', gap: 4, alignItems: 'center'}}>
                        {/* DETAY */}
                        <a href={`#/crm-detay-${c.id}`} onClick={(e) => { e.preventDefault(); setPage('crm-detay-' + c.id); }}
                          style={{...iconBtn(C.accent), textDecoration:'none'}} title="DETAY">
                          <LIcon name="Eye" size={13} color={C.accent}/>
                        </a>
                        {/* DÜZENLE */}
                        <button style={iconBtn(C.warning)} title="DÜZENLE"
                          onClick={() => openEdit(c)}>
                          <LIcon name="Edit3" size={13} color={C.warning}/>
                        </button>
                        {/* DURUM DEĞİŞTİR */}
                        <div style={{position: 'relative'}}>
                          <button style={iconBtn(C.cyan)} title="DURUM DEĞİŞTİR"
                            onClick={() => setDurumDropId(durumDropId === c.id ? null : c.id)}>
                            <LIcon name="RefreshCw" size={13} color={C.cyan}/>
                          </button>
                          {durumDropId === c.id && (
                            <div style={{
                              position: 'absolute', top: 32, right: 0, zIndex: 100,
                              background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8,
                              boxShadow: '0 8px 24px rgba(0,0,0,.3)', minWidth: 140, overflow: 'hidden'
                            }}>
                              {['Yeni', 'Takipte', 'Olumlu', 'Olumsuz'].map(d => (
                                <div key={d} onClick={() => durumDegistir(c.id, d)}
                                  style={{
                                    padding: '8px 14px', fontSize: 11, cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', gap: 8, borderBottom: `1px solid ${C.border}`,
                                    background: c.durum === d ? `${dC(d)}15` : 'transparent'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = `${dC(d)}22`}
                                  onMouseLeave={e => e.currentTarget.style.background = c.durum === d ? `${dC(d)}15` : 'transparent'}>
                                  <span style={{width: 8, height: 8, borderRadius: '50%', background: dC(d)}}/>
                                  {d.toUpperCase()}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* SİL */}
                        <button style={iconBtn(C.danger)} title="SİL"
                          onClick={() => setDeleteConfirm(c.id)}>
                          <LIcon name="Trash2" size={13} color={C.danger}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DURUM DROPDOWN KAPATMA - GLOBAL CLICK */}
      {durumDropId && (
        <div style={{position: 'fixed', inset: 0, zIndex: 50}} onClick={() => setDurumDropId(null)}/>
      )}

      {/* DÜZENLEME MODAL */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="CRM KAYDI DÜZENLE" width="800px">
        {editData && (
          <div>
            {editError && (
              <div style={{padding:10, background:`${C.danger}22`, borderRadius:8, marginBottom:16, fontSize:12, color:C.danger}}>
                {editError}
              </div>
            )}
            {/* MÜŞTERİ */}
            <div style={{fontSize:11, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:10}}>
              <LIcon name="User" size={12} color={C.accent}/> MÜŞTERİ BİLGİLERİ
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:16}}>
              <FormGroup label="AD SOYAD *">
                <input style={S.input} value={editData.ad_soyad} onChange={e => editUp('ad_soyad', e.target.value)} placeholder="AD SOYAD"/>
              </FormGroup>
              <FormGroup label="TC / VERGİ NO">
                <input style={S.input} value={editData.tc_vergi_no} onChange={e => editUp('tc_vergi_no', e.target.value.replace(/[^0-9]/g,''))} placeholder="TC / VERGİ NO" maxLength={11}/>
              </FormGroup>
              <FormGroup label="TELEFON *">
                <input style={S.input} value={editData.telefon} onChange={e => editUp('telefon', e.target.value)} placeholder="05XX XXX XXXX"/>
              </FormGroup>
              <FormGroup label="E-POSTA">
                <input style={S.input} value={editData.email} onChange={e => editUp('email', e.target.value)} placeholder="E-POSTA"/>
              </FormGroup>
              <FormGroup label="İL">
                <select style={S.select} value={editData.il} onChange={e => editUp('il', e.target.value)}>
                  <option value="">SEÇİNİZ</option>
                  {ILLER.map(il => <option key={il} value={il}>{il}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="İLÇE">
                <input style={S.input} value={editData.ilce} onChange={e => editUp('ilce', e.target.value)} placeholder="İLÇE"/>
              </FormGroup>
            </div>
            {/* ARAÇ */}
            <div style={{fontSize:11, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:10}}>
              <LIcon name="Car" size={12} color={C.accent}/> ARAÇ BİLGİLERİ
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:16}}>
              <FormGroup label="PLAKA">
                <input style={S.input} value={editData.plaka} onChange={e => editUp('plaka', e.target.value.toUpperCase())} placeholder="34 ABC 123"/>
              </FormGroup>
              <FormGroup label="MARKA">
                <MR.AracMarkaSelect value={editData.marka} onChange={v => { editUp('marka', v); setEditData(p => ({...p, model_adi:''})); }}/>
              </FormGroup>
              <FormGroup label="MODEL">
                <MR.AracModelSelect marka={editData.marka} value={editData.model_adi} onChange={v => editUp('model_adi', v)}/>
              </FormGroup>
              <FormGroup label="YIL">
                <select style={S.select} value={editData.arac_yili} onChange={e => editUp('arac_yili', e.target.value)}>
                  <option value="">SEÇİNİZ</option>
                  {Array.from({length:30}, (_,i) => new Date().getFullYear()-i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="KM">
                <input style={S.input} value={editData.arac_km} onChange={e => editUp('arac_km', e.target.value.replace(/[^0-9]/g,''))} placeholder="KM"/>
              </FormGroup>
              <div/>
            </div>
            {/* OLAY & DOSYA */}
            <div style={{fontSize:11, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:10}}>
              <LIcon name="FileText" size={12} color={C.accent}/> OLAY & DOSYA BİLGİLERİ
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:14, marginBottom:14}}>
              <FormGroup label="TÜR">
                <select style={S.select} value={editData.dosya_turu} onChange={e => editUp('dosya_turu', e.target.value)}>
                  <option value="ADK">ADK</option>
                  <option value="BH">BEDENİ HASAR</option>
                  <option value="MDK">MOTOR DEĞER KAYBI</option>
                </select>
              </FormGroup>
              <FormGroup label="KAYNAK">
                <select style={S.select} value={editData.kaynak} onChange={e => editUp('kaynak', e.target.value)}>
                  {kaynaklar.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="DURUM">
                <select style={S.select} value={editData.durum} onChange={e => editUp('durum', e.target.value)}>
                  {['Yeni','Takipte','Olumlu','Olumsuz'].map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="ÖNCELİK">
                <select style={S.select} value={editData.oncelik || 'NORMAL'} onChange={e => editUp('oncelik', e.target.value)}>
                  {['DÜŞÜK','NORMAL','YÜKSEK','ACİL'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FormGroup>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr', gap:14}}>
              <FormGroup label="OLAY AÇIKLAMASI">
                <textarea style={{...S.input, minHeight:60}} value={editData.olay_aciklama || ''} onChange={e => editUp('olay_aciklama', e.target.value)} placeholder="OLAY AÇIKLAMASI..."/>
              </FormGroup>
              <FormGroup label="NOT">
                <textarea style={{...S.input, minHeight:50}} value={editData.not_text} onChange={e => editUp('not_text', e.target.value)} placeholder="GÖRÜŞME NOTU..."/>
              </FormGroup>
            </div>
            <div style={{marginTop:20, display:'flex', gap:8, justifyContent:'flex-end'}}>
              <button style={{...S.btn, ...S.btnG}} onClick={() => setEditModal(false)}>İPTAL</button>
              <button style={{...S.btn, ...S.btnS}} onClick={editKaydet} disabled={editLoading}>
                <LIcon name="Save" size={14} color="#fff"/> {editLoading ? 'KAYDEDİLİYOR...' : 'GÜNCELLE'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* SİL ONAY */}
      <Confirm open={!!deleteConfirm} message="BU CRM KAYDINI SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ? BU İŞLEM GERİ ALINAMAZ." onConfirm={handleSil} onCancel={() => setDeleteConfirm(null)}/>

      {/* TOPLU SİL ONAY */}
      <Confirm open={topluSilConfirm}
        message={`SEÇİLEN ${secililer.length} CRM KAYDI KALICI OLARAK SİLİNECEK!\n\nBU İŞLEM GERİ ALINAMAZ! DEVAM EDİLSİN Mİ?`}
        onCancel={() => setTopluSilConfirm(false)}
        onConfirm={topluSil}/>
    </div>
  );
};

/* ═══════════════════════════════════════════
   CRM DETAY
   ═══════════════════════════════════════════ */
MR._CRMDetayInner = ({setPage, crmId}) => {
  const {C, S, LIcon, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, Confirm, api, ILLER} = MR;
  const [crm, setCrm] = useState(null);
  const [loading, setLoading] = useState(true);

  // NOT EKLEME
  const [notText, setNotText] = useState('');
  const [notLoading, setNotLoading] = useState(false);

  // BİRLEŞİK TİMELİNE (CRM notları + Çağrı logları + Yönlendirme notları)
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // DÜZENLEME MODAL
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // SİL ONAY
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // DÖNÜŞTÜR ONAY
  const [donusturConfirm, setDonusturConfirm] = useState(false);
  const [donusturLoading, setDonusturLoading] = useState(false);

  const kaynaklar = ['TELEFON', 'WEB FORMU', 'SOSYAL MEDYA', 'YÖNLENDİRME', 'DİĞER'];
  const dC = d => d === 'Olumlu' ? C.success : d === 'Takipte' ? C.warning : d === 'Yeni' ? C.cyan : d === 'Olumsuz' ? C.danger : C.textSec;

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.crmGet(crmId);
    if (r?.success) setCrm(r.data);
    setLoading(false);
  }, [crmId]);

  /* BİRLEŞİK TİMELİNE — CRM notları + arama_loglari + yönlendirme notları */
  const loadTimeline = useCallback(async () => {
    if (!crmId) return;
    setTimelineLoading(true);
    try {
      if (api.netsantralTimeline) {
        const numara = crm?.telefon || '';
        const r = await api.netsantralTimeline({crm_id: crmId, numara});
        if (r?.success && r.data?.timeline) {
          setTimeline(r.data.timeline);
        }
      }
    } catch(e) {}
    setTimelineLoading(false);
  }, [crmId, crm?.telefon]);

  useEffect(() => { load(); }, [crmId]);
  useEffect(() => { if (crm) loadTimeline(); }, [crm?.id, crm?.telefon]);

  // NOT EKLE
  const notEkle = async () => {
    if (!notText.trim()) return;
    setNotLoading(true);
    const r = await api.crmNotEkle({crm_id: crmId, not_text: notText.trim()});
    if (r?.success) {
      setNotText('');
      load();
      loadTimeline();
    }
    setNotLoading(false);
  };

  // DÜZENLEME
  const openEdit = () => {
    if (!crm) return;
    setEditData({
      id: crm.id,
      ad_soyad: crm.ad_soyad || '',
      tc_vergi_no: crm.tc_vergi_no || '',
      telefon: crm.telefon || '',
      email: crm.email || '',
      il: crm.il || '',
      ilce: crm.ilce || '',
      plaka: crm.plaka || '',
      marka: crm.marka || '',
      model_adi: crm.model_adi || '',
      arac_yili: crm.arac_yili || '',
      arac_km: crm.arac_km || '',
      olay_aciklama: crm.olay_aciklama || '',
      dosya_turu: crm.dosya_turu || 'ADK',
      kaynak: crm.kaynak || 'TELEFON',
      durum: crm.durum || 'Yeni',
      oncelik: crm.oncelik || 'NORMAL',
      not_text: ''
    });
    setEditError('');
    setEditModal(true);
  };

  const editUp = (k, v) => setEditData(p => ({...p, [k]: v}));

  const editKaydet = async () => {
    if (!editData.ad_soyad || !editData.telefon) {
      setEditError('AD VE TELEFON ZORUNLU');
      return;
    }
    setEditLoading(true);
    setEditError('');
    const r = await api.crmUpdate(editData);
    if (r?.success) {
      setEditModal(false);
      setEditData(null);
      load();
    } else {
      setEditError(r?.error || 'GÜNCELLEME HATASI');
    }
    setEditLoading(false);
  };

  // SİL
  const handleSil = async () => {
    const r = await api.crmDelete(crmId);
    if (r?.success) {
      setDeleteConfirm(false);
      setPage('crm-liste');
    }
  };

  // DÖNÜŞTÜR
  const handleDonustur = async () => {
    setDonusturLoading(true);
    const r = await api.crmDonustur({crm_id: crmId});
    if (r?.success) {
      setDonusturConfirm(false);
      if (r.data?.dosya_id) {
        setPage('dosya-detay-' + r.data.dosya_id);
      } else {
        setPage('dosya-liste');
      }
    }
    setDonusturLoading(false);
  };

  // DURUM DEĞİŞTİR
  const durumDegistir = async (yeniDurum) => {
    const r = await api.crmUpdate({id: crmId, durum: yeniDurum});
    if (r?.success) load();
  };

  if (loading) return <Loading/>;
  if (!crm) return <EmptyState icon="AlertCircle" title="CRM KAYDI BULUNAMADI" desc="GEÇERSİZ KAYIT"/>;

  const notlar = crm.notlar || [];
  const infoRow = (label, value) => (
    <div style={{display: 'flex', padding: '10px 0', borderBottom: `1px solid ${C.border}`}}>
      <div style={{width: 160, fontSize: 11, fontWeight: 600, color: C.textMuted}}>{label}</div>
      <div style={{flex: 1, fontSize: 12, fontWeight: 500}}>{value || '-'}</div>
    </div>
  );

  return (
    <div className="fade-in">
      {/* GERİ BUTONU */}
      <button style={{...S.btn, ...S.btnG, marginBottom: 16, fontSize: 11}} onClick={() => setPage('crm-liste')}>
        <LIcon name="ArrowLeft" size={14}/> LİSTEYE DÖN
      </button>

      {/* HEADER CARD */}
      <div style={{...S.card, marginBottom: 16}}>
        <div style={{padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, background: `${C.accent}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <LIcon name="User" size={24} color={C.accent}/>
            </div>
            <div>
              <div style={{fontSize: 20, fontWeight: 800}}>
                {crm.ad_soyad}
                <span style={{marginLeft: 10}}>
                  <Badge text={crm.durum || 'YENİ'} color={dC(crm.durum)}/>
                </span>
              </div>
              <div style={{fontSize: 12, color: C.textSec, marginTop: 4, display: 'flex', gap: 10, alignItems: 'center'}}>
                <span>{crm.telefon || '-'}</span>
                {crm.telefon && (
                  <button onClick={() => { MR._gelenCagriTelefon = crm.telefon; MR._gelenCagriAdi = crm.ad_soyad || ''; setPage('crm-yeni'); }} style={{
                    ...S.btnMini,...S.btnMiniS, padding:'5px 12px', fontSize:11
                  }}>
                    <LIcon name="Phone" size={13} color="#fff"/> ARA
                  </button>
                )}
                <span style={{color: C.textMuted}}>|</span>
                <Badge text={crm.kaynak || 'TELEFON'} color={C.textSec}/>
                <Badge text={crm.dosya_turu || 'ADK'} color={crm.dosya_turu === 'BH' ? C.purple : C.accent}/>
              </div>
            </div>
          </div>
          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            <select value={crm.durum} onChange={e => durumDegistir(e.target.value)}
              style={{...S.select, width: 160, fontSize: 11, background: `${dC(crm.durum)}11`, border: `1px solid ${dC(crm.durum)}44`}}>
              {['Yeni', 'Takipte', 'Olumlu', 'Olumsuz'].map(d =>
                <option key={d} value={d}>{d.toUpperCase()}</option>
              )}
            </select>
            <button style={{...S.btn, ...S.btnP, fontSize: 11}} onClick={openEdit}>
              <LIcon name="Edit3" size={14} color="#fff"/> DÜZENLE
            </button>
            <button style={{...S.btn, ...S.btnS, fontSize: 11}} onClick={() => setDonusturConfirm(true)}>
              <LIcon name="ArrowRightCircle" size={14} color="#fff"/> DOSYAYA DÖNÜŞTÜR
            </button>
            <button style={{...S.btn, ...S.btnD, fontSize: 11}} onClick={() => setDeleteConfirm(true)}>
              <LIcon name="Trash2" size={14} color="#fff"/> SİL
            </button>
          </div>
        </div>
      </div>

      {/* İÇERİK GRİD */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
        {/* BİLGİLER */}
        <div style={S.card}>
          <SectionTitle icon="Info" title="MÜŞTERİ & ARAÇ BİLGİLERİ" sub="DETAY BİLGİLER"/>
          <div style={{padding: 20}}>
            {infoRow('AD SOYAD', crm.ad_soyad)}
            {infoRow('TC / VERGİ NO', crm.tc_vergi_no)}
            {infoRow('TELEFON', crm.telefon ? (
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <span>{crm.telefon}</span>
                <button onClick={() => { MR._gelenCagriTelefon = crm.telefon; MR._gelenCagriAdi = crm.ad_soyad || ''; setPage('crm-yeni'); }} style={{
                  ...S.btnMini,...S.btnMiniS, padding:'4px 10px'
                }}>
                  <LIcon name="Phone" size={11} color="#fff"/> ARA
                </button>
              </div>
            ) : '-')}
            {infoRow('E-POSTA', crm.email)}
            {infoRow('İL / İLÇE', [crm.il, crm.ilce].filter(Boolean).join(' / ') || '-')}
            {crm.plaka && <div style={{padding:'6px 0', borderBottom:`1px solid ${C.border}`, marginTop:6}}>
              <div style={{fontSize:10, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:6}}>ARAÇ BİLGİLERİ</div>
            </div>}
            {infoRow('PLAKA', crm.plaka)}
            {infoRow('MARKA / MODEL', [crm.marka, crm.model_adi].filter(Boolean).join(' - ') || '-')}
            {infoRow('YIL / KM', [crm.arac_yili, crm.arac_km ? crm.arac_km + ' KM' : ''].filter(Boolean).join(' / ') || '-')}
            <div style={{padding:'6px 0', borderBottom:`1px solid ${C.border}`, marginTop:6}}>
              <div style={{fontSize:10, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:6}}>DOSYA BİLGİLERİ</div>
            </div>
            {infoRow('DOSYA TÜRÜ', crm.dosya_turu)}
            {infoRow('KAYNAK', crm.kaynak)}
            {infoRow('ÖNCELİK', crm.oncelik || 'NORMAL')}
            {infoRow('DURUM', (
              <Badge text={crm.durum || 'YENİ'} color={dC(crm.durum)}/>
            ))}
            {infoRow('ATANAN', crm.atanan_adi || '-')}
            {infoRow('KAYIT TARİHİ', crm.created_at || '-')}
            {infoRow('SON İLETİŞİM', crm.son_iletisim || '-')}
            {crm.olay_aciklama && (
              <div style={{marginTop:10}}>
                <div style={{fontSize:10, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:6}}>OLAY AÇIKLAMASI</div>
                <div style={{fontSize:12, lineHeight:1.6, padding:10, background:`${C.accent}08`, borderRadius:8, border:`1px solid ${C.border}`}}>
                  {crm.olay_aciklama}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BİRLEŞİK TİMELİNE — CRM notları + Çağrı geçmişi + Yönlendirme notları */}
        <div style={S.card}>
          <SectionTitle icon="History" title="GÖRÜŞME GEÇMİŞİ & NOTLAR" sub={`${(timeline.length || notlar.length)} KAYIT`}/>
          <div style={{padding: 20}}>
            {/* NOT EKLEME FORMU */}
            <div style={{marginBottom: 20}}>
              <textarea
                style={{...S.input, minHeight: 80, marginBottom: 10}}
                value={notText}
                onChange={e => setNotText(e.target.value)}
                placeholder="YENİ NOT YAZIN..."
              />
              <button style={{...S.btn, ...S.btnP, fontSize: 11}} onClick={notEkle} disabled={notLoading || !notText.trim()}>
                <LIcon name="Plus" size={14} color="#fff"/> {notLoading ? 'EKLENİYOR...' : 'NOT EKLE'}
              </button>
            </div>

            {/* BİRLEŞİK LİSTE — timeline varsa onu, yoksa eski notlar listesini göster */}
            <div style={{maxHeight: 500, overflowY: 'auto'}}>
              {timelineLoading && <div style={{textAlign:'center',padding:20,color:C.textMuted,fontSize:11}}>YÜKLENİYOR...</div>}
              {!timelineLoading && timeline.length === 0 && notlar.length === 0 && (
                <div style={{textAlign: 'center', padding: 30, color: C.textMuted, fontSize: 12}}>
                  HENÜZ NOT VEYA ÇAĞRI KAYDI YOK
                </div>
              )}
              {!timelineLoading && timeline.length > 0 ? (
                timeline.map((t, i) => {
                  const renkMap = {
                    'crm-not': C.accent,
                    'arama-gelen': C.success,
                    'arama-giden': C.cyan,
                    'yonlendirme-not': C.warning
                  };
                  const renk = renkMap[t.tip] || C.textMuted;
                  return (
                    <div key={i} style={{
                      padding: 12, marginBottom: 10,
                      background: renk + '0a', borderRadius: 10,
                      border: '1px solid ' + renk + '33',
                      display: 'flex', gap: 10
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: renk + '22',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <LIcon name={t.icon || 'Circle'} size={14} color={renk}/>
                      </div>
                      <div style={{flex: 1, minWidth: 0}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4}}>
                          <span style={{fontSize: 10, fontWeight: 800, color: renk, letterSpacing: 0.5}}>{t.baslik}</span>
                          <span style={{fontSize: 9, color: C.textMuted, whiteSpace: 'nowrap'}}>{t.tarih || '-'}</span>
                        </div>
                        <div style={{fontSize: 12, lineHeight: 1.55, color: C.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>{t.metin || '-'}</div>
                        <div style={{display: 'flex', gap: 12, marginTop: 6, fontSize: 9, color: C.textMuted}}>
                          {t.kullanici && <span>👤 {t.kullanici}</span>}
                          {t.sonuc && <span>🎯 {t.sonuc}</span>}
                          {t.kayit_url && <a href={t.kayit_url} target="_blank" style={{color: C.accent}}>🔊 KAYDI DİNLE</a>}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Fallback: timeline yüklenemezse eski notlar */
                notlar.map((n, i) => (
                  <div key={n.id || i} style={{
                    padding: 14, marginBottom: 10, background: `${C.accent}08`, borderRadius: 10,
                    border: `1px solid ${C.border}`
                  }}>
                    <div style={{fontSize: 12, lineHeight: 1.6, marginBottom: 8}}>{n.not_text || n.icerik || '-'}</div>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.textMuted}}>
                      <span>{n.ekleyen_adi || 'SİSTEM'}</span>
                      <span>{n.created_at || '-'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DÜZENLEME MODAL */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="CRM KAYDI DÜZENLE" width="800px">
        {editData && (
          <div>
            {editError && (
              <div style={{padding:10, background:`${C.danger}22`, borderRadius:8, marginBottom:16, fontSize:12, color:C.danger}}>
                {editError}
              </div>
            )}
            {/* MÜŞTERİ BİLGİLERİ */}
            <div style={{fontSize:11, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:10}}>
              <LIcon name="User" size={12} color={C.accent}/> MÜŞTERİ BİLGİLERİ
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:18}}>
              <FormGroup label="AD SOYAD *">
                <input style={S.input} value={editData.ad_soyad} onChange={e => editUp('ad_soyad', e.target.value)} placeholder="AD SOYAD"/>
              </FormGroup>
              <FormGroup label="TC / VERGİ NO">
                <input style={S.input} value={editData.tc_vergi_no} onChange={e => editUp('tc_vergi_no', e.target.value.replace(/[^0-9]/g,''))} placeholder="TC / VERGİ NO" maxLength={11}/>
              </FormGroup>
              <FormGroup label="TELEFON *">
                <input style={S.input} value={editData.telefon} onChange={e => editUp('telefon', e.target.value)} placeholder="05XX XXX XXXX"/>
              </FormGroup>
              <FormGroup label="E-POSTA">
                <input style={S.input} value={editData.email} onChange={e => editUp('email', e.target.value)} placeholder="E-POSTA"/>
              </FormGroup>
              <FormGroup label="İL">
                <select style={S.select} value={editData.il} onChange={e => editUp('il', e.target.value)}>
                  <option value="">SEÇİNİZ</option>
                  {ILLER.map(il => <option key={il} value={il}>{il}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="İLÇE">
                <input style={S.input} value={editData.ilce} onChange={e => editUp('ilce', e.target.value)} placeholder="İLÇE"/>
              </FormGroup>
            </div>
            {/* ARAÇ BİLGİLERİ */}
            <div style={{fontSize:11, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:10}}>
              <LIcon name="Car" size={12} color={C.accent}/> ARAÇ BİLGİLERİ
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:18}}>
              <FormGroup label="PLAKA">
                <input style={S.input} value={editData.plaka} onChange={e => editUp('plaka', e.target.value.toUpperCase())} placeholder="34 ABC 123"/>
              </FormGroup>
              <FormGroup label="MARKA">
                <MR.AracMarkaSelect value={editData.marka} onChange={v => { editUp('marka', v); setEditData(p => ({...p, model_adi:''})); }}/>
              </FormGroup>
              <FormGroup label="MODEL">
                <MR.AracModelSelect marka={editData.marka} value={editData.model_adi} onChange={v => editUp('model_adi', v)}/>
              </FormGroup>
              <FormGroup label="YIL">
                <select style={S.select} value={editData.arac_yili} onChange={e => editUp('arac_yili', e.target.value)}>
                  <option value="">SEÇİNİZ</option>
                  {Array.from({length:30}, (_,i) => new Date().getFullYear()-i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="KM">
                <input style={S.input} value={editData.arac_km} onChange={e => editUp('arac_km', e.target.value.replace(/[^0-9]/g,''))} placeholder="KM"/>
              </FormGroup>
              <div/>
            </div>
            {/* OLAY & DOSYA BİLGİLERİ */}
            <div style={{fontSize:11, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:10}}>
              <LIcon name="FileText" size={12} color={C.accent}/> OLAY & DOSYA BİLGİLERİ
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:14, marginBottom:14}}>
              <FormGroup label="TÜR">
                <select style={S.select} value={editData.dosya_turu} onChange={e => editUp('dosya_turu', e.target.value)}>
                  <option value="ADK">ADK</option>
                  <option value="BH">BEDENİ HASAR</option>
                  <option value="MDK">MOTOR DEĞER KAYBI</option>
                </select>
              </FormGroup>
              <FormGroup label="KAYNAK">
                <select style={S.select} value={editData.kaynak} onChange={e => editUp('kaynak', e.target.value)}>
                  {kaynaklar.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="DURUM">
                <select style={S.select} value={editData.durum} onChange={e => editUp('durum', e.target.value)}>
                  {['Yeni','Takipte','Olumlu','Olumsuz'].map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="ÖNCELİK">
                <select style={S.select} value={editData.oncelik || 'NORMAL'} onChange={e => editUp('oncelik', e.target.value)}>
                  {['DÜŞÜK','NORMAL','YÜKSEK','ACİL'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FormGroup>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr', gap:14}}>
              <FormGroup label="OLAY AÇIKLAMASI">
                <textarea style={{...S.input, minHeight:70}} value={editData.olay_aciklama || ''} onChange={e => editUp('olay_aciklama', e.target.value)} placeholder="OLAY AÇIKLAMASI..."/>
              </FormGroup>
              <FormGroup label="NOT">
                <textarea style={{...S.input, minHeight:60}} value={editData.not_text} onChange={e => editUp('not_text', e.target.value)} placeholder="GÖRÜŞME NOTU..."/>
              </FormGroup>
            </div>
            <div style={{marginTop:20, display:'flex', gap:8, justifyContent:'flex-end'}}>
              <button style={{...S.btn, ...S.btnG}} onClick={() => setEditModal(false)}>İPTAL</button>
              <button style={{...S.btn, ...S.btnS}} onClick={editKaydet} disabled={editLoading}>
                <LIcon name="Save" size={14} color="#fff"/> {editLoading ? 'KAYDEDİLİYOR...' : 'GÜNCELLE'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* SİL ONAY */}
      <Confirm open={deleteConfirm} message="BU CRM KAYDINI SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ? BU İŞLEM GERİ ALINAMAZ." onConfirm={handleSil} onCancel={() => setDeleteConfirm(false)}/>

      {/* DÖNÜŞTÜR ONAY */}
      <Confirm open={donusturConfirm} message="BU CRM KAYDINI DOSYAYA DÖNÜŞTÜRMEK İSTEDİĞİNİZE EMİN MİSİNİZ? CRM KAYDI 'OLUMLU' OLARAK İŞARETLENECEK VE YENİ BİR DOSYA OLUŞTURULACAKTIR." onConfirm={handleDonustur} onCancel={() => setDonusturConfirm(false)}/>
    </div>
  );
};

/* ═══════════════════════════════════════════
   CRM YENİ KAYIT - ZENGİNLEŞTİRİLMİŞ EKRAN
   ═══════════════════════════════════════════ */
MR._CRMYeniInner = ({setPage}) => {
  const {C, S, LIcon, FormGroup, Badge, api, ILLER, Confirm} = MR;

  /* ── FORM STATE ── */
  const [f, sF] = useState({
    ad_soyad: '', tc_vergi_no: '', telefon: '', telefon2: '',
    il: '', ilce: '', adres: '',
    olay_aciklama: '',
    dosya_turu: 'ADK', kaza_tarihi: '', kaza_turu: 'TEK_TARAFLI', pozisyon: 'SURUCU',
    durum: 'Yeni', not_text: '', taslak: 0
  });
  const [loading, setLoading] = useState(false);
  const [hangupLoading, setHangupLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savedId, setSavedId] = useState(null);
  const [donusturConfirm, setDonusturConfirm] = useState(false);
  const up = (k, v) => { sF(p => ({...p, [k]: v})); setError(''); setSuccess(''); };

  /* ── DOSYA / FOTOĞRAF STATE ── */
  const [ekler, setEkler] = useState([]);
  const dosyaInputRef = useRef(null);
  const fotoInputRef = useRef(null);

  const dosyaEkle = (files, type = 'dosya') => {
    const newFiles = Array.from(files).map(file => {
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      return {type, file, preview, name: file.name, size: file.size};
    });
    setEkler(prev => [...prev, ...newFiles]);
  };

  const dosyaSil = (idx) => {
    setEkler(prev => {
      const item = prev[idx];
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  /* ── GELEN ÇAĞRI / ARA BUTONUNDAN OTOMATİK DOLDURMA ── */
  useEffect(() => {
    /* ÖNCE localStorage'DAN KONTROL ET (WEBRTC WIDGET TARAFINDAN SET EDİLİR) */
    var lsTel = localStorage.getItem('webrtc_new_call_phone');
    var lsAd = localStorage.getItem('webrtc_new_call_name');
    if (lsTel) {
      sF(p => ({...p, telefon: lsTel, ad_soyad: lsAd || p.ad_soyad || ''}));
      localStorage.removeItem('webrtc_new_call_phone');
      localStorage.removeItem('webrtc_new_call_name');
    } else if (MR._gelenCagriTelefon) {
      sF(p => ({...p, telefon: MR._gelenCagriTelefon, ad_soyad: MR._gelenCagriAdi || ''}));
      MR._gelenCagriTelefon = null;
      MR._gelenCagriAdi = null;
    }
  }, []);


  /* ── ÇAĞRI ZAMANLAYICI (REF BAZLI - RE-RENDER ENGELLER) ── */
  const [callActive, setCallActive] = useState(false);
  const callSecondsRef = useRef(0);
  const timerRef = useRef(null);
  const timerDisplayRef = useRef(null);
  const prevCallActiveRef = useRef(false);

  /* ── WEBRTC DURUM DİNLEYİCİ - callActive SENKRONİZASYONU ── */
  useEffect(() => {
    const webrtcHandler = (e) => {
      const d = e.detail || {};
      switch(d.durum) {
        case 'araniyor':
        case 'caliyor':
        case 'gorusmede':
          setCallActive(true);
          break;
        case 'kapandi':
        case 'reddedildi':
          /* ÇAĞRI SONA ERDİ */
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          setCallActive(false);
          setHangupLoading(false);
          window.dispatchEvent(new CustomEvent('mr-arama-sonlandi'));
          break;
        case 'baglanti-koptu':
        case 'durduruldu':
          setCallActive(false);
          break;
      }
    };
    window.addEventListener('mr-webrtc-durum', webrtcHandler);
    return () => window.removeEventListener('mr-webrtc-durum', webrtcHandler);
  }, []);

  useEffect(() => {
    if (callActive) {
      callSecondsRef.current = 0;
      if (timerDisplayRef.current) timerDisplayRef.current.textContent = fmtTime(0);
      timerRef.current = setInterval(() => {
        callSecondsRef.current += 1;
        if (timerDisplayRef.current) {
          timerDisplayRef.current.textContent = fmtTime(callSecondsRef.current);
        }
      }, 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [callActive]);

  /* ── GÖRÜŞME SONLANDIĞINDA OTOMATİK KAYDET ── */
  useEffect(() => {
    if (prevCallActiveRef.current && !callActive) {
      /* ÇAĞRI SONA ERDİ - AD SOYAD VE TELEFON DOLUYSA OTOMATİK KAYDET */
      if (f.ad_soyad.trim() && f.telefon.trim()) {
        otomatikKaydet();
      }
    }
    prevCallActiveRef.current = callActive;
  }, [callActive]);

  const otomatikKaydet = async () => {
    if (loading || savedId) return;
    if (!f.ad_soyad.trim()) { setError('OTOMATİK KAYIT İÇİN AD SOYAD GİRİLMELİDİR'); return; }
    if (!f.telefon.trim()) { setError('OTOMATİK KAYIT İÇİN TELEFON GİRİLMELİDİR'); return; }
    setLoading(true); setError(''); setSuccess('');
    const data = {...f, taslak: 0, kaynak: 'TELEFON'};
    const r = await api.crmCreate(data);
    if (r?.success) {
      const newId = r.data?.id;
      setSavedId(newId);
      /* EKLERİ YÜKLE */
      if (ekler.length > 0 && newId) {
        for (const ek of ekler) {
          try { await api.crmDosyaYukle(newId, ek.type, ek.file); } catch(e) {}
        }
      }
      /* NOT OLARAK GÖRÜŞME SÜRESİ EKLE */
      if (newId && callSecondsRef.current > 0) {
        const m = Math.floor(callSecondsRef.current / 60);
        const s = callSecondsRef.current % 60;
        const sure = `${m} DK ${s} SN`;
        await api.crmNotEkle({crm_id: newId, not_text: `TELEFON GÖRÜŞMESİ - SÜRE: ${sure}\n${f.olay_aciklama || ''}`}).catch(() => {});
      }
      setLoading(false);
      setSuccess('GÖRÜŞME KAYDI OTOMATİK KAYDEDİLDİ');
      setTimeout(() => setPage('crm-detay-' + newId), 1500);
    } else {
      setLoading(false);
      setError(r?.error || 'OTOMATİK KAYIT SIRASINDA HATA OLUŞTU');
    }
  };

  /* PBX ÜZERİNDEN Mİ BAŞLADI: false = SIP FALLBACK */
  const pbxOriginatedRef = useRef(false);

  const toggleCall = async () => {
    if (callActive) {
      /* Aktif çağrıyı kapat */
      if (MR.webrtcTelefon && MR.webrtcTelefon.kapat) MR.webrtcTelefon.kapat();
      zorlaKapat();
      return;
    }
    if (!f.telefon || f.telefon.length < 10) { setError('GEÇERLİ BİR TELEFON NUMARASI GİRİN'); return; }
    if (MR.webrtcAra) {
      MR.webrtcAra(f.telefon, {ad: f.ad_soyad || ''});
    } else {
      setError('ARAMA SİSTEMİ DEVRE DIŞI');
    }
  };

  /* ZORLA ÇAĞRI SONLANDIR */
  const zorlaKapat = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setCallActive(false);
    setHangupLoading(false);
    pbxOriginatedRef.current = false;
    setError('');
    window.dispatchEvent(new CustomEvent('mr-arama-sonlandi'));
  };

  const fmtTime = (s) => {
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sc = String(s % 60).padStart(2, '0');
    return `${m}:${sc}`;
  };

  /* ── AI ANALİZ ── */
  const aiItems = useMemo(() => {
    const r = [];
    if (f.telefon.length >= 10) r.push({t: 'ÇAĞRI KAYDI OLUŞTURULDU.', c: C.success});
    if (f.dosya_turu === 'ADK') r.push({t: 'DEĞER KAYBI POTANSİYELİ YÜKSEK.', c: C.success});
    if (f.dosya_turu === 'BH') r.push({t: 'BEDENİ HASAR HESAPLAMASI GEREKLİ.', c: C.purple});
    if (f.kaza_turu === 'CIFT_TARAFLI') r.push({t: 'ÇİFT TARAFLI KAZA - KUSUR TESPİTİ GEREKLİ.', c: C.warning});
    if (f.pozisyon === 'YAYA') r.push({t: 'YAYA KAZASI - BEDENİ HASAR ÖNCELİKLİ.', c: C.danger});
    if (f.pozisyon === 'YOLCU') r.push({t: 'YOLCU POZİSYONU - TAZMİNAT HAKKI YÜKSEK.', c: C.success});
    if (f.kaza_tarihi) r.push({t: 'KAZA TARİHİ GİRİLDİ.', c: C.success});
    if (f.olay_aciklama && f.olay_aciklama.length > 30) r.push({t: 'TAHKİM UYGUN OLABİLİR.', c: C.success});
    if (ekler.length > 0) r.push({t: `${ekler.length} DOSYA/EK EKLENDİ.`, c: C.cyan});
    return r;
  }, [f.telefon, f.dosya_turu, f.kaza_turu, f.pozisyon, f.kaza_tarihi, f.olay_aciklama, ekler.length]);

  /* ── KAYDET ── */
  const kaydet = async () => {
    if (!f.ad_soyad.trim()) { setError('AD SOYAD ZORUNLU ALAN'); return null; }
    if (!f.telefon.trim()) { setError('TELEFON ZORUNLU ALAN'); return null; }
    setLoading(true); setError(''); setSuccess('');
    const data = {...f, taslak: 0, kaynak: 'TELEFON'};
    const r = await api.crmCreate(data);
    if (r?.success) {
      const newId = r.data?.id;
      setSavedId(newId);
      /* EKLERİ YÜKLE */
      if (ekler.length > 0 && newId) {
        for (const ek of ekler) {
          try { await api.crmDosyaYukle(newId, ek.type, ek.file); } catch(e) {}
        }
      }
      setLoading(false);
      setPage('crm-detay-' + newId);
      return newId;
    } else {
      setLoading(false);
      setError(r?.error || 'KAYIT OLUŞTURULURKEN HATA OLUŞTU');
      return null;
    }
  };

  /* ── DOSYAYA DÖNÜŞTÜR ── */
  const handleDonustur = async () => {
    setDonusturConfirm(false);
    if (!f.ad_soyad.trim()) { setError('DOSYAYA DÖNÜŞTÜRMEK İÇİN AD SOYAD ZORUNLU'); return; }
    if (!f.telefon.trim()) { setError('DOSYAYA DÖNÜŞTÜRMEK İÇİN TELEFON ZORUNLU'); return; }
    setLoading(true); setError('');
    const createR = await api.crmCreate({...f, taslak: 0, durum: 'Olumlu', kaynak: 'TELEFON'});
    if (!createR?.success) { setError(createR?.error || 'CRM KAYDI OLUŞTURULAMADI'); setLoading(false); return; }
    const newId = createR.data?.id;
    const convR = await api.crmDonustur({crm_id: newId});
    setLoading(false);
    if (convR?.success && convR.data?.dosya_id) {
      setPage('dosya-detay-' + convR.data.dosya_id);
    } else {
      setPage('crm-detay-' + newId);
    }
  };

  /* ── FORM TEMİZLE ── */
  const [clearConfirm, setClearConfirm] = useState(false);
  const resetForm = () => {
    setClearConfirm(false);
    sF({ad_soyad:'',tc_vergi_no:'',telefon:'',telefon2:'',il:'',ilce:'',adres:'',olay_aciklama:'',dosya_turu:'ADK',kaza_tarihi:'',kaza_turu:'TEK_TARAFLI',pozisyon:'SURUCU',durum:'Yeni',not_text:'',taslak:0});
    setError(''); setSuccess(''); setSavedId(null);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setCallActive(false);
    callSecondsRef.current = 0;
    if (timerDisplayRef.current) timerDisplayRef.current.textContent = fmtTime(0);
    ekler.forEach(e => { if (e.preview) URL.revokeObjectURL(e.preview); });
    setEkler([]);
  };

  /* ── FIELDSET BİLEŞENİ ── */
  const Fieldset = ({title, icon, children}) => (
    <fieldset style={{
      border: `1px solid ${C.border}`, borderRadius: 8,
      padding: '12px 14px 10px', marginBottom: 10, background: 'transparent'
    }}>
      <legend style={{
        padding: '3px 10px', fontSize: 11, fontWeight: 700, color: C.textSec,
        display: 'flex', alignItems: 'center', gap: 5, letterSpacing: 0.5
      }}>
        <LIcon name={icon} size={12} color={C.accent}/>
        {title}
      </legend>
      {children}
    </fieldset>
  );

  /* ── SOL PANEL BUTON STİLİ ── */
  const actionBtn = (color) => ({
    ...S.btn, width: '100%', justifyContent: 'flex-start',
    background: `${color}12`, border: `1px solid ${color}30`,
    color: color, fontSize: 10, padding: '8px 10px', borderRadius: 8
  });

  /* ── RENDER ── */
  return (
    <div className="fade-in">

      {/* MESAJLAR */}
      {error && (
        <div style={{padding:'8px 14px', background:`${C.danger}15`, borderRadius:8, marginBottom:8, fontSize:11, color:C.danger, border:`1px solid ${C.danger}33`, display:'flex', alignItems:'center', gap:6}}>
          <LIcon name="AlertCircle" size={14} color={C.danger}/> {error}
        </div>
      )}
      {success && (
        <div style={{padding:'8px 14px', background:`${C.success}15`, borderRadius:8, marginBottom:8, fontSize:11, color:C.success, border:`1px solid ${C.success}33`, display:'flex', alignItems:'center', gap:6}}>
          <LIcon name="CheckCircle" size={14} color={C.success}/> {success}
        </div>
      )}

      {/* ═══ ANA İKİ SÜTUN LAYOUT ═══ */}
      <div style={{display:'flex', gap:12, alignItems:'flex-start'}}>

        {/* ═══ SOL PANEL - ANLIK ÇAĞRI & ANALİZ ═══ */}
        <div style={{width:260, minWidth:260, flexShrink:0}}>

          {/* ÜST BAR - KOMPAKT */}
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10, flexWrap:'wrap'}}>
            <button style={{...S.btn, ...S.btnG, fontSize:9, padding:'5px 10px', borderRadius:7}} onClick={() => setPage('crm-liste')}>
              <LIcon name="ArrowLeft" size={11}/> LİSTEYE DÖN
            </button>
            <div style={{display:'flex', alignItems:'center', gap:5, flex:1, minWidth:0}}>
              <LIcon name="UserPlus" size={12} color={C.accent}/>
              <span style={{fontSize:10, fontWeight:700, whiteSpace:'nowrap'}}>ÇAĞRI / CRM KAYIT</span>
            </div>
            <span style={{fontSize:9, color:C.textMuted, whiteSpace:'nowrap'}}>
              {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}
            </span>
          </div>

          {/* ÇAĞRI PANELİ - YETKİ KONTROLLÜ */}
          {(MR._currentUser?.rol === 'admin' || MR._currentUser?.yetkiler?.netsipp_goruntule === 1) && <div style={{...S.card, marginBottom:10}}>
            <div style={{...S.cardHead, padding:'8px 12px'}}>
              <LIcon name="Headphones" size={13} color={C.accent}/>
              <span style={{fontSize:11, fontWeight:700}}>ANLIK ÇAĞRI & ANALİZ</span>
            </div>
            <div style={{padding:12}}>
              {/* TELEFON NUMARASI */}
              <div style={{
                background: callActive ? `${C.success}18` : `${C.accent}15`,
                border: `1px solid ${callActive ? C.success : C.accent}40`,
                borderRadius: 8, padding: '10px 12px', marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all .3s'
              }}>
                <div style={{
                  width:30, height:30, borderRadius:'50%',
                  background: callActive ? `${C.success}30` : `${C.accent}25`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  animation: callActive ? 'pulse 2s infinite' : 'none'
                }}>
                  <LIcon name={callActive ? 'PhoneCall' : 'Phone'} size={15} color={callActive ? C.success : C.accent}/>
                </div>
                <span style={{fontSize:15, fontWeight:800, letterSpacing:1, color: callActive ? C.success : C.text}}>
                  {f.telefon || '0XXX XXX XX XX'}
                </span>
              </div>

              {/* ZAMANLAYICI */}
              <div style={{
                display:'flex', alignItems:'center', gap:8,
                marginBottom:10, padding:'4px 0'
              }}>
                <LIcon name="Clock" size={14} color={callActive ? C.success : C.textMuted}/>
                <span ref={timerDisplayRef} style={{
                  fontSize:22, fontWeight:800, fontFamily:'monospace', letterSpacing:2,
                  color: callActive ? C.text : C.textMuted
                }}>
                  {fmtTime(0)}
                </span>
                {callActive && <Badge text="AKTIF" color={C.success}/>}
              </div>

              {/* ÇAĞRI KONTROL */}
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await toggleCall();
                }}
                disabled={hangupLoading}
                style={{
                  ...S.btn, width:'100%', justifyContent:'center',
                  background: callActive ? C.danger : C.success,
                  color:'#fff', padding:'10px', fontSize:12, borderRadius:8,
                  transition:'all .2s', userSelect:'none', WebkitUserSelect:'none',
                  position:'relative', zIndex:10,
                  opacity: hangupLoading ? 0.7 : 1
                }}>
                <LIcon name={callActive ? 'PhoneOff' : 'PhoneCall'} size={15} color="#fff"/>
                {hangupLoading ? 'SONLANDIRILIYOR...' : (callActive ? 'ÇAĞRIYI SONLANDIR' : 'ÇAĞRI BAŞLAT')}
              </button>
              {/* ZORLA SONLANDIR */}
              {callActive && !hangupLoading && error && error.includes('SONLANDIRILAMADI') && (
                <button onClick={zorlaKapat} style={{
                  ...S.btn, width:'100%', justifyContent:'center', marginTop:6,
                  background:`${C.warning}22`, color:C.warning, padding:'8px',
                  fontSize:10, borderRadius:7, border:`1px solid ${C.warning}`,
                  cursor:'pointer'
                }}>
                  <LIcon name="XCircle" size={12} color={C.warning}/> ZORLA SONLANDIR
                </button>
              )}
              {/* NetSIPP DURUM */}
              <MR._NetsippDurum/>
              {callActive && (
                <div style={{marginTop:8, padding:'6px 10px', background:`${C.warning}12`, borderRadius:6, fontSize:9, color:C.warning, border:`1px solid ${C.warning}30`}}>
                  <LIcon name="Info" size={10} color={C.warning}/> OTOMATİK KAYDEDİLECEK
                </div>
              )}
            </div>
          </div>}

          {/* SES & MİKROFON AYARLARI PANELİ */}
          <MR._SesAyarlariPaneli/>

          {/* AI ANALİZ PANELİ */}
          <div style={{...S.card}}>
            <div style={{...S.cardHead, padding:'8px 12px'}}>
              <LIcon name="Bot" size={13} color={C.accent}/>
              <span style={{fontSize:11, fontWeight:700}}>AI ANALİZ</span>
            </div>
            <div style={{padding:10}}>
              {aiItems.length === 0 ? (
                <div style={{color:C.textMuted, fontSize:10, textAlign:'center', padding:'10px 0'}}>
                  BİLGİ GİRİLDİKÇE ANALİZ OLUŞACAK...
                </div>
              ) : (
                <div style={{marginBottom:10}}>
                  {aiItems.map((item, i) => (
                    <div key={i} style={{
                      display:'flex', alignItems:'center', gap:6, padding:'5px 0',
                      borderBottom: i < aiItems.length-1 ? `1px solid ${C.border}` : 'none'
                    }}>
                      <LIcon name="CheckCircle" size={13} color={item.c}/>
                      <span style={{fontSize:10, fontWeight:500}}>{item.t}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{display:'flex', flexDirection:'column', gap:5, marginTop: aiItems.length > 0 ? 0 : 8}}>
                <button style={actionBtn(C.accent)} onClick={() => setPage('hesap-adk')}>
                  <LIcon name="Calculator" size={14} color={C.accent}/> DEĞER KAYBI HESAPLA
                </button>
                <button style={actionBtn(C.purple)} onClick={() => setPage('hesap-bh')}>
                  <LIcon name="Stethoscope" size={14} color={C.purple}/> BEDENİ HASAR HESAPLA
                </button>
                <button style={actionBtn(C.success)} onClick={() => setDonusturConfirm(true)}>
                  <LIcon name="ArrowRightCircle" size={14} color={C.success}/> DOSYAYI ONAYA GÖNDER
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SAĞ PANEL - FORM ═══ */}
        <div style={{flex:1, minWidth:0}}>

          {/* ── MÜŞTERİ BİLGİLERİ ── */}
          <Fieldset title="MÜŞTERİ BİLGİLERİ" icon="User">
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
              <FormGroup label="ADI SOYADI *">
                <input style={{...S.input, padding:'10px 12px', fontSize:13}} value={f.ad_soyad} onChange={e => up('ad_soyad', e.target.value)} placeholder="ADI SOYADI"/>
              </FormGroup>
              <FormGroup label="TC KİMLİK NO">
                <input style={{...S.input, padding:'10px 12px', fontSize:13}} value={f.tc_vergi_no} onChange={e => up('tc_vergi_no', e.target.value.replace(/[^0-9]/g,''))} placeholder="TC KİMLİK NO" maxLength={11}/>
              </FormGroup>
              <FormGroup label="TELEFON *">
                <input style={{...S.input, padding:'10px 12px', fontSize:13}} value={f.telefon} onChange={e => up('telefon', e.target.value)} placeholder="05XX XXX XX XX"/>
              </FormGroup>
              <FormGroup label="İL / İLÇE">
                <div style={{display:'flex', gap:6}}>
                  <select style={{...S.select, flex:'1 1 50%', padding:'10px 12px', fontSize:13}} value={f.il} onChange={e => up('il', e.target.value)}>
                    <option value="">İL SEÇİNİZ</option>
                    {ILLER.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  <input style={{...S.input, flex:'1 1 50%', padding:'10px 12px', fontSize:13}} value={f.ilce} onChange={e => up('ilce', e.target.value)} placeholder="İLÇE"/>
                </div>
              </FormGroup>
            </div>
            <div style={{marginTop:10}}>
              <FormGroup label="ADRES">
                <textarea style={{...S.input, minHeight:50, padding:'10px 12px', fontSize:13}} value={f.adres} onChange={e => up('adres', e.target.value)} placeholder="AÇIK ADRES..."/>
              </FormGroup>
            </div>
          </Fieldset>

          {/* ── OLAY BİLGİLERİ ── */}
          <Fieldset title="OLAY BİLGİLERİ" icon="FileText">
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10}}>
              <FormGroup label="DOSYA TÜRÜ">
                <select style={S.select} value={f.dosya_turu} onChange={e => up('dosya_turu', e.target.value)}>
                  <option value="ADK">ADK</option>
                  <option value="BH">BEDENİ HASAR</option>
                  <option value="MDK">MOTOR DEĞER KAYBI</option>
                </select>
              </FormGroup>
              <FormGroup label="KAZA TARİHİ">
                <MR.DateInput value={f.kaza_tarihi} onChange={v => up('kaza_tarihi', v)}/>
              </FormGroup>
            </div>

            {/* ── KAZA TÜRÜ TOGGLE ── */}
            <FormGroup label="KAZA TÜRÜ">
              <div style={{display:'flex', gap:6}}>
                {[{v:'TEK_TARAFLI', l:'TEK TARAFLI', icon:'ArrowRight'}, {v:'CIFT_TARAFLI', l:'ÇİFT TARAFLI', icon:'ArrowLeftRight'}].map(opt => (
                  <button key={opt.v} type="button" onClick={() => up('kaza_turu', opt.v)}
                    style={{
                      flex:1, padding:'12px 10px', borderRadius:10,
                      border: `2px solid ${f.kaza_turu === opt.v ? C.accent : C.borderLight}`,
                      background: f.kaza_turu === opt.v ? `${C.accent}20` : C.bgInput,
                      color: f.kaza_turu === opt.v ? C.accent : C.textSec,
                      fontWeight: f.kaza_turu === opt.v ? 800 : 500,
                      fontSize:13, cursor:'pointer', transition:'all .2s',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8
                    }}>
                    <LIcon name={opt.icon} size={16} color={f.kaza_turu === opt.v ? C.accent : C.textMuted}/>
                    {opt.l}
                  </button>
                ))}
              </div>
            </FormGroup>

            {/* ── POZİSYON TOGGLE ── */}
            <FormGroup label="POZİSYON">
              <div style={{display:'flex', gap:6, marginBottom:10}}>
                {[{v:'SURUCU', l:'SÜRÜCÜ', icon:'Steering'}, {v:'YOLCU', l:'YOLCU', icon:'Users'}, {v:'YAYA', l:'YAYA', icon:'PersonStanding'}].map(opt => (
                  <button key={opt.v} type="button" onClick={() => up('pozisyon', opt.v)}
                    style={{
                      flex:1, padding:'12px 10px', borderRadius:10,
                      border: `2px solid ${f.pozisyon === opt.v ? C.purple : C.borderLight}`,
                      background: f.pozisyon === opt.v ? `${C.purple}20` : C.bgInput,
                      color: f.pozisyon === opt.v ? C.purple : C.textSec,
                      fontWeight: f.pozisyon === opt.v ? 800 : 500,
                      fontSize:13, cursor:'pointer', transition:'all .2s',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8
                    }}>
                    <LIcon name={opt.v === 'SURUCU' ? 'CircleUser' : opt.v === 'YOLCU' ? 'Users' : 'Footprints'} size={16} color={f.pozisyon === opt.v ? C.purple : C.textMuted}/>
                    {opt.l}
                  </button>
                ))}
              </div>
            </FormGroup>

            <FormGroup label="OLAY AÇIKLAMASI / GÖRÜŞME NOTU">
              <textarea style={{...S.input, minHeight:80, padding:'10px 12px', fontSize:13}} value={f.olay_aciklama} onChange={e => up('olay_aciklama', e.target.value)} placeholder="MÜŞTERİ SAĞ ÖN ÇAMURLUK HASARLI, SİGORTA EKSPER BEKLİYOR, DEĞER KAYBI TALEP EDECEK..."/>
            </FormGroup>
          </Fieldset>

          {/* ── EKLER / MEDYA ── */}
          <Fieldset title="EKLER" icon="Paperclip">
            <div style={{display:'flex', gap:8, marginBottom:10, flexWrap:'wrap'}}>
              {/* DOSYA EKLE */}
              <button type="button" onClick={() => dosyaInputRef.current?.click()}
                style={{
                  ...S.btn, flex:'1 1 auto', justifyContent:'center',
                  background: `${C.success}12`, border: `1px solid ${C.success}40`,
                  color: C.success, fontSize:12, padding:'11px 14px', borderRadius:10
                }}>
                <LIcon name="FilePlus" size={16} color={C.success}/> DOSYA EKLE
              </button>
              {/* FOTOĞRAF YÜKLE */}
              <button type="button" onClick={() => fotoInputRef.current?.click()}
                style={{
                  ...S.btn, flex:'1 1 auto', justifyContent:'center',
                  background: `${C.purple}12`, border: `1px solid ${C.purple}40`,
                  color: C.purple, fontSize:12, padding:'11px 14px', borderRadius:10
                }}>
                <LIcon name="Camera" size={16} color={C.purple}/> FOTOĞRAF YÜKLE
              </button>
            </div>
            {/* GİZLİ FILE INPUT'LAR */}
            <input ref={dosyaInputRef} type="file" multiple style={{display:'none'}}
              onChange={e => { dosyaEkle(e.target.files, 'dosya'); e.target.value = ''; }}/>
            <input ref={fotoInputRef} type="file" accept="image/*" multiple capture="environment" style={{display:'none'}}
              onChange={e => { dosyaEkle(e.target.files, 'foto'); e.target.value = ''; }}/>

            {/* EK LİSTESİ */}
            {ekler.length > 0 && (
              <div style={{display:'flex', flexDirection:'column', gap:6}}>
                {ekler.map((ek, i) => (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                    background: `${ek.type === 'foto' ? C.purple : C.success}08`,
                    borderRadius:8, border:`1px solid ${C.border}`
                  }}>
                    <LIcon name={ek.type === 'foto' ? 'Image' : 'File'} size={14}
                      color={ek.type === 'foto' ? C.purple : C.success}/>
                    {ek.preview && <img src={ek.preview} style={{width:32, height:32, borderRadius:4, objectFit:'cover'}}/>}
                    <span style={{flex:1, fontSize:11, fontWeight:500}}>{ek.name}</span>
                    <span style={{fontSize:10, color:C.textMuted}}>{(ek.size/1024).toFixed(0)} KB</span>
                    <button type="button" onClick={() => dosyaSil(i)} style={{
                      background:'none', border:'none', cursor:'pointer', padding:2
                    }}>
                      <LIcon name="X" size={14} color={C.danger}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Fieldset>

        </div>
      </div>

      {/* ═══ ALT AKSİYON BAR ═══ */}
      <div style={{
        marginTop:12, padding:'12px 0 4px',
        display:'flex', justifyContent:'center', gap:10,
        borderTop:`1px solid ${C.border}`
      }}>
        <button style={{...S.btn, ...S.btnS, fontSize:12, padding:'10px 24px', borderRadius:8}} onClick={() => kaydet()} disabled={loading}>
          <LIcon name="Folder" size={15} color="#fff"/> {loading ? 'KAYDEDİLİYOR...' : 'KAYDET'}
        </button>
        <button style={{...S.btn, background:C.warning, color:'#000', fontSize:12, padding:'10px 24px', borderRadius:8}} onClick={() => setDonusturConfirm(true)} disabled={loading}>
          <LIcon name="ArrowRightCircle" size={15} color="#000"/> DOSYAYA DÖNÜŞTÜR
        </button>
        <button style={{...S.btn, ...S.btnD, fontSize:12, padding:'10px 24px', borderRadius:8}} onClick={() => setClearConfirm(true)}>
          <LIcon name="Trash2" size={15} color="#fff"/> TEMİZLE
        </button>
      </div>

      {/* ═══ ONAY DİALOGLARI ═══ */}
      <Confirm open={clearConfirm} message="FORMU TEMİZLEMEK İSTEDİĞİNİZE EMİN MİSİNİZ? TÜM GİRİLEN BİLGİLER SİLİNECEKTİR." onConfirm={resetForm} onCancel={() => setClearConfirm(false)}/>
      <Confirm open={donusturConfirm} message="BU KAYDI DOĞRUDAN DOSYAYA DÖNÜŞTÜRMEK İSTİYOR MUSUNUZ? CRM KAYDI OLUŞTURULUP DOSYAYA DÖNÜŞTÜRÜLECEKTİR." onConfirm={handleDonustur} onCancel={() => setDonusturConfirm(false)}/>

      {/* PULSE ANİMASYON CSS */}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
};
