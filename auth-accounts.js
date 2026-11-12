/* Override accounts: Elena, Tom, Riadh + HR */
var ACCOUNT_USERS = {
  'hr@logimove.be': { password: 'hr', role: 'hr', name: 'HR' },
  'elena@logimove.be': { password: 'elena', role: 'werknemer', name: 'Elena', personeelsnummer: '2111' },
  'tom@logimove.be': { password: 'tom', role: 'werknemer', name: 'Tom Willems', personeelsnummer: '2101' },
  'riadh@logimove.be': { password: 'riadh', role: 'werknemer', name: 'Riadh Man\u00e9', personeelsnummer: '2102' }
};

var USER_NAME_KEY = 'moveflow_user_name';
var USER_EMAIL_KEY = 'moveflow_user_email';

function loginAs(role, meta) {
  meta = meta || {};
  sessionStorage.setItem(ROLE_KEY, role);
  if (meta.name) sessionStorage.setItem(USER_NAME_KEY, meta.name);
  else sessionStorage.removeItem(USER_NAME_KEY);
  if (meta.email) sessionStorage.setItem(USER_EMAIL_KEY, meta.email);
  else sessionStorage.removeItem(USER_EMAIL_KEY);
  if (meta.personeelsnummer) setCurrentUserKey(String(meta.personeelsnummer));
  applySession();
}

function tryLogin(email, password) {
  var key = (email || '').trim().toLowerCase();
  var user = ACCOUNT_USERS[key];
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

// Zorg dat demo-data Elena bevat en e-mails kloppen
(function ensurePersonaData() {
  try {
    var list = loadAll();
    var changed = false;
    list.forEach(function(a) {
      if (a.personeelsnummer === '2101' && a.email !== 'tom@logimove.be') {
        a.email = 'tom@logimove.be';
        changed = true;
      }
      if (a.personeelsnummer === '2102' && a.email !== 'riadh@logimove.be') {
        a.email = 'riadh@logimove.be';
        changed = true;
      }
    });
    if (!list.some(function(a) { return a.personeelsnummer === '2111'; })) {
      list.push({
        id: 'demo_elena',
        voornaam: 'Elena',
        achternaam: 'Costa',
        personeelsnummer: '2111',
        email: 'elena@logimove.be',
        afdeling: 'Logistiek',
        adres: 'Kerkstraat 11, 2550 Kontich',
        jaarBudget: 9500,
        p1: 0,
        p2: 6000,
        p3: 3500,
        huisvesting: false,
        opmerkingen: 'Deelmobiliteit en fiets.',
        status: 'ingediend',
        submittedAt: '2026-11-10T11:00:00',
        lastUpdate: '2026-11-10T11:00:00'
      });
      changed = true;
    }
    if (changed) saveAll(list);
  } catch (e) {}
})();

// Re-bind login form to overridden tryLogin
var loginFormEl = document.getElementById('loginForm');
if (loginFormEl) {
  loginFormEl.onsubmit = function(e) {
    e.preventDefault();
    var email = document.getElementById('loginEmail');
    var pass = document.getElementById('loginPassword');
    tryLogin(email ? email.value : '', pass ? pass.value : '');
  };
}
var logoutEl = document.getElementById('logoutBtn');
if (logoutEl) {
  logoutEl.onclick = function() { logout(); };
}
