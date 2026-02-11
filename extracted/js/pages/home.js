const MR = window.MR || (window.MR = {});
const {useState, useEffect} = React;

MR.HomePage = ({setPage, user}) => {
  const {C, api} = MR;
  const [logoUrl, setLogoUrl] = useState(MR.logoUrl || '');

  useEffect(() => {
    if (MR.logoUrl) { setLogoUrl(MR.logoUrl); return; }
    (async () => {
      try {
        const r = await api.ayarlarList();
        if (r?.success && r.data?.logo_url) {
          setLogoUrl(r.data.logo_url);
          MR.logoUrl = r.data.logo_url;
        }
      } catch(e) {}
    })();
  }, []);

  return (
    <div className="fade-in" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 'calc(100vh - 140px)',
      position: 'relative'
    }}>
      {/* YARI ŞEFFAF WATERMARK LOGO */}
      {logoUrl && (
        <img src={logoUrl} alt="" style={{
          maxWidth: '65vw', maxHeight: '65vh', width: 'auto', height: 'auto',
          opacity: MR.tema === 'koyu' ? 0.05 : 0.07,
          filter: MR.tema === 'koyu' ? 'brightness(0) invert(1)' : 'none',
          pointerEvents: 'none', userSelect: 'none'
        }}/>
      )}

      {/* SLOGAN */}
      <div style={{
        position: 'absolute', bottom: 30, left: 0, right: 0,
        textAlign: 'center', fontSize: 14, fontWeight: 700,
        color: C.textMuted, letterSpacing: 6
      }}>
        HER ZAMAN FARK EDER
      </div>
    </div>
  );
};
