// MoveFlow process tool - werknemer + HR process manager

const STORAGE_KEY = 'moveflow_applications_v2';
const CURRENT_USER_KEY = 'moveflow_current_user';
const ROLE_KEY = 'moveflow_role';

const KONTICH_ZONE = [
  'kontich', 'aartselaar', 'rumst', 'edegem', 'hove', 'lint', 'boechout',
  'mortsel', 'niel', 'boom', 'schelle', 'reeth', 'waarloos', 'vremde',
  'borsbeek', 'wijnegem', 'schoten', 'brasschaat', 'antwerpen', 'wilrijk',
  'berchem', 'deurne', 'merksem', 'hemiksem'
];

const PAGE_TITLES = {
  dashboard: 'Mijn dossier',
  aanvraag: 'Aanvraag',
  info: 'Info & regels',
  chat: 'Flo assistent',
  hr: 'Process manager'
};

function getRole() {
  return sessionStorage.getItem(ROLE_KEY) || null;
}

function loginAs(role) {
  sessionStorage.setItem(ROLE_KEY, role);
  applySession();
}

function logout() {
  sessionStorage.removeItem(ROLE_KEY);
  applySession();
}

function applySession() {
  var role = getRole();
  var loginScreen = document.getElementById('loginScreen');
  var appShell = document.getElementById('appShell');
  var navW = document.getElementById('navWerknemer');
  var navH = document.getElementById('navHr');
  var badge = document.getElementById('modeBadge');
  if (!role) {
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (appShell) appShell.classList.add('hidden');
    if (navW) navW.classList.add('hidden');
    if (navH) navH.classList.add('hidden');
    if (badge) badge.textContent = 'Niet ingelogd';
    return;
  }
  if (loginScreen) loginScreen.classList.add('hidden');
  if (appShell) appShell.classList.remove('hidden');
  var isHr = role === 'hr';
  if (navW) navW.classList.toggle('hidden', isHr);
  if (navH) navH.classList.toggle('hidden', !isHr);
  if (badge) badge.textContent = isHr ? 'Ingelogd: HR' : 'Ingelogd: Werknemer';
  showPage(isHr ? 'hr' : 'dashboard');
}

function showPage(pageId) {
  var role = getRole();
  if (!role) return;
  if (role === 'hr' && pageId !== 'hr') return;
  if (role === 'werknemer' && pageId === 'hr') return;
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(b) { b.classList.remove('active'); });
  var page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');
  var btn = document.querySelector('.nav-item[data-page="' + pageId + '"]');
  if (btn) btn.classList.add('active');
  var title = document.getElementById('pageTitle');
  if (title) title.textContent = PAGE_TITLES[pageId] || 'MoveFlow';
  if (pageId === 'dashboard') renderDashboard();
  if (pageId === 'aanvraag') prefillForm();
  if (pageId === 'hr') renderHrOverview();
}

document.querySelectorAll('.nav-item').forEach(function(btn) {
  btn.addEventListener('click', function() { showPage(btn.dataset.page); });
});

function loadAll() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function getCurrentUserKey() {
  return localStorage.getItem(CURRENT_USER_KEY) || null;
}

function setCurrentUserKey(key) {
  localStorage.setItem(CURRENT_USER_KEY, key);
}

function findByPersoneelsnummer(nr) {
  return loadAll().find(function(a) { return a.personeelsnummer === nr; }) || null;
}

function upsertApplication(app) {
  var list = loadAll();
  var idx = list.findIndex(function(a) { return a.personeelsnummer === app.personeelsnummer; });
  if (idx >= 0) {
    var prev = list[idx];
    app.status = prev.status === 'afgerond' ? 'ingediend' : (prev.status || 'ingediend');
    app.id = prev.id;
    list[idx] = Object.assign({}, prev, app, { lastUpdate: new Date().toISOString() });
  } else {
    app.id = 'app_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    app.status = 'ingediend';
    list.push(app);
  }
  saveAll(list);
  setCurrentUserKey(app.personeelsnummer);
  return app;
}

function updateStatus(id, newStatus) {
  var list = loadAll();
  var idx = list.findIndex(function(a) { return a.id === id; });
  if (idx < 0) return;
  list[idx].status = newStatus;
  list[idx].lastUpdate = new Date().toISOString();
  saveAll(list);
}

