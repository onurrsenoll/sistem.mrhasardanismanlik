const MR = window.MR || (window.MR = {});
const {useState, useEffect} = React;

MR.DosyaYeniPage = ({setPage, user}) => {
  const {C, S, LIcon, Badge, SectionTitle, FormGroup, api, SIGORTA, ILLER, ILCELER, formatPlaka, AracMarkaSelect, AracModelSelect, IBANInput, DateInput} = MR;
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [ortaklar, setOrtaklar] = useState([]);
  const [personeller, setPersoneller] = useState([]);
  const [paydaslar, setPaydaslar] = useState([]);
  const [kullanicilar, setKullanicilar] = useState([]);
  const [form, setForm] = useState({
    // Mağdur bilgileri
    ad_soyad:'', tc_kimlik:'', telefon:'', iban:'', adres:'', il:'', ilce:'', dogum_tarihi:'',
    // Dosya bilgileri
    dosya_turu:'ADK', kaza_tarihi:'', kaza_il:'', kaza_ilce:'', haklilik:'100', hak_mahrumiyet:'0', meslek:'', komisyon:'',
    dosya_kaynak:'', sorumlu_id:'', ortak_id:'', paydas_id:'', noter_vekalet:'',
    sakatlik_aciklama:'', gelir_durumu:'', sigorta_brans:'', talep_turu:'',
    // Sigorta bilgileri
    sigorta_sirket:'', hasar_no:'', police_no:'', sorumlu_sigorta:'', eksper_firma:'', onarim_servisi:'',
    // ADK araç bilgileri - mağdur
    ma_plaka:'', ma_marka:'', ma_model:'', ma_yil:'',
    ma_ruhsat:'', ma_tc:'', ma_belge_tescil:'', ma_onarim_gun:'', ma_gecmis_hasar:'', ma_kasko:'',
    // ADK araç bilgileri - karşı
    ka_plaka:'', ka_marka:'', ka_yil:'', ka_trafik:'',
    ka_ruhsat:'', ka_tc:'', ka_model:'', ka_belge_tescil:'', ka_trafik_police:'',
    ka_kasko:'', ka_ruhsat_surucu:'', ka_surucu_ad:'', ka_surucu_tc:'',
    // BH araç & sürücü bilgileri
    bh_arac_plaka:'', bh_arac_marka:'', bh_arac_yil:'', bh_kasko:'',
    surucu_ad:'', surucu_ehliyet:'', surucu_kusur:'',
    // Notlar
    notlar:''
  });
  const u = (k, v) => setForm(p => ({...p, [k]: v}));

  useEffect(() => {
    api.ortakList({durum:'aktif', limit:200}).then(r => {
      if (r?.success) setOrtaklar(r.data?.items || r.data || []);
    });
    api.personelList({durum:'aktif'}).then(r => {
      if (r?.success) setPersoneller(r.data?.items || r.data || []);
    });
    api.paydasList({durum:'aktif', limit:200}).then(r => {
      if (r?.success) setPaydaslar(r.data?.items || r.data || []);
    });
    api.kullaniciList({limit:200}).then(r => {
      if (r?.success) setKullanicilar((r.data?.items || r.data || []).filter(k => k.aktif));
    });
  }, []);

  const validate = () => {
    if (!form.ad_soyad.trim()) return 'MAĞDUR ADI SOYADI GEREKLİ';
    if (!form.tc_kimlik.trim()) return 'T.C. KİMLİK NO GEREKLİ';
    if (!form.telefon.trim()) return 'TELEFON GEREKLİ';
    if (!form.il) return 'İL SEÇİMİ GEREKLİ';
    if (!form.ilce) return 'İLÇE SEÇİMİ GEREKLİ';
    if (!form.dosya_turu) return 'DOSYA TÜRÜ SEÇİMİ GEREKLİ';
    if (!form.kaza_tarihi) return 'KAZA TARİHİ GEREKLİ';
    if (!form.komisyon) return 'KOMİSYON ORANI GEREKLİ';
    if (!form.noter_vekalet || parseFloat(form.noter_vekalet) <= 0) return 'NOTER VEKALET UCRETI GEREKLİ';
    if (!form.sorumlu_id) return 'DOSYA SORUMLUSU SEÇİMİ GEREKLİ';
    if (!form.dosya_kaynak) return 'DOSYA KAYNAĞI SEÇİMİ GEREKLİ';
    if (form.dosya_kaynak === 'PAYDAŞ/YÖNLENDİREN' && !form.paydas_id) return 'YÖNLENDİREN PAYDAŞ SEÇİMİ GEREKLİ';
    if (!form.sigorta_sirket) return 'SİGORTA ŞİRKETİ SEÇİMİ GEREKLİ';
    if (!form.hasar_no.trim()) return 'HASAR DOSYA NO GEREKLİ';
    if ((form.dosya_turu === 'ADK' || form.dosya_turu === 'MDK') && !form.ma_plaka.trim()) return 'MAĞDUR ARACI PLAKASI GEREKLİ';
    return null;
  };

  const kaydet = async () => {
    const eksik = validate();
    if (eksik) { setError(eksik); window.scrollTo({top:0,behavior:'smooth'}); return; }
    setLoading(true); setError('');
    const gonder = {...form};
    if (gonder.ortak_id) gonder.ortak_id = parseInt(gonder.ortak_id);
    else delete gonder.ortak_id;
    if (gonder.sorumlu_id) gonder.sorumlu_id = parseInt(gonder.sorumlu_id);
    else delete gonder.sorumlu_id;
    if (gonder.paydas_id) gonder.paydas_id = parseInt(gonder.paydas_id);
    else delete gonder.paydas_id;
    if (gonder.noter_vekalet) gonder.noter_vekalet = parseFloat(gonder.noter_vekalet);
    const r = await api.dosyaCreate(gonder);
    if (r?.success) setResult(r.data);
    else setError(r?.error || 'HATA');
    setLoading(false);
  };

  // Section header component
  const SecHead = ({icon, title}) => (
    <div style={{gridColumn:'1 / -1', display:'flex', alignItems:'center', gap:10, margin:'12px 0 4px', paddingBottom:10, borderBottom:`2px solid ${C.accent}33`}}>
      <div style={{width:32,height:32,borderRadius:8,background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <LIcon name={icon} size={15} color={C.accent}/>
      </div>
      <span style={{fontSize:13,fontWeight:800,color:C.accent,letterSpacing:1}}>{title}</span>
    </div>
  );

  // Computed values
  const isADK = form.dosya_turu === 'ADK' || form.dosya_turu === 'MDK';
  const isBH = form.dosya_turu === 'BH';
  const isPaydas = form.dosya_kaynak === 'PAYDAŞ/YÖNLENDİREN';
  const seciliOrtak = ortaklar.find(o => String(o.id) === String(form.ortak_id));
  const seciliSorumlu = personeller.find(p => String(p.user_id || p.id) === String(form.sorumlu_id));
  const seciliPaydas = paydaslar.find(p => String(p.id) === String(form.paydas_id));
  const paydasPrimTutar = seciliPaydas ? parseFloat(isBH ? seciliPaydas.prim_bh : seciliPaydas.prim_adk) || 0 : 0;

  // Başarı ekranı
  if (result) return (
    <div style={{maxWidth:600,margin:'0 auto'}} className="fade-in">
      <div style={S.card}>
        <div style={{padding:60,textAlign:'center'}}>
          <div style={{width:80,height:80,borderRadius:'50%',background:`${C.success}22`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
            <LIcon name="Check" size={40} color={C.success}/>
          </div>
          <div style={{fontSize:24,fontWeight:800,color:C.success,marginBottom:8}}>DOSYA OLUŞTURULDU</div>
          <div style={{fontSize:16,color:C.textSec}}>DOSYA NO: <strong style={{color:C.accent}}>{result.dosya_no}</strong></div>
          {result.oto_prim?.paydas_prim > 0 && (
            <div style={{marginTop:16,padding:12,background:`${C.gold || C.warning}11`,borderRadius:10,border:`1px solid ${C.gold || C.warning}33`,fontSize:12,color:C.textSec}}>
              PAYDAŞ PRİMİ: <strong>₺{result.oto_prim.paydas_prim}</strong> — MASRAF VE CARİYE OTOMATİK EKLENDİ (ÖDENMEDİ)
            </div>
          )}
          {result.oto_prim?.yonlendiren_ucret > 0 && (
            <div style={{marginTop:8,padding:12,background:`${C.accent}11`,borderRadius:10,border:`1px solid ${C.accent}33`,fontSize:12,color:C.textSec}}>
              {result.oto_prim.kaynak_tipi || 'YÖNLENDİREN ÜCRETİ'}: <strong>₺{Number(result.oto_prim.yonlendiren_ucret).toLocaleString('tr-TR')}</strong> — {result.oto_prim.yonlendiren_tur} MASRAFA OTOMATİK EKLENDİ
            </div>
          )}
          <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:24}}>
            <button style={{...S.btn,...S.btnP}} onClick={() => setPage('dosya-liste')}>DOSYA LİSTESİ</button>
            <button style={{...S.btn,...S.btnS}} onClick={() => {setResult(null);setForm(p=>({...p,ad_soyad:'',tc_kimlik:'',telefon:'',iban:'',adres:''}));}}>YENİ DOSYA</button>
          </div>
        </div>
      </div>
    </div>
  );

  // Section card component
  const SecCard = ({icon, title, sub, color, badge, children}) => (
    <div style={{background:C.bgCard||'#fff', borderRadius:10, border:`1px solid ${C.border}`, marginBottom:10, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
      <div style={{display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderBottom:`1px solid ${C.border}`, borderLeft:`3px solid ${color||C.accent}`}}>
        <div style={{width:26,height:26,borderRadius:6,background:`${color||C.accent}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <LIcon name={icon} size={12} color={color||C.accent}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:800,color:C.text}}>{title}</div>
          {sub && <div style={{fontSize:8,color:C.textMuted}}>{sub}</div>}
        </div>
        {badge && <span style={{padding:'2px 8px',borderRadius:6,fontSize:8,fontWeight:700,background:`${color||C.accent}18`,color:color||C.accent}}>{badge}</span>}
      </div>
      <div style={{padding:12}}>{children}</div>
    </div>
  );

  // Toggle button component
  const Toggle = ({value, onSelect, options}) => (
    <div style={{display:'flex',gap:6}}>
      {options.map(o => (
        <div key={o.value} onClick={() => onSelect(o.value)} style={{padding:'5px 12px',borderRadius:6,fontSize:10,fontWeight:700,cursor:'pointer',flex:1,textAlign:'center',
          background:value===o.value?`${o.color}22`:'transparent',color:value===o.value?o.color:C.textMuted,border:`1px solid ${value===o.value?o.color+'66':C.border}`}}>{o.label}</div>
      ))}
    </div>
  );

  // Plaka bileşeni
  const PlakaInput = ({value, onChange, placeholder}) => (
    <div style={{display:'flex',border:'2px solid #1a1a1a',borderRadius:7,overflow:'hidden',height:38}}>
      <div style={{width:28,background:'#003399',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <span style={{fontSize:6,color:'#ffd700'}}>★★★</span>
        <span style={{fontSize:7,fontWeight:900,color:'#fff'}}>TR</span>
      </div>
      <input value={value} onChange={e => onChange(formatPlaka(e.target.value))} placeholder={placeholder||'34XX000'}
        style={{flex:1,border:'none',padding:'0 12px',fontFamily:'Arial Black,Arial',fontSize:17,fontWeight:900,letterSpacing:3,textTransform:'uppercase',textAlign:'center',background:'#fff',color:'#1a1a1a',outline:'none'}}/>
    </div>
  );

  // Progress hesaplama
  const requiredFields = ['ad_soyad','tc_kimlik','telefon','kaza_tarihi','sorumlu_id','sigorta_sirket'];
  const filledCount = requiredFields.filter(f => form[f] && String(form[f]).trim()).length;
  const progressPct = Math.round((filledCount / requiredFields.length) * 100);

  const isKoyu = MR.tema === 'koyu';

  // Ana form
  return (
    <div style={{maxWidth:900,margin:'0 auto',paddingBottom:80}} className="fade-in">

      {error && (
        <div style={{padding:12,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
          <LIcon name="AlertTriangle" size={14}/>{error}
        </div>
      )}

      {/* ═══ 1. MAĞDUR BİLGİLERİ ═══ */}
      <SecCard icon="User" title="MAĞDUR BİLGİLERİ" sub="Mağdur kişiye ait bilgiler" color="#3b82f6" badge="ZORUNLU">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          <FormGroup label="ADI SOYADI *"><input style={S.input} value={form.ad_soyad} onChange={e=>u('ad_soyad',e.target.value)}/></FormGroup>
          <FormGroup label="T.C. KİMLİK NO *"><input style={S.input} value={form.tc_kimlik} onChange={e=>u('tc_kimlik',e.target.value)} maxLength={11}/></FormGroup>
          <FormGroup label="TELEFON *"><input style={S.input} value={form.telefon} onChange={e=>u('telefon',e.target.value)} placeholder="05XX XXX XX XX"/></FormGroup>
          <FormGroup label="DOĞUM TARİHİ"><DateInput value={form.dogum_tarihi} onChange={v=>u('dogum_tarihi',v)}/></FormGroup>
          <FormGroup label="IBAN"><IBANInput value={form.iban} onChange={v=>u('iban',v)}/></FormGroup>
          <FormGroup label="İL *"><select style={S.select} value={form.il} onChange={e=>{u('il',e.target.value);u('ilce','');}}><option value="">SEÇİNİZ</option>{ILLER.map(i=><option key={i} value={i}>{i}</option>)}</select></FormGroup>
          <FormGroup label="İLÇE *"><select style={S.select} value={form.ilce} onChange={e=>u('ilce',e.target.value)} disabled={!form.il}><option value="">ÖNCE İL SEÇİN</option>{(ILCELER[form.il]||[]).map(i=><option key={i} value={i}>{i}</option>)}</select></FormGroup>
          {isBH && <FormGroup label="MESLEK"><input style={S.input} value={form.meslek} onChange={e=>u('meslek',e.target.value)}/></FormGroup>}
          {isBH && <FormGroup label="GELİR DURUMU"><select style={S.select} value={form.gelir_durumu||''} onChange={e=>u('gelir_durumu',e.target.value)}><option value="">SEÇİNİZ</option><option value="ASGARİ ÜCRET">ASGARİ ÜCRET</option><option value="ASGARİ ÜCRET ÜSTÜ">ASGARİ ÜCRET ÜSTÜ</option><option value="SERBEST MESLEK">SERBEST MESLEK</option><option value="EMEKLİ">EMEKLİ</option><option value="ÖĞRENCİ">ÖĞRENCİ</option><option value="ÇALIŞMIYOR">ÇALIŞMIYOR</option></select></FormGroup>}
        </div>
        <FormGroup label="ADRES"><textarea style={{...S.input,minHeight:40}} value={form.adres} onChange={e=>u('adres',e.target.value)}/></FormGroup>
      </SecCard>

      {/* ═══ 2. DOSYA BİLGİLERİ ═══ */}
      <SecCard icon="FileText" title="DOSYA BİLGİLERİ" sub="Tür, tarih, sorumluluk ve sigorta" color="#f97316" badge="ZORUNLU">
        {/* DOSYA TÜRÜ PİLL */}
        <div style={{marginBottom:10}}>
          <div style={{fontSize:9,fontWeight:700,color:C.textMuted,marginBottom:4}}>DOSYA TÜRÜ *</div>
          <div style={{display:'flex',gap:6}}>
            {[{v:'ADK',l:'ADK',d:'Araç Değer Kaybı',icon:'Car'},{v:'BH',l:'BH',d:'Bedeni Hasar',icon:'Heart'},{v:'MDK',l:'MDK',d:'Maddi Hasar / Kaza',icon:'Wrench'}].map(t => (
              <div key={t.v} onClick={() => u('dosya_turu',t.v)} style={{flex:1,padding:'8px 10px',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:8,
                background:form.dosya_turu===t.v?`${C.accent}18`:'transparent',border:`1.5px solid ${form.dosya_turu===t.v?C.accent:C.border}`,transition:'all .2s'}}>
                <LIcon name={t.icon} size={14} color={form.dosya_turu===t.v?C.accent:C.textMuted}/>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:form.dosya_turu===t.v?C.accent:C.text}}>{t.l}</div>
                  <div style={{fontSize:8,color:C.textMuted}}>{t.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          <FormGroup label="KAZA TARİHİ *"><DateInput value={form.kaza_tarihi} onChange={v=>u('kaza_tarihi',v)}/></FormGroup>
          <FormGroup label="KAZA İLİ"><select style={S.select} value={form.kaza_il} onChange={e=>u('kaza_il',e.target.value)}><option value="">SEÇİNİZ</option>{ILLER.map(i=><option key={i} value={i}>{i}</option>)}</select></FormGroup>
          <FormGroup label="KAZA İLÇE"><input style={S.input} value={form.kaza_ilce} onChange={e=>u('kaza_ilce',e.target.value)}/></FormGroup>
          <FormGroup label="KOMİSYON (%) *"><input type="number" style={S.input} value={form.komisyon} onChange={e=>u('komisyon',e.target.value)} placeholder="20"/></FormGroup>
          <FormGroup label="NOTER VEKALET (TL) *"><input type="number" style={S.input} value={form.noter_vekalet} onChange={e=>u('noter_vekalet',e.target.value)} placeholder="1596"/></FormGroup>
          <FormGroup label="DOSYA KAYNAĞI *">
            <select style={S.select} value={form.dosya_kaynak} onChange={e=>{u('dosya_kaynak',e.target.value);u('paydas_id','');}}>
              <option value="">SEÇİNİZ</option><option value="OFİS CRM">OFİS CRM</option><option value="PAYDAŞ/YÖNLENDİREN">PAYDAŞ / YÖNLENDİREN</option>
            </select>
          </FormGroup>
          <FormGroup label="DOSYA SORUMLUSU *">
            <select style={S.select} value={form.sorumlu_id} onChange={e=>u('sorumlu_id',e.target.value)}>
              <option value="">SORUMLU SEÇİNİZ</option>
              {personeller.length > 0 && personeller.map(p => <option key={'p-'+p.id} value={p.user_id||p.id}>{p.ad_soyad}{p.pozisyon?` - ${p.pozisyon}`:''}{p.departman?` (${p.departman})`:''}</option>)}
              {personeller.length === 0 && kullanicilar.map(k => <option key={'k-'+k.id} value={k.id}>{k.ad_soyad}{k.rol?` (${k.rol.toUpperCase()})`:''}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="AVUKAT (İŞ ORTAĞI)">
            <select style={S.select} value={form.ortak_id} onChange={e=>u('ortak_id',e.target.value)}>
              <option value="">AVUKAT SEÇİNİZ</option>
              {ortaklar.map(o => <option key={o.id} value={o.id}>{o.ad_soyad}{o.firma?` - ${o.firma}`:''} — %{o.odeme_orani||0}</option>)}
            </select>
          </FormGroup>
        </div>
        {/* HAKLILIK ORANI */}
        <div style={{marginTop:8}}>
          <div style={{fontSize:9,fontWeight:700,color:C.textMuted,marginBottom:4}}>HAKLILIK ORANI *</div>
          <div style={{display:'flex',gap:4}}>
            {['100','75','50','25'].map(v => (
              <div key={v} onClick={() => u('haklilik',v)} style={{flex:1,padding:'6px',borderRadius:6,textAlign:'center',cursor:'pointer',fontSize:12,fontWeight:800,
                background:form.haklilik===v?`${C.accent}22`:'transparent',color:form.haklilik===v?C.accent:C.textMuted,border:`1.5px solid ${form.haklilik===v?C.accent:C.border}`}}>%{v}</div>
            ))}
          </div>
        </div>
        {/* SEÇİLİ SORUMLU */}
        {seciliSorumlu && (
          <div style={{marginTop:8,padding:10,background:`${C.accent}08`,borderRadius:10,border:`1px solid ${C.accent}22`,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:32,height:32,borderRadius:8,background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center'}}><LIcon name="UserCheck" size={18} color={C.accent}/></div>
            <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700}}>{seciliSorumlu.ad_soyad}</div><div style={{fontSize:9,color:C.textSec}}>{seciliSorumlu.departman||''} {seciliSorumlu.pozisyon?'• '+seciliSorumlu.pozisyon:''}</div></div>
            {(parseFloat(isBH?seciliSorumlu.prim_bh:seciliSorumlu.prim_adk)>0) && <div style={{padding:'6px 12px',background:`${C.success}18`,borderRadius:8,textAlign:'center'}}><div style={{fontSize:8,color:C.textMuted}}>{form.dosya_turu} PRİMİ</div><div style={{fontSize:16,fontWeight:900,color:C.success}}>₺{isBH?seciliSorumlu.prim_bh:seciliSorumlu.prim_adk}</div></div>}
          </div>
        )}
        {seciliOrtak && (
          <div style={{marginTop:8,padding:12,background:`${C.purple}08`,borderRadius:10,border:`1px solid ${C.purple}22`,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:32,height:32,borderRadius:8,background:`${C.purple}22`,display:'flex',alignItems:'center',justifyContent:'center'}}><LIcon name="Scale" size={18} color={C.purple}/></div>
            <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700}}>{seciliOrtak.ad_soyad}</div><div style={{fontSize:9,color:C.textSec}}>{seciliOrtak.firma||''} {seciliOrtak.baro?'• '+seciliOrtak.baro:''}</div></div>
            <div style={{padding:'6px 12px',background:`${C.purple}18`,borderRadius:8,textAlign:'center'}}><div style={{fontSize:8,color:C.textMuted}}>ODEME ORANI</div><div style={{fontSize:18,fontWeight:900,color:C.purple}}>%{seciliOrtak.odeme_orani||0}</div></div>
          </div>
        )}
      </SecCard>

      {/* ═══ 3. PAYDAS / YÖNLENDİREN ═══ */}
      {isPaydas && (
        <SecCard icon="Handshake" title="PAYDAŞ / YÖNLENDİREN" sub="Dosyayı yönlendiren paydaş bilgileri" color="#8b5cf6" badge="KOŞULLU">
          <FormGroup label="YÖNLENDİREN (İŞ PAYDAŞI) *">
            <select style={S.select} value={form.paydas_id} onChange={e=>u('paydas_id',e.target.value)}>
              <option value="">PAYDAŞ SEÇİNİZ</option>
              {paydaslar.map(p => <option key={p.id} value={p.id}>{p.ad}{p.yetkili?` - ${p.yetkili}`:''}{p.tur?` (${p.tur})`:''}</option>)}
            </select>
          </FormGroup>
          {seciliPaydas && (
            <div style={{marginTop:8,padding:10,background:`${C.warning}08`,borderRadius:10,border:`1px solid ${C.warning}22`,display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:32,height:32,borderRadius:8,background:`${C.warning}22`,display:'flex',alignItems:'center',justifyContent:'center'}}><LIcon name="Users" size={18} color={C.warning}/></div>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700}}>{seciliPaydas.ad}</div><div style={{fontSize:9,color:C.textSec}}>{seciliPaydas.yetkili||''} {seciliPaydas.telefon?'• '+seciliPaydas.telefon:''}</div></div>
              <div style={{padding:'6px 12px',background:`${C.warning}18`,borderRadius:8,textAlign:'center'}}><div style={{fontSize:8,color:C.textMuted}}>{form.dosya_turu} DOSYA BASI UCRETI</div><div style={{fontSize:18,fontWeight:900,color:C.warning}}>₺{paydasPrimTutar}</div></div>
            </div>
          )}
        </SecCard>
      )}

      {/* ═══ 4. SİGORTA BİLGİLERİ ═══ */}
      <SecCard icon="Shield" title="SİGORTA BİLGİLERİ" sub="Sigorta ve hasar dosya bilgileri" color="#10b981" badge="ZORUNLU">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <FormGroup label="SİGORTA ŞİRKETİ *">
            <select style={S.select} value={form.sigorta_sirket} onChange={e=>u('sigorta_sirket',e.target.value)}>
              <option value="">SEÇİNİZ</option>{SIGORTA.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="HASAR DOSYA NO *"><input style={S.input} value={form.hasar_no} onChange={e=>u('hasar_no',e.target.value)}/></FormGroup>
          <FormGroup label="SİGORTA BRANŞI">
            <select style={S.select} value={form.sigorta_brans} onChange={e=>u('sigorta_brans',e.target.value)}>
              <option value="">SEÇİNİZ</option><option value="TRAFİK">TRAFİK</option><option value="KASKO">KASKO</option><option value="İMM">İMM</option><option value="DİĞER">DİĞER</option>
            </select>
          </FormGroup>
          <FormGroup label="DOSYA TALEP TÜRÜ">
            <select style={S.select} value={form.talep_turu} onChange={e=>u('talep_turu',e.target.value)}>
              <option value="">SEÇİNİZ</option><option value="DEĞER KAYBI">DEĞER KAYBI</option><option value="BEDENİ HASAR">BEDENİ HASAR</option><option value="MOTOR DEĞER KAYBI">MOTOR DEĞER KAYBI</option><option value="DİĞER">DİĞER</option>
            </select>
          </FormGroup>
          {isADK && <>
            <FormGroup label="EKSPER FİRMASI"><input style={S.input} value={form.eksper_firma||''} onChange={e=>u('eksper_firma',e.target.value)}/></FormGroup>
            <FormGroup label="ONARIM SERVİSİ"><input style={S.input} value={form.onarim_servisi||''} onChange={e=>u('onarim_servisi',e.target.value)}/></FormGroup>
          </>}
          {isBH && <>
            <FormGroup label="POLİÇE NO"><input style={S.input} value={form.police_no} onChange={e=>u('police_no',e.target.value)}/></FormGroup>
            <FormGroup label="SORUMLU SİGORTA"><select style={S.select} value={form.sorumlu_sigorta} onChange={e=>u('sorumlu_sigorta',e.target.value)}><option value="">SEÇİNİZ</option>{SIGORTA.map(s=><option key={s} value={s}>{s}</option>)}</select></FormGroup>
          </>}
        </div>
      </SecCard>

      {/* ═══ 5. ARAÇ BİLGİLERİ (ADK/MDK) ═══ */}
      {isADK && (
        <SecCard icon="Car" title="ARAÇ BİLGİLERİ" sub="Mağdur ve karşı araç tescil bilgileri" color="#3b82f6" badge={form.dosya_turu}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {/* MAĞDUR ARACI */}
            <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden'}}>
              <div style={{padding:'8px 12px',background:`${C.accent}08`,display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${C.border}`}}>
                <div><div style={{fontSize:12,fontWeight:700}}>Mağdur Aracı</div><div style={{fontSize:9,color:C.textMuted}}>Araç Tescil Belgesi</div></div>
                <PlakaInput value={form.ma_plaka} onChange={v=>u('ma_plaka',v)} placeholder="55MR001"/>
              </div>
              <div style={{padding:10,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <FormGroup label="RUHSAT SAHİBİ"><input style={S.input} value={form.ma_ruhsat || form.ad_soyad} onChange={e=>u('ma_ruhsat',e.target.value)}/></FormGroup>
                <FormGroup label="RUHSAT SAHİBİ TC"><input style={S.input} value={form.ma_tc || form.tc_kimlik} onChange={e=>u('ma_tc',e.target.value)} maxLength={11}/></FormGroup>
                <FormGroup label="MARKA"><AracMarkaSelect value={form.ma_marka} onChange={v=>{u('ma_marka',v);u('ma_model','');}}/></FormGroup>
                <FormGroup label="MODEL"><AracModelSelect marka={form.ma_marka} value={form.ma_model} onChange={v=>u('ma_model',v)}/></FormGroup>
                <FormGroup label="MODEL YILI"><select style={S.select} value={form.ma_yil} onChange={e=>u('ma_yil',e.target.value)}><option value="">YIL</option>{Array.from({length:30},(_,i)=>2026-i).map(y=><option key={y} value={y}>{y}</option>)}</select></FormGroup>
                <FormGroup label="BELGE TESCİL NO"><input style={S.input} value={form.ma_belge_tescil} onChange={e=>u('ma_belge_tescil',e.target.value)}/></FormGroup>
                <FormGroup label="ONARIM GÜN SÜRESİ"><input type="number" style={S.input} value={form.ma_onarim_gun} onChange={e=>u('ma_onarim_gun',e.target.value)}/></FormGroup>
                <div/>
                <FormGroup label="GEÇMİŞ HASAR"><Toggle value={form.ma_gecmis_hasar} onSelect={v=>u('ma_gecmis_hasar',v)} options={[{value:'yok',label:'YOK',color:C.success},{value:'var',label:'VAR',color:C.danger}]}/></FormGroup>
                <FormGroup label="KASKO"><Toggle value={form.ma_kasko} onSelect={v=>u('ma_kasko',v)} options={[{value:'0',label:'YOK',color:C.danger},{value:'1',label:'VAR',color:C.success}]}/></FormGroup>
                <FormGroup label="HAK MAHRUMİYET TALEP"><Toggle value={form.hak_mahrumiyet} onSelect={v=>u('hak_mahrumiyet',v)} options={[{value:'0',label:'YOK',color:C.danger},{value:'1',label:'VAR',color:C.success}]}/></FormGroup>
              </div>
            </div>
            {/* KARŞI ARAÇ */}
            <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden'}}>
              <div style={{padding:'8px 12px',background:`${C.danger}08`,display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${C.border}`}}>
                <div><div style={{fontSize:12,fontWeight:700}}>Karşı Araç</div><div style={{fontSize:9,color:C.textMuted}}>Araç Tescil Belgesi</div></div>
                <PlakaInput value={form.ka_plaka} onChange={v=>u('ka_plaka',v)} placeholder="34XX123"/>
              </div>
              <div style={{padding:10,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <FormGroup label="RUHSAT SAHİBİ"><input style={S.input} value={form.ka_ruhsat} onChange={e=>u('ka_ruhsat',e.target.value)}/></FormGroup>
                <FormGroup label="RUHSAT SAHİBİ TC"><input style={S.input} value={form.ka_tc} onChange={e=>u('ka_tc',e.target.value)} maxLength={11}/></FormGroup>
                <FormGroup label="MARKA"><AracMarkaSelect value={form.ka_marka} onChange={v=>u('ka_marka',v)}/></FormGroup>
                <FormGroup label="MODEL"><AracModelSelect marka={form.ka_marka} value={form.ka_model} onChange={v=>u('ka_model',v)}/></FormGroup>
                <FormGroup label="MODEL YILI"><select style={S.select} value={form.ka_yil} onChange={e=>u('ka_yil',e.target.value)}><option value="">YIL</option>{Array.from({length:30},(_,i)=>2026-i).map(y=><option key={y} value={y}>{y}</option>)}</select></FormGroup>
                <FormGroup label="BELGE TESCİL NO"><input style={S.input} value={form.ka_belge_tescil} onChange={e=>u('ka_belge_tescil',e.target.value)}/></FormGroup>
                <FormGroup label="TRAFİK SİGORTA"><select style={S.select} value={form.ka_trafik} onChange={e=>u('ka_trafik',e.target.value)}><option value="">SEÇİNİZ</option>{SIGORTA.map(s=><option key={s} value={s}>{s}</option>)}</select></FormGroup>
                <FormGroup label="POLICE NO"><input style={S.input} value={form.ka_trafik_police} onChange={e=>u('ka_trafik_police',e.target.value)}/></FormGroup>
                <FormGroup label="KASKO"><Toggle value={form.ka_kasko} onSelect={v=>u('ka_kasko',v)} options={[{value:'0',label:'YOK',color:C.danger},{value:'1',label:'VAR',color:C.success}]}/></FormGroup>
                <FormGroup label="RUHSAT SAHİBİ / SÜRÜCÜ"><Toggle value={form.ka_ruhsat_surucu} onSelect={v=>u('ka_ruhsat_surucu',v)} options={[{value:'ayni',label:'AYNI KİŞİ',color:C.accent},{value:'farkli',label:'FARKLI KİŞİ',color:C.warning}]}/></FormGroup>
                {form.ka_ruhsat_surucu === 'farkli' && <>
                  <FormGroup label="SÜRÜCÜ ADI"><input style={S.input} value={form.ka_surucu_ad} onChange={e=>u('ka_surucu_ad',e.target.value)}/></FormGroup>
                  <FormGroup label="SÜRÜCÜ TC"><input style={S.input} value={form.ka_surucu_tc} onChange={e=>u('ka_surucu_tc',e.target.value)} maxLength={11}/></FormGroup>
                </>}
              </div>
            </div>
          </div>
        </SecCard>
      )}

      {/* ═══ 6. BEDENİ HASAR (BH) ═══ */}
      {isBH && (
        <SecCard icon="Heart" title="BEDENİ HASAR BİLGİLERİ" sub="Araç, sürücü ve sakatlık bilgileri" color="#ef4444" badge="BH">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:8}}>ARAÇ BİLGİLERİ</div>
              <div style={{display:'grid',gap:8}}>
                <FormGroup label="PLAKA"><input style={S.input} value={form.bh_arac_plaka} onChange={e=>u('bh_arac_plaka',formatPlaka(e.target.value))}/></FormGroup>
                <FormGroup label="MARKA"><AracMarkaSelect value={form.bh_arac_marka} onChange={v=>u('bh_arac_marka',v)}/></FormGroup>
                <FormGroup label="MODEL YILI"><select style={S.select} value={form.bh_arac_yil} onChange={e=>u('bh_arac_yil',e.target.value)}><option value="">YIL</option>{Array.from({length:30},(_,i)=>2026-i).map(y=><option key={y} value={y}>{y}</option>)}</select></FormGroup>
                <FormGroup label="KASKO"><Toggle value={form.bh_kasko||''} onSelect={v=>u('bh_kasko',v)} options={[{value:'0',label:'YOK',color:C.danger},{value:'1',label:'VAR',color:C.success}]}/></FormGroup>
              </div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:8}}>SÜRÜCÜ BİLGİLERİ</div>
              <div style={{display:'grid',gap:8}}>
                <FormGroup label="SÜRÜCÜ ADI"><input style={S.input} value={form.surucu_ad} onChange={e=>u('surucu_ad',e.target.value)}/></FormGroup>
                <FormGroup label="EHLİYET BİLGİSİ"><input style={S.input} value={form.surucu_ehliyet} onChange={e=>u('surucu_ehliyet',e.target.value)}/></FormGroup>
                <FormGroup label="KUSUR ORANI (%)"><input type="number" style={S.input} value={form.surucu_kusur} onChange={e=>u('surucu_kusur',e.target.value)} placeholder="0-100"/></FormGroup>
              </div>
            </div>
          </div>
          <div style={{marginTop:12}}>
            <FormGroup label="SAKATLIK AÇIKLAMASI"><textarea style={{...S.input,minHeight:50}} value={form.sakatlik_aciklama} onChange={e=>u('sakatlik_aciklama',e.target.value)}/></FormGroup>
          </div>
        </SecCard>
      )}

      {/* ═══ 7. NOTLAR ═══ */}
      <SecCard icon="StickyNote" title="Notlar ve Ekstra Bilgi" sub="Kaza hakkında ek bilgiler, özel durumlar" color="#6b7280" badge="İSTEĞE BAĞLI">
        <FormGroup label="DOSYA NOTLARI">
          <textarea style={{...S.input,minHeight:50}} value={form.notlar} onChange={e=>u('notlar',e.target.value)}/>
        </FormGroup>
      </SecCard>

      {/* ═══ FIXED ACTION BAR ═══ */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:isKoyu?'#1e293b':'#ffffff',borderTop:`1px solid ${C.border}`,padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 -4px 20px rgba(0,0,0,0.1)',zIndex:999}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:200,height:6,borderRadius:3,background:C.border,overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:3,background:progressPct===100?C.success:C.accent,width:progressPct+'%',transition:'width .3s'}}/>
          </div>
          <span style={{fontSize:11,fontWeight:700,color:progressPct===100?C.success:C.textMuted}}>%{progressPct}</span>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={{...S.btn,...S.btnG,fontSize:12,padding:'10px 20px'}} onClick={() => {setForm(p => {const n={...p};Object.keys(n).forEach(k=>n[k]='');n.dosya_turu='ADK';n.haklilik='100';n.hak_mahrumiyet='0';return n;});setError('');}}>
            <LIcon name="RotateCcw" size={14} color={C.textSec}/> SIFIRLA
          </button>
          <button style={{...S.btn,...S.btnS,fontSize:12,padding:'10px 28px',background:'linear-gradient(135deg, #3b82f6, #2563eb)'}} onClick={kaydet} disabled={loading}>
            <LIcon name="Save" size={14} color="#fff"/> {loading ? 'KAYDEDİLİYOR...' : 'DOSYAYI KAYDET'}
          </button>
        </div>
      </div>
    </div>
  );
};
