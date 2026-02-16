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
  async req(ep, o = {}) {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    const r = await fetch(API_BASE + ep, { ...o, headers: { ...h, ...o.headers } });
    if (r.status === 401) { this.setToken(null); location.reload(); return null; }
    const t = await r.text();
    try { return JSON.parse(t); } catch (e) { return { success: false, error: 'SUNUCU YANIT HATASI' }; }
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
  // NETSANTRAL
  netsantralAyarGetir() { return this.req('/netsantral/ayarlar-getir.php'); },
  netsantralAyarKaydet(d) { return this.req('/netsantral/ayarlar-kaydet.php', { method: 'POST', body: JSON.stringify(d) }); },
  netsantralBaglantiTest(d) { return this.req('/netsantral/baglanti-test.php', { method: 'POST', body: JSON.stringify(d) }); },
  netsantralAramaKayitlari(p = {}) { return this.req('/netsantral/arama-kayitlari.php?' + new URLSearchParams(p)); },
  netsantralCagriBaslat(d) { return this.req('/netsantral/cagri-baslat.php', { method: 'POST', body: JSON.stringify(d) }); },
};

// ═══ RENKLER ═══
MR.C = {
  bg: '#0B1120', bgCard: '#111827', bgHover: '#1F2937', bgInput: '#1a2332',
  border: '#1F2937', borderLight: '#374151',
  accent: '#2563eb', accentLight: '#3b82f6',
  success: '#10b981', warning: '#f59e0b', danger: '#ef4444',
  purple: '#8b5cf6', cyan: '#06b6d4', pink: '#ec4899', gold: '#fbbf24',
  text: '#f1f5f9', textSec: '#94a3b8', textMuted: '#64748b',
  headerBg: '#0f1729', navBg: '#111d33'
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
