/**
 * MR HASAR DANIŞMANLIK - SOHBET PANELİ
 * FLOATING CHAT WIDGET
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useRef, useCallback} = React;

MR.SohbetPanel = ({user}) => {
  const {C, S, LIcon, api} = MR;
  const [acik, setAcik] = useState(false);
  const [ekran, setEkran] = useState('liste'); // liste | sohbet | yeni
  const [konusmalar, setKonusmalar] = useState([]);
  const [kullanicilar, setKullanicilar] = useState([]);
  const [mesajlar, setMesajlar] = useState([]);
  const [seciliKisi, setSeciliKisi] = useState(null);
  const [yeniMesaj, setYeniMesaj] = useState('');
  const [loading, setLoading] = useState(false);
  const [toplamOkunmamis, setToplamOkunmamis] = useState(0);
  const mesajRef = useRef(null);
  const intervalRef = useRef(null);

  // Konuşmaları yükle
  const konusmalariYukle = useCallback(async () => {
    const r = await api.sohbetKonusmalar();
    if (r?.success) {
      const items = r.data || [];
      setKonusmalar(items);
      setToplamOkunmamis(items.reduce((t, k) => t + (parseInt(k.okunmamis) || 0), 0));
    }
  }, []);

  // Panel açıkken konuşmaları yükle
  useEffect(() => {
    if (acik) {
      konusmalariYukle();
    }
  }, [acik]);

  // Periyodik güncelleme
  useEffect(() => {
    konusmalariYukle();
    intervalRef.current = setInterval(konusmalariYukle, 15000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Mesajları yükle
  const mesajlariYukle = useCallback(async (kisiId) => {
    const r = await api.sohbetMesajlar(kisiId);
    if (r?.success) {
      setMesajlar(r.data || []);
      setTimeout(() => {
        if (mesajRef.current) mesajRef.current.scrollTop = mesajRef.current.scrollHeight;
      }, 100);
    }
  }, []);

  // Sohbet açıkken mesajları güncelle
  useEffect(() => {
    if (ekran === 'sohbet' && seciliKisi) {
      const iv = setInterval(() => mesajlariYukle(seciliKisi.id), 5000);
      return () => clearInterval(iv);
    }
  }, [ekran, seciliKisi]);

  // Kişi seç ve sohbeti aç
  const sohbetAc = async (kisi) => {
    setSeciliKisi(kisi);
    setEkran('sohbet');
    setLoading(true);
    await mesajlariYukle(kisi.id);
    setLoading(false);
    konusmalariYukle();
  };

  // Mesaj gönder
  const mesajGonder = async () => {
    if (!yeniMesaj.trim() || !seciliKisi) return;
    const mesajText = yeniMesaj.trim();
    setYeniMesaj('');
    const r = await api.sohbetGonder(seciliKisi.id, mesajText);
    if (r?.success) {
      await mesajlariYukle(seciliKisi.id);
      konusmalariYukle();
    }
  };

  // Kullanıcı listesini yükle (yeni sohbet)
  const yeniSohbetAc = async () => {
    setEkran('yeni');
    const r = await api.sohbetKullanicilar();
    if (r?.success) setKullanicilar(r.data || []);
  };

  // Zaman formatla
  const zamanF = (t) => {
    if (!t) return '';
    const fark = Date.now() - new Date(t).getTime();
    const dk = Math.floor(fark / 60000);
    if (dk < 1) return 'ŞİMDİ';
    if (dk < 60) return dk + 'DK';
    const saat = Math.floor(dk / 60);
    if (saat < 24) return saat + 'SA';
    return Math.floor(saat / 24) + 'G';
  };

  const panelStyle = {
    position: 'fixed', bottom: 80, right: 24, width: 380, height: 520,
    background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`,
    boxShadow: '0 20px 60px rgba(0,0,0,.6)', zIndex: 9998,
    display: acik ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden'
  };

  return (
    <>
      {/* FLOATING BUTON */}
      <div onClick={() => setAcik(!acik)} style={{
        position: 'fixed', bottom: 24, right: 24, width: 56, height: 56,
        borderRadius: '50%', background: C.accent, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 30px rgba(37,99,235,.4)', zIndex: 9999,
        transition: 'transform .2s'
      }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
        <LIcon name={acik ? 'X' : 'MessageSquare'} size={24} color="#fff"/>
        {!acik && toplamOkunmamis > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: 22, height: 22, borderRadius: '50%',
            background: C.danger, color: '#fff', fontSize: 11, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid ' + C.bg
          }}>{toplamOkunmamis > 9 ? '9+' : toplamOkunmamis}</span>
        )}
      </div>

      {/* PANEL */}
      <div style={panelStyle}>
        {/* HEADER */}
        <div style={{
          padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: `${C.accent}11`
        }}>
          {ekran === 'liste' ? (
            <>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <LIcon name="MessageSquare" size={18} color={C.accent}/>
                <span style={{fontSize:14,fontWeight:700}}>SOHBET</span>
                {toplamOkunmamis > 0 && (
                  <span style={{
                    padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:700,
                    background:`${C.danger}22`,color:C.danger
                  }}>{toplamOkunmamis}</span>
                )}
              </div>
              <div onClick={yeniSohbetAc} style={{
                width:32,height:32,borderRadius:8,cursor:'pointer',
                background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center'
              }}>
                <LIcon name="Edit" size={14} color={C.accent}/>
              </div>
            </>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:10,flex:1}}>
              <div onClick={() => { setEkran('liste'); setSeciliKisi(null); }} style={{cursor:'pointer'}}>
                <LIcon name="ArrowLeft" size={18} color={C.textSec}/>
              </div>
              {ekran === 'sohbet' && seciliKisi ? (
                <div>
                  <div style={{fontSize:13,fontWeight:700}}>{seciliKisi.ad_soyad}</div>
                  <div style={{fontSize:10,color:C.textMuted}}>{(seciliKisi.rol || '').toUpperCase()}</div>
                </div>
              ) : (
                <span style={{fontSize:14,fontWeight:700}}>YENİ SOHBET</span>
              )}
            </div>
          )}
        </div>

        {/* İÇERİK */}
        <div style={{flex:1,overflow:'auto',padding: ekran === 'sohbet' ? 0 : '8px'}}>
          {/* KONUŞMA LİSTESİ */}
          {ekran === 'liste' && (
            konusmalar.length === 0 ? (
              <div style={{textAlign:'center',padding:40,color:C.textMuted}}>
                <LIcon name="MessageSquare" size={40} color={C.textMuted} style={{opacity:.3,marginBottom:12}}/>
                <div style={{fontSize:13,fontWeight:600,color:C.textSec,marginBottom:4}}>HENÜZ SOHBET YOK</div>
                <div style={{fontSize:11}}>YENİ SOHBET BAŞLATMAK İÇİN SAĞ ÜSTTEKİ BUTONA TIKLAYIN</div>
              </div>
            ) : konusmalar.map(k => (
              <div key={k.id} onClick={() => sohbetAc(k)} style={{
                display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
                borderRadius:10,cursor:'pointer',margin:'2px 4px',
                background: parseInt(k.okunmamis) > 0 ? `${C.accent}08` : 'transparent',
                transition:'all .15s'
              }}
                onMouseEnter={e => e.currentTarget.style.background = `${C.accent}11`}
                onMouseLeave={e => e.currentTarget.style.background = parseInt(k.okunmamis) > 0 ? `${C.accent}08` : 'transparent'}>
                <div style={{
                  width:40,height:40,borderRadius:12,flexShrink:0,
                  background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:14,fontWeight:700,color:C.accent
                }}>{(k.ad_soyad || '?')[0]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:12,fontWeight: parseInt(k.okunmamis) > 0 ? 700 : 500}}>{k.ad_soyad}</span>
                    <span style={{fontSize:9,color:C.textMuted}}>{zamanF(k.son_mesaj_tarih)}</span>
                  </div>
                  <div style={{fontSize:11,color:C.textMuted,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginTop:2}}>
                    {k.son_mesaj || '...'}
                  </div>
                </div>
                {parseInt(k.okunmamis) > 0 && (
                  <span style={{
                    width:20,height:20,borderRadius:'50%',flexShrink:0,
                    background:C.accent,color:'#fff',fontSize:10,fontWeight:700,
                    display:'flex',alignItems:'center',justifyContent:'center'
                  }}>{k.okunmamis}</span>
                )}
              </div>
            ))
          )}

          {/* YENİ SOHBET - KULLANICI SEÇ */}
          {ekran === 'yeni' && (
            kullanicilar.length === 0 ? (
              <div style={{textAlign:'center',padding:40,color:C.textMuted}}>
                <div style={{fontSize:12}}>KULLANICI BULUNAMADI</div>
              </div>
            ) : kullanicilar.map(k => (
              <div key={k.id} onClick={() => sohbetAc(k)} style={{
                display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
                borderRadius:10,cursor:'pointer',margin:'2px 4px',transition:'all .15s'
              }}
                onMouseEnter={e => e.currentTarget.style.background = `${C.accent}11`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{
                  width:36,height:36,borderRadius:10,
                  background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:13,fontWeight:700,color:C.accent
                }}>{(k.ad_soyad || '?')[0]}</div>
                <div>
                  <div style={{fontSize:12,fontWeight:600}}>{k.ad_soyad}</div>
                  <div style={{fontSize:10,color:C.textMuted}}>{(k.rol || '').toUpperCase()}</div>
                </div>
              </div>
            ))
          )}

          {/* SOHBET MESAJLARI */}
          {ekran === 'sohbet' && (
            <div ref={mesajRef} style={{height:'100%',overflow:'auto',padding:'12px 14px',display:'flex',flexDirection:'column',gap:6}}>
              {loading ? (
                <div style={{textAlign:'center',padding:40}}>
                  <div style={{width:30,height:30,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.accent}`,borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto'}}/>
                </div>
              ) : mesajlar.length === 0 ? (
                <div style={{textAlign:'center',padding:40,color:C.textMuted}}>
                  <LIcon name="MessageSquare" size={32} color={C.textMuted} style={{opacity:.3,marginBottom:8}}/>
                  <div style={{fontSize:12}}>HENÜZ MESAJ YOK</div>
                  <div style={{fontSize:10,marginTop:4}}>İLK MESAJINIZI GÖNDERİN</div>
                </div>
              ) : mesajlar.map((m, i) => {
                const bendenMi = parseInt(m.gonderen_id) === user.id;
                return (
                  <div key={m.id || i} style={{
                    display:'flex',justifyContent:bendenMi?'flex-end':'flex-start',marginBottom:2
                  }}>
                    <div style={{
                      maxWidth:'75%',padding:'8px 12px',borderRadius:12,
                      background: bendenMi ? C.accent : C.bgHover,
                      color: bendenMi ? '#fff' : C.text,
                      borderBottomRightRadius: bendenMi ? 4 : 12,
                      borderBottomLeftRadius: bendenMi ? 12 : 4
                    }}>
                      <div style={{fontSize:12,lineHeight:1.4,wordBreak:'break-word'}}>{m.baslik}</div>
                      <div style={{fontSize:9,marginTop:4,opacity:.7,textAlign:'right'}}>
                        {m.created_at ? new Date(m.created_at).toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'}) : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MESAJ GİRİŞ ALANI */}
        {ekran === 'sohbet' && seciliKisi && (
          <div style={{
            padding:'10px 12px',borderTop:`1px solid ${C.border}`,
            display:'flex',gap:8,alignItems:'center'
          }}>
            <input
              value={yeniMesaj}
              onChange={e => setYeniMesaj(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); mesajGonder(); } }}
              placeholder="MESAJ YAZIN..."
              style={{
                flex:1,padding:'10px 14px',background:C.bgInput,
                border:`1px solid ${C.borderLight}`,borderRadius:10,
                color:C.text,fontSize:12,outline:'none'
              }}
              autoFocus
            />
            <div onClick={mesajGonder} style={{
              width:38,height:38,borderRadius:10,flexShrink:0,
              background: yeniMesaj.trim() ? C.accent : C.borderLight,
              display:'flex',alignItems:'center',justifyContent:'center',
              cursor: yeniMesaj.trim() ? 'pointer' : 'default',
              transition:'all .2s'
            }}>
              <LIcon name="Send" size={16} color={yeniMesaj.trim() ? '#fff' : C.textMuted}/>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
