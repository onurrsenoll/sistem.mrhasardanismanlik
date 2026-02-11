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
      justifyContent: 'center',
      minHeight: 'calc(100vh - 100px)',
      position: 'relative'
    }}>
      {/* YARI ŞEFFAF WATERMARK LOGO */}
      {logoUrl && (
        <img src={logoUrl} alt="" style={{
          width: '50vw', maxWidth: 500, height: 'auto',
          opacity: MR.tema === 'koyu' ? 0.07 : 0.10,
          filter: MR.tema === 'koyu' ? 'brightness(0) invert(1)' : 'none',
          pointerEvents: 'none', userSelect: 'none'
        }}/>
      )}

      {/* SLOGAN - EN ALTTA SABİT */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        textAlign: 'center', padding: '16px 0',
        fontSize: 13, fontWeight: 700,
        color: C.textMuted, letterSpacing: 6,
        background: `linear-gradient(transparent, ${C.bg})`,
        zIndex: 10
      }}>
        HER ZAMAN FARK EDER
      </div>
    </div>
  );
};
