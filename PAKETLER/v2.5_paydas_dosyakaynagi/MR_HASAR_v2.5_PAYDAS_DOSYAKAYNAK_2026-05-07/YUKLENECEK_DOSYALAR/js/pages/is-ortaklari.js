/* ============================================================
   MR HASAR — İŞ ORTAKLARI (v2.5)
   PERSONEL + AVUKAT 2 sekmeli sayfa
   PAYDAŞLAR > İŞ ORTAKLARI menüsünden çağrılır.
   Sayfanın kendi tablo/form mantığı yok — mevcut PersonelPage
   ve OrtaklarPage'in IsOrtaklari (avukat) component'lerini reuse eder.
   ============================================================ */
const MR = window.MR || (window.MR = {});
const {useState} = React;

MR.IsOrtaklariPage = ({setPage, user, subPage}) => {
  const {C, S, LIcon} = MR;
  const aktifSekme = subPage || 'personel';

  const sekmeler = [
    {key:'personel', label:'PERSONEL',  icon:'Users'},
    {key:'avukat',   label:'AVUKAT',    icon:'Scale'}
  ];

  return (
    <div className="fade-in">
      {/* SEKME BAR */}
      <div style={{display:'flex',gap:4,marginBottom:20,background:C.bgCard,borderRadius:12,padding:6,border:`1px solid ${C.border}`}}>
        {sekmeler.map(s => {
          const aktif = aktifSekme === s.key;
          return (
            <div key={s.key}
              onClick={() => setPage(s.key === 'personel' ? 'is-ortaklari' : 'is-ortaklari-' + s.key)}
              style={{
                flex:1, padding:'12px 8px', borderRadius:8, cursor:'pointer', textAlign:'center',
                background: aktif ? `${C.accent}22` : 'transparent',
                border: `1px solid ${aktif ? C.accent + '44' : 'transparent'}`,
                transition:'all .2s'
              }}
              onMouseEnter={e => { if(!aktif) e.currentTarget.style.background = C.bgHover; }}
              onMouseLeave={e => { if(!aktif) e.currentTarget.style.background = 'transparent'; }}>
              <LIcon name={s.icon} size={16} color={aktif ? C.accent : C.textMuted} style={{marginBottom:4}}/>
              <div style={{fontSize:11,fontWeight:aktif?700:500,color:aktif?C.accent:C.textSec,marginTop:4,letterSpacing:0.5}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* SEKME İÇERİKLERİ */}
      {aktifSekme === 'personel' && (
        MR.PersonelPage
          ? <MR.PersonelPage setPage={setPage} user={user} subPage="liste"/>
          : <div style={{padding:40,textAlign:'center',color:C.textSec}}>Personel modülü yüklenmemiş.</div>
      )}
      {aktifSekme === 'avukat' && (
        MR.IsOrtaklariView
          ? <MR.IsOrtaklariView setPage={setPage} user={user}/>
          : <div style={{padding:40,textAlign:'center',color:C.textSec}}>Ortaklar modülü yüklenmemiş.</div>
      )}
    </div>
  );
};