function updateApplicationById(id, fields) {
  var list = loadAll();
  var idx = list.findIndex(function(a) { return a.id === id; });
  if (idx < 0) return false;
  list[idx] = Object.assign({}, list[idx], fields, { lastUpdate: new Date().toISOString() });
  saveAll(list);
  return true;
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(function(el) { el.textContent = ''; });
  document.querySelectorAll('input.invalid, textarea.invalid').forEach(function(el) { el.classList.remove('invalid'); });
}

function setError(id, msg) {
  var err = document.getElementById('err-' + id);
  var input = document.getElementById(id);
  if (err) err.textContent = msg || '';
  if (input) {
    if (msg) input.classList.add('invalid');
    else input.classList.remove('invalid');
  }
}

function isInKontichZone(adres) {
  if (!adres) return false;
  var lower = adres.toLowerCase();
  return KONTICH_ZONE.some(function(g) { return lower.indexOf(g) !== -1; });
}

function validateApplication(data, opts) {
  opts = opts || {};
  var requireAkkoord = opts.requireAkkoord !== false;
  var errors = {};
  if (!data.voornaam || data.voornaam.trim().length < 2) errors.voornaam = 'Voornaam is verplicht (min. 2 tekens).';
  if (!data.achternaam || data.achternaam.trim().length < 2) errors.achternaam = 'Achternaam is verplicht (min. 2 tekens).';
  if (!data.personeelsnummer || !/^\d{3,10}$/.test(data.personeelsnummer.trim())) errors.personeelsnummer = 'Geldig personeelsnummer vereist (alleen cijfers).';
  if (!data.email || !/^[^\s@]+@logimove\.be$/i.test(data.email.trim())) errors.email = 'Gebruik een @logimove.be e-mailadres.';
  if (!data.adres || data.adres.trim().length < 8) errors.adres = 'Vul een volledig woonadres in.';
  var total = Number(data.jaarBudget);
  if (!total || total < 3233 || total > 17244) errors.jaarBudget = 'Budget moet tussen 3233 en 17244 liggen.';
  var p1 = Number(data.p1) || 0;
  var p2 = Number(data.p2) || 0;
  var p3 = Number(data.p3) || 0;
  if (p1 + p2 + p3 !== total) errors.jaarBudget = (errors.jaarBudget ? errors.jaarBudget + ' ' : '') + 'Som van de pijlers moet gelijk zijn aan het totaal.';
  if (data.huisvesting) {
    if (p2 <= 0) errors.huisvesting = 'Bij huisvesting moet pijler 2 > 0 zijn.';
    if (!isInKontichZone(data.adres)) {
      errors.adres = 'Voor huisvesting moet het adres binnen 10 km van Kontich liggen.';
      errors.huisvesting = 'Adres ligt buiten de toegelaten zone rond Kontich.';
    }
  }
  if (requireAkkoord && !data.akkoord) errors.akkoord = 'Bevestiging is verplicht.';
  return errors;
}

var form = document.getElementById('aanvraagForm');
var p1Input = document.getElementById('p1');
var p2Input = document.getElementById('p2');
var p3Input = document.getElementById('p3');
var jaarInput = document.getElementById('jaarBudget');

function updateP3() {
  if (!jaarInput || !p1Input || !p2Input || !p3Input) return;
  var total = Number(jaarInput.value) || 0;
  var p1 = Number(p1Input.value) || 0;
  var p2 = Number(p2Input.value) || 0;
  p3Input.value = Math.max(0, total - p1 - p2);
}

if (jaarInput && p1Input && p2Input) {
  [jaarInput, p1Input, p2Input].forEach(function(el) { el.addEventListener('input', updateP3); });
}

function prefillForm() {
  var key = getCurrentUserKey();
  if (!key) return;
  var data = findByPersoneelsnummer(key);
  if (!data) return;
  document.getElementById('voornaam').value = data.voornaam || '';
  document.getElementById('achternaam').value = data.achternaam || '';
  document.getElementById('personeelsnummer').value = data.personeelsnummer || '';
  document.getElementById('email').value = data.email || '';
  document.getElementById('afdeling').value = data.afdeling || '';
  document.getElementById('adres').value = data.adres || '';
  jaarInput.value = data.jaarBudget || 10000;
  p1Input.value = data.p1 || 0;
  p2Input.value = data.p2 || 0;
  document.getElementById('huisvesting').checked = !!data.huisvesting;
  document.getElementById('opmerkingen').value = data.opmerkingen || '';
  updateP3();
}

