/**
 * MR HASAR DANIŞMANLIK - KONFIGÜRASYON
 * API, RENKLER, STİLLER, SABİTLER
 */
const MR = window.MR || (window.MR = {});

// ═══ TOAST BİLDİRİM ═══
MR.toast = (mesaj, tip = 'info') => {
  const isK = MR.tema === 'koyu';
  const renk = tip === 'success' ? (MR.C?.accent || '#f59e0b') : tip === 'error' ? (isK ? '#fca5a5' : '#dc2626') : tip === 'warning' ? (MR.C?.accent || '#f59e0b') : (MR.C?.accent || '#f59e0b');
  const el = document.createElement('div');
  el.textContent = mesaj;
  Object.assign(el.style, {
    position:'fixed', top:'20px', right:'20px', zIndex:'99999',
    background: isK ? 'rgba(30,31,42,0.95)' : 'rgba(255,255,255,0.92)',
    color:renk, border:'1.5px solid '+renk+'55',
    padding:'14px 24px', borderRadius:'12px', fontSize:'13px', fontWeight:'800',
    fontFamily:'Manrope,sans-serif', letterSpacing:'0.3px', textTransform:'uppercase',
    boxShadow: isK
      ? '8px 8px 24px rgba(0,0,0,.55), -4px -4px 12px rgba(255,255,255,.03), 0 0 16px '+renk+'30'
      : '6px 6px 18px rgba(0,0,0,.10), 0 0 10px '+renk+'15',
    maxWidth:'400px',
    backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
    animation:'fadeIn .3s ease', cursor:'pointer'
  });
  el.onclick = () => el.remove();
  document.body.appendChild(el);
  setTimeout(() => { if(el.parentNode) el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(), 300); }, 3000);
};

