const MR = window.MR || (window.MR = {});
const {useState, useEffect} = React;

MR.DosyaDetayPage = ({dosyaId, setPage, user}) => {
  const {C, S, LIcon, Badge, SectionTitle, EmptyState, Loading, Modal, FormGroup, Confirm, api, fmt, MASRAF_K, EVRAK_T, ILLER, SIGORTA, today} = MR;
  const [dosya, setDosya] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('bilgi');
  const [masrafM, setMasrafM] = useState(false);
  const [evrakM, setEvrakM] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editM, setEditM] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [dosyaSilConfirm, setDosyaSilConfirm] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await api.dosyaGet(dosyaId);
    if (r?.success) setDosya(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [dosyaId]);

  const asamaDegistir = async (yeniAsama) => {
    const r = await api.dosyaUpdate({id: dosya.id, asama: yeniAsama});
    if (r?.success) load();
  };

  const masrafSil = async (id) => {
    const r = await api.masrafDelete(id);
    if (r?.success) { load(); setDeleteConfirm(null); }
  };

  const evrakSil = async (id) => {
    const r = await api.evrakDelete(id);
    if (r?.success) { load(); setDeleteConfirm(null); }
  };

  const openEditModal = () => {
    setEditForm({
      dosya_turu: dosya.dosya_turu || '',
      sigorta_sirket: dosya.sigorta_sirket || '',
      hasar_no: dosya.hasar_no || '',
      magdur_ad_soyad: dosya.magdur?.ad_soyad || '',
      magdur_tc_kimlik: dosya.magdur?.tc_kimlik || '',
      magdur_telefon: dosya.magdur?.telefon || '',
      magdur_il: dosya.magdur?.il || '',
      plaka: dosya.plaka || ''
    });
    setEditError('');
    setEditM(true);
  };

  const dosyaGuncelle = async () => {
    setEditLoading(true);
    setEditError('');
    const r = await api.dosyaUpdate({
      id: dosya.id,
      dosya_turu: editForm.dosya_turu,
      sigorta_sirket: editForm.sigorta_sirket,
      hasar_no: editForm.hasar_no,
      magdur_ad_soyad: editForm.magdur_ad_soyad,
      magdur_tc_kimlik: editForm.magdur_tc_kimlik,
      magdur_telefon: editForm.magdur_telefon,
      magdur_il: editForm.magdur_il,
      plaka: editForm.plaka
    });
    if (r?.success) { load(); setEditM(false); }
    else setEditError(r?.error || 'GÜNCELLEME HATASI');
    setEditLoading(false);
  };

  const dosyaSil = async () => {
    const r = await api.dosyaDelete(dosya.id);
    if (r?.success) { setDosyaSilConfirm(false); setPage('dosya-liste'); }
  };

  if (loading) return <Loading/>;
  if (!dosya) return <EmptyState icon="AlertCircle" title="DOSYA BULUNAMADI" desc=""/>;

  const tabs = [
    {id:'bilgi', l:'DOSYA BİLGİLERİ', ic:'FileText'},
    {id:'masraf', l:`MASRAFLAR (${dosya.masraflar?.length || 0})`, ic:'Receipt'},
    {id:'evrak', l:`EVRAKLAR (${dosya.evraklar?.length || 0})`, ic:'Folder'}
  ];

  return (
    <div className="fade-in">
      <button style={{...S.btn,...S.btnG,marginBottom:16,fontSize:11}} onClick={() => setPage('dosya-liste')}>
        <LIcon name="ArrowLeft" size={14}/> LİSTEYE DÖN
      </button>

      <div style={{...S.card,marginBottom:16}}>
        <div style={{padding:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:56,height:56,borderRadius:14,background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <LIcon name="FolderOpen" size={24} color={C.accent}/>
            </div>
            <div>
              <div style={{fontSize:20,fontWeight:800}}>{dosya.dosya_no} <Badge text={dosya.dosya_turu} color={dosya.dosya_turu==='ADK'?C.accent:C.purple}/></div>
              <div style={{fontSize:13,color:C.textSec,marginTop:2}}>{dosya.magdur?.ad_soyad || '-'}</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <select value={dosya.asama} onChange={e => asamaDegistir(e.target.value)}
              style={{...S.select, width:200, fontSize:12, background:`${C.cyan}11`, border:`1px solid ${C.cyan}44`}}>
              {['DOSYA AÇIK','EVRAK BEKLENİYOR','BAŞVURU HAZIRLANIYOR','SİGORTA BAŞVURUSU','TAHKİM BAŞVURUSU','DAVA AÇILDI','BİLİRKİŞİ AŞAMASI','KARAR BEKLENİYOR','ÖDEME BEKLENİYOR','ÖDEME ALINDI','DOSYA KAPANDI'].map(a =>
                <option key={a} value={a}>{a}</option>
              )}
            </select>
            <button style={{...S.btn,fontSize:11,padding:'8px 14px',background:`${C.danger}22`,color:C.danger,border:`1px solid ${C.danger}44`,borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}
              onClick={() => setDosyaSilConfirm(true)}>
              <LIcon name="Trash2" size={14} color={C.danger}/> DOSYA SİL
            </button>
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:16}}>
        {tabs.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)}
            style={{display:'flex',alignItems:'center',gap:6,padding:'10px 18px',borderRadius:10,fontSize:12,fontWeight:tab===t.id?700:400,cursor:'pointer',
              background:tab===t.id?`${C.accent}22`:'transparent',color:tab===t.id?C.accent:C.textSec,border:`1px solid ${tab===t.id?C.accent+'44':C.border}`}}>
            <LIcon name={t.ic} size={14} color={tab===t.id?C.accent:C.textSec}/>{t.l}
          </div>
        ))}
      </div>

      {tab === 'bilgi' && (
        <div style={S.card}>
          <SectionTitle icon="FileText" title="DOSYA BİLGİLERİ"
            right={<button style={{...S.btn,...S.btnP,fontSize:11,padding:'6px 14px'}} onClick={openEditModal}>
              <LIcon name="Edit2" size={14} color="#fff"/> DÜZENLE
            </button>}/>
          <div style={{...S.cardBody,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            {[
              ['DOSYA NO', dosya.dosya_no], ['DOSYA TÜRÜ', dosya.dosya_turu], ['AŞAMA', dosya.asama],
              ['SİGORTA', dosya.sigorta_sirket], ['HASAR NO', dosya.hasar_no], ['AÇILIŞ', dosya.acilis_tarihi],
              ['MAĞDUR', dosya.magdur?.ad_soyad], ['TC', dosya.magdur?.tc_kimlik], ['TELEFON', dosya.magdur?.telefon],
              ['İL', dosya.magdur?.il], ['PLAKA', dosya.plaka], ['TOPLAM MASRAF', fmt(dosya.toplam_masraf || 0)]
            ].map(([k, v], i) => (
              <div key={i} style={{padding:12,background:C.bgInput,borderRadius:8}}>
                <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>{k}</div>
                <div style={{fontSize:13,fontWeight:600}}>{v || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'masraf' && (
        <div style={S.card}>
          <SectionTitle icon="Receipt" title="MASRAFLAR" sub={`TOPLAM: ${fmt(dosya.toplam_masraf || 0)}`}
            right={<button style={{...S.btn,...S.btnP,fontSize:11}} onClick={() => setMasrafM(true)}><LIcon name="Plus" size={14} color="#fff"/> YENİ MASRAF</button>}/>
          <div style={S.cardBody}>
            {dosya.masraflar?.length > 0 ? (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{borderBottom:`2px solid ${C.border}`}}>
                    {['#','MASRAF KALEMİ','TUTAR','KASA','TARİH','KULLANICI','İŞLEM'].map(h =>
                      <th key={h} style={{padding:'10px 12px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:10}}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {dosya.masraflar.map((m, i) => (
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:'10px 12px',color:C.textMuted}}>{i+1}</td>
                      <td style={{padding:'10px 12px',fontWeight:600}}>{m.masraf_kalemi}</td>
                      <td style={{padding:'10px 12px',fontWeight:700,color:C.danger}}>{fmt(m.tutar)}</td>
                      <td style={{padding:'10px 12px'}}><Badge text={m.kasa_adi || '-'} color={C.cyan}/></td>
                      <td style={{padding:'10px 12px',color:C.textMuted}}>{m.islem_tarihi}</td>
                      <td style={{padding:'10px 12px',color:C.textSec}}>{m.kullanici_adi || '-'}</td>
                      <td style={{padding:'10px 12px'}}>
                        <LIcon name="Trash2" size={14} color={C.danger} style={{cursor:'pointer'}}
                          onClick={() => setDeleteConfirm({type:'masraf', id:m.id, text:m.masraf_kalemi})}/>
                      </td>
                    </tr>
                  ))}
                  <tr style={{background:`${C.accent}08`}}>
                    <td colSpan={2} style={{padding:12,fontWeight:800,textAlign:'right'}}>TOPLAM:</td>
                    <td style={{padding:12,fontWeight:800,fontSize:15,color:C.danger}}>{fmt(dosya.toplam_masraf || 0)}</td>
                    <td colSpan={4}/>
                  </tr>
                </tbody>
              </table>
            ) : <EmptyState icon="Receipt" title="MASRAF YOK" desc="MASRAF EKLE BUTONUNDAN MASRAF GİREBİLİRSİNİZ."/>}
          </div>
        </div>
      )}

      {tab === 'evrak' && (
        <div style={S.card}>
          <SectionTitle icon="Folder" title="EVRAKLAR"
            right={<button style={{...S.btn,...S.btnS,fontSize:11}} onClick={() => setEvrakM(true)}><LIcon name="Upload" size={14} color="#fff"/> EVRAK YÜKLE</button>}/>
          <div style={S.cardBody}>
            {dosya.evraklar?.length > 0 ? (
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                {dosya.evraklar.map((e, i) => (
                  <div key={i} style={{padding:16,background:C.bgInput,borderRadius:10,border:`1px solid ${C.border}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                      <LIcon name="FileText" size={20} color={C.accent}/>
                      <div>
                        <div style={{fontSize:12,fontWeight:600}}>{e.dosya_adi}</div>
                        <div style={{fontSize:10,color:C.textMuted}}>{e.evrak_turu} • {(e.dosya_boyutu/1024).toFixed(0)} KB</div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <a href={api.evrakUrl(e.id)} target="_blank"
                        style={{...S.btn,...S.btnP,fontSize:10,padding:'4px 10px',textDecoration:'none'}}>
                        <LIcon name="Download" size={12} color="#fff"/> İNDİR
                      </a>
                      <button style={{...S.btn,...S.btnD,fontSize:10,padding:'4px 10px'}}
                        onClick={() => setDeleteConfirm({type:'evrak', id:e.id, text:e.dosya_adi})}>
                        <LIcon name="Trash2" size={12} color="#fff"/> SİL
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon="Folder" title="EVRAK YOK" desc="PDF EVRAK YÜKLE BUTONUNDAN EVRAK EKLEYEBİLİRSİNİZ."/>}
          </div>
        </div>
      )}

      <MR.MasrafEkle open={masrafM} onClose={() => setMasrafM(false)} dosyaId={dosya.id} onOk={load}/>
      <MR.EvrakYukle open={evrakM} onClose={() => setEvrakM(false)} dosyaId={dosya.id} onOk={load}/>

      {/* MASRAF / EVRAK SİL ONAY */}
      <Confirm open={!!deleteConfirm} message={deleteConfirm ? `"${deleteConfirm.text}" SİLİNSİN Mİ?` : ''}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm.type === 'masraf') masrafSil(deleteConfirm.id);
          else if (deleteConfirm.type === 'evrak') evrakSil(deleteConfirm.id);
        }}/>

      {/* DOSYA SİL ONAY */}
      <Confirm open={dosyaSilConfirm} message={`"${dosya.dosya_no}" DOSYASI TAMAMEN SİLİNSİN Mİ? BU İŞLEM GERİ ALINAMAZ!`}
        onCancel={() => setDosyaSilConfirm(false)}
        onConfirm={dosyaSil}/>

      {/* DOSYA BİLGİLERİ DÜZENLEME MODAL */}
      <Modal open={editM} onClose={() => setEditM(false)} title="DOSYA BİLGİLERİ DÜZENLE" width="600px">
        {editError && <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:12,fontSize:12,color:C.danger}}>{editError}</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <FormGroup label="DOSYA TÜRÜ">
            <select value={editForm.dosya_turu} onChange={e => setEditForm({...editForm,dosya_turu:e.target.value})} style={S.select}>
              <option value="ADK">ADK</option>
              <option value="BH">BH</option>
            </select>
          </FormGroup>
          <FormGroup label="SİGORTA ŞİRKETİ">
            <select value={editForm.sigorta_sirket} onChange={e => setEditForm({...editForm,sigorta_sirket:e.target.value})} style={S.select}>
              <option value="">SEÇİNİZ</option>
              {(SIGORTA || []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="HASAR NO">
            <input value={editForm.hasar_no || ''} onChange={e => setEditForm({...editForm,hasar_no:e.target.value})} placeholder="HASAR NO" style={S.input}/>
          </FormGroup>
          <FormGroup label="MAĞDUR AD SOYAD">
            <input value={editForm.magdur_ad_soyad || ''} onChange={e => setEditForm({...editForm,magdur_ad_soyad:e.target.value})} placeholder="AD SOYAD" style={S.input}/>
          </FormGroup>
          <FormGroup label="TC KİMLİK NO">
            <input value={editForm.magdur_tc_kimlik || ''} onChange={e => setEditForm({...editForm,magdur_tc_kimlik:e.target.value})} placeholder="TC KİMLİK" maxLength={11} style={S.input}/>
          </FormGroup>
          <FormGroup label="TELEFON">
            <input value={editForm.magdur_telefon || ''} onChange={e => setEditForm({...editForm,magdur_telefon:e.target.value})} placeholder="05XX XXX XX XX" style={S.input}/>
          </FormGroup>
          <FormGroup label="İL">
            <select value={editForm.magdur_il} onChange={e => setEditForm({...editForm,magdur_il:e.target.value})} style={S.select}>
              <option value="">SEÇİNİZ</option>
              {(ILLER || []).map(il => <option key={il} value={il}>{il}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="PLAKA">
            <input value={editForm.plaka || ''} onChange={e => setEditForm({...editForm,plaka:e.target.value})} placeholder="PLAKA" style={S.input}/>
          </FormGroup>
        </div>
        <div style={{marginTop:16}}>
          <button onClick={dosyaGuncelle} disabled={editLoading} style={{...S.btn,...S.btnS,justifyContent:'center',padding:14,width:'100%'}}>
            {editLoading ? 'KAYDEDİLİYOR...' : 'DEĞİŞİKLİKLERİ KAYDET'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

// MASRAF EKLEME MODAL
MR.MasrafEkle = ({open, onClose, dosyaId, onOk}) => {
  const {C, S, Modal, FormGroup, api, MASRAF_K, today} = MR;
  const [f, sF] = useState({masraf_kalemi:'',tutar:'',kasa_id:1,aciklama:'',islem_tarihi:today()});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [kasalar, setKasalar] = useState([]);

  useEffect(() => {
    if (open) {
      api.kasaList().then(r => { if (r?.success) setKasalar(r.data || []); });
    }
  }, [open]);

  const go = async () => {
    if (!f.masraf_kalemi || !f.tutar) { setError('KALEM VE TUTAR GEREKLİ'); return; }
    setLoading(true); setError('');
    const r = await api.masrafCreate({...f, dosya_id:dosyaId, tutar:parseFloat(f.tutar)});
    if (r?.success) { onOk(); onClose(); sF({masraf_kalemi:'',tutar:'',kasa_id:1,aciklama:'',islem_tarihi:today()}); }
    else setError(r?.error || 'HATA');
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="MASRAF EKLE" width="500px">
      {error && <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:12,fontSize:12,color:C.danger}}>{error}</div>}
      <div style={{display:'grid',gap:14}}>
        <FormGroup label="MASRAF KALEMİ">
          <select value={f.masraf_kalemi} onChange={e => sF({...f,masraf_kalemi:e.target.value})} style={S.select}>
            <option value="">SEÇİNİZ</option>
            {MASRAF_K.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="TUTAR (₺)">
          <input type="number" value={f.tutar} onChange={e => sF({...f,tutar:e.target.value})} placeholder="0.00" style={S.input}/>
        </FormGroup>
        <FormGroup label="KASA">
          <select value={f.kasa_id} onChange={e => sF({...f,kasa_id:parseInt(e.target.value)})} style={S.select}>
            {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({MR.fmt(k.bakiye)})</option>)}
          </select>
        </FormGroup>
        <FormGroup label="TARİH">
          <input type="date" value={f.islem_tarihi} onChange={e => sF({...f,islem_tarihi:e.target.value})} style={S.input}/>
        </FormGroup>
        <FormGroup label="AÇIKLAMA">
          <input value={f.aciklama} onChange={e => sF({...f,aciklama:e.target.value})} placeholder="İSTEĞE BAĞLI" style={S.input}/>
        </FormGroup>
        <div style={{padding:12,background:`${C.warning}11`,borderRadius:8,fontSize:11,color:C.warning}}>
          MASRAF TUTARI KASA BAKİYESİNDEN OTOMATİK DÜŞÜLECEK.
        </div>
        <button onClick={go} disabled={loading} style={{...S.btn,...S.btnS,justifyContent:'center',padding:14}}>
          {loading ? 'KAYDEDİLİYOR...' : 'MASRAFI KAYDET'}
        </button>
      </div>
    </Modal>
  );
};

// EVRAK YÜKLEME MODAL
MR.EvrakYukle = ({open, onClose, dosyaId, onOk}) => {
  const {C, S, Modal, FormGroup, api, EVRAK_T} = MR;
  const [tur, setTur] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const go = async () => {
    if (!file || !tur) { setError('EVRAK TÜRÜ VE DOSYA GEREKLİ'); return; }
    if (file.type !== 'application/pdf') { setError('SADECE PDF'); return; }
    setLoading(true); setError('');
    const r = await api.evrakUpload(dosyaId, tur, file);
    if (r?.success) { onOk(); onClose(); setFile(null); setTur(''); }
    else setError(r?.error || 'HATA');
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="EVRAK YÜKLE (PDF)" width="480px">
      {error && <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:12,fontSize:12,color:C.danger}}>{error}</div>}
      <div style={{display:'grid',gap:14}}>
        <FormGroup label="EVRAK TÜRÜ">
          <select value={tur} onChange={e => setTur(e.target.value)} style={S.select}>
            <option value="">SEÇİNİZ</option>
            {EVRAK_T.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="PDF DOSYA">
          <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} style={{...S.input, padding:8}}/>
        </FormGroup>
        {file && <div style={{fontSize:12,color:C.textSec}}>SEÇİLEN: {file.name} ({(file.size/1024).toFixed(0)} KB)</div>}
        <button onClick={go} disabled={loading} style={{...S.btn,...S.btnS,justifyContent:'center',padding:14}}>
          {loading ? 'YÜKLENİYOR...' : 'EVRAK YÜKLE'}
        </button>
      </div>
    </Modal>
  );
};
