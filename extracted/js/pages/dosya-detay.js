const MR = window.MR || (window.MR = {});
const {useState, useEffect} = React;

const ASAMALAR = ['DOSYA AÇIK','EVRAK BEKLENİYOR','BAŞVURU HAZIRLANIYOR','SİGORTA BAŞVURUSU','TAHKİM BAŞVURUSU','DAVA AÇILDI','BİLİRKİŞİ AŞAMASI','KARAR BEKLENİYOR','ÖDEME BEKLENİYOR','ÖDEME ALINDI','DOSYA KAPANDI'];
const ADK_TT = ['TRAFİK SİGORTASI BAŞVURUSU','KASKO BAŞVURUSU','TAHKİM BAŞVURUSU','DAVA YOLU'];
const BH_TT = ['MALULİYET TAZMİNATI','GEÇİCİ İŞ GÖREMEZLİK','DESTEKTEN YOKSUN KALMA','BAKICI GİDERİ','TEDAVİ GİDERLERİ'];
const KAYNAKLAR = ['OFİS CRM','YÖNLENDİREN','SAHA PERSONEL'];

const asamaRenk = (a) => {
  const m = {
    'DOSYA AÇIK':'#3b82f6','EVRAK BEKLENİYOR':'#f59e0b','BAŞVURU HAZIRLANIYOR':'#8b5cf6',
    'SİGORTA BAŞVURUSU':'#06b6d4','TAHKİM BAŞVURUSU':'#6366f1','DAVA AÇILDI':'#ef4444',
    'BİLİRKİŞİ AŞAMASI':'#d97706','KARAR BEKLENİYOR':'#ec4899',
    'ÖDEME BEKLENİYOR':'#84cc16','ÖDEME ALINDI':'#22c55e','DOSYA KAPANDI':'#6b7280'
  };
  return m[a] || '#6b7280';
};

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

  const getPlaka = () => dosya?.plaka || dosya?.araclar?.find(a=>a.taraf==='magdur')?.plaka || '';

  const openEditModal = () => {
    const magdur = dosya.magdur || {};
    setEditForm({
      dosya_turu: dosya.dosya_turu || 'ADK',
      talep_turu: dosya.talep_turu || '',
      sigorta_sirket: dosya.sigorta_sirket || '',
      hasar_no: dosya.hasar_no || '',
      dosya_kaynagi: dosya.dosya_kaynagi || '',
      kaza_tarihi: dosya.kaza_tarihi || '',
      kaza_il: dosya.kaza_il || '',
      haklilik: dosya.haklilik || 100,
      komisyon_orani: dosya.komisyon_orani || 0,
      plaka: getPlaka(),
      notlar: dosya.notlar || '',
      magdur_ad_soyad: magdur.ad_soyad || '',
      magdur_tc_kimlik: magdur.tc_kimlik || '',
      magdur_telefon: magdur.telefon || '',
      magdur_telefon2: magdur.telefon2 || '',
      magdur_il: magdur.il || '',
      magdur_ilce: magdur.ilce || '',
      magdur_dogum_tarihi: magdur.dogum_tarihi || '',
      magdur_meslek: magdur.meslek || ''
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
      talep_turu: editForm.talep_turu,
      sigorta_sirket: editForm.sigorta_sirket,
      hasar_no: editForm.hasar_no,
      dosya_kaynagi: editForm.dosya_kaynagi,
      kaza_tarihi: editForm.kaza_tarihi || null,
      kaza_il: editForm.kaza_il,
      haklilik: parseInt(editForm.haklilik) || 100,
      komisyon_orani: parseFloat(editForm.komisyon_orani) || 0,
      plaka: editForm.plaka,
      notlar: editForm.notlar,
      magdur_ad_soyad: editForm.magdur_ad_soyad,
      magdur_tc_kimlik: editForm.magdur_tc_kimlik,
      magdur_telefon: editForm.magdur_telefon,
      magdur_telefon2: editForm.magdur_telefon2,
      magdur_il: editForm.magdur_il,
      magdur_ilce: editForm.magdur_ilce,
      magdur_dogum_tarihi: editForm.magdur_dogum_tarihi || null,
      magdur_meslek: editForm.magdur_meslek
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

  const magdur = dosya.magdur || {};
  const arac = dosya.araclar?.find(a=>a.taraf==='magdur') || {};
  const karsiArac = dosya.araclar?.find(a=>a.taraf==='karsi') || {};
  const ac = asamaRenk(dosya.asama);
  const u = (k, v) => setEditForm(p => ({...p, [k]: v}));

  // Bilgi satır bileşeni
  const InfoRow = ({label, value, mono, bold, color}) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:`1px solid ${C.border}22`}}>
      <span style={{fontSize:10,color:C.textMuted,fontWeight:500,minWidth:90}}>{label}</span>
      <span style={{fontSize:11,fontWeight:bold?700:500,color:color||C.text,fontFamily:mono?'monospace':'inherit',textAlign:'right',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{value || '-'}</span>
    </div>
  );

  const tabs = [
    {id:'bilgi', l:'DOSYA BİLGİLERİ', ic:'FileText'},
    {id:'masraf', l:`MASRAFLAR (${dosya.masraflar?.length || 0})`, ic:'Receipt'},
    {id:'evrak', l:`EVRAKLAR (${dosya.evraklar?.length || 0})`, ic:'Folder'}
  ];

  return (
    <div className="fade-in">
      {/* ÜST BAR */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <button style={{...S.btn,...S.btnG,fontSize:10,padding:'6px 14px'}} onClick={() => setPage('dosya-liste')}>
          <LIcon name="ArrowLeft" size={13}/> LİSTEYE DÖN
        </button>
      </div>

      {/* DOSYA HEADER */}
      <div style={{...S.card,marginBottom:12}}>
        <div style={{padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:42,height:42,borderRadius:10,background:`${C.accent}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <LIcon name="FolderOpen" size={20} color={C.accent}/>
            </div>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:18,fontWeight:800}}>{dosya.dosya_no}</span>
                <span style={{padding:'2px 8px',borderRadius:4,fontSize:9,fontWeight:700,
                  background:dosya.dosya_turu==='ADK'?`${C.accent}18`:`${C.purple}18`,
                  color:dosya.dosya_turu==='ADK'?C.accent:C.purple}}>
                  {dosya.dosya_turu}
                </span>
                <span style={{padding:'2px 8px',borderRadius:4,fontSize:8,fontWeight:600,background:ac+'18',color:ac,border:`1px solid ${ac}33`}}>
                  {dosya.asama}
                </span>
              </div>
              <div style={{fontSize:11,color:C.textSec,marginTop:2}}>
                {magdur.ad_soyad || '-'} {dosya.sigorta_sirket ? `• ${dosya.sigorta_sirket}` : ''} {dosya.hasar_no ? `• ${dosya.hasar_no}` : ''}
              </div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <select value={dosya.asama} onChange={e => asamaDegistir(e.target.value)}
              style={{...S.select,width:180,fontSize:10,padding:'6px 10px',background:`${ac}11`,border:`1px solid ${ac}33`,color:ac,fontWeight:600}}>
              {ASAMALAR.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button style={{...S.btn,...S.btnP,fontSize:10,padding:'6px 12px'}} onClick={openEditModal}>
              <LIcon name="Edit2" size={12} color="#fff"/> DÜZENLE
            </button>
            <button style={{...S.btn,fontSize:10,padding:'6px 12px',background:`${C.danger}18`,color:C.danger,border:`1px solid ${C.danger}33`,borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}
              onClick={() => setDosyaSilConfirm(true)}>
              <LIcon name="Trash2" size={12} color={C.danger}/> SİL
            </button>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{display:'flex',gap:4,marginBottom:12}}>
        {tabs.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)}
            style={{display:'flex',alignItems:'center',gap:5,padding:'8px 16px',borderRadius:8,fontSize:11,fontWeight:tab===t.id?700:400,cursor:'pointer',
              background:tab===t.id?`${C.accent}18`:'transparent',color:tab===t.id?C.accent:C.textSec,border:`1px solid ${tab===t.id?C.accent+'33':C.border}`,transition:'all .2s'}}>
            <LIcon name={t.ic} size={13} color={tab===t.id?C.accent:C.textSec}/>{t.l}
          </div>
        ))}
      </div>

      {/* DOSYA BİLGİLERİ TAB */}
      {tab === 'bilgi' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {/* SOL: DOSYA BİLGİLERİ */}
          <div style={S.card}>
            <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8,background:`${C.accent}06`}}>
              <LIcon name="FileText" size={14} color={C.accent}/>
              <span style={{fontSize:12,fontWeight:700}}>DOSYA BİLGİLERİ</span>
            </div>
            <div style={{padding:'10px 14px'}}>
              <InfoRow label="DOSYA NO" value={dosya.dosya_no} bold mono/>
              <InfoRow label="DOSYA TÜRÜ" value={dosya.dosya_turu} bold/>
              <InfoRow label="BAŞVURU TÜRÜ" value={dosya.talep_turu}/>
              <InfoRow label="SİGORTA ŞİRKETİ" value={dosya.sigorta_sirket}/>
              <InfoRow label="HASAR NO" value={dosya.hasar_no} mono/>
              <InfoRow label="DOSYA KAYNAĞI" value={dosya.dosya_kaynagi}/>
              <InfoRow label="AVUKAT" value={dosya.avukat_adi}/>
              <InfoRow label="SORUMLU" value={dosya.sorumlu_adi}/>
              <InfoRow label="AÇILIŞ TARİHİ" value={dosya.acilis_tarihi}/>
              <InfoRow label="KAZA TARİHİ" value={dosya.kaza_tarihi}/>
              <InfoRow label="KAZA İLİ" value={dosya.kaza_il}/>
              <InfoRow label="HAKLILIK" value={`%${dosya.haklilik || 0}`} bold color={C.success}/>
              <InfoRow label="KOMİSYON" value={`%${dosya.komisyon_orani || 0}`}/>
              {dosya.notlar && <div style={{marginTop:8,padding:8,background:C.bgInput,borderRadius:6,fontSize:10,color:C.textSec}}>{dosya.notlar}</div>}
            </div>
          </div>

          {/* SAĞ: MAĞDUR + ARAÇ + FİNANSAL */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* MAĞDUR BİLGİLERİ */}
            <div style={S.card}>
              <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8,background:`${C.cyan}06`}}>
                <LIcon name="User" size={14} color={C.cyan}/>
                <span style={{fontSize:12,fontWeight:700}}>MAĞDUR BİLGİLERİ</span>
              </div>
              <div style={{padding:'10px 14px'}}>
                <InfoRow label="AD SOYAD" value={magdur.ad_soyad} bold/>
                <InfoRow label="T.C. KİMLİK" value={magdur.tc_kimlik} mono/>
                <InfoRow label="TELEFON" value={magdur.telefon} mono/>
                {magdur.telefon2 && <InfoRow label="TELEFON 2" value={magdur.telefon2} mono/>}
                <InfoRow label="İL" value={magdur.il}/>
                {magdur.ilce && <InfoRow label="İLÇE" value={magdur.ilce}/>}
                {magdur.meslek && <InfoRow label="MESLEK" value={magdur.meslek}/>}
                {magdur.dogum_tarihi && <InfoRow label="DOĞUM TARİHİ" value={magdur.dogum_tarihi}/>}
              </div>
            </div>

            {/* ARAÇ BİLGİLERİ (ADK) */}
            {dosya.dosya_turu === 'ADK' && (
              <div style={S.card}>
                <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8,background:`${C.warning}06`}}>
                  <LIcon name="Truck" size={14} color={C.warning}/>
                  <span style={{fontSize:12,fontWeight:700}}>ARAÇ BİLGİLERİ</span>
                </div>
                <div style={{padding:'10px 14px'}}>
                  <InfoRow label="PLAKA" value={getPlaka()} bold mono/>
                  <InfoRow label="MARKA" value={arac.marka}/>
                  <InfoRow label="MODEL" value={arac.model}/>
                  {arac.model_yili && <InfoRow label="MODEL YILI" value={arac.model_yili}/>}
                  {karsiArac.plaka && (
                    <>
                      <div style={{margin:'8px 0 4px',fontSize:9,color:C.textMuted,fontWeight:600,borderTop:`1px solid ${C.border}`,paddingTop:6}}>KARŞI ARAÇ</div>
                      <InfoRow label="PLAKA" value={karsiArac.plaka} mono/>
                      {karsiArac.marka && <InfoRow label="MARKA" value={karsiArac.marka}/>}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* FİNANSAL ÖZET */}
            <div style={S.card}>
              <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8,background:`${C.danger}06`}}>
                <LIcon name="DollarSign" size={14} color={C.danger}/>
                <span style={{fontSize:12,fontWeight:700}}>FİNANSAL ÖZET</span>
              </div>
              <div style={{padding:'10px 14px'}}>
                <InfoRow label="TOPLAM MASRAF" value={fmt(dosya.toplam_masraf || 0)} bold color={C.danger}/>
                <InfoRow label="MASRAF SAYISI" value={dosya.masraflar?.length || 0}/>
                <InfoRow label="EVRAK SAYISI" value={dosya.evraklar?.length || 0}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MASRAFLAR TAB */}
      {tab === 'masraf' && (
        <div style={S.card}>
          <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.accent}06`}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <LIcon name="Receipt" size={14} color={C.accent}/>
              <span style={{fontSize:12,fontWeight:700}}>MASRAFLAR</span>
              <span style={{fontSize:10,color:C.textMuted}}>TOPLAM: {fmt(dosya.toplam_masraf || 0)}</span>
            </div>
            <button style={{...S.btn,...S.btnP,fontSize:10,padding:'5px 12px'}} onClick={() => setMasrafM(true)}>
              <LIcon name="Plus" size={12} color="#fff"/> YENİ MASRAF
            </button>
          </div>
          <div>
            {dosya.masraflar?.length > 0 ? (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{background:C.bgHover}}>
                    {['#','MASRAF KALEMİ','TUTAR','KASA','TARİH','KULLANICI','İŞLEM'].map(h =>
                      <th key={h} style={{padding:'8px 10px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:9,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {dosya.masraflar.map((m, i) => (
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}22`}}>
                      <td style={{padding:'8px 10px',color:C.textMuted,fontSize:10}}>{i+1}</td>
                      <td style={{padding:'8px 10px',fontWeight:600,fontSize:11}}>{m.masraf_kalemi}</td>
                      <td style={{padding:'8px 10px',fontWeight:700,color:C.danger,fontSize:11}}>{fmt(m.tutar)}</td>
                      <td style={{padding:'8px 10px'}}><Badge text={m.kasa_adi || '-'} color={C.cyan}/></td>
                      <td style={{padding:'8px 10px',color:C.textMuted,fontSize:10}}>{m.islem_tarihi}</td>
                      <td style={{padding:'8px 10px',color:C.textSec,fontSize:10}}>{m.kullanici_adi || '-'}</td>
                      <td style={{padding:'8px 10px'}}>
                        <span style={{cursor:'pointer',display:'flex',padding:2,borderRadius:4,background:`${C.danger}11`,width:'fit-content'}}
                          onClick={() => setDeleteConfirm({type:'masraf', id:m.id, text:m.masraf_kalemi})}>
                          <LIcon name="Trash2" size={12} color={C.danger}/>
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr style={{background:`${C.accent}06`}}>
                    <td colSpan={2} style={{padding:'10px 12px',fontWeight:800,textAlign:'right',fontSize:11}}>TOPLAM:</td>
                    <td style={{padding:'10px 12px',fontWeight:800,fontSize:13,color:C.danger}}>{fmt(dosya.toplam_masraf || 0)}</td>
                    <td colSpan={4}/>
                  </tr>
                </tbody>
              </table>
            ) : <EmptyState icon="Receipt" title="MASRAF YOK" desc="YENİ MASRAF EKLE BUTONUYLA MASRAF GİREBİLİRSİNİZ"/>}
          </div>
        </div>
      )}

      {/* EVRAKLAR TAB */}
      {tab === 'evrak' && (
        <div style={S.card}>
          <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.accent}06`}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <LIcon name="Folder" size={14} color={C.accent}/>
              <span style={{fontSize:12,fontWeight:700}}>EVRAKLAR</span>
            </div>
            <button style={{...S.btn,...S.btnS,fontSize:10,padding:'5px 12px'}} onClick={() => setEvrakM(true)}>
              <LIcon name="Upload" size={12} color="#fff"/> EVRAK YÜKLE
            </button>
          </div>
          <div style={{padding:dosya.evraklar?.length?14:0}}>
            {dosya.evraklar?.length > 0 ? (
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                {dosya.evraklar.map((e, i) => (
                  <div key={i} style={{padding:12,background:C.bgInput,borderRadius:8,border:`1px solid ${C.border}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                      <LIcon name="FileText" size={16} color={C.accent}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.dosya_adi}</div>
                        <div style={{fontSize:9,color:C.textMuted}}>{e.evrak_turu} • {(e.dosya_boyutu/1024).toFixed(0)} KB</div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:4}}>
                      <a href={api.evrakUrl(e.id)} target="_blank"
                        style={{...S.btn,...S.btnP,fontSize:9,padding:'3px 8px',textDecoration:'none'}}>
                        <LIcon name="Download" size={10} color="#fff"/> İNDİR
                      </a>
                      <button style={{...S.btn,...S.btnD,fontSize:9,padding:'3px 8px'}}
                        onClick={() => setDeleteConfirm({type:'evrak', id:e.id, text:e.dosya_adi})}>
                        <LIcon name="Trash2" size={10} color="#fff"/> SİL
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon="Folder" title="EVRAK YOK" desc="PDF EVRAK YÜKLE BUTONUYLA EVRAK EKLEYEBİLİRSİNİZ"/>}
          </div>
        </div>
      )}

      {/* MODALLER */}
      <MR.MasrafEkle open={masrafM} onClose={() => setMasrafM(false)} dosyaId={dosya.id} onOk={load}/>
      <MR.EvrakYukle open={evrakM} onClose={() => setEvrakM(false)} dosyaId={dosya.id} onOk={load}/>

      {/* MASRAF / EVRAK SİL */}
      <Confirm open={!!deleteConfirm} message={deleteConfirm ? `"${deleteConfirm.text}" SİLİNSİN Mİ?` : ''}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm.type === 'masraf') masrafSil(deleteConfirm.id);
          else if (deleteConfirm.type === 'evrak') evrakSil(deleteConfirm.id);
        }}/>

      {/* DOSYA SİL */}
      <Confirm open={dosyaSilConfirm} message={`"${dosya.dosya_no}" DOSYASI TAMAMEN SİLİNSİN Mİ? BU İŞLEM GERİ ALINAMAZ!`}
        onCancel={() => setDosyaSilConfirm(false)}
        onConfirm={dosyaSil}/>

      {/* DÜZENLEME MODAL */}
      <Modal open={editM} onClose={() => setEditM(false)} title="DOSYA BİLGİLERİ DÜZENLE" width="680px">
        {editError && <div style={{padding:8,background:`${C.danger}18`,borderRadius:6,marginBottom:10,fontSize:11,color:C.danger,border:`1px solid ${C.danger}33`}}>{editError}</div>}

        {/* DOSYA BİLGİLERİ BÖLÜMÜ */}
        <div style={{fontSize:10,fontWeight:700,color:C.accent,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
          <LIcon name="FileText" size={12} color={C.accent}/> DOSYA BİLGİLERİ
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          <FormGroup label="DOSYA TÜRÜ">
            <select value={editForm.dosya_turu} onChange={e => { u('dosya_turu',e.target.value); u('talep_turu',''); }} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="ADK">ADK</option>
              <option value="BH">BH</option>
            </select>
          </FormGroup>
          <FormGroup label="BAŞVURU TÜRÜ">
            <select value={editForm.talep_turu} onChange={e => u('talep_turu',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {(editForm.dosya_turu==='ADK'?ADK_TT:BH_TT).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="SİGORTA ŞİRKETİ">
            <select value={editForm.sigorta_sirket} onChange={e => u('sigorta_sirket',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {(SIGORTA || []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="HASAR NO">
            <input value={editForm.hasar_no||''} onChange={e => u('hasar_no',e.target.value)} placeholder="HASAR NO" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="DOSYA KAYNAĞI">
            <select value={editForm.dosya_kaynagi} onChange={e => u('dosya_kaynagi',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {KAYNAKLAR.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="PLAKA">
            <input value={editForm.plaka||''} onChange={e => u('plaka',e.target.value)} placeholder="34 XX 0000" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="KAZA TARİHİ">
            <input type="date" value={editForm.kaza_tarihi||''} onChange={e => u('kaza_tarihi',e.target.value)} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="KAZA İLİ">
            <select value={editForm.kaza_il} onChange={e => u('kaza_il',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {(ILLER || []).map(il => <option key={il} value={il}>{il}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="HAKLILIK (%)">
            <input type="number" min="0" max="100" value={editForm.haklilik} onChange={e => u('haklilik',e.target.value)} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="KOMİSYON (%)">
            <input type="number" min="0" max="100" step="0.1" value={editForm.komisyon_orani} onChange={e => u('komisyon_orani',e.target.value)} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
        </div>

        {/* MAĞDUR BİLGİLERİ BÖLÜMÜ */}
        <div style={{fontSize:10,fontWeight:700,color:C.cyan,marginBottom:8,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
          <LIcon name="User" size={12} color={C.cyan}/> MAĞDUR BİLGİLERİ
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          <FormGroup label="AD SOYAD">
            <input value={editForm.magdur_ad_soyad||''} onChange={e => u('magdur_ad_soyad',e.target.value)} placeholder="AD SOYAD" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="T.C. KİMLİK NO">
            <input value={editForm.magdur_tc_kimlik||''} onChange={e => u('magdur_tc_kimlik',e.target.value)} placeholder="T.C. KİMLİK" maxLength={11} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="TELEFON">
            <input value={editForm.magdur_telefon||''} onChange={e => u('magdur_telefon',e.target.value)} placeholder="05XX XXX XX XX" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="TELEFON 2">
            <input value={editForm.magdur_telefon2||''} onChange={e => u('magdur_telefon2',e.target.value)} placeholder="TELEFON 2" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="İL">
            <select value={editForm.magdur_il} onChange={e => u('magdur_il',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {(ILLER || []).map(il => <option key={il} value={il}>{il}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="İLÇE">
            <input value={editForm.magdur_ilce||''} onChange={e => u('magdur_ilce',e.target.value)} placeholder="İLÇE" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="DOĞUM TARİHİ">
            <input type="date" value={editForm.magdur_dogum_tarihi||''} onChange={e => u('magdur_dogum_tarihi',e.target.value)} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="MESLEK">
            <input value={editForm.magdur_meslek||''} onChange={e => u('magdur_meslek',e.target.value)} placeholder="MESLEK" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
        </div>

        {/* NOTLAR */}
        <div style={{fontSize:10,fontWeight:700,color:C.textSec,marginBottom:8,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
          <LIcon name="Edit3" size={12} color={C.textSec}/> NOTLAR
        </div>
        <textarea value={editForm.notlar||''} onChange={e => u('notlar',e.target.value)} placeholder="DOSYA İLE İLGİLİ NOTLAR..."
          style={{...S.input,minHeight:60,padding:'8px 10px',fontSize:11,resize:'vertical',marginBottom:14}}/>

        {/* KAYDET */}
        <button onClick={dosyaGuncelle} disabled={editLoading}
          style={{...S.btn,...S.btnS,justifyContent:'center',padding:12,width:'100%',fontSize:12}}>
          {editLoading ? 'KAYDEDİLİYOR...' : 'DEĞİŞİKLİKLERİ KAYDET'}
        </button>
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
    <Modal open={open} onClose={onClose} title="MASRAF EKLE" width="480px">
      {error && <div style={{padding:8,background:`${C.danger}18`,borderRadius:6,marginBottom:10,fontSize:11,color:C.danger}}>{error}</div>}
      <div style={{display:'grid',gap:10}}>
        <FormGroup label="MASRAF KALEMİ">
          <select value={f.masraf_kalemi} onChange={e => sF({...f,masraf_kalemi:e.target.value})} style={{...S.select,padding:'8px 10px',fontSize:11}}>
            <option value="">SEÇİNİZ</option>
            {MASRAF_K.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="TUTAR (₺)">
          <input type="number" value={f.tutar} onChange={e => sF({...f,tutar:e.target.value})} placeholder="0.00" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
        </FormGroup>
        <FormGroup label="KASA">
          <select value={f.kasa_id} onChange={e => sF({...f,kasa_id:parseInt(e.target.value)})} style={{...S.select,padding:'8px 10px',fontSize:11}}>
            {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({MR.fmt(k.bakiye)})</option>)}
          </select>
        </FormGroup>
        <FormGroup label="TARİH">
          <input type="date" value={f.islem_tarihi} onChange={e => sF({...f,islem_tarihi:e.target.value})} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
        </FormGroup>
        <FormGroup label="AÇIKLAMA">
          <input value={f.aciklama} onChange={e => sF({...f,aciklama:e.target.value})} placeholder="İSTEĞE BAĞLI" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
        </FormGroup>
        <div style={{padding:8,background:`${C.warning}11`,borderRadius:6,fontSize:10,color:C.warning}}>
          MASRAF TUTARI KASA BAKİYESİNDEN OTOMATİK DÜŞÜLECEK.
        </div>
        <button onClick={go} disabled={loading} style={{...S.btn,...S.btnS,justifyContent:'center',padding:12,fontSize:12}}>
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
    <Modal open={open} onClose={onClose} title="EVRAK YÜKLE (PDF)" width="450px">
      {error && <div style={{padding:8,background:`${C.danger}18`,borderRadius:6,marginBottom:10,fontSize:11,color:C.danger}}>{error}</div>}
      <div style={{display:'grid',gap:10}}>
        <FormGroup label="EVRAK TÜRÜ">
          <select value={tur} onChange={e => setTur(e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
            <option value="">SEÇİNİZ</option>
            {EVRAK_T.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="PDF DOSYA">
          <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} style={{...S.input, padding:6,fontSize:11}}/>
        </FormGroup>
        {file && <div style={{fontSize:10,color:C.textSec}}>SEÇİLEN: {file.name} ({(file.size/1024).toFixed(0)} KB)</div>}
        <button onClick={go} disabled={loading} style={{...S.btn,...S.btnS,justifyContent:'center',padding:12,fontSize:12}}>
          {loading ? 'YÜKLENİYOR...' : 'EVRAK YÜKLE'}
        </button>
      </div>
    </Modal>
  );
};