function resetForm() {
  form.reset();
  jaarInput.value = 10000;
  p1Input.value = 0;
  p2Input.value = 0;
  updateP3();
  clearErrors();
  document.getElementById('formFeedback').classList.add('hidden');
}

if (form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    clearErrors();
    var data = {
      voornaam: document.getElementById('voornaam').value.trim(),
      achternaam: document.getElementById('achternaam').value.trim(),
      personeelsnummer: document.getElementById('personeelsnummer').value.trim(),
      email: document.getElementById('email').value.trim(),
      afdeling: document.getElementById('afdeling').value.trim(),
      adres: document.getElementById('adres').value.trim(),
      jaarBudget: Number(jaarInput.value),
      p1: Number(p1Input.value) || 0,
      p2: Number(p2Input.value) || 0,
      p3: Number(p3Input.value) || 0,
      huisvesting: document.getElementById('huisvesting').checked,
      opmerkingen: document.getElementById('opmerkingen').value.trim(),
      akkoord: document.getElementById('akkoord').checked
    };
    var errors = validateApplication(data);
    var feedback = document.getElementById('formFeedback');
    if (Object.keys(errors).length) {
      Object.keys(errors).forEach(function(k) { setError(k, errors[k]); });
      feedback.textContent = 'Controleer de gemarkeerde velden.';
      feedback.className = 'feedback error';
      feedback.classList.remove('hidden');
      return;
    }
    upsertApplication(Object.assign({}, data, {
      submittedAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString()
    }));
    feedback.textContent = 'Aanvraag opgeslagen. Zichtbaar in Process manager.';
    feedback.className = 'feedback success';
    feedback.classList.remove('hidden');
  });
}

