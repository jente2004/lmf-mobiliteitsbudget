// MoveFlow – client-side demo app
// Werknemer: eigen aanvraag | HR: overzicht van alle aanvragen

const STORAGE_KEY = 'moveflow_applications_v1';
const CURRENT_USER_KEY = 'moveflow_current_user';

// --- Navigation ---
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');

  const btn = document.querySelector(`.nav-btn[data-page="${pageId}"]`);
  if (btn) btn.classList.add('active');

  if (pageId === 'dashboard') renderDashboard();
  if (pageId === 'aanvraag') prefillForm();
  if (pageId === 'hr') renderHrOverview();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => showPage(btn.dataset.page));
});

// --- Data helpers (array of applications) ---
function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
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
  return loadAll().find(a => a.personeelsnummer === nr) || null;
}

function upsertApplication(app) {
  const list = loadAll();
  const idx = list.findIndex(a => a.personeelsnummer === app.personeelsnummer);
  if (idx >= 0) {
    app.status = list[idx].status === 'afgerond' ? 'ingediend' : (list[idx].status || 'ingediend');
    if (list[idx].status === 'afgerond') app.status = 'ingediend';
    app.id = list[idx].id;
    list[idx] = app;
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
  const list = loadAll();
  const idx = list.findIndex(a => a.id === id);
  if (idx < 0) return;
  list[idx].status = newStatus;
  list[idx].lastUpdate = new Date().toISOString();
  saveAll(list);
}

// --- Form logic ---
const form = document.getElementById('aanvraagForm');
const p1Input = document.getElementById('p1');
const p2Input = document.getElementById('p2');
const p3Input = document.getElementById('p3');
const jaarInput = document.getElementById('jaarBudget');

function updateP3() {
  const total = Number(jaarInput.value) || 0;
  const p1 = Number(p1Input.value) || 0;
  const p2 = Number(p2Input.value) || 0;
  p3Input.value = Math.max(0, total - p1 - p2);
}

[jaarInput, p1Input, p2Input].forEach(el => {
  el.addEventListener('input', updateP3);
});

function prefillForm() {
  const key = getCurrentUserKey();
  if (!key) return;
  const data = findByPersoneelsnummer(key);
  if (!data) return;

  document.getElementById('voornaam').value = data.voornaam || '';
  document.getElementById('achternaam').value = data.achternaam || '';
  document.getElementById('personeelsnummer').value = data.personeelsnummer || '';
  document.getElementById('email').value = data.email || '';
  document.getElementById('afdeling').value = data.afdeling || '';
  jaarInput.value = data.jaarBudget || 10000;
  p1Input.value = data.p1 || 0;
  p2Input.value = data.p2 || 0;
  document.getElementById('opmerkingen').value = data.opmerkingen || '';
  updateP3();
}

function resetForm() {
  form.reset();
  jaarInput.value = 10000;
  p1Input.value = 0;
  p2Input.value = 0;
  updateP3();
  document.getElementById('formFeedback').classList.add('hidden');
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const voornaam = document.getElementById('voornaam').value.trim();
  const achternaam = document.getElementById('achternaam').value.trim();
  const personeelsnummer = document.getElementById('personeelsnummer').value.trim();
  const email = document.getElementById('email').value.trim();
  const afdeling = document.getElementById('afdeling').value.trim();

  const total = Number(jaarInput.value);
  const p1 = Number(p1Input.value) || 0;
  const p2 = Number(p2Input.value) || 0;
  const p3 = Number(p3Input.value) || 0;
  const opmerkingen = document.getElementById('opmerkingen').value.trim();

  const feedback = document.getElementById('formFeedback');

  if (p1 + p2 + p3 !== total) {
    feedback.textContent = 'De som van de drie pijlers moet gelijk zijn aan het jaarlijkse budget.';
    feedback.className = 'feedback error';
    feedback.classList.remove('hidden');
    return;
  }

  if (total < 3233 || total > 17244) {
    feedback.textContent = 'Het budget moet tussen € 3.233 en € 17.244 liggen (2026).';
    feedback.className = 'feedback error';
    feedback.classList.remove('hidden');
    return;
  }

  const app = {
    voornaam,
    achternaam,
    personeelsnummer,
    email,
    afdeling,
    jaarBudget: total,
    p1,
    p2,
    p3,
    opmerkingen,
    submittedAt: new Date().toISOString(),
    lastUpdate: new Date().toISOString()
  };

  upsertApplication(app);

  feedback.textContent = 'Je aanvraag is succesvol ingediend / bijgewerkt. HR ziet ze in het overzicht.';
  feedback.className = 'feedback success';
  feedback.classList.remove('hidden');
});

