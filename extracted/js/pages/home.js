const MR = window.MR || (window.MR = {});
const {useState, useEffect, useMemo} = React;

MR.HomePage = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, api, fmt} = MR;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ajandaItems, setAjandaItems] = useState([]);
  const [sonDosyalar, setSonDosyalar] = useState([]);
  const [crmSon, setCrmSon] = useState([]);

  useEffect(() => {
    (async () => {
      const [dash, aj, ds, crm] = await Promise.all([
        api.dashboard().catch(() => null),
        api.ajandaList({limit: 5}).catch(() => null),
        api.dosyaList({limit: 5, sort: 'created_at', order: 'desc'}).catch(() => null),
        api.crmList({limit: 5, sort: 'created_at', order: 'desc'}).catch(() => null)
      ]);
      if (dash?.success) setData(dash.data || {});
      if (aj?.success) setAjandaItems((aj.data?.items || aj.data || []).slice(0, 5));
      if (ds?.success) setSonDosyalar((ds.data?.items || ds.data || []).slice(0, 5));
      if (crm?.success) setCrmSon((crm.data?.items || crm.data || []).slice(0, 5));
      setLoading(false);
    })();
  }, []);

  const saat = new Date().getHours();
  const selamlama = saat < 12 ? 'GÜNAYDIM' : saat < 18 ? 'İYİ GÜNLER' : 'İYİ AKŞAMLAR';

  /* AŞAMA RENK */
  const asamaRenk = (a) => {
    if (!a) return C.textMuted;
    const al = a.toLowerCase();
    if (al.includes('kapan') || al.includes('tamamlan')) return C.success;
    if (al.includes('dava') || al.includes('mahkeme') || al.includes('tahkim')) return C.purple;
    if (al.includes('bekle') || al.includes('değerlen')) return C.warning;
    if (al.includes('iptal') || al.includes('red')) return C.danger;
    return C.accent;
  };

  /* CRM DURUM RENK */
  const crmRenk = (d) => {
    if (!d) return C.textMuted;
    const dl = d.toLowerCase();
    if (dl.includes('yeni') || dl.includes('ilk')) return C.accent;
    if (dl.includes('görüş') || dl.includes('takip')) return C.warning;
    if (dl.includes('dönüş') || dl.includes('kazan')) return C.success;
    if (dl.includes('iptal') || dl.includes('kayıp')) return C.danger;
    return C.cyan;
  };

  const toplam_dosya = data?.toplam_dosya || data?.dosya_sayisi || 0;
  const aktif_dosya = data?.aktif_dosya || data?.acik_dosya || 0;
  const toplam_crm = data?.toplam_crm || data?.crm_sayisi || 0;
  const toplam_gelir = data?.toplam_gelir || 0;
  const toplam_masraf = data?.toplam_masraf || 0;
  const bekleyen_gorev = data?.bekleyen_gorev || data?.ajanda_bekleyen || 0;

  return (
    <div className="fade-in" style={{paddingTop: 10}}>
      {/* SELAMLAMA */}
      <div style={{marginBottom: 24}}>
        <div style={{fontSize: 22, fontWeight: 800, letterSpacing: 0.5}}>
          {selamlama}, {(user?.ad_soyad || 'KULLANICI').split(' ')[0]}
        </div>
        <div style={{fontSize: 12, color: C.textMuted, marginTop: 4}}>
          {new Date().toLocaleDateString('tr-TR', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}).toUpperCase()}
        </div>
      </div>

      {loading ? <Loading/> : (
        <>
          {/* İSTATİSTİK KARTLARI */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24}}>
            <div onClick={() => setPage('dosya-liste')} style={{cursor: 'pointer'}}>
              <StatCard icon="FolderOpen" label="TOPLAM DOSYA" value={toplam_dosya} color={C.accent}/>
            </div>
            <div onClick={() => setPage('dosya-liste')} style={{cursor: 'pointer'}}>
              <StatCard icon="FolderOpen" label="AKTİF DOSYA" value={aktif_dosya} color={C.success}/>
            </div>
            <div onClick={() => setPage('crm-liste')} style={{cursor: 'pointer'}}>
              <StatCard icon="Users" label="CRM KAYIT" value={toplam_crm} color={C.purple}/>
            </div>
            <div onClick={() => setPage('muhasebe-gelir')} style={{cursor: 'pointer'}}>
              <StatCard icon="TrendingUp" label="TOPLAM GELİR" value={fmt(toplam_gelir)} color={C.success}/>
            </div>
            <div onClick={() => setPage('ajanda')} style={{cursor: 'pointer'}}>
              <StatCard icon="CalendarDays" label="BEKLEYEN GÖREV" value={bekleyen_gorev} color={C.warning}/>
            </div>
          </div>

          {/* ANA GRID */}
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}}>
            {/* SOL: SON DOSYALAR */}
            <div style={S.card}>
              <SectionTitle icon="FolderOpen" title="SON DOSYALAR"
                right={
                  <div onClick={() => setPage('dosya-liste')} style={{cursor: 'pointer', fontSize: 11, color: C.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4}}>
                    TÜMÜNÜ GÖR <LIcon name="ChevronRight" size={12} color={C.accent}/>
                  </div>
                }/>
              <div style={S.cardBody}>
                {sonDosyalar.length === 0 ? (
                  <div style={{textAlign: 'center', padding: 20, color: C.textMuted, fontSize: 12}}>
                    <LIcon name="FolderOpen" size={28} color={C.textMuted} style={{opacity: 0.3, marginBottom: 8}}/>
                    <div>HENÜZ DOSYA KAYDI YOK</div>
                  </div>
                ) : (
                  <div>
                    {sonDosyalar.map((d, i) => (
                      <div key={d.id || i}
                        onClick={() => setPage('dosya-detay-' + d.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 0', borderBottom: i < sonDosyalar.length - 1 ? `1px solid ${C.border}` : 'none',
                          cursor: 'pointer', transition: 'all .15s'
                        }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10,
                          background: `${d.dosya_turu === 'ADK' ? C.accent : C.purple}15`,
                          border: `1px solid ${d.dosya_turu === 'ADK' ? C.accent : C.purple}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <LIcon name={d.dosya_turu === 'ADK' ? 'Car' : 'Heart'} size={16}
                            color={d.dosya_turu === 'ADK' ? C.accent : C.purple}/>
                        </div>
                        <div style={{flex: 1, minWidth: 0}}>
                          <div style={{fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {d.dosya_no || `#${d.id}`} - {d.magdur_adi || '-'}
                          </div>
                          <div style={{fontSize: 10, color: C.textMuted, marginTop: 2}}>
                            {d.sigorta_sirket || '-'} | {d.plaka || '-'}
                          </div>
                        </div>
                        <div style={{textAlign: 'right', flexShrink: 0}}>
                          <Badge text={d.dosya_turu || '-'} color={d.dosya_turu === 'ADK' ? C.accent : C.purple}/>
                          <div style={{fontSize: 9, color: C.textMuted, marginTop: 4}}>
                            {d.created_at ? d.created_at.split(' ')[0] : '-'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SAĞ: SON CRM KAYITLARI */}
            <div style={S.card}>
              <SectionTitle icon="Users" title="SON CRM KAYITLARI"
                right={
                  <div onClick={() => setPage('crm-liste')} style={{cursor: 'pointer', fontSize: 11, color: C.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4}}>
                    TÜMÜNÜ GÖR <LIcon name="ChevronRight" size={12} color={C.accent}/>
                  </div>
                }/>
              <div style={S.cardBody}>
                {crmSon.length === 0 ? (
                  <div style={{textAlign: 'center', padding: 20, color: C.textMuted, fontSize: 12}}>
                    <LIcon name="Users" size={28} color={C.textMuted} style={{opacity: 0.3, marginBottom: 8}}/>
                    <div>HENÜZ CRM KAYDI YOK</div>
                  </div>
                ) : (
                  <div>
                    {crmSon.map((c, i) => (
                      <div key={c.id || i}
                        onClick={() => setPage('crm-detay-' + c.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 0', borderBottom: i < crmSon.length - 1 ? `1px solid ${C.border}` : 'none',
                          cursor: 'pointer'
                        }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10,
                          background: `${C.cyan}15`, border: `1px solid ${C.cyan}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          fontSize: 14, fontWeight: 800, color: C.cyan
                        }}>
                          {(c.ad_soyad || 'M')[0]}
                        </div>
                        <div style={{flex: 1, minWidth: 0}}>
                          <div style={{fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {c.ad_soyad || '-'}
                          </div>
                          <div style={{fontSize: 10, color: C.textMuted, marginTop: 2}}>
                            {c.telefon || '-'} | {c.kaynak || c.dosya_turu || '-'}
                          </div>
                        </div>
                        <div style={{textAlign: 'right', flexShrink: 0}}>
                          <Badge text={c.durum || c.asama || 'YENİ'} color={crmRenk(c.durum || c.asama)}/>
                          <div style={{fontSize: 9, color: C.textMuted, marginTop: 4}}>
                            {c.created_at ? c.created_at.split(' ')[0] : '-'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ALT: AJANDA / GÖREVLER */}
          <div style={{...S.card, marginTop: 20}}>
            <SectionTitle icon="CalendarDays" title="YAKINLAŞAN GÖREVLER"
              right={
                <div onClick={() => setPage('ajanda')} style={{cursor: 'pointer', fontSize: 11, color: C.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4}}>
                  TÜMÜNÜ GÖR <LIcon name="ChevronRight" size={12} color={C.accent}/>
                </div>
              }/>
            <div style={S.cardBody}>
              {ajandaItems.length === 0 ? (
                <div style={{textAlign: 'center', padding: 20, color: C.textMuted, fontSize: 12}}>
                  <LIcon name="CalendarDays" size={28} color={C.textMuted} style={{opacity: 0.3, marginBottom: 8}}/>
                  <div>YAKLAŞAN GÖREV BULUNMAMAKTADIR</div>
                </div>
              ) : (
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12}}>
                  {ajandaItems.map((g, i) => {
                    const oncelikRenk = g.oncelik === 'yuksek' ? C.danger : g.oncelik === 'orta' ? C.warning : C.success;
                    const durumRenk = g.durum === 'tamamlandi' ? C.success : g.durum === 'iptal' ? C.danger : C.accent;
                    return (
                      <div key={g.id || i} onClick={() => setPage('ajanda')} style={{
                        padding: 14, borderRadius: 10, cursor: 'pointer',
                        background: C.bgHover, border: `1px solid ${C.border}`,
                        transition: 'all .15s'
                      }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                          <Badge text={g.durum === 'tamamlandi' ? 'TAMAMLANDI' : g.durum === 'iptal' ? 'İPTAL' : 'BEKLEYEN'} color={durumRenk}/>
                          <span style={{fontSize: 9, color: C.textMuted}}>{g.tarih || g.baslangic_tarihi || '-'}</span>
                        </div>
                        <div style={{fontSize: 12, fontWeight: 700, marginBottom: 4}}>{g.baslik || g.konu || '-'}</div>
                        {g.aciklama && <div style={{fontSize: 10, color: C.textSec, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{g.aciklama}</div>}
                        <div style={{display: 'flex', gap: 6, marginTop: 8}}>
                          <div style={{width: 8, height: 8, borderRadius: '50%', background: oncelikRenk, marginTop: 2}}/>
                          <span style={{fontSize: 9, color: C.textMuted}}>
                            {g.oncelik === 'yuksek' ? 'YÜKSEK ÖNCELİK' : g.oncelik === 'orta' ? 'ORTA ÖNCELİK' : 'DÜŞÜK ÖNCELİK'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* HIZLI ERİŞİM BUTONLARI */}
          <div style={{marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap'}}>
            {[
              {label: 'YENİ DOSYA', icon: 'Plus', page: 'dosya-yeni', color: C.accent},
              {label: 'YENİ CRM', icon: 'UserPlus', page: 'crm-yeni', color: C.purple},
              {label: 'HESAPLAMA', icon: 'Calculator', page: 'hesap-adk', color: C.success},
              {label: 'MUHASEBE', icon: 'Landmark', page: 'muhasebe-gelir', color: C.warning},
              {label: 'AJANDA', icon: 'CalendarDays', page: 'ajanda', color: C.cyan}
            ].map((b, i) => (
              <div key={i} onClick={() => setPage(b.page)} style={{
                padding: '12px 20px', borderRadius: 10, cursor: 'pointer',
                background: `${b.color}12`, border: `1px solid ${b.color}30`,
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12, fontWeight: 700, color: b.color, transition: 'all .2s'
              }}
                onMouseEnter={e => e.currentTarget.style.background = `${b.color}22`}
                onMouseLeave={e => e.currentTarget.style.background = `${b.color}12`}>
                <LIcon name={b.icon} size={16} color={b.color}/> {b.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