// ═══ API ═══
const API_BASE = '/api/v1';
MR.api = {
  base: API_BASE,
  token: localStorage.getItem('mr_token'),
  setToken(t) { this.token = t; if (t) localStorage.setItem('mr_token', t); else localStorage.removeItem('mr_token'); },
  async req(ep, o = {}, timeout = 30000) {
    try {
      const h = { 'Content-Type': 'application/json' };
      if (this.token) h['Authorization'] = 'Bearer ' + this.token;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const r = await fetch(API_BASE + ep, { ...o, headers: { ...h, ...o.headers }, signal: controller.signal });
      clearTimeout(timeoutId);
      if (r.status === 401) { this.setToken(null); location.reload(); return null; }
      const t = await r.text();
      try { return JSON.parse(t); } catch (e) { return { success: false, error: 'SUNUCU YANIT HATASI' }; }
    } catch (e) {
      if (e.name === 'AbortError') return { success: false, error: 'İSTEK ZAMAN AŞIMINA UĞRADI' };
      return { success: false, error: 'BAĞLANTI HATASI' };
    }
  },
  // AUTH
  login(e, s) { return this.req('/auth/login.php', { method: 'POST', body: JSON.stringify({ email: e, sifre: s }) }); },
  me() { return this.req('/auth/me.php'); },
  changePw(d) { return this.req('/auth/change-password.php', { method: 'POST', body: JSON.stringify(d) }); },
  profilUpdate(d) { return this.req('/auth/profil-update.php', { method: 'POST', body: JSON.stringify(d) }); },
  avatarYukle(file) {
    const fd = new FormData(); fd.append('avatar', file);
    const h = {}; if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return fetch(API_BASE + '/auth/avatar-yukle.php', { method: 'POST', headers: h, body: fd }).then(r => r.json()).catch(() => ({success: false, error: 'BAĞLANTI HATASI'}));
  },
  // DOSYA
  dosyaList(p = {}) { return this.req('/dosya/list.php?' + new URLSearchParams(p)); },
  dosyaGet(id) { return this.req('/dosya/get.php?id=' + id); },
  dosyaCreate(d) { return this.req('/dosya/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  dosyaUpdate(d) { return this.req('/dosya/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  dosyaDelete(id) { return this.req('/dosya/delete.php?id=' + id, { method: 'DELETE' }); },
  dosyaBulkDelete(ids) { return this.req('/dosya/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  // MASRAF
  masrafCreate(d) { return this.req('/masraf/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  masrafList(p = {}) { return this.req('/masraf/list.php?' + new URLSearchParams(p)); },
  masrafDelete(id) { return this.req('/masraf/delete.php?id=' + id, { method: 'DELETE' }); },
  masrafOde(d) { return this.req('/masraf/ode.php', { method: 'PUT', body: JSON.stringify(d) }); },
  // EVRAK
  async evrakUpload(did, tur, file) {
    try {
      const fd = new FormData(); fd.append('dosya_id', did); fd.append('evrak_turu', tur); fd.append('file', file);
      const h = {}; if (this.token) h['Authorization'] = 'Bearer ' + this.token;
      const r = await fetch(API_BASE + '/evrak/upload.php', { method: 'POST', headers: h, body: fd, credentials: 'include' });
      const txt = await r.text();
      try { return JSON.parse(txt); } catch(e) { return { success: false, error: 'SUNUCU YANIT HATASI: ' + txt.substring(0, 200) }; }
    } catch(e) { return { success: false, error: 'BAĞLANTI HATASI: ' + e.message }; }
  },
  evrakUrl(id) { return API_BASE + '/evrak/download.php?id=' + id; },
  evrakPreviewUrl(id) { return API_BASE + '/evrak/download.php?id=' + id + '&mode=inline'; },
  evrakDelete(id) { return this.req('/evrak/delete.php?id=' + id, { method: 'DELETE' }); },
  // CRM
  crmList(p = {}) { return this.req('/crm/list.php?' + new URLSearchParams(p)); },
  crmGet(id) { return this.req('/crm/get.php?id=' + id); },
  crmCreate(d) { return this.req('/crm/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  crmUpdate(d) { return this.req('/crm/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  crmDelete(id) { return this.req('/crm/delete.php?id=' + id, { method: 'DELETE' }); },
  crmBulkDelete(ids) { return this.req('/crm/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  crmNotEkle(d) { return this.req('/crm/not-ekle.php', { method: 'POST', body: JSON.stringify(d) }); },
  crmDonustur(d) { return this.req('/crm/donustur.php', { method: 'POST', body: JSON.stringify(d) }); },
  async crmDosyaYukle(crmId, tur, file) {
    const fd = new FormData(); fd.append('crm_id', crmId); fd.append('tur', tur); fd.append('file', file);
    const h = {}; if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return (await fetch(API_BASE + '/crm/dosya-yukle.php', { method: 'POST', headers: h, body: fd })).json();
  },
  // NETSIPP
  netsippBekleyenCagri() { return this.req('/netsipp/bekleyen-cagri.php'); },
  // NETSANTRAL
  netsantralBekleyen() { return this.req('/netsantral/bekleyen.php'); },
  netsantralProxy(d) { return this.req('/netsantral/proxy.php', { method: 'POST', body: JSON.stringify(d) }); },
  netsantralOriginate(hedef, dahili) { return this.netsantralProxy({ action: 'originate', params: { hedef, dahili } }); },
  netsantralHangup(dahili) { return this.netsantralProxy({ action: 'hangup', params: { dahili } }); },
  netsantralMute(state, dahili) { return this.netsantralProxy({ action: 'muteaudio', params: { state, dahili } }); },
  netsantralTransfer(hedef, dahili) { return this.netsantralProxy({ action: 'xfer', params: { hedef, dahili } }); },
  netsantralAtxfer(hedef, dahili) { return this.netsantralProxy({ action: 'atxfer', params: { hedef, dahili } }); },
  netsantralQueueStats(kuyruk) { return this.netsantralProxy({ action: 'queuestats', params: { kuyruk } }); },
  netsantralAgentLogin(dahili, kuyruk) { return this.netsantralProxy({ action: 'agentlogin', params: { dahili, kuyruk } }); },
  netsantralAgentLogoff(dahili, kuyruk) { return this.netsantralProxy({ action: 'agentlogoff', params: { dahili, kuyruk } }); },
  netsantralAgentPause(pause, dahili, reason) { return this.netsantralProxy({ action: 'agentpause', params: { pause, dahili, reason } }); },
  netsantralTest() { return this.netsantralProxy({ action: 'test', params: {} }); },
  // NETSANTRAL ARAMA LOG
  netsantralAramaLogCreate(d) { return this.req('/netsantral/arama-log.php', { method: 'POST', body: JSON.stringify({ action: 'create', ...d }) }); },
  netsantralAramaLogUpdate(d) { return this.req('/netsantral/arama-log.php', { method: 'POST', body: JSON.stringify({ action: 'update', ...d }) }); },
  netsantralAramaLogHangup(d) { return this.req('/netsantral/arama-log.php', { method: 'POST', body: JSON.stringify({ action: 'hangup', ...d }) }); },
  netsantralAramaList(p = {}) { return this.req('/netsantral/arama-list.php?' + new URLSearchParams(p)); },
  // MUHASEBE
  kasaList() { return this.req('/muhasebe/kasa-list.php'); },
  kasaCreate(d) { return this.req('/muhasebe/kasa-create.php', { method: 'POST', body: JSON.stringify(d) }); },
  kasaUpdate(d) { return this.req('/muhasebe/kasa-update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  gelirEkle(d) { return this.req('/muhasebe/gelir-ekle.php', { method: 'POST', body: JSON.stringify(d) }); },
  kasaTransfer(d) { return this.req('/muhasebe/transfer.php', { method: 'POST', body: JSON.stringify(d) }); },
  kasaHareketler(p = {}) { return this.req('/muhasebe/hareketler.php?' + new URLSearchParams(p)); },
  muhasebeRapor(p = {}) { return this.req('/muhasebe/rapor.php?' + new URLSearchParams(p)); },
  // SİSTEM
  kullaniciList(p = {}) { return this.req('/sistem/kullanici-list.php?' + new URLSearchParams(p)); },
  kullaniciCreate(d) { return this.req('/sistem/kullanici-create.php', { method: 'POST', body: JSON.stringify(d) }); },
  kullaniciUpdate(d) { return this.req('/sistem/kullanici-update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  kullaniciDelete(id) { return this.req('/sistem/kullanici-delete.php?id=' + id, { method: 'DELETE' }); },
  loglar(p = {}) { return this.req('/sistem/loglar.php?' + new URLSearchParams(p)); },
  dashboard() { return this.req('/sistem/dashboard.php'); },
  // BİLDİRİM
  bildirimList(p = {}) { return this.req('/bildirim/list.php?' + new URLSearchParams(p)); },
  bildirimCreate(d) { return this.req('/bildirim/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  bildirimOku(d) { return this.req('/bildirim/oku.php', { method: 'PUT', body: JSON.stringify(d) }); },
  bildirimDelete(id) { return this.req('/bildirim/delete.php?id=' + id, { method: 'DELETE' }); },
  bildirimBulkDelete(ids) { return this.req('/bildirim/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  // AJANDA
  ajandaList(p = {}) { return this.req('/ajanda/list.php?' + new URLSearchParams(p)); },
  ajandaCreate(d) { return this.req('/ajanda/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  ajandaUpdate(d) { return this.req('/ajanda/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  ajandaDelete(id) { return this.req('/ajanda/delete.php?id=' + id, { method: 'DELETE' }); },
  ajandaBulkDelete(ids) { return this.req('/ajanda/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  // TANIM
  tanimList(p = {}) { return this.req('/tanim/list.php?' + new URLSearchParams(p)); },
  tanimCreate(d) { return this.req('/tanim/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  tanimUpdate(d) { return this.req('/tanim/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  tanimDelete(id) { return this.req('/tanim/delete.php?id=' + id, { method: 'DELETE' }); },
  tanimBulkCreate(d) { return this.req('/tanim/bulk-create.php', { method: 'POST', body: JSON.stringify(d) }); },
  // SERVİS
  servisList(p = {}) { return this.req('/servis/list.php?' + new URLSearchParams(p)); },
  servisGet(id) { return this.req('/servis/get.php?id=' + id); },
  servisCreate(d) { return this.req('/servis/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  servisUpdate(d) { return this.req('/servis/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  servisDelete(id) { return this.req('/servis/delete.php?id=' + id, { method: 'DELETE' }); },
  servisBulkDelete(ids) { return this.req('/servis/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  servisIhbarList(p = {}) { return this.req('/servis/ihbar-list.php?' + new URLSearchParams(p)); },
  servisIhbarCreate(d) { return this.req('/servis/ihbar-create.php', { method: 'POST', body: JSON.stringify(d) }); },
  servisIhbarUpdate(d) { return this.req('/servis/ihbar-update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  servisRapor(p = {}) { return this.req('/servis/rapor.php?' + new URLSearchParams(p)); },
  // ORTAK
  ortakList(p = {}) { return this.req('/ortak/list.php?' + new URLSearchParams(p)); },
  ortakGet(id) { return this.req('/ortak/get.php?id=' + id); },
  ortakCreate(d) { return this.req('/ortak/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  ortakUpdate(d) { return this.req('/ortak/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  ortakDelete(id) { return this.req('/ortak/delete.php?id=' + id, { method: 'DELETE' }); },
  ortakBulkDelete(ids) { return this.req('/ortak/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  ortakHareketList(p = {}) { return this.req('/ortak/hareket-list.php?' + new URLSearchParams(p)); },
  ortakHareketEkle(d) { return this.req('/ortak/hareket-ekle.php', { method: 'POST', body: JSON.stringify(d) }); },
  // PAYDAŞ
  paydasList(p = {}) { return this.req('/paydas/list.php?' + new URLSearchParams(p)); },
  paydasGet(id) { return this.req('/paydas/get.php?id=' + id); },
  paydasCreate(d) { return this.req('/paydas/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  paydasUpdate(d) { return this.req('/paydas/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  paydasDelete(id) { return this.req('/paydas/delete.php?id=' + id, { method: 'DELETE' }); },
  paydasBulkDelete(ids) { return this.req('/paydas/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  paydasKomisyonList(p = {}) { return this.req('/paydas/komisyon-list.php?' + new URLSearchParams(p)); },
  paydasKomisyonEkle(d) { return this.req('/paydas/komisyon-ekle.php', { method: 'POST', body: JSON.stringify(d) }); },
  paydasKomisyonOde(d) { return this.req('/paydas/komisyon-ode.php', { method: 'PUT', body: JSON.stringify(d) }); },
  // MUHASEBE (YENİ)
  gelirList(p = {}) { return this.req('/muhasebe/gelir-list.php?' + new URLSearchParams(p)); },
  gelirCreate(d) { return this.req('/muhasebe/gelir-create.php', { method: 'POST', body: JSON.stringify(d) }); },
  giderList(p = {}) { return this.req('/muhasebe/gider-list.php?' + new URLSearchParams(p)); },
  giderCreate(d) { return this.req('/muhasebe/gider-create.php', { method: 'POST', body: JSON.stringify(d) }); },
  komisyonList(p = {}) { return this.req('/muhasebe/komisyon-list.php?' + new URLSearchParams(p)); },
  komisyonOlustur(d) { return this.req('/muhasebe/komisyon-olustur.php', { method: 'POST', body: JSON.stringify(d) }); },
  komisyonOde(d) { return this.req('/muhasebe/komisyon-ode.php', { method: 'PUT', body: JSON.stringify(d) }); },
  maliyetAnaliz(p = {}) { return this.req('/muhasebe/maliyet-analiz.php?' + new URLSearchParams(p)); },
  finansalRapor(p = {}) { return this.req('/muhasebe/finansal-rapor.php?' + new URLSearchParams(p)); },
  bakiyeSifirla() { return this.req('/muhasebe/bakiye-sifirla.php', { method: 'POST', body: '{}' }); },
  bakiyeDuzelt(d) { return this.req('/muhasebe/bakiye-duzelt.php', { method: 'PUT', body: JSON.stringify(d) }); },
  // MESAJ
  mesajList(p = {}) { return this.req('/mesaj/list.php?' + new URLSearchParams(p)); },
  mesajGiden(p = {}) { return this.req('/mesaj/giden.php?' + new URLSearchParams(p)); },
  mesajGet(id) { return this.req('/mesaj/get.php?id=' + id); },
  mesajCreate(d) { return this.req('/mesaj/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  mesajDelete(id) { return this.req('/mesaj/delete.php?id=' + id, { method: 'DELETE' }); },
  mesajBulkDelete(ids) { return this.req('/mesaj/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  mesajOku(d) { return this.req('/mesaj/oku.php', { method: 'PUT', body: JSON.stringify(d) }); },
  // HESAP (AI)
  adkAiAnaliz(d) { return this.req('/hesap/ai-analiz.php', { method: 'POST', body: JSON.stringify(d) }); },
  bhAiAnaliz(d) { return this.req('/hesap/bh-ai-analiz.php', { method: 'POST', body: JSON.stringify(d) }); },
  rayicArastir(d) { return this.req('/hesap/rayic-arastirma.php', { method: 'POST', body: JSON.stringify(d) }, 90000); },
  tahkimEmsalAra(d) { return this.req('/hesap/tahkim-emsal-ara.php', { method: 'POST', body: JSON.stringify(d) }, 90000); },
  // ŞABLON
  sablonList(p = {}) { return this.req('/sablon/list.php?' + new URLSearchParams(p)); },
  sablonGet(id) { return this.req('/sablon/get.php?id=' + id); },
  sablonCreate(d) { return this.req('/sablon/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  sablonUpdate(d) { return this.req('/sablon/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  sablonDelete(id) { return this.req('/sablon/delete.php?id=' + id, { method: 'DELETE' }); },
  // YETKİ
  yetkiList(p = {}) { return this.req('/sistem/yetki-list.php?' + new URLSearchParams(p)); },
  yetkiGuncelle(d) { return this.req('/sistem/yetki-guncelle.php', { method: 'POST', body: JSON.stringify(d) }); },
  // AYARLAR
  ayarlarList() { return this.req('/sistem/ayarlar-list.php'); },
  ayarlarGuncelle(d) { return this.req('/sistem/ayarlar-guncelle.php', { method: 'POST', body: JSON.stringify(d) }); },
  logoYukle(file) {
    const fd = new FormData(); fd.append('logo', file);
    const h = {}; if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return fetch(API_BASE + '/sistem/logo-yukle.php', {
      method: 'POST', headers: h, body: fd
    }).then(r => r.json()).catch(() => ({success: false, error: 'BAĞLANTI HATASI'}));
  },
  sidebarLogoYukle(file) {
    const fd = new FormData(); fd.append('sidebar_logo', file);
    const h = {}; if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return fetch(API_BASE + '/sistem/sidebar-logo-yukle.php', {
      method: 'POST', headers: h, body: fd
    }).then(r => r.json()).catch(() => ({success: false, error: 'BAĞLANTI HATASI'}));
  },
  // YÖNLENDİRME / ARAMA LİSTESİ
  yonlendirmeList(p = {}) { return this.req('/yonlendirme/list.php?' + new URLSearchParams(p)); },
  yonlendirmeGet(id) { return this.req('/yonlendirme/get.php?id=' + id); },
  yonlendirmeCreate(d) { return this.req('/yonlendirme/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  yonlendirmeUpdate(d) { return this.req('/yonlendirme/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  yonlendirmeDelete(id) { return this.req('/yonlendirme/delete.php?id=' + id, { method: 'DELETE' }); },
  yonlendirmeImport(d) { return this.req('/yonlendirme/import.php', { method: 'POST', body: JSON.stringify(d) }); },
  yonlendirmeNotEkle(d) { return this.req('/yonlendirme/not-ekle.php', { method: 'POST', body: JSON.stringify(d) }); },
  yonlendirmeTopluIslem(d) { return this.req('/yonlendirme/toplu-islem.php', { method: 'POST', body: JSON.stringify(d) }); },
  // SMS
  smsLogList(p = {}) { return this.req('/sms/log-list.php?' + new URLSearchParams(p)); },
  smsTest(d) { return this.req('/sms/test.php', { method: 'POST', body: JSON.stringify(d) }); },
  smsGonder(d) { return this.req('/sms/gonder.php', { method: 'POST', body: JSON.stringify(d) }); },
  smsGelenList(p = {}) { return this.req('/sms/gelen-list.php?' + new URLSearchParams(p)); },
  smsGelenOkundu(d) { return this.req('/sms/gelen-okundu.php', { method: 'POST', body: JSON.stringify(d) }); },
  // ARAÇ KATALOG
  aracMarkaList() { return this.req('/tanim/arac-marka-list.php'); },
  aracModelList(marka) { return this.req('/tanim/arac-model-list.php?marka=' + encodeURIComponent(marka)); },
  // AI MOTİVASYON
  motivasyonSoz() { return this.req('/ai/motivasyon.php', {}, 12000); },
  geminiTest(d = {}) { return this.req('/ai/motivasyon-test.php', { method: 'POST', body: JSON.stringify(d) }, 20000); },
  // PERSONEL
  personelList(p = {}) { return this.req('/personel/list.php?' + new URLSearchParams(p)); },
  personelGet(id) { return this.req('/personel/get.php?id=' + id); },
  personelCreate(d) { return this.req('/personel/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  personelUpdate(d) { return this.req('/personel/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  personelDelete(id) { return this.req('/personel/delete.php?id=' + id, { method: 'DELETE' }); },
  personelBulkDelete(ids) { return this.req('/personel/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  // HAKEDİŞ
  hakedisHesapla(d) { return this.req('/personel/hakedis-hesapla.php', { method: 'POST', body: JSON.stringify(d) }); },
  hakedisList(p = {}) { return this.req('/personel/hakedis-list.php?' + new URLSearchParams(p)); },
  hakedisOde(d) { return this.req('/personel/hakedis-ode.php', { method: 'PUT', body: JSON.stringify(d) }); },
  // POLİÇE
  policeList(p = {}) { return this.req('/police/list.php?' + new URLSearchParams(p)); },
  policeGet(id) { return this.req('/police/get.php?id=' + id); },
  policeCreate(d) { return this.req('/police/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  policeUpdate(d) { return this.req('/police/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  policeDelete(id) { return this.req('/police/delete.php?id=' + id, { method: 'DELETE' }); },
  policeBulkDelete(ids) { return this.req('/police/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  policeTahsilatEkle(d) { return this.req('/police/tahsilat-ekle.php', { method: 'POST', body: JSON.stringify(d) }); },
  policeTahsilatList(p = {}) { return this.req('/police/tahsilat-list.php?' + new URLSearchParams(p)); },
  policeRapor(p = {}) { return this.req('/police/rapor.php?' + new URLSearchParams(p)); },
  policeHatirlatma() { return this.req('/police/hatirlatma-kontrol.php'); },
  policeExcelImport(d) { return this.req('/police/excel-import.php', { method: 'POST', body: JSON.stringify(d) }); },
  // SAHA
  sahaList(p = {}) { return this.req('/saha/list.php?' + new URLSearchParams(p)); },
  sahaGet(id) { return this.req('/saha/get.php?id=' + id); },
  sahaCreate(d) { return this.req('/saha/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  sahaUpdate(d) { return this.req('/saha/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  sahaOnayaGonder(d) { return this.req('/saha/onaya-gonder.php', { method: 'POST', body: JSON.stringify(d) }); },
  sahaOnayla(d) { return this.req('/saha/onayla.php', { method: 'POST', body: JSON.stringify(d) }); },
  sahaReddet(d) { return this.req('/saha/reddet.php', { method: 'POST', body: JSON.stringify(d) }); },
  sahaDosyayaDonustur(d) { return this.req('/saha/dosyaya-donustur.php', { method: 'POST', body: JSON.stringify(d) }); },
  async sahaDosyaYukle(sahaId, file, aciklama) {
    const fd = new FormData(); fd.append('saha_dosya_id', sahaId); fd.append('file', file); if (aciklama) fd.append('aciklama', aciklama);
    const h = {}; if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return (await fetch(API_BASE + '/saha/dosya-yukle.php', { method: 'POST', headers: h, body: fd })).json();
  },
  sahaMedyaList(sahaId) { return this.req('/saha/medya-list.php?saha_dosya_id=' + sahaId); },
  sahaDosyaSil(id) { return this.req('/saha/dosya-sil.php?id=' + id, { method: 'DELETE' }); },
  sahaSil(id) { return this.req('/saha/sil.php?id=' + id, { method: 'DELETE' }); },
  // PORTAL
  portalErisimList(p = {}) { return this.req('/portal/erisim-list.php?' + new URLSearchParams(p)); },
  portalErisimOlustur(d) { return this.req('/portal/erisim-olustur.php', { method: 'POST', body: JSON.stringify(d) }); },
  portalErisimGuncelle(d) { return this.req('/portal/erisim-guncelle.php', { method: 'PUT', body: JSON.stringify(d) }); },
  portalErisimSil(id) { return this.req('/portal/erisim-sil.php?id=' + id, { method: 'DELETE' }); },
  portalMesajList(dosyaId) { return this.req('/portal/portal-mesaj-list.php?dosya_id=' + dosyaId); },
  portalMesajGonder(d) { return this.req('/portal/portal-mesaj-gonder.php', { method: 'POST', body: JSON.stringify(d) }); },
  portalLoglar(p = {}) { return this.req('/portal/loglar.php?' + new URLSearchParams(p)); },
};

// ═══ TEMA SİSTEMİ — AMBER NEUMORPHİC 3D ═══

/* ─── KOYU TEMA: DARK NEUMORPHİC — ÇİFT YÖNLÜ GÖLGE ─── */
const KOYU_TEMA = {
  /* Zemin — 3 katmanlı koyu antrasit */
  bg: '#16171f', bgCard: '#1e1f2a', bgHover: '#282a38', bgInput: '#13141c',
  /* Kenar — ince beyaz çizgi */
  border: 'rgba(255,255,255,0.10)', borderLight: 'rgba(255,255,255,0.06)',
  /* Vurgu — AMBER tek renk ailesi */
  accent: '#f59e0b', accentLight: '#fbbf24',
  accentGradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
  /* Durum renkleri — amber ailesi tonları */
  success: '#f59e0b', warning: '#fbbf24', danger: '#ef4444',
  purple: '#d97706', cyan: '#fcd34d', pink: '#b45309', gold: '#f59e0b',
  /* Metin — saf beyaz hiyerarşi */
  text: '#ffffff', textSec: '#d4d4d8', textMuted: '#71717a',
  /* Header / Nav */
  headerBg: 'rgba(22,23,31,0.97)', navBg: 'rgba(30,31,42,0.98)',
  /* 3D NEUMORPHİC GÖLGE — çift yönlü: sağ-alt koyu + sol-üst açık */
  cardGlass: 'rgba(30,31,42,0.88)',
  cardShadow: '10px 10px 24px rgba(0,0,0,.60), -8px -8px 20px rgba(255,255,255,.04), inset 0 1px 0 rgba(255,255,255,.06)',
  cardBlur: 'blur(12px) saturate(1.3)',
  statShadow: '8px 8px 20px rgba(0,0,0,.55), -6px -6px 16px rgba(255,255,255,.03), inset 0 1px 0 rgba(255,255,255,.05)',
  inputShadow: 'inset 5px 5px 10px rgba(0,0,0,.55), inset -3px -3px 8px rgba(255,255,255,.03)',
  btnShadow: '8px 8px 20px rgba(0,0,0,.50), -6px -6px 14px rgba(245,158,11,.12), 0 0 20px rgba(245,158,11,.20)',
  bgGradient: 'linear-gradient(145deg, #13141c 0%, #16171f 30%, #1a1b25 60%, #14151d 100%)'
};

/* ─── AÇIK TEMA: LIGHT ELEVATION — SICAK KREM + TEK YÖNLÜ DÜŞME GÖLGESİ ─── */
const ACIK_TEMA = {
  /* Zemin — sıcak krem beyaz */
  bg: '#f5f0eb', bgCard: '#ffffff', bgHover: '#fef3e2', bgInput: '#f0ebe4',
  /* Kenar — ince kahve-gri çizgi */
  border: 'rgba(0,0,0,0.10)', borderLight: 'rgba(0,0,0,0.06)',
  /* Vurgu — AMBER koyu (beyaz zeminde kontrast) */
  accent: '#d97706', accentLight: '#f59e0b',
  accentGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
  /* Durum renkleri — amber ailesi */
  success: '#d97706', warning: '#b45309', danger: '#dc2626',
  purple: '#b45309', cyan: '#fbbf24', pink: '#92400e', gold: '#d97706',
  /* Metin — sıcak koyu kahve-gri */
  text: '#1c1917', textSec: '#44403c', textMuted: '#78716c',
  /* Header / Nav */
  headerBg: 'rgba(255,255,255,0.94)', navBg: 'rgba(255,255,255,0.96)',
  /* ELEVATION GÖLGESİ — tek yönlü aşağı düşme */
  cardGlass: 'rgba(255,255,255,0.82)',
  cardShadow: '6px 6px 18px rgba(0,0,0,.08), 0 1px 0 rgba(255,255,255,.5)',
  cardBlur: 'blur(12px) saturate(1.2)',
  statShadow: '4px 4px 14px rgba(0,0,0,.06), 0 1px 0 rgba(255,255,255,.4)',
  inputShadow: 'inset 3px 3px 6px rgba(0,0,0,.05), inset -2px -2px 4px rgba(255,255,255,.7), 0 0 0 1px rgba(0,0,0,.06)',
  btnShadow: '6px 6px 18px rgba(0,0,0,.10), 0 0 16px rgba(217,119,6,.08)',
  bgGradient: 'linear-gradient(145deg, #f0ebe4 0%, #f5f0eb 30%, #f8f4ef 60%, #f2ede6 100%)'
};

MR.TEMALAR = { koyu: KOYU_TEMA, acik: ACIK_TEMA };
MR.tema = localStorage.getItem('mr_tema') || 'koyu';

// ═══ RENKLER ═══
MR.C = { ...MR.TEMALAR[MR.tema] };

// ═══ TEMA DEĞİŞTİRME ═══
MR._stilGuncelle = () => {
  const C = MR.C;
  const isK = MR.tema === 'koyu';

  /* SAYFA */
  MR.S.page = { minHeight: '100vh', background: C.bgGradient || C.bg, color: C.text };

  /* KART — neumorphic kabarık yüzey */
  MR.S.card = {
    background: C.cardGlass || C.bgCard,
    backdropFilter: C.cardBlur, WebkitBackdropFilter: C.cardBlur,
    borderRadius: 16, border: `1px solid ${C.border}`,
    overflow: 'hidden', boxShadow: C.cardShadow,
    transition: 'box-shadow .2s ease, transform .2s ease'
  };

  /* KART BAŞLIK */
  MR.S.cardHead = {
    padding: '16px 22px', borderBottom: `1px solid ${C.border}`,
    display: 'flex', alignItems: 'center', gap: 10,
    background: isK ? `${C.accent}0c` : `${C.accent}08`,
    fontSize: 15, fontWeight: 800
  };

  MR.S.cardBody = { padding: 22 };

  /* INPUT — çöküntü (inset shadow = kağıda kazınmış çukur) */
  MR.S.input = {
    width: '100%', padding: '12px 16px',
    background: C.bgInput,
    border: `1px solid ${C.borderLight}`,
    borderRadius: 10, color: C.text, fontSize: 14, fontWeight: 600,
    outline: 'none', boxSizing: 'border-box',
    boxShadow: C.inputShadow,
    transition: 'border-color .2s, box-shadow .2s'
  };

  /* SELECT */
  MR.S.select = {
    width: '100%', padding: '12px 16px',
    background: C.bgInput,
    border: `1px solid ${C.borderLight}`,
    borderRadius: 10, color: C.text, fontSize: 14, fontWeight: 600,
    outline: 'none', boxSizing: 'border-box',
    boxShadow: C.inputShadow
  };

  /* LABEL */
  MR.S.label = { fontSize: 13, fontWeight: 800, color: C.textSec, marginBottom: 7, display: 'block', letterSpacing: 0.5 };

  /* GHOST BUTON — sadece border */
  MR.S.btnG = {
    background: 'transparent',
    color: C.accent,
    border: `1.5px solid ${C.accent}44`,
    boxShadow: isK
      ? `6px 6px 14px rgba(0,0,0,.40), -4px -4px 10px rgba(255,255,255,.02)`
      : `4px 4px 12px rgba(0,0,0,.06)`
  };

  /* STAT KART */
  MR.S.stat = {
    background: C.cardGlass || C.bgCard,
    backdropFilter: C.cardBlur, WebkitBackdropFilter: C.cardBlur,
    borderRadius: 16, padding: '18px 20px',
    border: `1px solid ${C.border}`,
    boxShadow: C.statShadow,
    transition: 'box-shadow .2s ease, transform .2s ease'
  };

  /* ═══ 3 SEVİYE BUTON SİSTEMİ ═══ */
  /* Primary: gradient dolgu + dış glow */
  MR.S.btn.fontWeight = 800;
  MR.S.btn.fontSize = 14;
  MR.S.btn.borderRadius = 12;
  MR.S.btn.border = 'none';
  MR.S.btnP = {
    background: C.accentGradient, color: isK ? '#000' : '#fff', fontWeight: 800,
    border: 'none',
    boxShadow: C.btnShadow
  };
  /* Aynı amber ailesi — farklı tonlar */
  MR.S.btnS = {
    background: isK ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: isK ? '#000' : '#fff', fontWeight: 800, border: 'none',
    boxShadow: C.btnShadow
  };
  MR.S.btnW = {
    background: isK ? 'linear-gradient(135deg, #fcd34d, #fbbf24)' : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    color: '#000', fontWeight: 800, border: 'none',
    boxShadow: isK
      ? '8px 8px 20px rgba(0,0,0,.45), -4px -4px 10px rgba(251,191,36,.10), 0 0 14px rgba(251,191,36,.15)'
      : '5px 5px 16px rgba(0,0,0,.08), 0 0 12px rgba(217,119,6,.06)'
  };
  MR.S.btnD = {
    background: isK ? 'linear-gradient(135deg, #b45309, #92400e)' : 'linear-gradient(135deg, #d97706, #b45309)',
    color: '#fff', fontWeight: 800, border: 'none',
    boxShadow: isK
      ? '8px 8px 20px rgba(0,0,0,.50), -4px -4px 10px rgba(180,83,9,.10), 0 0 14px rgba(180,83,9,.18)'
      : '5px 5px 16px rgba(0,0,0,.08), 0 0 12px rgba(180,83,9,.08)'
  };

  /* BADGE — yarı saydam accent zemin + ince accent border */
  MR.S.badge = c => ({
    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800,
    background: `${c}18`, color: c, border: `1px solid ${c}30`,
    display: 'inline-block',
    boxShadow: isK
      ? `4px 4px 10px rgba(0,0,0,.30), -2px -2px 6px rgba(255,255,255,.02)`
      : `3px 3px 8px rgba(0,0,0,.05)`
  });

  /* DOM GÜNCELLEMELERİ */
  document.body.style.background = C.bgGradient || C.bg;
  document.body.style.color = C.text;
  const selStyle = document.getElementById('mr-select-style');
  if (selStyle) selStyle.textContent = `select option{background:${C.bgCard};color:${C.text}}`;
};

MR.setTema = (t) => {
  MR.tema = t;
  localStorage.setItem('mr_tema', t);
  Object.assign(MR.C, MR.TEMALAR[t] || MR.TEMALAR.koyu);
  MR._stilGuncelle();
};

// ═══ STİLLER ═══
MR.S = {
  page: { minHeight: '100vh', background: MR.C.bgGradient || MR.C.bg, color: MR.C.text },

  /* KART — neumorphic kabarık */
  card: {
    background: MR.C.cardGlass || MR.C.bgCard,
    backdropFilter: MR.C.cardBlur, WebkitBackdropFilter: MR.C.cardBlur,
    borderRadius: 16, border: `1px solid ${MR.C.border}`,
    overflow: 'hidden', boxShadow: MR.C.cardShadow,
    transition: 'box-shadow .2s ease, transform .2s ease'
  },

  cardHead: {
    padding: '16px 22px', borderBottom: `1px solid ${MR.C.border}`,
    display: 'flex', alignItems: 'center', gap: 10,
    background: `${MR.C.accent}0c`, fontSize: 15, fontWeight: 800
  },

  cardBody: { padding: 22 },

  /* INPUT — çöküntü */
  input: {
    width: '100%', padding: '12px 16px',
    background: MR.C.bgInput,
    border: `1px solid ${MR.C.borderLight}`,
    borderRadius: 10, color: MR.C.text, fontSize: 14, fontWeight: 600,
    outline: 'none', boxSizing: 'border-box',
    boxShadow: MR.C.inputShadow,
    transition: 'border-color .2s, box-shadow .2s'
  },

  select: {
    width: '100%', padding: '12px 16px',
    background: MR.C.bgInput,
    border: `1px solid ${MR.C.borderLight}`,
    borderRadius: 10, color: MR.C.text, fontSize: 14, fontWeight: 600,
    outline: 'none', boxSizing: 'border-box',
    boxShadow: MR.C.inputShadow
  },

  label: { fontSize: 13, fontWeight: 800, color: MR.C.textSec, marginBottom: 7, display: 'block', letterSpacing: 0.5 },

  /* 3 SEVİYE BUTON */
  btn: {
    padding: '12px 24px', borderRadius: 12, border: 'none',
    fontWeight: 800, fontSize: 14, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 8,
    transition: 'all .2s ease, transform .15s ease',
    position: 'relative'
  },
  btnP: {
    background: MR.C.accentGradient, color: '#000', fontWeight: 800,
    border: 'none', boxShadow: MR.C.btnShadow
  },
  btnS: {
    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#000', fontWeight: 800,
    border: 'none', boxShadow: MR.C.btnShadow
  },
  btnW: {
    background: 'linear-gradient(135deg, #fcd34d, #fbbf24)', color: '#000', fontWeight: 800,
    border: 'none',
    boxShadow: '8px 8px 20px rgba(0,0,0,.45), -4px -4px 10px rgba(251,191,36,.10), 0 0 14px rgba(251,191,36,.15)'
  },
  btnD: {
    background: 'linear-gradient(135deg, #b45309, #92400e)', color: '#fff', fontWeight: 800,
    border: 'none',
    boxShadow: '8px 8px 20px rgba(0,0,0,.50), -4px -4px 10px rgba(180,83,9,.10), 0 0 14px rgba(180,83,9,.18)'
  },
  btnG: {
    background: 'transparent', color: MR.C.accent,
    border: `1.5px solid ${MR.C.accent}44`,
    boxShadow: '6px 6px 14px rgba(0,0,0,.40), -4px -4px 10px rgba(255,255,255,.02)'
  },

  /* BADGE */
  badge: c => ({
    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800,
    background: `${c}18`, color: c, border: `1px solid ${c}30`,
    display: 'inline-block',
    boxShadow: '4px 4px 10px rgba(0,0,0,.30), -2px -2px 6px rgba(255,255,255,.02)'
  }),

  /* STAT KARTI */
  stat: {
    background: MR.C.cardGlass || MR.C.bgCard,
    backdropFilter: MR.C.cardBlur, WebkitBackdropFilter: MR.C.cardBlur,
    borderRadius: 16, padding: '18px 20px',
    border: `1px solid ${MR.C.border}`,
    boxShadow: MR.C.statShadow,
    transition: 'box-shadow .2s ease, transform .2s ease'
  }
};

// İLK TEMA UYGULAMASI
MR._stilGuncelle();