function renderDashboard() {
  var key = getCurrentUserKey();
  var data = key ? findByPersoneelsnummer(key) : null;
  var badge = document.getElementById('statusBadge');
  var details = document.getElementById('statusDetails');
  var steps = document.querySelectorAll('.timeline-step');
  steps.forEach(function(s) { s.classList.remove('done', 'current'); });
  if (!data) {
    badge.textContent = 'Geen aanvraag';
    badge.className = 'status-badge';
    details.innerHTML = '<p>Nog geen aanvraag. Ga naar Aanvraag in het menu.</p>';
    document.getElementById('p1Amount').textContent = '-';
    document.getElementById('p2Amount').textContent = '-';
    document.getElementById('p3Amount').textContent = '-';
    return;
  }
  document.getElementById('p1Amount').textContent = 'EUR ' + data.p1.toLocaleString('nl-BE');
  document.getElementById('p2Amount').textContent = 'EUR ' + data.p2.toLocaleString('nl-BE');
  document.getElementById('p3Amount').textContent = 'EUR ' + data.p3.toLocaleString('nl-BE');
  var statusMap = {
    ingediend: { label: 'Openstaand', class: 'ingediend' },
    verwerkt: { label: 'In behandeling', class: 'verwerkt' },
    afgerond: { label: 'Afgerond', class: 'afgerond' }
  };
  var st = statusMap[data.status] || statusMap.ingediend;
  badge.textContent = st.label;
  badge.className = 'status-badge ' + st.class;
  var order = ['ingediend', 'verwerkt', 'afgerond'];
  var currentIdx = order.indexOf(data.status);
  order.forEach(function(step, idx) {
    var el = document.querySelector('.timeline-step[data-step="' + step + '"]');
    if (!el) return;
    if (idx < currentIdx) el.classList.add('done');
    else if (idx === currentIdx) el.classList.add('current');
  });
  var dateStr = new Date(data.submittedAt).toLocaleString('nl-BE');
  var naam = [data.voornaam, data.achternaam].filter(Boolean).join(' ');
  details.innerHTML = '<p><strong>' + escapeHtml(naam) + '</strong> · ' + escapeHtml(data.personeelsnummer) + '</p>' +
    '<p>' + escapeHtml(data.email) + ' · ' + escapeHtml(data.adres || '-') + '</p>' +
    '<p>Ingediend: ' + dateStr + ' · Budget: EUR ' + data.jaarBudget.toLocaleString('nl-BE') + '</p>';
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

var hrFilter = 'all';
var selectedHrId = null;

function renderHrOverview() {
  var list = loadAll();
  document.getElementById('statOpen').textContent = list.filter(function(a) { return a.status === 'ingediend'; }).length;
  document.getElementById('statBehandeling').textContent = list.filter(function(a) { return a.status === 'verwerkt'; }).length;
  document.getElementById('statAfgerond').textContent = list.filter(function(a) { return a.status === 'afgerond'; }).length;
  document.getElementById('statTotaal').textContent = list.length;
  var filtered = hrFilter === 'all' ? list.slice() : list.filter(function(a) { return a.status === hrFilter; });
  var tbody = document.getElementById('hrTableBody');
  var empty = document.getElementById('hrEmpty');
  if (!filtered.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  filtered.sort(function(a, b) { return new Date(b.submittedAt) - new Date(a.submittedAt); });
  tbody.innerHTML = filtered.map(function(a) {
    var naam = [a.voornaam, a.achternaam].filter(Boolean).join(' ');
    return '<tr data-id="' + a.id + '" class="' + (selectedHrId === a.id ? 'selected' : '') + '" onclick="showHrDetail(\'' + a.id + '\')">' +
      '<td><strong>' + escapeHtml(naam) + '</strong></td>' +
      '<td>' + escapeHtml(a.personeelsnummer) + '</td>' +
      '<td>' + escapeHtml(a.afdeling || '-') + '</td>' +
      '<td>EUR ' + Number(a.jaarBudget).toLocaleString('nl-BE') + '</td>' +
      '<td><select class="status-select" onclick="event.stopPropagation()" onchange="hrChangeStatus(\'' + a.id + '\', this.value)">' +
      '<option value="ingediend"' + (a.status === 'ingediend' ? ' selected' : '') + '>Openstaand</option>' +
      '<option value="verwerkt"' + (a.status === 'verwerkt' ? ' selected' : '') + '>In behandeling</option>' +
      '<option value="afgerond"' + (a.status === 'afgerond' ? ' selected' : '') + '>Afgerond</option></select></td>' +
      '<td><button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();showHrDetail(\'' + a.id + '\')">Bewerk</button></td></tr>';
  }).join('');
}

function hrChangeStatus(id, status) {
  updateStatus(id, status);
  renderHrOverview();
  if (selectedHrId === id) showHrDetail(id);
}

function showHrDetail(id) {
  var app = loadAll().find(function(a) { return a.id === id; });
  if (!app) return;
  selectedHrId = id;
  var panel = document.getElementById('hrDetail');
  var body = document.getElementById('hrDetailBody');
  var title = document.getElementById('hrDetailTitle');
  var fb = document.getElementById('hrEditFeedback');
  fb.classList.add('hidden');
  title.textContent = [app.voornaam, app.achternaam].filter(Boolean).join(' ');
  body.innerHTML = '<form id="hrEditForm" class="hr-edit-grid" onsubmit="return saveHrEdit(event, \'' + app.id + '\')">' +
    '<div class="form-group"><label>Voornaam *</label><input type="text" id="hr-voornaam" value="' + escapeHtml(app.voornaam) + '" /><span class="field-error" id="err-hr-voornaam"></span></div>' +
    '<div class="form-group"><label>Achternaam *</label><input type="text" id="hr-achternaam" value="' + escapeHtml(app.achternaam) + '" /><span class="field-error" id="err-hr-achternaam"></span></div>' +
    '<div class="form-group"><label>Personeelsnr. *</label><input type="text" id="hr-personeelsnummer" value="' + escapeHtml(app.personeelsnummer) + '" /><span class="field-error" id="err-hr-personeelsnummer"></span></div>' +
    '<div class="form-group"><label>E-mail *</label><input type="email" id="hr-email" value="' + escapeHtml(app.email) + '" /><span class="field-error" id="err-hr-email"></span></div>' +
    '<div class="form-group"><label>Afdeling</label><input type="text" id="hr-afdeling" value="' + escapeHtml(app.afdeling || '') + '" /></div>' +
    '<div class="form-group full"><label>Woonadres *</label><input type="text" id="hr-adres" value="' + escapeHtml(app.adres || '') + '" /><span class="field-error" id="err-hr-adres"></span></div>' +
    '<div class="form-group"><label>Budget</label><input type="number" id="hr-jaarBudget" value="' + app.jaarBudget + '" /><span class="field-error" id="err-hr-jaarBudget"></span></div>' +
    '<div class="form-group"><label>Pijler 1</label><input type="number" id="hr-p1" value="' + app.p1 + '" /></div>' +
    '<div class="form-group"><label>Pijler 2</label><input type="number" id="hr-p2" value="' + app.p2 + '" /></div>' +
    '<div class="form-group"><label>Pijler 3</label><input type="number" id="hr-p3" value="' + app.p3 + '" readonly /></div>' +
    '<div class="form-group full"><label class="check-label"><input type="checkbox" id="hr-huisvesting"' + (app.huisvesting ? ' checked' : '') + ' /> Huisvesting in pijler 2</label><span class="field-error" id="err-hr-huisvesting"></span></div>' +
    '<div class="form-group full"><label>Opmerkingen</label><textarea id="hr-opmerkingen" rows="2">' + escapeHtml(app.opmerkingen || '') + '</textarea></div>' +
    '<div class="form-group full form-actions"><button type="submit" class="btn btn-primary btn-sm">Wijzigingen opslaan</button></div></form>';
  var hp1 = document.getElementById('hr-p1');
  var hp2 = document.getElementById('hr-p2');
  var hp3 = document.getElementById('hr-p3');
  var hj = document.getElementById('hr-jaarBudget');
  function sync() {
    var t = Number(hj.value) || 0;
    hp3.value = Math.max(0, t - (Number(hp1.value) || 0) - (Number(hp2.value) || 0));
  }
  [hp1, hp2, hj].forEach(function(el) { el.addEventListener('input', sync); });
  panel.classList.remove('hidden');
  renderHrOverview();
}

function saveHrEdit(e, id) {
  e.preventDefault();
  ['voornaam','achternaam','personeelsnummer','email','adres','jaarBudget','huisvesting'].forEach(function(k) {
    var err = document.getElementById('err-hr-' + k);
    if (err) err.textContent = '';
  });
  var data = {
    voornaam: document.getElementById('hr-voornaam').value.trim(),
    achternaam: document.getElementById('hr-achternaam').value.trim(),
    personeelsnummer: document.getElementById('hr-personeelsnummer').value.trim(),
    email: document.getElementById('hr-email').value.trim(),
    afdeling: document.getElementById('hr-afdeling').value.trim(),
    adres: document.getElementById('hr-adres').value.trim(),
    jaarBudget: Number(document.getElementById('hr-jaarBudget').value),
    p1: Number(document.getElementById('hr-p1').value) || 0,
    p2: Number(document.getElementById('hr-p2').value) || 0,
    p3: Number(document.getElementById('hr-p3').value) || 0,
    huisvesting: document.getElementById('hr-huisvesting').checked,
    opmerkingen: document.getElementById('hr-opmerkingen').value.trim(),
    akkoord: true
  };
  var errors = validateApplication(data, { requireAkkoord: false });
  var fb = document.getElementById('hrEditFeedback');
  if (Object.keys(errors).length) {
    Object.keys(errors).forEach(function(k) {
      var err = document.getElementById('err-hr-' + k);
      if (err) err.textContent = errors[k];
    });
    fb.textContent = 'Corrigeer de fouten vooraleer op te slaan.';
    fb.className = 'feedback error';
    fb.classList.remove('hidden');
    return false;
  }
  updateApplicationById(id, data);
  fb.textContent = 'Dossier bijgewerkt.';
  fb.className = 'feedback success';
  fb.classList.remove('hidden');
  renderHrOverview();
  return false;
}

function closeHrDetail() {
  selectedHrId = null;
  document.getElementById('hrDetail').classList.add('hidden');
  renderHrOverview();
}

document.querySelectorAll('.filter-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    hrFilter = btn.dataset.filter;
    renderHrOverview();
  });
});

