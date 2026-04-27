const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback} = React;

function zamanOnce(tarih) {
  const fark = Date.now() - new Date(tarih).getTime();
  const dk = Math.floor(fark / 60000);
  if (dk < 1) return 'AZ ÖNCE';
  if (dk < 60) return dk + ' DAKİKA ÖNCE';
  const saat = Math.floor(dk / 60);
  if (saat < 24) return saat + ' SAAT ÖNCE';
  const gun = Math.floor(saat / 24);
  if (gun < 7) return gun + ' GÜN ÖNCE';
  return new Date(tarih).toLocaleDateString('tr-TR');
}

MR.BildirimPage = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, EmptyState, Loading, Modal, FormGroup, Confirm, api} = MR;

  const [bildirimler, setBildirimler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState('');
  const [silOnay, setSilOnay] = useState(null);
  const [modalAcik, setModalAcik] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [kullanicilar, setKullanicilar] = useState([]);

  const bosForm = {hedef_id: '', baslik: '', mesaj: '', tur: 'bilgi'};
  const [form, setForm] = useState({...bosForm});

  const yukle = useCallback(async () => {
    setLoading(true);
    const p = {limit: 500};
    if (filtre === 'okunmamis') p.okunmamis = 1;
    const r = await api.bildirimList(p);
    if (r?.success) {
      setBildirimler(r.data?.items || r.data || []);
    }
    setLoading(false);
  }, [filtre]);

  useEffect(() => { yukle(); }, [yukle]);

  const up = (k, v) => setForm(p => ({...p, [k]: v}));

  const isAdmin = user?.rol === 'admin' || user?.rol === 'yonetici';

  // ═══ KULLANICI LİSTESİ YÜKLE (ADMIN İÇİN) ═══
  useEffect(() => {
    if (isAdmin) {
      (async () => {
        const r = await api.kullaniciList({limit: 100});
        if (r?.success) {
          setKullanicilar(r.data?.items || r.data || []);
        }
      })();
    }
  }, [isAdmin]);

  // ═══ İSTATİSTİKLER ═══
  const toplam = bildirimler.length;
  const okunmamis = bildirimler.filter(b => !b.okundu).length;
  const okunan = toplam - okunmamis;

  // ═══ FİLTRELENMİŞ LİSTE ═══
  const filtrelenmis = bildirimler.filter(b => {
    if (filtre === 'okunmamis') return !b.okundu;
    if (filtre === 'okunan') return !!b.okundu;
    return true;
  });

  // ═══ TÜR İKON VE RENK ═══
  const turIkon = (tur) => {
    if (tur === 'bilgi') return {icon: 'Info', color: C.accent};
    if (tur === 'uyari') return {icon: 'AlertTriangle', color: C.warning};
    if (tur === 'basari') return {icon: 'CheckCircle', color: C.success};
    if (tur === 'hata') return {icon: 'XCircle', color: C.danger};
    return {icon: 'Bell', color: C.accent};
  };

  const turLabel = (tur) => {
    if (tur === 'bilgi') return 'BİLGİ';
    if (tur === 'uyari') return 'UYARI';
    if (tur === 'basari') return 'BAŞARI';
    if (tur === 'hata') return 'HATA';
    return 'BİLGİ';
  };

  // ═══ OKUNDU İŞARETLE ═══
  const okunduIsaretle = async (bildirim) => {
    if (bildirim.okundu) return;
    const r = await api.bildirimOku({id: bildirim.id});
    if (r?.success) yukle();
  };

  // ═══ TÜMÜNÜ OKUNDU İŞARETLE ═══
  const tumunuOku = async () => {
    const r = await api.bildirimOku({tumu: true});
    if (r?.success) yukle();
  };

  // ═══ SİL ═══
  const sil = async () => {
    if (!silOnay) return;
    const r = await api.bildirimDelete(silOnay.id);
    if (r?.success) {
      setSilOnay(null);
      yukle();
    }
  };

  // ═══ BİLDİRİM GÖNDER ═══
  const gonder = async () => {
    if (!form.baslik.trim()) { setError('BAŞLIK ZORUNLUDUR'); return; }
    if (!form.mesaj.trim()) { setError('MESAJ ZORUNLUDUR'); return; }
    if (!form.hedef_id) { setError('HEDEF KULLANICI SEÇİNİZ'); return; }
    setSaving(true); setError('');
    const veri = {...form};
    if (veri.hedef_id === 'tumu') {
      // TÜM KULLANICILARA GÖNDER
      let basarili = true;
      for (const k of kullanicilar) {
        const r = await api.bildirimCreate({...veri, hedef_id: k.id});
        if (!r?.success) basarili = false;
      }
      if (basarili) {
        setModalAcik(false);
        setForm({...bosForm});
        yukle();
      } else {
        setError('BAZI BİLDİRİMLER GÖNDERİLEMEDİ');
      }
    } else {
      const r = await api.bildirimCreate(veri);
      if (r?.success) {
        setModalAcik(false);
        setForm({...bosForm});
        yukle();
      } else {
        setError(r?.error || 'BİLDİRİM GÖNDERİLEMEDİ');
      }
    }
    setSaving(false);
  };

  // ═══ FİLTRE SEKMELERİ ═══
  const filtreler = [
    {v: '', l: 'TÜMÜ', sayi: toplam},
    {v: 'okunmamis', l: 'OKUNMAMIŞ', sayi: okunmamis},
    {v: 'okunan', l: 'OKUNAN', sayi: okunan}
  ];

  return (
    <div className="fade-in">
      {/* ═══ İSTATİSTİK KARTLARI ═══ */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
        <StatCard icon="Bell" label="TOPLAM" value={toplam} color={C.accent}/>
        <StatCard icon="BellRing" label="OKUNMAMIŞ" value={okunmamis} color={C.warning}/>
        <StatCard icon="BellOff" label="OKUNAN" value={okunan} color={C.success}/>
      </div>

      <div style={S.card}>
        {/* ═══ BAŞLIK ═══ */}
        <div style={{...S.cardHead, justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <LIcon name="Bell" size={16} color={C.accent}/>
            <span style={{fontSize:14,fontWeight:700}}>BİLDİRİMLER</span>
            {okunmamis > 0 && <Badge text={okunmamis + ' OKUNMAMIŞ'} color={C.warning}/>}
          </div>
          <div style={{display:'flex',gap:8}}>
            {okunmamis > 0 && (
              <button style={{...S.btn,...S.btnW,fontSize:11}} onClick={tumunuOku}>
                <LIcon name="CheckCheck" size={14} color="#000"/> TÜMÜNÜ OKUNDU İŞARETLE
              </button>
            )}
            {(isAdmin || (MR.hasYetki && MR.hasYetki(user, 'bildirim', 'bildirim-gonder'))) && (
              <button style={{...S.btn,...S.btnP,fontSize:11}} onClick={() => { setError(''); setForm({...bosForm}); setModalAcik(true); }}>
                <LIcon name="Send" size={14} color="#fff"/> BİLDİRİM GÖNDER
              </button>
            )}
          </div>
        </div>

        {/* ═══ FİLTRE SEKMELERİ ═══ */}
        <div style={{padding:'12px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:6}}>
          {filtreler.map(f => (
            <span key={f.v||'all'} onClick={() => setFiltre(f.v)}
              style={{
                padding:'5px 14px',borderRadius:20,fontSize:11,fontWeight:filtre===f.v?700:400,
                cursor:'pointer',
                background:filtre===f.v?`${C.accent}22`:'transparent',
                color:filtre===f.v?C.accent:C.textSec,
                border:`1px solid ${filtre===f.v?C.accent+'44':C.border}`,
                display:'flex',alignItems:'center',gap:6
              }}>
              {f.l}
              <span style={{
                fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:10,
                background:filtre===f.v?`${C.accent}33`:`${C.border}`,
                color:filtre===f.v?C.accent:C.textMuted
              }}>
                {f.sayi}
              </span>
            </span>
          ))}
        </div>

        {/* ═══ BİLDİRİM LİSTESİ ═══ */}
        {loading ? <Loading/> : filtrelenmis.length === 0 ? (
          <EmptyState icon="Bell" title="BİLDİRİM BULUNAMADI" desc={
            filtre === 'okunmamis' ? 'TÜM BİLDİRİMLER OKUNMUŞ' :
            filtre === 'okunan' ? 'HENÜZ OKUNAN BİLDİRİM YOK' :
            'HENÜZ BİLDİRİM BULUNMUYOR'
          }/>
        ) : (
          <div style={S.cardBody}>
            {filtrelenmis.map((b, i) => {
              const {icon, color} = turIkon(b.tur);
              const okunmadi = !b.okundu;

              return (
                <div key={i}
                  onClick={() => okunduIsaretle(b)}
                  style={{
                    display:'flex', alignItems:'flex-start', gap:14, padding:'14px 16px',
                    borderRadius:10, marginBottom:8, cursor:'pointer',
                    background: okunmadi ? `${C.accent}08` : 'transparent',
                    border: `1px solid ${okunmadi ? C.accent + '33' : C.border}`,
                    transition:'all .2s',
                    position:'relative'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = `${C.accent}11`}
                  onMouseLeave={e => e.currentTarget.style.background = okunmadi ? `${C.accent}08` : 'transparent'}
                >
                  {/* OKUNMADI NOKTASI */}
                  {okunmadi && (
                    <div style={{
                      position:'absolute', top:8, right:8,
                      width:8, height:8, borderRadius:'50%',
                      background:C.accent
                    }}/>
                  )}

                  {/* İKON */}
                  <div style={{
                    width:40, height:40, borderRadius:10, flexShrink:0,
                    background:`${color}22`,
                    display:'flex', alignItems:'center', justifyContent:'center'
                  }}>
                    <LIcon name={icon} size={18} color={color}/>
                  </div>

                  {/* İÇERİK */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{
                        fontSize:13, fontWeight: okunmadi ? 700 : 500,
                        color: okunmadi ? C.text : C.textSec
                      }}>
                        {b.baslik}
                      </span>
                      <Badge text={turLabel(b.tur)} color={color}/>
                    </div>
                    <div style={{
                      fontSize:12, color: okunmadi ? C.textSec : C.textMuted,
                      lineHeight:1.5, marginBottom:6
                    }}>
                      {b.mesaj}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontSize:10,color:C.textMuted}}>
                        <LIcon name="Clock" size={10} color={C.textMuted} style={{marginRight:4,verticalAlign:'middle'}}/>
                        {b.created_at ? zamanOnce(b.created_at) : b.tarih ? zamanOnce(b.tarih) : '-'}
                      </span>
                      {b.gonderen_adi && (
                        <span style={{fontSize:10,color:C.textMuted}}>
                          <LIcon name="User" size={10} color={C.textMuted} style={{marginRight:4,verticalAlign:'middle'}}/>
                          {b.gonderen_adi}
                        </span>
                      )}
                      {okunmadi && (
                        <span style={{fontSize:9,color:C.accent,fontWeight:600}}>OKUNMADI</span>
                      )}
                    </div>
                  </div>

                  {/* SİL BUTONU */}
                  <div style={{flexShrink:0,display:'flex',alignItems:'center',gap:6}}>
                    {okunmadi && (
                      <button
                        style={{...S.btn,...S.btnG,fontSize:9,padding:'5px 10px'}}
                        onClick={(e) => { e.stopPropagation(); okunduIsaretle(b); }}>
                        <LIcon name="Eye" size={10} color={C.textSec}/> OKU
                      </button>
                    )}
                    <button
                      style={{...S.btn,...S.btnD,fontSize:9,padding:'5px 10px'}}
                      onClick={(e) => { e.stopPropagation(); setSilOnay(b); }}>
                      <LIcon name="Trash2" size={10} color="#fff"/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
         BİLDİRİM GÖNDER MODAL (SADECE ADMİN)
         ═══════════════════════════════════════════════════════ */}
      <Modal open={modalAcik} onClose={() => { setModalAcik(false); setForm({...bosForm}); }} title="BİLDİRİM GÖNDER" width="500px">
        {error && (
          <div style={{padding:10,background:`${C.danger}22`,border:`1px solid ${C.danger}44`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger}}>{error}</div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="HEDEF KULLANICI *">
            <select style={S.select} value={form.hedef_id} onChange={e => up('hedef_id', e.target.value)}>
              <option value="">SEÇİNİZ</option>
              <option value="tumu">TÜMÜ</option>
              {kullanicilar.map(k => (
                <option key={k.id} value={k.id}>{k.ad_soyad || k.email}</option>
              ))}
            </select>
          </FormGroup>
          <FormGroup label="TÜR">
            <select style={S.select} value={form.tur} onChange={e => up('tur', e.target.value)}>
              <option value="bilgi">BİLGİ</option>
              <option value="uyari">UYARI</option>
              <option value="basari">BAŞARI</option>
              <option value="hata">HATA</option>
            </select>
          </FormGroup>
          <FormGroup label="BAŞLIK *" full>
            <input style={S.input} value={form.baslik} onChange={e => up('baslik', e.target.value)} placeholder="BİLDİRİM BAŞLIĞI"/>
          </FormGroup>
          <FormGroup label="MESAJ *" full>
            <textarea style={{...S.input,minHeight:100}} value={form.mesaj} onChange={e => up('mesaj', e.target.value)} placeholder="BİLDİRİM MESAJI..."/>
          </FormGroup>
        </div>

        {/* ÖNİZLEME */}
        {form.baslik && form.mesaj && (
          <div style={{marginTop:16,padding:14,borderRadius:10,background:C.bgHover,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:10,color:C.textMuted,fontWeight:600,marginBottom:8}}>ÖNİZLEME</div>
            <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
              <div style={{
                width:32,height:32,borderRadius:8,flexShrink:0,
                background:`${turIkon(form.tur).color}22`,
                display:'flex',alignItems:'center',justifyContent:'center'
              }}>
                <LIcon name={turIkon(form.tur).icon} size={16} color={turIkon(form.tur).color}/>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700}}>{form.baslik}</div>
                <div style={{fontSize:11,color:C.textSec,marginTop:2}}>{form.mesaj}</div>
              </div>
            </div>
          </div>
        )}

        <div style={{marginTop:20,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => { setModalAcik(false); setForm({...bosForm}); }}>İPTAL</button>
          <button style={{...S.btn,...S.btnP}} onClick={gonder} disabled={saving}>
            <LIcon name="Send" size={14} color="#fff"/> {saving ? 'GÖNDERİLİYOR...' : 'GÖNDER'}
          </button>
        </div>
      </Modal>

      {/* ═══ SİLME ONAY ═══ */}
      <Confirm
        open={!!silOnay}
        message={'BU BİLDİRİMİ SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ? "' + (silOnay?.baslik || '') + '"'}
        onConfirm={sil}
        onCancel={() => setSilOnay(null)}
      />
    </div>
  );
};
