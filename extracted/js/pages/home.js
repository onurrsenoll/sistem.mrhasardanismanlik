const MR = window.MR || (window.MR = {});
const {useState, useEffect} = React;

MR.HomePage = ({setPage, user}) => {
  const {C} = MR;

  return (
    <div className="fade-in" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 150px)',
      position: 'relative'
    }}>
      {/* ANA SAYFA BOŞ - WATERMARK VE SLOGAN APP SEVİYESİNDE GLOBAL */}
    </div>
  );
};
