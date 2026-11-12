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

const USER_NAME_KEY = 'moveflow_user_name';
const USER_EMAIL_KEY = 'moveflow_user_email';

const DEMO_USERS = {
  'hr@logimove.be': { password: 'hr', role: 'hr', name: 'HR' },
  'elena@logimove.be': { password: 'elena', role: 'werknemer', name: 'Elena', personeelsnummer: '2111' },
  'tom@logimove.be': { password: 'tom', role: 'werknemer', name: 'Tom Willems', personeelsnummer: '2101' },
  'riadh@logimove.be': { password: 'riadh', role: 'werknemer', name: 'Riadh Man\u00e9', personeelsnummer: '2102' }
};

function loginAs(role, meta) {
  meta = meta || {};
  sessionStorage.setItem(ROLE_KEY, role);
  if (meta.name) sessionStorage.setItem(USER_NAME_KEY, meta.name);
  else sessionStorage.removeItem(USER_NAME_KEY);
  if (meta.email) sessionStorage.setItem(USER_EMAIL_KEY, meta.email);
  else sessionStorage.removeItem(USER_EMAIL_KEY);
  if (meta.personeelsnummer) setCurrentUserKey(meta.personeelsnummer);
  applySession();
}

function tryLogin(email, password) {
  var key = (email || '').trim().toLowerCase();
  var user = DEMO_USERS[key];
  var err = document.getElementById('loginError');
  if (!user || user.password !== password) {
    if (err) {
      err.textContent = 'Onjuiste e-mail of wachtwoord.';
      err.classList.remove('hidden');
    }
    return false;
  }
  if (err) err.classList.add('hidden');
  loginAs(user.role, {
    name: user.name,
    email: key,
    personeelsnummer: user.personeelsnummer || null
  });
  return true;
}

function logout() {
  sessionStorage.removeItem(ROLE_KEY);
  sessionStorage.removeItem(USER_NAME_KEY);
  sessionStorage.removeItem(USER_EMAIL_KEY);
  var email = document.getElementById('loginEmail');
  var pass = document.getElementById('loginPassword');
  if (email) email.value = '';
  if (pass) pass.value = '';
  var err = document.getElementById('loginError');
  if (err) err.classList.add('hidden');
  applySession();
}

function applySession() {
  var role = getRole();
  var loginScreen = document.getElementById('loginScreen');
  var appShell = document.getElementById('appShell');
  var navW = document.getElementById('navWerknemer');
  var navH = document.getElementById('navHr');
  var badge = document.getElementById('modeBadge');
  var userLabel = document.getElementById('topbarUser');
  if (!role) {
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (appShell) appShell.classList.add('hidden');
    if (navW) navW.classList.add('hidden');
    if (navH) navH.classList.add('hidden');
    if (badge) badge.textContent = 'Niet ingelogd';
    if (userLabel) userLabel.textContent = '';
    return;
  }
  if (loginScreen) loginScreen.classList.add('hidden');
  if (appShell) appShell.classList.remove('hidden');
  var isHr = role === 'hr';
  if (navW) navW.classList.toggle('hidden', isHr);
  if (navH) navH.classList.toggle('hidden', !isHr);
  if (badge) badge.textContent = isHr ? 'Ingelogd: HR' : 'Ingelogd: Werknemer';
  var displayName = sessionStorage.getItem(USER_NAME_KEY) || (isHr ? 'HR' : 'Werknemer');
  if (userLabel) userLabel.textContent = displayName;
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

  var statusMap = {
    ingediend: { label: 'Openstaand', class: 'ingediend' },
    verwerkt: { label: 'In behandeling', class: 'verwerkt' },
    afgerond: { label: 'Afgerond', class: 'afgerond' }
  };

  if (!data) {
    badge.textContent = 'Geen aanvraag';
    badge.className = 'status-badge';
    details.innerHTML = '<p>Nog geen aanvraag. Ga naar Aanvraag in het menu om een dossier in te dienen.</p>';
  } else {
    var st = statusMap[data.status] || statusMap.ingediend;
    badge.textContent = st.label;
    badge.className = 'status-badge ' + st.class;
    var order = ['ingediend', 'verwerkt', 'afgerond'];
    var currentIdx = order.indexOf(data.status);
    order.forEach(function(step, idx) {
      var el = document.querySelector('.timeline-step[ repdata-step="' + step + '"]');
      if (!el) return;
      if (idx < currentIdx) el.classList.add('done');
      else if (idx === currentIdx) el.classList.add('current');
    });
    var dateStr = new Date(data.submittedAt).toLocaleString('nl-BE');
    var naam = [data.voornaam, data.achternaam].filter(Boolean).join(' ');
    details.innerHTML = '<p><strong>' + escapeHtml(naam) + '</strong> · ' + escapeHtml(data.personeelsnummer) + '</p>' +
      '<p>' + escapeHtml(data.email) + ' · ' + escapeHtml(data.adres || '-') + '</p>' +
      '<p>Laatste update: ' + dateStr + ' · Budget: EUR ' + data.jaarBudget.toLocaleString('nl-BE') + '</p>';
  }

  var myApps = [];
  if (key) {
    myApps = loadAll().filter(function(a) { return a.personeelsnummer === key; });
  }
  myApps.sort(function(a, b) { return new Date(b.submittedAt) - new Date(a.submittedAt); });

  var tbody = document.getElementById('myAppsBody');
  var empty = document.getElementById('myAppsEmpty');
  var table = document.getElementById('myAppsTable');
  if (!tbody) return;

  if (!myApps.length) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    if (table) table.classList.add('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  if (table) table.classList.remove('hidden');
  tbody.innerHTML = myApps.map(function(a) {
    var st = statusMap[a.status] || statusMap.ingediend;
    var d = a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('nl-BE') : '-';
    return '<tr>' +
      '<td>' + escapeHtml(d) + '</td>' +
      '<td>EUR ' + Number(a.jaarBudget || 0).toLocaleString('nl-BE') + '</td>' +
      '<td>EUR ' + Number(a.p1 || 0).toLocaleString('nl-BE') + '</td>' +
      '<td>EUR ' + Number(a.p2 || 0).toLocaleString('nl-BE') + '</td>' +
      '<td>EUR ' + Number(a.p3 || 0).toLocaleString('nl-BE') + '</td>' +
      '<td><span class="status-badge ' + st.class + '">' + st.label + '</span></td>' +
      '</tr>';
  }).join('');
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
    var naam = [a.voornaam, a... truncated due to length - need full file
