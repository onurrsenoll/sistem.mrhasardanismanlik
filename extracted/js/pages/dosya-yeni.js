const MR = window.MR || (window.MR = {});
const {useState, useEffect} = React;

MR.DosyaYeniPage = ({setPage, user}) => {
  const {C, S, LIcon, Badge, SectionTitle, FormGroup, api, SIGORTA, ILLER, ILCELER, formatPlaka, AracMarkaSelect, AracModelSelect} = MR;
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [ortaklar, setOrtaklar] = useState([]);
  const [personeller, setPersoneller] = useState([]);
  const [paydaslar, setPaydaslar] = useState([]);
  const [form, setForm] = useState({
    ad_soyad:'', tc_kimlik:'', telefon:'', iban:'', adres:'', il:'', ilce:'',
    dosya_turu:'ADK', kaza_tarihi:'', haklilik:'100', hak_mahrumiyet:'0', meslek:'', komisyon:'',
    ma_plaka:'', ma_marka:'', ma_model:'', ma_yil:'',
    ka_plaka:'', ka_marka:'', ka_yil:'', ka_trafik:'',
    sigorta_sirket:'', hasar_no:'', dosya_kaynak:'', notlar:'', ortak_id:'', sorumlu_id:'', paydas_id:''
  });
  const u = (k, v) => setForm(p => ({...p, [k]: v}));

  const validateStep = (stepNum) => {
    if (stepNum === 0) {
      if (!form.ad_soyad.trim()) return 'MAĞDUR ADI SOYADI GEREKLİ';
      if (!form.tc_kimlik.trim()) return 'T.C. KİMLİK NO GEREKLİ';
      if (!form.telefon.trim()) return 'TELEFON GEREKLİ';
      if (!form.il) return 'İL SEÇİMİ GEREKLİ';
      if (!form.ilce) return 'İLÇE SEÇİMİ GEREKLİ';
    }
    if (stepNum === 1) {
      if (!form.dosya_turu) return 'DOSYA TÜRÜ SEÇİMİ GEREKLİ';
      if (!form.kaza_tarihi) return 'KAZA TARİHİ GEREKLİ';
    }
    if (stepNum === 2 && form.dosya_turu === 'ADK') {
      if (!form.ma_plaka.trim()) return 'MAĞDUR ARACI PLAKASI GEREKLİ';
    }
    // Son adım (ATAMA) - ADK için step 3, BH için step 2
    const sonAdim = form.dosya_turu === 'ADK' ? 3 : 2;
    if (stepNum === sonAdim) {
      if (!form.sigorta_sirket) return 'SİGORTA ŞİRKETİ SEÇİMİ GEREKLİ';
      if (!form.hasar_no.trim()) return 'HASAR DOSYA NO GEREKLİ';
      if (!form.dosya_kaynak) return 'DOSYA KAYNAĞI SEÇİMİ GEREKLİ';
    }
    return null;
  };

  // İŞ ORTAKLARI (AVUKATLAR) LİSTESİNİ YÜKLE
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
  }, []);

  const adkTT = ['TRAFİK SİGORTASI BAŞVURUSU','KASKO BAŞVURUSU','TAHKİM BAŞVURUSU','DAVA YOLU'];
  const bhTT = ['MALULİYET TAZMİNATI','GEÇİCİ İŞ GÖREMEZLİK','DESTEKTEN YOKSUN KALMA','BAKICI GİDERİ','TEDAVİ GİDERLERİ'];
  const steps = form.dosya_turu === 'ADK'
    ? ['MAĞDUR BİLGİLERİ','DOSYA BİLGİSİ','ARAÇ BİLGİLERİ','ATAMA']
    : ['MAĞDUR BİLGİLERİ','DOSYA BİLGİSİ','ATAMA'];

  const kaydet = async () => {
    const eksik = validateStep(steps.length - 1);
    if (eksik) { setError(eksik); return; }
    if (!form.ad_soyad) { setError('MAĞDUR ADI GEREKLİ'); return; }
    setLoading(true); setError('');
    const gonder = {...form};
    if (gonder.ortak_id) gonder.ortak_id = parseInt(gonder.ortak_id);
    else delete gonder.ortak_id;
    if (gonder.sorumlu_id) gonder.sorumlu_id = parseInt(gonder.sorumlu_id);
    else delete gonder.sorumlu_id;
    if (gonder.paydas_id) gonder.paydas_id = parseInt(gonder.paydas_id);
    else delete gonder.paydas_id;
    const r = await api.dosyaCreate(gonder);
    if (r?.success) setResult(r.data);
    else setError(r?.error || 'HATA');
    setLoading(false);
  };

  if (result) return (
    <div style={S.card} className="fade-in">
      <div style={{padding:60,textAlign:'center'}}>
        <div style={{width:80,height:80,borderRadius:'50%',background:`${C.success}22`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
          <LIcon name="Check" size={40} color={C.success}/>
        </div>
        <div style={{fontSize:24,fontWeight:800,color:C.success,marginBottom:8}}>DOSYA OLUŞTURULDU</div>
        <div style={{fontSize:16,color:C.textSec}}>DOSYA NO: <strong style={{color:C.accent}}>{result.dosya_no}</strong></div>
        <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:24}}>
          <button style={{...S.btn,...S.btnP}} onClick={() => setPage('dosya-liste')}>DOSYA LİSTESİ</button>
          <button style={{...S.btn,...S.btnS}} onClick={() => {setResult(null);setStep(0);setForm(p=>({...p,ad_soyad:'',tc_kimlik:'',telefon:''}));}}>YENİ DOSYA</button>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch(step) {
      case 0: return (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="ADI SOYADI *"><input style={S.input} value={form.ad_soyad} onChange={e=>u('ad_soyad',e.target.value)} placeholder="MAĞDUR ADI SOYADI"/></FormGroup>
          <FormGroup label="T.C. KİMLİK NO"><input style={S.input} value={form.tc_kimlik} onChange={e=>u('tc_kimlik',e.target.value)} maxLength={11} placeholder="11 HANELİ TC"/></FormGroup>
          <FormGroup label="TELEFON"><input style={S.input} value={form.telefon} onChange={e=>u('telefon',e.target.value)} placeholder="05XX XXX XXXX"/></FormGroup>
          <FormGroup label="IBAN"><input style={S.input} value={form.iban} onChange={e=>u('iban',e.target.value)} placeholder="TR00 0000 ..."/></FormGroup>
          <FormGroup label="ADRES" full><input style={S.input} value={form.adres} onChange={e=>u('adres',e.target.value)} placeholder="AÇIK ADRES"/></FormGroup>
          <FormGroup label="İL"><select style={S.select} value={form.il} onChange={e=>{u('il',e.target.value);u('ilce','');}}><option value="">SEÇİNİZ</option>{ILLER.map(i=><option key={i} value={i}>{i}</option>)}</select></FormGroup>
          <FormGroup label="İLÇE"><select style={S.select} value={form.ilce} onChange={e=>u('ilce',e.target.value)} disabled={!form.il}><option value="">SEÇİNİZ</option>{(ILCELER[form.il]||[]).map(i=><option key={i} value={i}>{i}</option>)}</select></FormGroup>
        </div>
      );
      case 1: return (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="DOSYA TÜRÜ *">
            <select style={S.select} value={form.dosya_turu} onChange={e=>u('dosya_turu',e.target.value)}>
              <option value="ADK">ARAÇ DEĞER KAYBI (ADK)</option>
              <option value="BH">BEDENİ HASAR</option>
            </select>
          </FormGroup>
          <FormGroup label="KAZA TARİHİ"><input type="date" style={S.input} value={form.kaza_tarihi} onChange={e=>u('kaza_tarihi',e.target.value)}/></FormGroup>
          <FormGroup label="HAKLILIK ORANI">
            <select style={S.select} value={form.haklilik} onChange={e=>u('haklilik',e.target.value)}>
              <option value="100">%100</option><option value="75">%75</option><option value="50">%50</option><option value="25">%25</option>
            </select>
          </FormGroup>
          <FormGroup label="MESLEK"><input style={S.input} value={form.meslek} onChange={e=>u('meslek',e.target.value)} placeholder="MESLEK"/></FormGroup>
          <FormGroup label="KOMİSYON (%)"><input type="number" style={S.input} value={form.komisyon} onChange={e=>u('komisyon',e.target.value)} placeholder="20"/></FormGroup>
          <FormGroup label="HAK MAHRUMİYET TALEP">
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <div onClick={() => u('hak_mahrumiyet','1')}
                style={{padding:'8px 20px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',
                  background:form.hak_mahrumiyet==='1'?`${C.success}22`:'transparent',
                  color:form.hak_mahrumiyet==='1'?C.success:C.textMuted,
                  border:`1px solid ${form.hak_mahrumiyet==='1'?C.success+'66':C.border}`}}>VAR</div>
              <div onClick={() => u('hak_mahrumiyet','0')}
                style={{padding:'8px 20px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',
                  background:form.hak_mahrumiyet!=='1'?`${C.danger}22`:'transparent',
                  color:form.hak_mahrumiyet!=='1'?C.danger:C.textMuted,
                  border:`1px solid ${form.hak_mahrumiyet!=='1'?C.danger+'66':C.border}`}}>YOK</div>
            </div>
          </FormGroup>
        </div>
      );
      case 2:
        if (form.dosya_turu === 'ADK') return (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <div style={S.card}>
              <div style={{...S.cardHead,background:`${C.accent}11`}}>
                <LIcon name="Car" size={16} color={C.accent}/><span style={{fontWeight:700,fontSize:13}}>MAĞDUR ARACI</span>
              </div>
              <div style={{padding:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <FormGroup label="PLAKA *"><input style={S.input} value={form.ma_plaka} onChange={e=>u('ma_plaka',formatPlaka(e.target.value))} placeholder="55MR001"/></FormGroup>
                <FormGroup label="MARKA">
                  <AracMarkaSelect value={form.ma_marka} onChange={v=>{u('ma_marka',v);u('ma_model','');}}/>
                </FormGroup>
                <FormGroup label="MODEL / PAKET">
                  <AracModelSelect marka={form.ma_marka} value={form.ma_model} onChange={v=>u('ma_model',v)}/>
                </FormGroup>
                <FormGroup label="MODEL YILI">
                  <select style={S.select} value={form.ma_yil} onChange={e=>u('ma_yil',e.target.value)}>
                    <option value="">SEÇİNİZ</option>{Array.from({length:30},(_,i)=>2026-i).map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </FormGroup>
              </div>
            </div>
            <div style={S.card}>
              <div style={{...S.cardHead,background:`${C.danger}11`}}>
                <LIcon name="Car" size={16} color={C.danger}/><span style={{fontWeight:700,fontSize:13}}>KARŞI ARAÇ</span>
              </div>
              <div style={{padding:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <FormGroup label="PLAKA"><input style={S.input} value={form.ka_plaka} onChange={e=>u('ka_plaka',formatPlaka(e.target.value))} placeholder="34XX123"/></FormGroup>
                <FormGroup label="TRAFİK SİGORTASI">
                  <select style={S.select} value={form.ka_trafik} onChange={e=>u('ka_trafik',e.target.value)}>
                    <option value="">SEÇİNİZ</option>{SIGORTA.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </FormGroup>
                <FormGroup label="MARKA">
                  <AracMarkaSelect value={form.ka_marka} onChange={v=>u('ka_marka',v)}/>
                </FormGroup>
                <FormGroup label="MODEL YILI">
                  <select style={S.select} value={form.ka_yil} onChange={e=>u('ka_yil',e.target.value)}>
                    <option value="">SEÇİNİZ</option>{Array.from({length:30},(_,i)=>2026-i).map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </FormGroup>
              </div>
            </div>
          </div>
        );
        // BH falls through to default
      default: {
        const seciliOrtak = ortaklar.find(o => String(o.id) === String(form.ortak_id));
        /* DOSYA KAYNAĞI'NA GÖRE PERSONEL FİLTRELE */
        const isYonlendiren = form.dosya_kaynak === 'YÖNLENDİREN';
        const filtreliPersonel = personeller.filter(p => {
          if (!form.dosya_kaynak || isYonlendiren) return false;
          if (form.dosya_kaynak === 'OFİS CRM') return (p.departman || '').toUpperCase() === 'OFİS';
          if (form.dosya_kaynak === 'SAHA PERSONEL') return (p.departman || '').toUpperCase() === 'SAHA';
          return false;
        });
        const seciliSorumlu = personeller.find(p => String(p.id) === String(form.sorumlu_id));
        const seciliPaydas = paydaslar.find(p => String(p.id) === String(form.paydas_id));
        return (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <FormGroup label="SİGORTA ŞİRKETİ">
              <select style={S.select} value={form.sigorta_sirket} onChange={e=>u('sigorta_sirket',e.target.value)}>
                <option value="">SEÇİNİZ</option>{SIGORTA.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="HASAR DOSYA NO">
              <input style={S.input} value={form.hasar_no} onChange={e=>u('hasar_no',e.target.value)} placeholder="HASAR DOSYA NO GİRİNİZ"/>
            </FormGroup>
            <FormGroup label="DOSYA KAYNAĞI">
              <select style={S.select} value={form.dosya_kaynak} onChange={e=>{u('dosya_kaynak',e.target.value);u('sorumlu_id','');u('paydas_id','');}}>
                <option value="">SEÇİNİZ</option>
                <option value="OFİS CRM">OFİS CRM</option>
                <option value="YÖNLENDİREN">YÖNLENDİREN</option>
                <option value="SAHA PERSONEL">SAHA PERSONEL</option>
              </select>
            </FormGroup>
            {/* DOSYA SORUMLUSU - OFİS CRM / SAHA PERSONEL İÇİN */}
            {form.dosya_kaynak && !isYonlendiren && (
              <FormGroup label="DOSYA SORUMLUSU">
                <select style={{...S.select,fontWeight:600}} value={form.sorumlu_id} onChange={e=>u('sorumlu_id',e.target.value)}>
                  <option value="">SORUMLU SEÇİNİZ</option>
                  {filtreliPersonel.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.ad_soyad}{p.pozisyon ? ` - ${p.pozisyon}` : ''}{p.departman ? ` (${p.departman})` : ''}
                    </option>
                  ))}
                </select>
              </FormGroup>
            )}
            {/* SEÇİLİ SORUMLU BİLGİ KARTI */}
            {seciliSorumlu && !isYonlendiren && (
              <div style={{gridColumn:'1 / -1',padding:14,background:`${C.accent}11`,borderRadius:10,border:`1px solid ${C.accent}33`,display:'flex',alignItems:'center',gap:16}}>
                <div style={{width:44,height:44,borderRadius:10,background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <LIcon name="UserCheck" size={20} color={C.accent}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.text}}>{seciliSorumlu.ad_soyad}</div>
                  <div style={{fontSize:10,color:C.textSec,marginTop:2}}>
                    {seciliSorumlu.departman ? `${seciliSorumlu.departman}` : ''}{seciliSorumlu.pozisyon ? ` • ${seciliSorumlu.pozisyon}` : ''}
                  </div>
                </div>
                <div style={{textAlign:'center',padding:'8px 16px',background:`${C.accent}22`,borderRadius:8}}>
                  <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>KAYNAK</div>
                  <div style={{fontSize:12,fontWeight:800,color:C.accent}}>{form.dosya_kaynak}</div>
                </div>
              </div>
            )}
            {seciliSorumlu && !isYonlendiren && (parseFloat(form.dosya_turu === 'BH' ? seciliSorumlu.prim_bh : seciliSorumlu.prim_adk) > 0) && (
              <div style={{gridColumn:'1 / -1',padding:12,background:`${C.success}11`,borderRadius:10,border:`1px solid ${C.success}33`,display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:36,height:36,borderRadius:8,background:`${C.success}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <LIcon name="Banknote" size={18} color={C.success}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:C.textMuted,fontWeight:600}}>OTOMATİK DOSYA PRİMİ</div>
                  <div style={{fontSize:11,color:C.textSec,marginTop:2}}>DOSYA AÇILDIĞINDA <strong>{seciliSorumlu.ad_soyad}</strong> İÇİN OTOMATİK OLARAK MASRAF VE HAKEDİŞ KAYDEDİLECEKTİR</div>
                </div>
                <div style={{textAlign:'center',padding:'8px 16px',background:`${C.success}22`,borderRadius:8}}>
                  <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>{form.dosya_turu} PRİMİ</div>
                  <div style={{fontSize:20,fontWeight:900,color:C.success}}>₺{form.dosya_turu === 'BH' ? seciliSorumlu.prim_bh || 0 : seciliSorumlu.prim_adk || 0}</div>
                </div>
              </div>
            )}
            {/* YÖNLENDİREN SEÇİMİ - İŞ PAYDAŞLARI */}
            {isYonlendiren && (
              <FormGroup label="YÖNLENDİREN (İŞ PAYDAŞI)">
                <select style={{...S.select,fontWeight:600}} value={form.paydas_id} onChange={e=>u('paydas_id',e.target.value)}>
                  <option value="">PAYDAŞ SEÇİNİZ</option>
                  {paydaslar.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.ad}{p.yetkili ? ` - ${p.yetkili}` : ''}{p.tur ? ` (${p.tur})` : ''}
                    </option>
                  ))}
                </select>
              </FormGroup>
            )}
            {/* SEÇİLİ PAYDAŞ BİLGİ KARTI */}
            {isYonlendiren && seciliPaydas && (
              <div style={{gridColumn:'1 / -1',padding:14,background:`${C.gold}11`,borderRadius:10,border:`1px solid ${C.gold}33`,display:'flex',alignItems:'center',gap:16}}>
                <div style={{width:44,height:44,borderRadius:10,background:`${C.gold}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <LIcon name="Users" size={20} color={C.gold}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.text}}>{seciliPaydas.ad}</div>
                  <div style={{fontSize:10,color:C.textSec,marginTop:2}}>
                    {seciliPaydas.yetkili ? `${seciliPaydas.yetkili}` : ''}{seciliPaydas.telefon ? ` • ${seciliPaydas.telefon}` : ''}{seciliPaydas.tur ? ` • ${seciliPaydas.tur}` : ''}
                  </div>
                </div>
                <div style={{textAlign:'center',padding:'8px 16px',background:`${C.gold}22`,borderRadius:8}}>
                  <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>{form.dosya_turu} PRİMİ</div>
                  <div style={{fontSize:22,fontWeight:900,color:C.gold}}>₺{form.dosya_turu === 'BH' ? seciliPaydas.prim_bh || 0 : seciliPaydas.prim_adk || 0}</div>
                </div>
              </div>
            )}
            {isYonlendiren && seciliPaydas && (parseFloat(form.dosya_turu === 'BH' ? seciliPaydas.prim_bh : seciliPaydas.prim_adk) > 0) && (
              <div style={{gridColumn:'1 / -1',padding:12,background:`${C.success}11`,borderRadius:10,border:`1px solid ${C.success}33`,display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:36,height:36,borderRadius:8,background:`${C.success}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <LIcon name="Banknote" size={18} color={C.success}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:C.textMuted,fontWeight:600}}>OTOMATİK DOSYA PRİMİ</div>
                  <div style={{fontSize:11,color:C.textSec,marginTop:2}}>DOSYA AÇILDIĞINDA <strong>{seciliPaydas.ad}</strong> İÇİN OTOMATİK OLARAK MASRAF VE KOMİSYON KAYDEDİLECEKTİR</div>
                </div>
                <div style={{textAlign:'center',padding:'8px 16px',background:`${C.success}22`,borderRadius:8}}>
                  <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>{form.dosya_turu} PRİMİ</div>
                  <div style={{fontSize:20,fontWeight:900,color:C.success}}>₺{form.dosya_turu === 'BH' ? seciliPaydas.prim_bh || 0 : seciliPaydas.prim_adk || 0}</div>
                </div>
              </div>
            )}
            {/* AVUKAT SEÇİMİ */}
            <FormGroup label="AVUKAT (İŞ ORTAĞI)" full>
              <select style={{...S.select,fontWeight:600}} value={form.ortak_id} onChange={e=>u('ortak_id',e.target.value)}>
                <option value="">AVUKAT SEÇİNİZ</option>
                {ortaklar.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.ad_soyad}{o.firma ? ` - ${o.firma}` : ''}{o.baro ? ` (${o.baro})` : ''} — ÖDEME ORANI: %{o.odeme_orani || 0}
                  </option>
                ))}
              </select>
            </FormGroup>
            {/* SEÇİLİ AVUKAT BİLGİ KARTI */}
            {seciliOrtak && (
              <div style={{gridColumn:'1 / -1',padding:14,background:`${C.purple}11`,borderRadius:10,border:`1px solid ${C.purple}33`,display:'flex',alignItems:'center',gap:16}}>
                <div style={{width:44,height:44,borderRadius:10,background:`${C.purple}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <LIcon name="Scale" size={20} color={C.purple}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.text}}>{seciliOrtak.ad_soyad}</div>
                  <div style={{fontSize:10,color:C.textSec,marginTop:2}}>
                    {seciliOrtak.firma ? `${seciliOrtak.firma} • ` : ''}{seciliOrtak.baro || ''}{seciliOrtak.sicil_no ? ` • SİCİL: ${seciliOrtak.sicil_no}` : ''}
                  </div>
                </div>
                <div style={{textAlign:'center',padding:'8px 16px',background:`${C.purple}22`,borderRadius:8}}>
                  <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>ÖDEME ORANI</div>
                  <div style={{fontSize:22,fontWeight:900,color:C.purple}}>%{seciliOrtak.odeme_orani || 0}</div>
                </div>
              </div>
            )}
            <FormGroup label="NOTLAR" full>
              <textarea style={{...S.input,minHeight:70}} value={form.notlar} onChange={e=>u('notlar',e.target.value)} placeholder="DOSYA İLE İLGİLİ NOTLAR..."/>
            </FormGroup>
          </div>
        );
      }
    }
  };

  return (
    <div style={S.card} className="fade-in">
      <SectionTitle icon="Plus" title="YENİ DOSYA OLUŞTUR" sub="KADEMELİ BİLGİ GİRİŞİ"/>
      <div style={S.cardBody}>
        {error && <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger}}>{error}</div>}
        <div style={{display:'flex',gap:4,marginBottom:24}}>
          {steps.map((s, i) => (
            <div key={i} style={{flex:1,textAlign:'center'}}>
              <div style={{display:'flex',alignItems:'center'}}>
                {i > 0 && <div style={{flex:1,height:2,background:i<=step?C.accent:C.border}}/>}
                <div style={{width:32,height:32,borderRadius:'50%',background:i<=step?C.accent:C.border,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>
                  {i < step ? '✓' : i+1}
                </div>
                {i < steps.length-1 && <div style={{flex:1,height:2,background:i<step?C.accent:C.border}}/>}
              </div>
              <div style={{fontSize:10,marginTop:6,color:i<=step?C.text:C.textMuted,fontWeight:i===step?700:400}}>{s}</div>
            </div>
          ))}
        </div>
        {renderStep()}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:24}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setStep(Math.max(0,step-1))} disabled={step===0}>
            <LIcon name="ArrowLeft" size={14}/> GERİ
          </button>
          {step < steps.length-1
            ? <button style={{...S.btn,...S.btnP}} onClick={() => {
                const eksik = validateStep(step);
                if (eksik) { setError(eksik); return; }
                setError('');
                setStep(step+1);
              }}>İLERİ <LIcon name="ArrowRight" size={14} color="#fff"/></button>
            : <button style={{...S.btn,...S.btnS}} onClick={() => {
                const eksik = validateStep(step);
                if (eksik) { setError(eksik); return; }
                setError('');
                kaydet();
              }} disabled={loading}>
                <LIcon name="Save" size={14} color="#fff"/> {loading ? 'KAYDEDİLİYOR...' : 'DOSYAYI KAYDET'}
              </button>
          }
        </div>
      </div>
    </div>
  );
};