var DEMO_APPLICATIONS = [
  { id: 'demo_tom', voornaam: 'Tom', achternaam: 'Willems', personeelsnummer: '2101', email: 'tom.willems@logimove.be', afdeling: 'Marketing', adres: 'Molenstraat 18, 2840 Rumst', jaarBudget: 9000, p1: 0, p2: 6500, p3: 2500, huisvesting: false, opmerkingen: 'Geen bedrijfswagen. Deelautos + OV.', status: 'ingediend', submittedAt: '2026-11-08T10:15:00', lastUpdate: '2026-11-08T10:15:00' },
  { id: 'demo_riadh', voornaam: 'Riadh', achternaam: 'Mané', personeelsnummer: '2102', email: 'riadh.mane@logimove.be', afdeling: 'Accountancy', adres: 'Statiestraat 42, 2630 Aartselaar', jaarBudget: 14500, p1: 12000, p2: 1500, p3: 1000, huisvesting: false, opmerkingen: 'Wil bedrijfswagen behouden (pijler 1).', status: 'verwerkt', submittedAt: '2026-10-20T09:00:00', lastUpdate: '2026-11-03T14:20:00' },
  { id: 'demo_sara', voornaam: 'Sara', achternaam: 'Janssens', personeelsnummer: '2103', email: 'sara.janssens@logimove.be', afdeling: 'Logistiek', adres: 'Prins Boudewijnlaan 5, 2550 Kontich', jaarBudget: 12000, p1: 8500, p2: 2000, p3: 1500, huisvesting: false, opmerkingen: 'Elektrische bestelwagen.', status: 'ingediend', submittedAt: '2026-11-05T09:12:00', lastUpdate: '2026-11-05T09:12:00' },
  { id: 'demo_lisa', voornaam: 'Lisa', achternaam: 'Peeters', personeelsnummer: '2104', email: 'lisa.peeters@logimove.be', afdeling: 'HR', adres: 'Dorpstraat 7, 2650 Edegem', jaarBudget: 11000, p1: 0, p2: 7500, p3: 3500, huisvesting: true, opmerkingen: 'Fiets + trein. Huur binnen 10 km.', status: 'afgerond', submittedAt: '2026-09-15T10:00:00', lastUpdate: '2026-10-01T16:45:00' },
  { id: 'demo_kevin', voornaam: 'Kevin', achternaam: 'Claes', personeelsnummer: '2105', email: 'kevin.claes@logimove.be', afdeling: 'Warehouse', adres: 'Kerkstraat 22, 2840 Rumst', jaarBudget: 8000, p1: 0, p2: 5000, p3: 3000, huisvesting: false, opmerkingen: 'E-bike + deelmobiliteit.', status: 'ingediend', submittedAt: '2026-11-10T08:20:00', lastUpdate: '2026-11-10T08:20:00' },
  { id: 'demo_eline', voornaam: 'Eline', achternaam: 'Vandenberghe', personeelsnummer: '2106', email: 'eline.vandenberghe@logimove.be', afdeling: 'Sales', adres: 'Kapelstraat 3, 2540 Hove', jaarBudget: 13500, p1: 10000, p2: 2000, p3: 1500, huisvesting: false, opmerkingen: 'Klantenbezoeken - bedrijfswagen.', status: 'verwerkt', submittedAt: '2026-10-12T11:30:00', lastUpdate: '2026-10-28T09:15:00' },
  { id: 'demo_mohamed', voornaam: 'Mohamed', achternaam: 'El Amrani', personeelsnummer: '2107', email: 'mohamed.elamrani@logimove.be', afdeling: 'IT', adres: 'Stationstraat 14, 2610 Wilrijk', jaarBudget: 7500, p1: 0, p2: 4500, p3: 3000, huisvesting: false, opmerkingen: 'Thuiswerk + OV.', status: 'afgerond', submittedAt: '2026-08-22T14:00:00', lastUpdate: '2026-09-10T10:00:00' },
  { id: 'demo_anne', voornaam: 'Anne', achternaam: 'De Vos', personeelsnummer: '2108', email: 'anne.devos@logimove.be', afdeling: 'Finance', adres: 'Veldstraat 9, 2547 Lint', jaarBudget: 10000, p1: 6000, p2: 2500, p3: 1500, huisvesting: true, opmerkingen: 'EV + hypotheek (Lint).', status: 'ingediend', submittedAt: '2026-11-11T16:40:00', lastUpdate: '2026-11-11T16:40:00' },
  { id: 'demo_pieter', voornaam: 'Pieter', achternaam: 'Hermans', personeelsnummer: '2109', email: 'pieter.hermans@logimove.be', afdeling: 'Operations', adres: 'Industrieweg 1, 2550 Kontich', jaarBudget: 16000, p1: 14000, p2: 1000, p3: 1000, huisvesting: false, opmerkingen: 'Fulltime tussen sites.', status: 'verwerkt', submittedAt: '2026-10-05T08:45:00', lastUpdate: '2026-10-18T13:00:00' },
  { id: 'demo_sofie', voornaam: 'Sofie', achternaam: 'Maes', personeelsnummer: '2110', email: 'sofie.maes@logimove.be', afdeling: 'Customer Service', adres: 'Gemeenteplein 2, 2630 Aartselaar', jaarBudget: 6500, p1: 0, p2: 4000, p3: 2500, huisvesting: false, opmerkingen: 'De Lijn + Cambio.', status: 'ingediend', submittedAt: '2026-11-09T13:25:00', lastUpdate: '2026-11-09T13:25:00' }
];

