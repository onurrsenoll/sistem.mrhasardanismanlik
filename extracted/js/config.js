/**
 * MR HASAR DANIŞMANLIK - KONFIGÜRASYON
 * API, RENKLER, STİLLER, SABİTLER
 */
const MR = window.MR || (window.MR = {});

// ═══ API ═══
const API_BASE = '/api/v1';
MR.api = {
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
  // DOSYA
  dosyaList(p = {}) { return this.req('/dosya/list.php?' + new URLSearchParams(p)); },
  dosyaGet(id) { return this.req('/dosya/get.php?id=' + id); },
  dosyaCreate(d) { return this.req('/dosya/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  dosyaUpdate(d) { return this.req('/dosya/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  dosyaDelete(id) { return this.req('/dosya/delete.php?id=' + id, { method: 'DELETE' }); },
  // MASRAF
  masrafCreate(d) { return this.req('/masraf/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  masrafList(p = {}) { return this.req('/masraf/list.php?' + new URLSearchParams(p)); },
  masrafDelete(id) { return this.req('/masraf/delete.php?id=' + id, { method: 'DELETE' }); },
  // EVRAK
  async evrakUpload(did, tur, file) {
    const fd = new FormData(); fd.append('dosya_id', did); fd.append('evrak_turu', tur); fd.append('file', file);
    const h = {}; if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return (await fetch(API_BASE + '/evrak/upload.php', { method: 'POST', headers: h, body: fd })).json();
  },
  evrakUrl(id) { return API_BASE + '/evrak/download.php?id=' + id; },
  evrakDelete(id) { return this.req('/evrak/delete.php?id=' + id, { method: 'DELETE' }); },
  // CRM
  crmList(p = {}) { return this.req('/crm/list.php?' + new URLSearchParams(p)); },
  crmGet(id) { return this.req('/crm/get.php?id=' + id); },
  crmCreate(d) { return this.req('/crm/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  crmUpdate(d) { return this.req('/crm/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  crmDelete(id) { return this.req('/crm/delete.php?id=' + id, { method: 'DELETE' }); },
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
  // AJANDA
  ajandaList(p = {}) { return this.req('/ajanda/list.php?' + new URLSearchParams(p)); },
  ajandaCreate(d) { return this.req('/ajanda/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  ajandaUpdate(d) { return this.req('/ajanda/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  ajandaDelete(id) { return this.req('/ajanda/delete.php?id=' + id, { method: 'DELETE' }); },
  // TANIM
  tanimList(p = {}) { return this.req('/tanim/list.php?' + new URLSearchParams(p)); },
  tanimCreate(d) { return this.req('/tanim/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  tanimUpdate(d) { return this.req('/tanim/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  tanimDelete(id) { return this.req('/tanim/delete.php?id=' + id, { method: 'DELETE' }); },
  // SERVİS
  servisList(p = {}) { return this.req('/servis/list.php?' + new URLSearchParams(p)); },
  servisGet(id) { return this.req('/servis/get.php?id=' + id); },
  servisCreate(d) { return this.req('/servis/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  servisUpdate(d) { return this.req('/servis/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  servisDelete(id) { return this.req('/servis/delete.php?id=' + id, { method: 'DELETE' }); },
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
  ortakHareketList(p = {}) { return this.req('/ortak/hareket-list.php?' + new URLSearchParams(p)); },
  ortakHareketEkle(d) { return this.req('/ortak/hareket-ekle.php', { method: 'POST', body: JSON.stringify(d) }); },
  // PAYDAŞ
  paydasList(p = {}) { return this.req('/paydas/list.php?' + new URLSearchParams(p)); },
  paydasGet(id) { return this.req('/paydas/get.php?id=' + id); },
  paydasCreate(d) { return this.req('/paydas/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  paydasUpdate(d) { return this.req('/paydas/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  paydasDelete(id) { return this.req('/paydas/delete.php?id=' + id, { method: 'DELETE' }); },
  paydasKomisyonList(p = {}) { return this.req('/paydas/komisyon-list.php?' + new URLSearchParams(p)); },
  paydasKomisyonEkle(d) { return this.req('/paydas/komisyon-ekle.php', { method: 'POST', body: JSON.stringify(d) }); },
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
  // MESAJ
  mesajList(p = {}) { return this.req('/mesaj/list.php?' + new URLSearchParams(p)); },
  mesajGiden(p = {}) { return this.req('/mesaj/giden.php?' + new URLSearchParams(p)); },
  mesajGet(id) { return this.req('/mesaj/get.php?id=' + id); },
  mesajCreate(d) { return this.req('/mesaj/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  mesajDelete(id) { return this.req('/mesaj/delete.php?id=' + id, { method: 'DELETE' }); },
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
};

// ═══ TEMA SİSTEMİ ═══
const KOYU_TEMA = {
  bg: '#0B1120', bgCard: '#111827', bgHover: '#1F2937', bgInput: '#1a2332',
  border: '#1F2937', borderLight: '#374151',
  accent: '#2563eb', accentLight: '#3b82f6',
  success: '#10b981', warning: '#f59e0b', danger: '#ef4444',
  purple: '#8b5cf6', cyan: '#06b6d4', pink: '#ec4899', gold: '#fbbf24',
  text: '#f1f5f9', textSec: '#94a3b8', textMuted: '#64748b',
  headerBg: '#0f1729', navBg: '#111d33'
};

const ACIK_TEMA = {
  bg: '#f1f5f9', bgCard: '#ffffff', bgHover: '#f1f5f9', bgInput: '#f8fafc',
  border: '#e2e8f0', borderLight: '#cbd5e1',
  accent: '#2563eb', accentLight: '#3b82f6',
  success: '#059669', warning: '#d97706', danger: '#dc2626',
  purple: '#7c3aed', cyan: '#0891b2', pink: '#db2777', gold: '#ca8a04',
  text: '#0f172a', textSec: '#475569', textMuted: '#94a3b8',
  headerBg: '#ffffff', navBg: '#f8fafc'
};

MR.TEMALAR = { koyu: KOYU_TEMA, acik: ACIK_TEMA };
MR.tema = localStorage.getItem('mr_tema') || 'koyu';

// ═══ RENKLER ═══
MR.C = { ...MR.TEMALAR[MR.tema] };

// ═══ TEMA DEĞİŞTİRME ═══
MR._stilGuncelle = () => {
  const C = MR.C;
  MR.S.page = { minHeight: '100vh', background: C.bg, color: C.text };
  MR.S.card = { background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' };
  MR.S.cardHead = { padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, background: MR.tema === 'koyu' ? 'rgba(37,99,235,0.05)' : 'rgba(37,99,235,0.03)' };
  MR.S.cardBody = { padding: 20 };
  MR.S.input = { width: '100%', padding: '10px 14px', background: C.bgInput, border: `1px solid ${C.borderLight}`, borderRadius: 8, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  MR.S.select = { width: '100%', padding: '10px 14px', background: C.bgInput, border: `1px solid ${C.borderLight}`, borderRadius: 8, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  MR.S.label = { fontSize: 11, fontWeight: 600, color: C.textSec, marginBottom: 6, display: 'block', letterSpacing: 0.5 };
  MR.S.btnG = { background: C.borderLight, color: C.textSec };
  MR.S.stat = { background: C.bgCard, borderRadius: 12, padding: '18px 20px', border: `1px solid ${C.border}` };
  document.body.style.background = C.bg;
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
  page: { minHeight: '100vh', background: MR.C.bg, color: MR.C.text },
  card: { background: MR.C.bgCard, borderRadius: 12, border: `1px solid ${MR.C.border}`, overflow: 'hidden' },
  cardHead: { padding: '14px 20px', borderBottom: `1px solid ${MR.C.border}`, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(37,99,235,0.05)' },
  cardBody: { padding: 20 },
  input: { width: '100%', padding: '10px 14px', background: MR.C.bgInput, border: `1px solid ${MR.C.borderLight}`, borderRadius: 8, color: MR.C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 14px', background: MR.C.bgInput, border: `1px solid ${MR.C.borderLight}`, borderRadius: 8, color: MR.C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  label: { fontSize: 11, fontWeight: 600, color: MR.C.textSec, marginBottom: 6, display: 'block', letterSpacing: 0.5 },
  btn: { padding: '10px 20px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all .2s' },
  btnP: { background: MR.C.accent, color: '#fff' },
  btnS: { background: MR.C.success, color: '#fff' },
  btnW: { background: MR.C.warning, color: '#000' },
  btnD: { background: MR.C.danger, color: '#fff' },
  btnG: { background: MR.C.borderLight, color: MR.C.textSec },
  badge: c => ({ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: `${c}22`, color: c, border: `1px solid ${c}33`, display: 'inline-block' }),
  stat: { background: MR.C.bgCard, borderRadius: 12, padding: '18px 20px', border: `1px solid ${MR.C.border}` }
};

// İLK TEMA UYGULAMASI
MR._stilGuncelle();
