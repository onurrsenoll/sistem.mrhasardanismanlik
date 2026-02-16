const MR = window.MR || (window.MR = {});
const {useState, useEffect} = React;

MR.HomePage = ({setPage, user}) => {
  const {C} = MR;

  const saat = new Date().getHours();
  const selamlama = saat < 12 ? 'GÜNAYDIM' : saat < 18 ? 'İYİ GÜNLER' : 'İYİ AKŞAMLAR';

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
    </div>
  );
};