function seedDemoData() {
  saveAll(DEMO_APPLICATIONS.map(function(d) { return Object.assign({}, d); }));
}

var seedBtn = document.getElementById('seedDemoBtn');
if (seedBtn) {
  seedBtn.addEventListener('click', function() {
    seedDemoData();
    selectedHrId = null;
    document.getElementById('hrDetail').classList.add('hidden');
    renderHrOverview();
  });
}

if (loadAll().length === 0) seedDemoData();

var faq = [
  { keywords: ['hoeveel', 'budget', '2026', 'minimum', 'maximum'], answer: 'In 2026: minimum <strong>EUR 3.233</strong>, maximum <strong>EUR 17.244</strong> (of 20% brutojaarloon).' },
  { keywords: ['pijlers', 'pijler'], answer: 'Drie pijlers: 1) zero-emissie wagen, 2) duurzame mobiliteit + huisvesting (max. 10 km van Kontich), 3) cash (38,07% bijdrage).' },
  { keywords: ['huisvesting', 'huur', 'hypotheek', 'kontich'], answer: 'Huisvesting in pijler 2 mag alleen als je woning max. <strong>10 km</strong> van Kontich ligt.' },
  { keywords: ['bijdrage', '38', 'cash', 'pijler 3'], answer: 'Op pijler 3 geldt een bijzondere werknemersbijdrage van <strong>38,07%</strong>.' },
  { keywords: ['contact', 'hr'], answer: 'Voor persoonlijke dossiers: open Process manager of contacteer HR.' },
  { keywords: ['hallo', 'hoi', 'hey'], answer: 'Hallo! Stel je vraag over het mobiliteitsbudget.' }
];
var fallback = 'Geen duidelijk antwoord. Neem contact op met <strong>HR</strong>.';

