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
    ad_soyad:'', tc_kimlik:'', telefon:'', iban:'', adres:'', il:'', ilce:'',
    // Dosya bilgileri
    dosya_turu:'ADK', kaza_tarihi:'', haklilik:'100', hak_mahrumiyet:'0', meslek:'', komisyon:'',
    dosya_kaynak:'', sorumlu_id:'', ortak_id:'', paydas_id:'', noter_vekalet:'',
    sakatlik_aciklama:'',
    // Sigorta bilgileri
    sigorta_sirket:'', hasar_no:'', police_no:'', sorumlu_sigorta:'',
    // ADK araç bilgileri - mağdur
    ma_plaka:'', ma_marka:'', ma_model:'', ma_yil:'',
    ma_ruhsat:'', ma_tc:'', ma_belge_tescil:'', ma_onarim_gun:'', ma_gecmis_hasar:'',
    // ADK araç bilgileri - karşı
    ka_plaka:'', ka_marka:'', ka_yil:'', ka_trafik:'',
    ka_ruhsat:'', ka_tc:'', ka_model:'', ka_belge_tescil:'', ka_trafik_police:'',
    ka_kasko:'', ka_ruhsat_surucu:'', ka_surucu_ad:'', ka_surucu_tc:'',
    // BH araç & sürücü bilgileri
    bh_arac_plaka:'', bh_arac_marka:'', bh_arac_yil:'',
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

  // Ana form
  return (
    <div style={{maxWidth:'50vw',minWidth:600,margin:'0 auto'}} className="fade-in">
      <div style={S.card}>
        <SectionTitle icon="FilePlus" title="YENİ DOSYA OLUŞTUR" sub="TEK SAYFADA TÜM BİLGİLERİ GİRİN"/>
        <div style={S.cardBody}>
          {error && (
            <div style={{padding:12,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
              <LIcon name="AlertTriangle" size={14}/>{error}
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>

            {/* ═══ MAĞDUR BİLGİLERİ ═══ */}
            <SecHead icon="User" title="MAĞDUR BİLGİLERİ"/>
            <FormGroup label="ADI SOYADI *"><input style={S.input} value={form.ad_soyad} onChange={e=>u('ad_soyad',e.target.value)} placeholder="MAĞDUR ADI SOYADI"/></FormGroup>
            <FormGroup label="T.C. KİMLİK NO *"><input style={S.input} value={form.tc_kimlik} onChange={e=>u('tc_kimlik',e.target.value)} maxLength={11} placeholder="11 HANELİ TC"/></FormGroup>
            <FormGroup label="TELEFON *"><input style={S.input} value={form.telefon} onChange={e=>u('telefon',e.target.value)} placeholder="05XX XXX XXXX"/></FormGroup>
            <FormGroup label="IBAN"><IBANInput value={form.iban} onChange={v=>u('iban',v)}/></FormGroup>
            <FormGroup label="ADRES" full><input style={S.input} value={form.adres} onChange={e=>u('adres',e.target.value)} placeholder="AÇIK ADRES"/></FormGroup>
            <FormGroup label="İL *"><select style={S.select} value={form.il} onChange={e=>{u('il',e.target.value);u('ilce','');}}><option value="">SEÇİNİZ</option>{ILLER.map(i=><option key={i} value={i}>{i}</option>)}</select></FormGroup>
            <FormGroup label="İLÇE *"><select style={S.select} value={form.ilce} onChange={e=>u('ilce',e.target.value)} disabled={!form.il}><option value="">SEÇİNİZ</option>{(ILCELER[form.il]||[]).map(i=><option key={i} value={i}>{i}</option>)}</select></FormGroup>

            {/* ═══ DOSYA BİLGİLERİ ═══ */}
            <SecHead icon="FileText" title="DOSYA BİLGİLERİ"/>
            <FormGroup label="DOSYA TÜRÜ *">
              <select style={S.select} value={form.dosya_turu} onChange={e=>u('dosya_turu',e.target.value)}>
                <option value="ADK">ARAÇ DEĞER KAYBI (ADK)</option>
                <option value="BH">BEDENİ HASAR (BH)</option>
                <option value="MDK">MOTOR DEĞER KAYBI (MDK)</option>
              </select>
            </FormGroup>
            <FormGroup label="KAZA TARİHİ *"><DateInput value={form.kaza_tarihi} onChange={v=>u('kaza_tarihi',v)}/></FormGroup>
            <FormGroup label="KOMİSYON (%) *"><input type="number" style={S.input} value={form.komisyon} onChange={e=>u('komisyon',e.target.value)} placeholder="20"/></FormGroup>
            <FormGroup label="NOTER VEKALET (TL) *"><input type="number" style={S.input} value={form.noter_vekalet} onChange={e=>u('noter_vekalet',e.target.value)} placeholder="1596"/></FormGroup>
            <FormGroup label="DOSYA KAYNAĞI *">
              <select style={S.select} value={form.dosya_kaynak} onChange={e=>{u('dosya_kaynak',e.target.value);u('paydas_id','');}}>
                <option value="">SEÇİNİZ</option>
                <option value="OFİS CRM">OFİS CRM</option>
                <option value="PAYDAŞ/YÖNLENDİREN">PAYDAŞ / YÖNLENDİREN</option>
              </select>
            </FormGroup>
            <FormGroup label="DOSYA SORUMLUSU *">
              <select style={{...S.select,fontWeight:600}} value={form.sorumlu_id} onChange={e=>u('sorumlu_id',e.target.value)}>
                <option value="">SORUMLU SEÇİNİZ</option>
                {personeller.length > 0 && personeller.map(p => (
                  <option key={'p-'+p.id} value={p.user_id || p.id}>
                    {p.ad_soyad}{p.pozisyon ? ` - ${p.pozisyon}` : ''}{p.departman ? ` (${p.departman})` : ''}
                  </option>
                ))}
                {personeller.length === 0 && kullanicilar.map(k => (
                  <option key={'k-'+k.id} value={k.id}>
                    {k.ad_soyad}{k.rol ? ` (${k.rol.toUpperCase()})` : ''}
                  </option>
                ))}
              </select>
            </FormGroup>
            <FormGroup label="AVUKAT (İŞ ORTAĞI)">
              <select style={{...S.select,fontWeight:600}} value={form.ortak_id} onChange={e=>u('ortak_id',e.target.value)}>
                <option value="">AVUKAT SEÇİNİZ</option>
                {ortaklar.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.ad_soyad}{o.firma ? ` - ${o.firma}` : ''}{o.baro ? ` (${o.baro})` : ''} — %{o.odeme_orani || 0}
                  </option>
                ))}
              </select>
            </FormGroup>
            <FormGroup label="HAKLILIK ORANI *">
              <select style={S.select} value={form.haklilik} onChange={e=>u('haklilik',e.target.value)}>
                <option value="100">%100</option><option value="75">%75</option><option value="50">%50</option><option value="25">%25</option>
              </select>
            </FormGroup>
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
            <FormGroup label="MESLEK"><input style={S.input} value={form.meslek} onChange={e=>u('meslek',e.target.value)} placeholder="MESLEK"/></FormGroup>
            {isBH && (
              <FormGroup label="SAKATLIK AÇIKLAMA"><input style={S.input} value={form.sakatlik_aciklama} onChange={e=>u('sakatlik_aciklama',e.target.value)} placeholder="SAKATLIK DURUMU AÇIKLAMASI"/></FormGroup>
            )}

            {/* SEÇİLİ SORUMLU BİLGİ KARTI */}
            {seciliSorumlu && (
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
                {(parseFloat(isBH ? seciliSorumlu.prim_bh : seciliSorumlu.prim_adk) > 0) && (
                  <div style={{textAlign:'center',padding:'8px 16px',background:`${C.success}22`,borderRadius:8}}>
                    <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>{form.dosya_turu} PRİMİ (HAKEDİŞ)</div>
                    <div style={{fontSize:18,fontWeight:900,color:C.success}}>₺{isBH ? seciliSorumlu.prim_bh || 0 : seciliSorumlu.prim_adk || 0}</div>
                  </div>
                )}
              </div>
            )}

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

            {/* ═══ PAYDAŞ SEÇİMİ (KAYNAK PAYDAŞ İSE) ═══ */}
            {isPaydas && (
              <>
                <SecHead icon="Handshake" title="PAYDAŞ / YÖNLENDİREN"/>
                <FormGroup label="YÖNLENDİREN (İŞ PAYDAŞI) *" full>
                  <select style={{...S.select,fontWeight:600}} value={form.paydas_id} onChange={e=>u('paydas_id',e.target.value)}>
                    <option value="">PAYDAŞ SEÇİNİZ</option>
                    {paydaslar.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.ad}{p.yetkili ? ` - ${p.yetkili}` : ''}{p.tur ? ` (${p.tur})` : ''}
                      </option>
                    ))}
                  </select>
                </FormGroup>
                {seciliPaydas && (
                  <div style={{gridColumn:'1 / -1',padding:14,background:`${C.gold || C.warning}11`,borderRadius:10,border:`1px solid ${C.gold || C.warning}33`,display:'flex',alignItems:'center',gap:16}}>
                    <div style={{width:44,height:44,borderRadius:10,background:`${C.gold || C.warning}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <LIcon name="Users" size={20} color={C.gold || C.warning}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:800,color:C.text}}>{seciliPaydas.ad}</div>
                      <div style={{fontSize:10,color:C.textSec,marginTop:2}}>
                        {seciliPaydas.yetkili ? `${seciliPaydas.yetkili}` : ''}{seciliPaydas.telefon ? ` • ${seciliPaydas.telefon}` : ''}{seciliPaydas.tur ? ` • ${seciliPaydas.tur}` : ''}
                      </div>
                    </div>
                    <div style={{textAlign:'center',padding:'8px 16px',background:`${C.gold || C.warning}22`,borderRadius:8}}>
                      <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>{form.dosya_turu} DOSYA BAŞI ÜCRETİ</div>
                      <div style={{fontSize:22,fontWeight:900,color:C.gold || C.warning}}>₺{paydasPrimTutar}</div>
                    </div>
                  </div>
                )}
                {seciliPaydas && paydasPrimTutar > 0 && (
                  <div style={{gridColumn:'1 / -1',padding:12,background:`${C.success}11`,borderRadius:10,border:`1px solid ${C.success}33`,display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:36,height:36,borderRadius:8,background:`${C.success}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <LIcon name="Banknote" size={18} color={C.success}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:C.textMuted,fontWeight:600}}>OTOMATİK İŞLEMLER</div>
                      <div style={{fontSize:11,color:C.textSec,marginTop:2}}>
                        DOSYA AÇILDIĞINDA <strong>{seciliPaydas.ad}</strong> İÇİN:<br/>
                        • CARİSİNE <strong>₺{paydasPrimTutar}</strong> ALACAK OLARAK YAZILACAK (ÖDENMEDİ)<br/>
                        • DOSYA MASRAFLARINA <strong>YÖNLENDİREN ÜCRETİ</strong> OLARAK EKLENECEK (ÖDENMEDİ)
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ═══ SİGORTA BİLGİLERİ ═══ */}
            <SecHead icon="Shield" title="SİGORTA BİLGİLERİ"/>
            <FormGroup label="SİGORTA ŞİRKETİ *">
              <select style={S.select} value={form.sigorta_sirket} onChange={e=>u('sigorta_sirket',e.target.value)}>
                <option value="">SEÇİNİZ</option>{SIGORTA.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="HASAR DOSYA NO *">
              <input style={S.input} value={form.hasar_no} onChange={e=>u('hasar_no',e.target.value)} placeholder="HASAR DOSYA NO GİRİNİZ"/>
            </FormGroup>
            {isBH && (
              <>
                <FormGroup label="POLİÇE NO"><input style={S.input} value={form.police_no} onChange={e=>u('police_no',e.target.value)} placeholder="POLİÇE NUMARASI"/></FormGroup>
                <FormGroup label="SORUMLU SİGORTA ŞİRKETİ">
                  <select style={S.select} value={form.sorumlu_sigorta} onChange={e=>u('sorumlu_sigorta',e.target.value)}>
                    <option value="">SEÇİNİZ</option>{SIGORTA.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </FormGroup>
              </>
            )}

            {/* ═══ ARAÇ BİLGİLERİ (ADK) ═══ */}
            {isADK && (
              <>
                <SecHead icon="Car" title="ARAÇ BİLGİLERİ"/>
                <div style={{gridColumn:'1 / -1',display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <div style={S.card}>
                    <div style={{...S.cardHead,background:`${C.accent}11`,padding:'10px 16px'}}>
                      <LIcon name="Car" size={16} color={C.accent}/><span style={{fontWeight:700,fontSize:13,marginLeft:8}}>MAĞDUR ARACI</span>
                      {form.ma_plaka && <span style={{fontWeight:800,fontSize:13,marginLeft:'auto',fontFamily:'monospace',color:C.accent}}>{form.ma_plaka}</span>}
                    </div>
                    <div style={{padding:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                      <FormGroup label="PLAKA *"><input style={S.input} value={form.ma_plaka} onChange={e=>u('ma_plaka',formatPlaka(e.target.value))} placeholder="55MR001"/></FormGroup>
                      <FormGroup label="ARAÇ SAHİBİ ADI SOYADI"><input style={S.input} value={form.ma_ruhsat} onChange={e=>u('ma_ruhsat',e.target.value)} placeholder="ARAÇ SAHİBİ"/></FormGroup>
                      <FormGroup label="ARAÇ SAHİBİ TC KİMLİK"><input style={S.input} value={form.ma_tc} onChange={e=>u('ma_tc',e.target.value)} placeholder="TC KİMLİK NO" maxLength={11}/></FormGroup>
                      <FormGroup label="MARKA"><AracMarkaSelect value={form.ma_marka} onChange={v=>{u('ma_marka',v);u('ma_model','');}}/></FormGroup>
                      <FormGroup label="MODEL / PAKET"><AracModelSelect marka={form.ma_marka} value={form.ma_model} onChange={v=>u('ma_model',v)}/></FormGroup>
                      <FormGroup label="MODEL YILI">
                        <select style={S.select} value={form.ma_yil} onChange={e=>u('ma_yil',e.target.value)}>
                          <option value="">SEÇİNİZ</option>{Array.from({length:30},(_,i)=>2026-i).map(y=><option key={y} value={y}>{y}</option>)}
                        </select>
                      </FormGroup>
                      <FormGroup label="BELGE TESCİL NO"><input style={S.input} value={form.ma_belge_tescil} onChange={e=>u('ma_belge_tescil',e.target.value)} placeholder="BELGE TESCİL NO"/></FormGroup>
                      <FormGroup label="ONARIM GÜN SÜRESİ"><input type="number" min="0" style={S.input} value={form.ma_onarim_gun} onChange={e=>u('ma_onarim_gun',e.target.value)} placeholder="GÜN"/></FormGroup>
                      <FormGroup label="GEÇMİŞ HASAR">
                        <select style={S.select} value={form.ma_gecmis_hasar} onChange={e=>u('ma_gecmis_hasar',e.target.value)}>
                          <option value="">SEÇİNİZ</option><option value="var">VAR</option><option value="yok">YOK</option>
                        </select>
                      </FormGroup>
                    </div>
                  </div>
                  <div style={S.card}>
                    <div style={{...S.cardHead,background:`${C.danger}11`,padding:'10px 16px'}}>
                      <LIcon name="Car" size={16} color={C.danger}/><span style={{fontWeight:700,fontSize:13,marginLeft:8}}>KARŞI ARAÇ</span>
                      {form.ka_plaka && <span style={{fontWeight:800,fontSize:13,marginLeft:'auto',fontFamily:'monospace',color:C.danger}}>{form.ka_plaka}</span>}
                    </div>
                    <div style={{padding:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                      <FormGroup label="PLAKA"><input style={S.input} value={form.ka_plaka} onChange={e=>u('ka_plaka',formatPlaka(e.target.value))} placeholder="34XX123"/></FormGroup>
                      <FormGroup label="ARAÇ SAHİBİ ADI SOYADI"><input style={S.input} value={form.ka_ruhsat} onChange={e=>u('ka_ruhsat',e.target.value)} placeholder="ARAÇ SAHİBİ"/></FormGroup>
                      <FormGroup label="ARAÇ SAHİBİ TC KİMLİK"><input style={S.input} value={form.ka_tc} onChange={e=>u('ka_tc',e.target.value)} placeholder="TC KİMLİK NO" maxLength={11}/></FormGroup>
                      <FormGroup label="MARKA"><AracMarkaSelect value={form.ka_marka} onChange={v=>u('ka_marka',v)}/></FormGroup>
                      <FormGroup label="MODEL / PAKET">
                        <AracModelSelect marka={form.ka_marka} value={form.ka_model} onChange={v=>u('ka_model',v)}/>
                      </FormGroup>
                      <FormGroup label="MODEL YILI">
                        <select style={S.select} value={form.ka_yil} onChange={e=>u('ka_yil',e.target.value)}>
                          <option value="">SEÇİNİZ</option>{Array.from({length:30},(_,i)=>2026-i).map(y=><option key={y} value={y}>{y}</option>)}
                        </select>
                      </FormGroup>
                      <FormGroup label="BELGE TESCİL NO"><input style={S.input} value={form.ka_belge_tescil} onChange={e=>u('ka_belge_tescil',e.target.value)} placeholder="BELGE TESCİL NO"/></FormGroup>
                      <FormGroup label="TRAFİK SİGORTA ŞİRKETİ">
                        <select style={S.select} value={form.ka_trafik} onChange={e=>u('ka_trafik',e.target.value)}>
                          <option value="">SEÇİNİZ</option>{SIGORTA.map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                      </FormGroup>
                      <FormGroup label="POLİÇE NO"><input style={S.input} value={form.ka_trafik_police} onChange={e=>u('ka_trafik_police',e.target.value)} placeholder="POLİÇE NUMARASI"/></FormGroup>
                      <FormGroup label="KASKO">
                        <select style={S.select} value={form.ka_kasko} onChange={e=>u('ka_kasko',e.target.value)}>
                          <option value="">SEÇİNİZ</option><option value="1">VAR</option><option value="0">YOK</option>
                        </select>
                      </FormGroup>
                      <FormGroup label="RUHSAT SAHİBİ / SÜRÜCÜ">
                        <select style={S.select} value={form.ka_ruhsat_surucu} onChange={e=>u('ka_ruhsat_surucu',e.target.value)}>
                          <option value="">SEÇİNİZ</option><option value="ayni">AYNI</option><option value="farkli">FARKLI</option>
                        </select>
                      </FormGroup>
                      {form.ka_ruhsat_surucu === 'farkli' && (
                        <>
                          <FormGroup label="SÜRÜCÜ ADI SOYADI"><input style={S.input} value={form.ka_surucu_ad} onChange={e=>u('ka_surucu_ad',e.target.value)} placeholder="SÜRÜCÜ ADI SOYADI"/></FormGroup>
                          <FormGroup label="SÜRÜCÜ TC KİMLİK"><input style={S.input} value={form.ka_surucu_tc} onChange={e=>u('ka_surucu_tc',e.target.value)} placeholder="TC KİMLİK NO" maxLength={11}/></FormGroup>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ═══ ARAÇ & SÜRÜCÜ BİLGİLERİ (BH) ═══ */}
            {isBH && (
              <>
                <SecHead icon="Car" title="ARAÇ & SÜRÜCÜ BİLGİLERİ"/>
                <div style={{gridColumn:'1 / -1',display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <div style={S.card}>
                    <div style={{...S.cardHead,background:`${C.accent}11`,padding:'10px 16px'}}>
                      <LIcon name="Car" size={16} color={C.accent}/><span style={{fontWeight:700,fontSize:13,marginLeft:8}}>ARAÇ BİLGİLERİ</span>
                    </div>
                    <div style={{padding:16,display:'grid',gap:12}}>
                      <FormGroup label="PLAKA"><input style={S.input} value={form.bh_arac_plaka} onChange={e=>u('bh_arac_plaka',formatPlaka(e.target.value))} placeholder="34XX123"/></FormGroup>
                      <FormGroup label="MARKA"><AracMarkaSelect value={form.bh_arac_marka} onChange={v=>u('bh_arac_marka',v)}/></FormGroup>
                      <FormGroup label="MODEL YILI">
                        <select style={S.select} value={form.bh_arac_yil} onChange={e=>u('bh_arac_yil',e.target.value)}>
                          <option value="">SEÇİNİZ</option>{Array.from({length:30},(_,i)=>2026-i).map(y=><option key={y} value={y}>{y}</option>)}
                        </select>
                      </FormGroup>
                    </div>
                  </div>
                  <div style={S.card}>
                    <div style={{...S.cardHead,background:`${C.purple}11`,padding:'10px 16px'}}>
                      <LIcon name="UserCircle" size={16} color={C.purple}/><span style={{fontWeight:700,fontSize:13,marginLeft:8}}>SÜRÜCÜ BİLGİLERİ</span>
                    </div>
                    <div style={{padding:16,display:'grid',gap:12}}>
                      <FormGroup label="SÜRÜCÜ ADI SOYADI"><input style={S.input} value={form.surucu_ad} onChange={e=>u('surucu_ad',e.target.value)} placeholder="SÜRÜCÜ ADI SOYADI"/></FormGroup>
                      <FormGroup label="EHLİYET BİLGİSİ"><input style={S.input} value={form.surucu_ehliyet} onChange={e=>u('surucu_ehliyet',e.target.value)} placeholder="EHLİYET SINIFI / NO"/></FormGroup>
                      <FormGroup label="KUSUR ORANI (%)"><input type="number" style={S.input} value={form.surucu_kusur} onChange={e=>u('surucu_kusur',e.target.value)} placeholder="0-100"/></FormGroup>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ═══ NOTLAR ═══ */}
            <SecHead icon="StickyNote" title="NOTLAR"/>
            <FormGroup label="NOTLAR" full>
              <textarea style={{...S.input,minHeight:80}} value={form.notlar} onChange={e=>u('notlar',e.target.value)} placeholder="DOSYA İLE İLGİLİ NOTLAR..."/>
            </FormGroup>
          </div>

          {/* KAYDET BUTONU */}
          <div style={{display:'flex',justifyContent:'flex-end',marginTop:24,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
            <button style={{...S.btn,...S.btnS,fontSize:14,padding:'12px 40px'}} onClick={kaydet} disabled={loading}>
              <LIcon name="Save" size={16} color="#fff"/> {loading ? 'KAYDEDİLİYOR...' : 'DOSYAYI KAYDET'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
