// LM Mobiliteitsbudget – client-side demo app
// Data blijft lokaal in localStorage (geen backend)

const STORAGE_KEY = 'lm_mobiliteitsbudget_v1';

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
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => showPage(btn.dataset.page));
});

// --- Data helpers ---
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
  const p3 = Math.max(0, total - p1 - p2);
  p3Input.value = p3;
}

[jaarInput, p1Input, p2Input].forEach(el => {
  el.addEventListener('input', updateP3);
});

function prefillForm() {
  const data = loadData();
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

  const data = {
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
    status: 'ingediend',
    submittedAt: new Date().toISOString(),
    lastUpdate: new Date().toISOString()
  };

  saveData(data);

  feedback.textContent = 'Je aanvraag is succesvol ingediend / bijgewerkt. Je ziet de status en je gegevens op het dashboard.';
  feedback.className = 'feedback success';
  feedback.classList.remove('hidden');

  // Simuleer progressie na een paar seconden (demo)
  setTimeout(() => {
    const d = loadData();
    if (d && d.status === 'ingediend') {
      d.status = 'verwerkt';
      d.lastUpdate = new Date().toISOString();
      saveData(d);
      if (document.getElementById('page-dashboard').classList.contains('active')) {
        renderDashboard();
      }
    }
  }, 4000);

  setTimeout(() => {
    const d = loadData();
    if (d && d.status === 'verwerkt') {
      d.status = 'afgerond';
      d.lastUpdate = new Date().toISOString();
      saveData(d);
      if (document.getElementById('page-dashboard').classList.contains('active')) {
        renderDashboard();
      }
    }
  }, 9000);
});

// --- Dashboard ---
function renderDashboard() {
  const data = loadData();
  const badge = document.getElementById('statusBadge');
  const details = document.getElementById('statusDetails');
  const steps = document.querySelectorAll('.timeline-step');

  // Reset timeline
  steps.forEach(s => {
    s.classList.remove('done', 'current');
  });

  if (!data) {
    badge.textContent = 'Geen aanvraag';
    badge.className = 'status-badge';
    details.innerHTML = '<p>Je hebt nog geen aanvraag ingediend. Start hieronder een nieuwe aanvraag.</p>';
    document.getElementById('p1Amount').textContent = '—';
    document.getElementById('p2Amount').textContent = '—';
    document.getElementById('p3Amount').textContent = '—';
    return;
  }

  // Fill amounts
  document.getElementById('p1Amount').textContent = '€ ' + data.p1.toLocaleString('nl-BE');
  document.getElementById('p2Amount').textContent = '€ ' + data.p2.toLocaleString('nl-BE');
  document.getElementById('p3Amount').textContent = '€ ' + data.p3.toLocaleString('nl-BE');

  // Status
  const statusMap = {
    ingediend: { label: 'Ingediend', class: 'ingediend' },
    verwerkt: { label: 'In behandeling', class: 'verwerkt' },
    afgerond: { label: 'Afgerond', class: 'afgerond' }
  };

  const st = statusMap[data.status] || statusMap.ingediend;
  badge.textContent = st.label;
  badge.className = 'status-badge ' + st.class;

  // Timeline
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
    <p style="margin-top:0.5rem;font-size:0.9rem;">Status wordt automatisch bijgewerkt in deze demo. In productie gebeurt dit door HR.</p>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
}