function findAnswer(q) {
  var n = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  var best = null, score = 0;
  faq.forEach(function(item) {
    var s = 0;
    item.keywords.forEach(function(kw) { if (n.indexOf(kw) !== -1) s++; });
    if (s > score) { score = s; best = item; }
  });
  return score ? best.answer : fallback;
}

function addMessage(text, isUser) {
  var c = document.getElementById('chatMessages');
  if (!c) return;
  var d = document.createElement('div');
  d.className = 'message ' + (isUser ? 'user' : 'bot');
  d.innerHTML = '<div class="message-avatar">' + (isUser ? 'Jij' : 'Flo') + '</div><div class="message-content">' + text + '</div>';
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

function handleChat() {
  var input = document.getElementById('chatInput');
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;
  addMessage(escapeHtml(text), true);
  input.value = '';
  setTimeout(function() { addMessage(findAnswer(text), false); }, 350);
}

var chatSend = document.getElementById('chatSend');
var chatInput = document.getElementById('chatInput');
if (chatSend) chatSend.addEventListener('click', handleChat);
if (chatInput) chatInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') handleChat(); });
document.querySelectorAll('.chip').forEach(function(chip) {
  chip.addEventListener('click', function() {
    var input = document.getElementById('chatInput');
    if (input) input.value = chip.dataset.q;
    handleChat();
  });
});

updateP3();

var btnLoginW = document.getElementById('loginWerknemer');
var btnLoginH = document.getElementById('loginHr');
var btnLogout = document.getElementById('logoutBtn');
if (btnLoginW) btnLoginW.addEventListener('click', function() { loginAs('werknemer'); });
if (btnLoginH) btnLoginH.addEventListener('click', function() { loginAs('hr'); });
if (btnLogout) btnLogout.addEventListener('click', logout);

applySession();