// --- Dashboard (werknemer) ---
function renderDashboard() {
  const key = getCurrentUserKey();
  const data = key ? findByPersoneelsnummer(key) : null;
  const badge = document.getElementById('statusBadge');
  const details = document.getElementById('statusDetails');
  const steps = document.querySelectorAll('.timeline-step');

  steps.forEach(s => s.classList.remove('done', 'current'));

  if (!data) {
    badge.textContent = 'Geen aanvraag';
    badge.className = 'status-badge';
    details.innerHTML = '<p>Je hebt nog geen aanvraag ingediend. Start hieronder een nieuwe aanvraag.</p>';
    document.getElementById('p1Amount').textContent = '—';
    document.getElementById('p2Amount').textContent = '—';
    document.getElementById('p3Amount').textContent = '—';
    return;
  }

  document.getElementById('p1Amount').textContent = '€ ' + data.p1.toLocaleString('nl-BE');
  document.getElementById('p2Amount').textContent = '€ ' + data.p2.toLocaleString('nl-BE');
  document.getElementById('p3Amount').textContent = '€ ' + data.p3.toLocaleString('nl-BE');

  const statusMap = {
    ingediend: { label: 'Ingediend', class: 'ingediend' },
    verwerkt: { label: 'In behandeling', class: 'verwerkt' },
    afgerond: { label: 'Afgerond', class: 'afgerond' }
  };

  const st = statusMap[data.status] || statusMap.ingediend;
  badge.textContent = st.label;
  badge.className = 'status-badge ' + st.class;

  const order = ['ingediend', 'verwerkt', 'afgerond'];
  const currentIdx = order.indexOf(data.status);

  order.forEach((step, idx) => {
    const el = document.querySelector(`.timeline-step[data-step="${step}"]`);
    if (!el) return;
    if (idx < currentIdx) el.classList.add('done');
    else if (idx === currentIdx) el.classList.add('current');
  });

  const dateStr = new Date(data.submittedAt).toLocaleString('nl-BE', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const naam = [data.voornaam, data.achternaam].filter(Boolean).join(' ') || 'Onbekend';
  const afdelingRegel = data.afdeling ? `<p><strong>Afdeling:</strong> ${escapeHtml(data.afdeling)}</p>` : '';
  const opmerkingenRegel = data.opmerkingen ? `<p><strong>Opmerkingen:</strong> ${escapeHtml(data.opmerkingen)}</p>` : '';

  details.innerHTML = `
    <p><strong>Aanvrager:</strong> ${escapeHtml(naam)}</p>
    <p><strong>Personeelsnummer:</strong> ${escapeHtml(data.personeelsnummer || '—')}</p>
    <p><strong>E-mail:</strong> ${escapeHtml(data.email || '—')}</p>
    ${afdelingRegel}
    <p><strong>Ingediend op:</strong> ${dateStr}</p>
    <p><strong>Totaal budget:</strong> € ${data.jaarBudget.toLocaleString('nl-BE')}</p>
    ${opmerkingenRegel}
    <p style="margin-top:0.5rem;font-size:0.9rem;">HR past de status aan via het HR-overzicht.</p>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
}

// --- HR Overview ---
let hrFilter = 'all';

function renderHrOverview() {
  const list = loadAll();
  const open = list.filter(a => a.status === 'ingediend').length;
  const beh = list.filter(a => a.status === 'verwerkt').length;
  const afg = list.filter(a => a.status === 'afgerond').length;

  document.getElementById('statOpen').textContent = open;
  document.getElementById('statBehandeling').textContent = beh;
  document.getElementById('statAfgerond').textContent = afg;
  document.getElementById('statTotaal').textContent = list.length;

  const filtered = hrFilter === 'all' ? list : list.filter(a => a.status === hrFilter);
  const tbody = document.getElementById('hrTableBody');
  const empty = document.getElementById('hrEmpty');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  filtered.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  tbody.innerHTML = filtered.map(a => {
    const naam = [a.voornaam, a.achternaam].filter(Boolean).join(' ');
    const dateStr = new Date(a.submittedAt).toLocaleDateString('nl-BE');
    return `
      <tr data-id="${a.id}">
        <td><strong>${escapeHtml(naam)}</strong><br><small style="color:#6B4A4A">${escapeHtml(a.email || '')}</small></td>
        <td>${escapeHtml(a.personeelsnummer || '—')}</td>
        <td>${escapeHtml(a.afdeling || '—')}</td>
        <td>€ ${Number(a.jaarBudget).toLocaleString('nl-BE')}</td>
        <td>${dateStr}</td>
        <td>
          <select class="status-select" data-id="${a.id}" onchange="hrChangeStatus('${a.id}', this.value)">
            <option value="ingediend" ${a.status === 'ingediend' ? 'selected' : ''}>Openstaand</option>
            <option value="verwerkt" ${a.status === 'verwerkt' ? 'selected' : ''}>In behandeling</option>
            <option value="afgerond" ${a.status === 'afgerond' ? 'selected' : ''}>Afgerond</option>
          </select>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="showHrDetail('${a.id}')">Bekijk</button>
        </td>
      </tr>
    `;
  }).join('');
}

function hrChangeStatus(id, status) {
  updateStatus(id, status);
  renderHrOverview();
  if (document.getElementById('page-dashboard').classList.contains('active')) {
    renderDashboard();
  }
}

function showHrDetail(id) {
  const app = loadAll().find(a => a.id === id);
  if (!app) return;

  const panel = document.getElementById('hrDetail');
  const body = document.getElementById('hrDetailBody');
  const title = document.getElementById('hrDetailTitle');

  const naam = [app.voornaam, app.achternaam].filter(Boolean).join(' ');
  title.textContent = `Aanvraag – ${naam}`;

  const dateStr = new Date(app.submittedAt).toLocaleString('nl-BE', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  body.innerHTML = `
    <div class="hr-detail-grid">
      <p><strong>Naam:</strong> ${escapeHtml(naam)}</p>
      <p><strong>Personeelsnummer:</strong> ${escapeHtml(app.personeelsnummer)}</p>
      <p><strong>E-mail:</strong> ${escapeHtml(app.email)}</p>
      <p><strong>Afdeling:</strong> ${escapeHtml(app.afdeling || '—')}</p>
      <p><strong>Ingediend op:</strong> ${dateStr}</p>
      <p><strong>Status:</strong> <span class="status-badge ${app.status}">${statusLabel(app.status)}</span></p>
    </div>
    <hr style="margin:1rem 0;border:none;border-top:1px solid var(--border)">
    <p><strong>Totaal budget:</strong> € ${Number(app.jaarBudget).toLocaleString('nl-BE')}</p>
    <p><strong>Pijler 1 (wagen):</strong> € ${Number(app.p1).toLocaleString('nl-BE')}</p>
    <p><strong>Pijler 2 (duurzaam):</strong> € ${Number(app.p2).toLocaleString('nl-BE')}</p>
    <p><strong>Pijler 3 (cash):</strong> € ${Number(app.p3).toLocaleString('nl-BE')}</p>
    ${app.opmerkingen ? `<p style="margin-top:0.75rem"><strong>Opmerkingen:</strong> ${escapeHtml(app.opmerkingen)}</p>` : ''}
  `;

  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeHrDetail() {
  document.getElementById('hrDetail').classList.add('hidden');
}

function statusLabel(s) {
  return { ingediend: 'Openstaand', verwerkt: 'In behandeling', afgerond: 'Afgerond' }[s] || s;
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    hrFilter = btn.dataset.filter;
    renderHrOverview();
  });
});

// --- Fictieve demo-aanvragen (incl. Tom Willems & Riadh Mané) ---
const DEMO_APPLICATIONS = [
  {
    id: 'demo_tom',
    voornaam: 'Tom',
    achternaam: 'Willems',
    personeelsnummer: '2101',
    email: 'tom.willems@bedrijf.be',
    afdeling: 'Marketing',
    jaarBudget: 9000,
    p1: 0,
    p2: 6500,
    p3: 2500,
    opmerkingen: '26 jaar, woont in Rumst. Bachelor Marketing, rijbewijs B. Kiest bewust géén bedrijfswagen. Gebruikt regelmatig deelauto\'s + OV. Anciënniteit 5 jaar, voltijds.',
    status: 'ingediend',
    submittedAt: '2026-11-08T10:15:00',
    lastUpdate: '2026-11-08T10:15:00'
  },
  {
    id: 'demo_riadh',
    voornaam: 'Riadh',
    achternaam: 'Mané',
    personeelsnummer: '2102',
    email: 'riadh.mane@bedrijf.be',
    afdeling: 'Accountancy',
    jaarBudget: 14500,
    p1: 12000,
    p2: 1500,
    p3: 1000,
    opmerkingen: '50 jaar, woont in Aartselaar. Accountant medewerker, 25 jaar anciënniteit, voltijds. Wil bedrijfswagen behouden → focus op pijler 1 (zero-emissie).',
    status: 'verwerkt',
    submittedAt: '2026-10-20T09:00:00',
    lastUpdate: '2026-11-03T14:20:00'
  },
  {
    id: 'demo_sara',
    voornaam: 'Sara',
    achternaam: 'Janssens',
    personeelsnummer: '2103',
    email: 'sara.janssens@bedrijf.be',
    afdeling: 'Logistiek',
    jaarBudget: 12000,
    p1: 8500,
    p2: 2000,
    p3: 1500,
    opmerkingen: 'Wil een elektrische bestelwagen voor klantenbezoeken.',
    status: 'ingediend',
    submittedAt: '2026-11-05T09:12:00',
    lastUpdate: '2026-11-05T09:12:00'
  },
  {
    id: 'demo_lisa',
    voornaam: 'Lisa',
    achternaam: 'Peeters',
    personeelsnummer: '2104',
    email: 'lisa.peeters@bedrijf.be',
    afdeling: 'HR',
    jaarBudget: 11000,
    p1: 0,
    p2: 7500,
    p3: 3500,
    opmerkingen: 'Fiets + treinabonnement. Woning binnen 10 km van kantoor.',
    status: 'afgerond',
    submittedAt: '2026-09-15T10:00:00',
    lastUpdate: '2026-10-01T16:45:00'
  },
  {
    id: 'demo_kevin',
    voornaam: 'Kevin',
    achternaam: 'Claes',
    personeelsnummer: '2105',
    email: 'kevin.claes@bedrijf.be',
    afdeling: 'Warehouse',
    jaarBudget: 8000,
    p1: 0,
    p2: 5000,
    p3: 3000,
    opmerkingen: 'E-bike + deelmobiliteit.',
    status: 'ingediend',
    submittedAt: '2026-11-10T08:20:00',
    lastUpdate: '2026-11-10T08:20:00'
  },
  {
    id: 'demo_eline',
    voornaam: 'Eline',
    achternaam: 'Vandenberghe',
    personeelsnummer: '2106',
    email: 'eline.vandenberghe@bedrijf.be',
    afdeling: 'Sales',
    jaarBudget: 13500,
    p1: 10000,
    p2: 2000,
    p3: 1500,
    opmerkingen: 'Veel klantenbezoeken in Vlaanderen → bedrijfswagen noodzakelijk.',
    status: 'verwerkt',
    submittedAt: '2026-10-12T11:30:00',
    lastUpdate: '2026-10-28T09:15:00'
  },
  {
    id: 'demo_mohamed',
    voornaam: 'Mohamed',
    achternaam: 'El Amrani',
    personeelsnummer: '2107',
    email: 'mohamed.elamrani@bedrijf.be',
    afdeling: 'IT',
    jaarBudget: 7500,
    p1: 0,
    p2: 4500,
    p3: 3000,
    opmerkingen: 'Voornamelijk thuiswerk + OV naar kantoor.',
    status: 'afgerond',
    submittedAt: '2026-08-22T14:00:00',
    lastUpdate: '2026-09-10T10:00:00'
  },
  {
    id: 'demo_anne',
    voornaam: 'Anne',
    achternaam: 'De Vos',
    personeelsnummer: '2108',
    email: 'anne.devos@bedrijf.be',
    afdeling: 'Finance',
    jaarBudget: 10000,
    p1: 6000,
    p2: 2500,
    p3: 1500,
    opmerkingen: 'Combinatie kleine elektrische wagen + fiets.',
    status: 'ingediend',
    submittedAt: '2026-11-11T16:40:00',
    lastUpdate: '2026-11-11T16:40:00'
  },
  {
    id: 'demo_pieter',
    voornaam: 'Pieter',
    achternaam: 'Hermans',
    personeelsnummer: '2109',
    email: 'pieter.hermans@bedrijf.be',
    afdeling: 'Operations',
    jaarBudget: 16000,
    p1: 14000,
    p2: 1000,
    p3: 1000,
    opmerkingen: 'Fulltime op de baan tussen sites.',
    status: 'verwerkt',
    submittedAt: '2026-10-05T08:45:00',
    lastUpdate: '2026-10-18T13:00:00'
  },
  {
    id: 'demo_sofie',
    voornaam: 'Sofie',
    achternaam: 'Maes',
    personeelsnummer: '2110',
    email: 'sofie.maes@bedrijf.be',
    afdeling: 'Customer Service',
    jaarBudget: 6500,
    p1: 0,
    p2: 4000,
    p3: 2500,
    opmerkingen: 'Abonnement De Lijn + Cambio deelauto.',
    status: 'ingediend',
    submittedAt: '2026-11-09T13:25:00',
    lastUpdate: '2026-11-09T13:25:00'
  }
];

function seedDemoData(force = false) {
  const existing = loadAll();
  if (!force && existing.length > 0) return;

  const numbers = new Set(existing.map(a => a.personeelsnummer));
  DEMO_APPLICATIONS.forEach(d => {
    if (!numbers.has(d.personeelsnummer)) existing.push({ ...d });
  });
  saveAll(existing);
}

document.getElementById('seedDemoBtn').addEventListener('click', () => {
  seedDemoData(true);
  // force overwrite missing ones only; for full refresh we can replace
  const existing = loadAll();
  const numbers = new Set(existing.map(a => a.personeelsnummer));
  DEMO_APPLICATIONS.forEach(d => {
    if (!numbers.has(d.personeelsnummer)) existing.push({ ...d });
  });
  saveAll(existing);
  renderHrOverview();
});

// --- Chatbot ---
const faq = [
  {
    keywords: ['hoeveel', 'bedraagt', 'budget', '2026', 'minimum', 'maximum', 'grens'],
    answer: 'In 2026 bedraagt het mobiliteitsbudget minimum <strong>€ 3.233</strong> en maximum <strong>€ 17.244</strong> per kalenderjaar. Bovendien mag het nooit hoger zijn dan 20% van je totale brutojaarloon.'
  },
  {
    keywords: ['drie pijlers', 'pijlers', 'wat zijn de pijlers', 'pijler 1', 'pijler 2', 'pijler 3'],
    answer: 'Het mobiliteitsbudget heeft drie pijlers:<br><br>① <strong>Pijler 1</strong> – Milieuvriendelijke bedrijfswagen (vanaf 2026 uitsluitend zero-emissie).<br>② <strong>Pijler 2</strong> – Duurzame mobiliteit en bepaalde huisvestingskosten.<br>③ <strong>Pijler 3</strong> – Cash-restsaldo (met 38,07% bijdrage).'
  },
  {
    keywords: ['aanmerking', 'wie', 'recht op', 'in aanmerking', 'voorwaarden'],
    answer: 'Je komt in aanmerking als je een bedrijfswagen hebt of er volgens het bedrijfswagenbeleid recht op hebt. De werkgever moet het systeem hebben ingevoerd.'
  },
  {
    keywords: ['bijdrage', '38', 'pijler 3', 'cash', 'uitbetaling', 'netto'],
    answer: 'Op het cash-saldo van pijler 3 wordt een bijzondere werknemersbijdrage van <strong>38,07%</strong> ingehouden.'
  },
  {
    keywords: ['huisvesting', 'huur', 'hypotheek', 'woning', '10 km'],
    answer: 'Onder voorwaarden mag je in pijler 2 huisvestingskosten betalen. De woning moet max. <strong>10 kilometer in vogelvlucht</strong> van je normale werkplek liggen.'
  },
  {
    keywords: ['fiets', 'elektrische fiets', 'e-bike'],
    answer: 'Ja! Onder pijler 2 vallen aankoop, leasing, huur en onderhoud van een (elektrische) fiets of speed pedelec.'
  },
  {
    keywords: ['openbaar vervoer', 'trein', 'bus', 'tram', 'metro', 'abonnement'],
    answer: 'Abonnementen en tickets voor openbaar vervoer vallen onder pijler 2 en zijn fiscaal interessant.'
  },
  {
    keywords: ['wanneer', 'indienen', 'aanvragen', 'termijn'],
    answer: 'Je kunt een aanvraag indienen zodra je werkgever het systeem heeft ingevoerd. Uitbetaling pijler 3 gebeurt uiterlijk met het loon van de eerste maand van het volgende kalenderjaar.'
  },
  {
    keywords: ['contact', 'hr', 'help'],
    answer: 'Voor persoonlijke of complexe vragen kun je het best rechtstreeks contact opnemen met HR.'
  },
  {
    keywords: ['hallo', 'hoi', 'hey', 'goedemorgen'],
    answer: 'Hallo! Stel gerust je vraag over het mobiliteitsbudget.'
  }
];

const fallback = `Ik heb niet meteen een duidelijk antwoord. Voor persoonlijke situaties raad ik je aan om <strong>rechtstreeks contact op te nemen met HR</strong>.`;

function findAnswer(question) {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let best = null, bestScore = 0;
  for (const item of faq) {
    let score = 0;
    for (const kw of item.keywords) {
      if (q.includes(kw.toLowerCase())) score += 1;
    }
    if (score > bestScore) { bestScore = score; best = item; }
  }
  return bestScore >= 1 ? best.answer : fallback;
}

function addMessage(text, isUser = false) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'message ' + (isUser ? 'user' : 'bot');
  div.innerHTML = `
    <div class="message-avatar">${isUser ? 'Jij' : 'Flo'}</div>
    <div class="message-content">${text}</div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function handleChat() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  addMessage(escapeHtml(text), true);
  input.value = '';
  setTimeout(() => addMessage(findAnswer(text), false), 400);
}

document.getElementById('chatSend').addEventListener('click', handleChat);
document.getElementById('chatInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleChat();
});

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.getElementById('chatInput').value = chip.dataset.q;
    handleChat();
  });
});

// Init: laad demo-data als er nog niets staat
seedDemoData(false);
updateP3();
renderDashboard();
showPage('dashboard');