// --- Chatbot (FAQ) ---
const faq = [
  {
    keywords: ['hoeveel', 'bedraagt', 'budget', '2026', 'minimum', 'maximum', 'grens'],
    answer: 'In 2026 bedraagt het mobiliteitsbudget minimum <strong>€ 3.233</strong> en maximum <strong>€ 17.244</strong> per kalenderjaar. Bovendien mag het nooit hoger zijn dan 20% van je totale brutojaarloon. Het exacte bedrag hangt af van de TCO (Total Cost of Ownership) van de bedrijfswagen die je inruilt.'
  },
  {
    keywords: ['drie pijlers', 'pijlers', 'wat zijn de pijlers', 'pijler 1', 'pijler 2', 'pijler 3'],
    answer: 'Het mobiliteitsbudget heeft drie pijlers:<br><br>① <strong>Pijler 1</strong> – Milieuvriendelijke bedrijfswagen (vanaf 2026 uitsluitend zero-emissie).<br>② <strong>Pijler 2</strong> – Duurzame mobiliteit (fiets, OV, deelmobiliteit…) en bepaalde huisvestingskosten (woning max. 10 km van de werkplek).<br>③ <strong>Pijler 3</strong> – Het restsaldo dat cash wordt uitbetaald (met 38,07% bijzondere bijdrage).'
  },
  {
    keywords: ['aanmerking', 'wie', 'recht op', 'in aanmerking', 'voorwaarden'],
    answer: 'Je komt in aanmerking als je een bedrijfswagen hebt of er volgens het bedrijfswagenbeleid van je werkgever recht op hebt. De werkgever moet het mobiliteitsbudget ook hebben ingevoerd. De aanvraag gebeurt schriftelijk.'
  },
  {
    keywords: ['bijdrage', '38', 'pijler 3', 'cash', 'uitbetaling', 'netto'],
    answer: 'Op het cash-saldo van pijler 3 wordt een bijzondere werknemersbijdrage van <strong>38,07%</strong> ingehouden. Deze vervangt de gewone sociale bijdragen en belastingen. Het nettobedrag is daardoor meestal gunstiger dan gewoon loon.'
  },
  {
    keywords: ['huisvesting', 'huur', 'hypotheek', 'woning', '10 km'],
    answer: 'Onder voorwaarden mag je in pijler 2 huisvestingskosten (huur, interesten of kapitaalsaflossingen van een hypothecaire lening) betalen. De woning moet max. <strong>10 kilometer in vogelvlucht</strong> van je normale werkplek liggen.'
  },
  {
    keywords: ['fiets', 'elektrische fiets', 'e-bike', 'zachte mobiliteit'],
    answer: 'Ja! Onder pijler 2 vallen aankoop, leasing, huur, onderhoud en stalling van een (elektrische) fiets of speed pedelec, alsook veiligheidsuitrusting (helm, fluo…).'
  },
  {
    keywords: ['openbaar vervoer', 'trein', 'bus', 'tram', 'metro', 'abonnement'],
    answer: 'Abonnementen en losse tickets voor openbaar vervoer (trein, tram, bus, metro) vallen onder pijler 2 en zijn fiscaal zeer interessant (vrijgesteld van belastingen en RSZ binnen de wettelijke voorwaarden).'
  },
  {
    keywords: ['wanneer', 'indienen', 'aanvragen', 'termijn', 'data'],
    answer: 'Je kunt een aanvraag indienen zodra je werkgever het systeem heeft ingevoerd. De aanvraag en de positieve beslissing van de werkgever gebeuren schriftelijk. Uitbetaling van pijler 3 gebeurt uiterlijk met het loon van de eerste maand van het volgende kalenderjaar.'
  },
  {
    keywords: ['elektrisch', 'zero', 'co2', '2026', 'wagen', 'bedrijfswagen'],
    answer: 'Vanaf 1 januari 2026 mag pijler 1 enkel nog een wagen zonder CO₂-uitstoot bevatten (besteld of geleased vanaf die datum). Vóór 2026 golden ook wagens met max. 95 g/km CO₂ onder bepaalde voorwaarden.'
  },
  {
    keywords: ['wijzigen', 'aanpassen', 'verdelen', 'verdeling'],
    answer: 'Je kunt je verdeling over de drie pijlers wijzigen via de pagina “Aanvraag”. De som van de drie pijlers moet altijd gelijk zijn aan je totale jaarlijkse mobiliteitsbudget.'
  },
  {
    keywords: ['contact', 'hr', 'mensen', 'iemand', 'help'],
    answer: 'Voor persoonlijke of complexe vragen kun je het best rechtstreeks contact opnemen met HR. Ik kan algemene informatie geven, maar HR heeft toegang tot je individuele dossier.'
  },
  {
    keywords: ['hallo', 'hoi', 'hey', 'goedemorgen', 'goedemiddag'],
    answer: 'Hallo! Stel gerust je vraag over het mobiliteitsbudget. Ik help je graag met de drie pijlers, bedragen, voorwaarden of de status van je aanvraag.'
  }
];

const fallback = `Ik heb niet meteen een duidelijk antwoord op die vraag.  
Voor persoonlijke situaties of details die ik niet ken, raad ik je aan om <strong>rechtstreeks contact op te nemen met HR</strong>. Zij kunnen je dossier bekijken en je verder helpen.`;

function findAnswer(question) {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let best = null;
  let bestScore = 0;

  for (const item of faq) {
    let score = 0;
    for (const kw of item.keywords) {
      if (q.includes(kw.toLowerCase())) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (bestScore >= 1) return best.answer;
  return fallback;
}

function addMessage(text, isUser = false) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'message ' + (isUser ? 'user' : 'bot');
  div.innerHTML = `
    <div class="message-avatar">${isUser ? 'Jij' : 'LM'}</div>
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

  setTimeout(() => {
    const answer = findAnswer(text);
    addMessage(answer, false);
  }, 400);
}

document.getElementById('chatSend').addEventListener('click', handleChat);
document.getElementById('chatInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleChat();
});

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.getElementById('chatInput').value = chip.dataset.q;
    handleChat();
  });
});

// Init
updateP3();
renderDashboard();
showPage('dashboard');
