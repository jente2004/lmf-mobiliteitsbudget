// MoveFlow - complete app
const STORAGE_KEY = 'moveflow_applications_v2';
const CURRENT_USER_KEY = 'moveflow_current_user';
const ROLE_KEY = 'moveflow_role';
const USER_NAME_KEY = 'moveflow_user_name';
const USER_EMAIL_KEY = 'moveflow_user_email';

const KONTICH_ZONE = ['kontich','aartselaar','rumst','edegem','hove','lint','boechout','mortsel','niel','boom','schelle','reeth','waarloos','vremde','borsbeek','wijnegem','schoten','brasschaat','antwerpen','wilrijk','berchem','deurne','merksem','hemiksem'];

const PAGE_TITLES = { dashboard:'Mijn dossier', aanvraag:'Aanvraag', info:'Info & regels', chat:'Flo assistent', hr:'Process manager' };

const DEMO_USERS = {
  'hr@logimove.be': { password:'hr', role:'hr', name:'HR' },
  'elena@logimove.be': { 
    password:'elena', role:'werknemer', name:'Elena Janssens', personeelsnummer:'2111',
    sap: {
      voornaam:'Elena', achternaam:'Janssens', email:'elena@logimove.be', afdeling:'Administratief bediende',
      adres:'Kerkstraat 45, 2650 Edegem', leeftijd:31, thuiswerk:'woensdag',
      ancienniteit:'9 jaar', voltijds:true, rechtBedrijfswagen:true,
      gebruik:'Leasefiets + openbaar vervoer', totaalTCO:8400
    }
  },
  'tom@logimove.be': { password:'tom', role:'werknemer', name:'Tom Willems', personeelsnummer:'2101',
    sap: { voornaam:'Tom', achternaam:'Willems', email:'tom@logimove.be', afdeling:'Marketing', adres:'Molenstraat 18, 2840 Rumst', totaalTCO:8400 } },
  'riadh@logimove.be': { password:'riadh', role:'werknemer', name:'Riadh Man\u00e9', personeelsnummer:'2102',
    sap: { voornaam:'Riadh', achternaam:'Man\u00e9', email:'riadh@logimove.be', afdeling:'Accountancy', adres:'Statiestraat 42, 2630 Aartselaar', totaalTCO:14500 } }
};

function getRole(){ return sessionStorage.getItem(ROLE_KEY) || null; }

function setCurrentUserKey(key){ localStorage.setItem(CURRENT_USER_KEY, key); }
function getCurrentUserKey(){ return localStorage.getItem(CURRENT_USER_KEY) || null; }

function loadAll(){ try { var r=localStorage.getItem(STORAGE_KEY); return r?JSON.parse(r):[]; } catch(e){ return []; } }
function saveAll(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

function loginAs(role, meta){
  meta = meta || {};
  sessionStorage.setItem(ROLE_KEY, role);
  if (meta.name) sessionStorage.setItem(USER_NAME_KEY, meta.name); else sessionStorage.removeItem(USER_NAME_KEY);
  if (meta.email) sessionStorage.setItem(USER_EMAIL_KEY, meta.email); else sessionStorage.removeItem(USER_EMAIL_KEY);
  if (meta.personeelsnummer) setCurrentUserKey(String(meta.personeelsnummer));
  applySession();
}

function tryLogin(email, password){
  var key = (email||'').trim().toLowerCase();
  var user = DEMO_USERS[key];
  var err = document.getElementById('loginError');
  if (!user || user.password !== password){
    if (err){ err.textContent='Onjuiste e-mail of wachtwoord.'; err.classList.remove('hidden'); }
    return false;
  }
  if (err) err.classList.add('hidden');
  loginAs(user.role, { name:user.name, email:key, personeelsnummer:user.personeelsnummer||null });
  return true;
}

function logout(){
  sessionStorage.removeItem(ROLE_KEY);
  sessionStorage.removeItem(USER_NAME_KEY);
  sessionStorage.removeItem(USER_EMAIL_KEY);
  var email=document.getElementById('loginEmail');
  var pass=document.getElementById('loginPassword');
  if (email) email.value='';
  if (pass) pass.value='';
  var err=document.getElementById('loginError');
  if (err) err.classList.add('hidden');
  applySession();
}

function applySession(){
  var role=getRole();
  var loginScreen=document.getElementById('loginScreen');
  var appShell=document.getElementById('appShell');
  var navW=document.getElementById('navWerknemer');
  var navH=document.getElementById('navHr');
  var badge=document.getElementById('modeBadge');
  var userLabel=document.getElementById('topbarUser');
  if (!role){
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (appShell) appShell.classList.add('hidden');
    if (navW) navW.classList.add('hidden');
    if (navH) navH.classList.add('hidden');
    if (badge) badge.textContent='Niet ingelogd';
    if (userLabel) userLabel.textContent='';
    return;
  }
  if (loginScreen) loginScreen.classList.add('hidden');
  if (appShell) appShell.classList.remove('hidden');
  var isHr = role==='hr';
  if (navW) navW.classList.toggle('hidden', isHr);
  if (navH) navH.classList.toggle('hidden', !isHr);
  if (badge) badge.textContent = isHr ? 'Ingelogd: HR' : 'Ingelogd: Werknemer';
  if (userLabel) userLabel.textContent = sessionStorage.getItem(USER_NAME_KEY) || (isHr?'HR':'Werknemer');
  showPage(isHr ? 'hr' : 'dashboard');
}

function showPage(pageId){
  var role=getRole();
  if (!role) return;
  if (role==='hr' && pageId!=='hr') return;
  if (role==='werknemer' && pageId==='hr') return;
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(b){ b.classList.remove('active'); });
  var page=document.getElementById('page-'+pageId);
  if (page) page.classList.add('active');
  var btn=document.querySelector('.nav-item[data-page="'+pageId+'"]');
  if (btn) btn.classList.add('active');
  var title=document.getElementById('pageTitle');
  if (title) title.textContent=PAGE_TITLES[pageId]||'MoveFlow';
  if (pageId==='dashboard') renderDashboard();
  if (pageId==='aanvraag') prefillForm();
  if (pageId==='hr') renderHrOverview();
  if (pageId==='chat' && typeof renderFloHistory==='function') renderFloHistory();
}

document.querySelectorAll('.nav-item').forEach(function(btn){
  btn.addEventListener('click', function(){ showPage(btn.dataset.page); });
});

function findByPersoneelsnummer(nr){
  return loadAll().find(function(a){ return a.personeelsnummer===nr; })||null;
}

function upsertApplication(app){
  var list=loadAll();
  var idx=list.findIndex(function(a){ return a.personeelsnummer===app.personeelsnummer; });
  if (idx>=0){
    var prev=list[idx];
    app.status = prev.status==='afgerond' ? 'ingediend' : (prev.status||'ingediend');
    app.id=prev.id;
    list[idx]=Object.assign({}, prev, app, { lastUpdate:new Date().toISOString() });
  } else {
    app.id='app_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
    app.status='ingediend';
    list.push(app);
  }
  saveAll(list);
  setCurrentUserKey(app.personeelsnummer);
  return app;
}

function updateStatus(id, newStatus){
  var list=loadAll();
  var idx=list.findIndex(function(a){ return a.id===id; });
  if (idx<0) return;
  list[idx].status=newStatus;
  list[idx].lastUpdate=new Date().toISOString();
  saveAll(list);
}

function updateApplicationById(id, fields){
  var list=loadAll();
  var idx=list.findIndex(function(a){ return a.id===id; });
  if (idx<0) return false;
  list[idx]=Object.assign({}, list[idx], fields, { lastUpdate:new Date().toISOString() });
  saveAll(list);
  return true;
}

function clearErrors(){
  document.querySelectorAll('.field-error').forEach(function(el){ el.textContent=''; });
  document.querySelectorAll('input.invalid').forEach(function(el){ el.classList.remove('invalid'); });
}

function setError(id, msg){
  var err=document.getElementById('err-'+id);
  var input=document.getElementById(id);
  if (err) err.textContent=msg||'';
  if (input){ if (msg) input.classList.add('invalid'); else input.classList.remove('invalid'); }
}

function isInKontichZone(adres){
  if (!adres) return false;
  var lower=adres.toLowerCase();
  return KONTICH_ZONE.some(function(g){ return lower.indexOf(g)!==-1; });
}

function validateApplication(data, opts){
  opts=opts||{};
  var requireAkkoord=opts.requireAkkoord!==false;
  var errors={};
  if (!data.voornaam||data.voornaam.trim().length<2) errors.voornaam='Voornaam is verplicht (min. 2 tekens).';
  if (!data.achternaam||data.achternaam.trim().length<2) errors.achternaam='Achternaam is verplicht (min. 2 tekens).';
  if (!data.personeelsnummer||!/^\d{3,10}$/.test(data.personeelsnummer.trim())) errors.personeelsnummer='Geldig personeelsnummer vereist (alleen cijfers).';
  if (!data.email||!/^[^\s@]+@logimove\.be$/i.test(data.email.trim())) errors.email='Gebruik een @logimove.be e-mailadres.';
  if (!data.adres||data.adres.trim().length<8) errors.adres='Vul een volledig woonadres in.';
  var total=Number(data.jaarBudget);
  if (!total||total<3233||total>17244) errors.jaarBudget='Budget moet tussen 3233 en 17244 liggen.';
  if (!data.typeAanvraag) errors.typeAanvraag='Kies een type aanvraag.';
  if (requireAkkoord && !data.akkoord) errors.akkoord='Bevestiging is verplicht.';
  return errors;
}

var form=document.getElementById('aanvraagForm');
var jaarInput=document.getElementById('jaarBudget');

function prefillForm(){
  var key=getCurrentUserKey();
  if (!key) return;
  var data=findByPersoneelsnummer(key);
  var sap=null;
  var email=sessionStorage.getItem(USER_EMAIL_KEY);
  if (email && DEMO_USERS[email] && DEMO_USERS[email].sap) sap=DEMO_USERS[email].sap;
  var src=data||sap;
  if (!src) return;
  document.getElementById('voornaam').value=(data&&data.voornaam)||(sap&&sap.voornaam)||'';
  document.getElementById('achternaam').value=(data&&data.achternaam)||(sap&&sap.achternaam)||'';
  document.getElementById('personeelsnummer').value=key||'';
  document.getElementById('email').value=(data&&data.email)||(sap&&sap.email)||email||'';
  document.getElementById('afdeling').value=(sap&&sap.afdeling)||(data&&data.afdeling)||'';
  document.getElementById('adres').value=(data&&data.adres)||(sap&&sap.adres)||'';
  if (sap && sap.totaalTCO){
    jaarInput.value=sap.totaalTCO;
  } else if (data && data.jaarBudget){
    jaarInput.value=data.jaarBudget;
  }
  document.getElementById('opmerkingen').value='';
  document.querySelectorAll('input[name="typeAanvraag"]').forEach(function(r){ r.checked=false; });
}

function resetForm(){
  if (!form) return;
  form.reset();
  prefillForm();
  clearErrors();
  var fb=document.getElementById('formFeedback');
  if (fb) fb.classList.add('hidden');
}

if (form){
  form.addEventListener('submit', function(e){
    e.preventDefault();
    clearErrors();
    var data={
      voornaam:document.getElementById('voornaam').value.trim(),
      achternaam:document.getElementById('achternaam').value.trim(),
      personeelsnummer:document.getElementById('personeelsnummer').value.trim(),
      email:document.getElementById('email').value.trim(),
      afdeling:document.getElementById('afdeling').value.trim(),
      adres:document.getElementById('adres').value.trim(),
      jaarBudget:Number(jaarInput.value),
      p1:0,
      p2:0,
      p3:0,
      huisvesting:false,
      typeAanvraag:(document.querySelector('input[name="typeAanvraag"]:checked')||{}).value||'',
      opmerkingen:document.getElementById('opmerkingen').value.trim(),
      akkoord:document.getElementById('akkoord').checked
    };
    var errors=validateApplication(data);
    var feedback=document.getElementById('formFeedback');
    if (Object.keys(errors).length){
      Object.keys(errors).forEach(function(k){ setError(k, errors[k]); });
      feedback.textContent='Controleer de gemarkeerde velden.';
      feedback.className='feedback error';
      feedback.classList.remove('hidden');
      return;
    }
    upsertApplication(Object.assign({}, data, { submittedAt:new Date().toISOString(), lastUpdate:new Date().toISOString() }));
    feedback.textContent='Aanvraag opgeslagen. Zichtbaar in Process manager.';
    feedback.className='feedback success';
    feedback.classList.remove('hidden');
  });
}

function escapeHtml(str){
  return String(str==null?'':str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderDashboard(){
  var key=getCurrentUserKey();
  var data=key?findByPersoneelsnummer(key):null;
  var badge=document.getElementById('statusBadge');
  var details=document.getElementById('statusDetails');
  var steps=document.querySelectorAll('.timeline-step');
  steps.forEach(function(s){ s.classList.remove('done','current'); });
  var statusMap={
    ingediend:{ label:'Openstaand', class:'ingediend' },
    verwerkt:{ label:'In behandeling', class:'verwerkt' },
    afgerond:{ label:'Afgerond', class:'afgerond' }
  };
  if (!data){
    if (badge){ badge.textContent='Geen aanvraag'; badge.className='status-badge'; }
    if (details) details.innerHTML='<p>Nog geen aanvraag. Ga naar Aanvraag in het menu om een dossier in te dienen.</p>';
  } else {
    var st=statusMap[data.status]||statusMap.ingediend;
    if (badge){ badge.textContent=st.label; badge.className='status-badge '+st.class; }
    var order=['ingediend','verwerkt','afgerond'];
    var currentIdx=order.indexOf(data.status);
    order.forEach(function(step, idx){
      var el=document.querySelector('.timeline-step[data-step="'+step+'"]');
      if (!el) return;
      if (idx<currentIdx) el.classList.add('done');
      else if (idx===currentIdx) el.classList.add('current');
    });
    var dateStr=new Date(data.submittedAt).toLocaleString('nl-BE');
    var naam=[data.voornaam,data.achternaam].filter(Boolean).join(' ');
    if (details) details.innerHTML='<p><strong>'+escapeHtml(naam)+'</strong> · '+escapeHtml(data.personeelsnummer)+'</p><p>'+escapeHtml(data.email)+' · '+escapeHtml(data.adres||'-')+'</p><p>Laatste update: '+dateStr+' · Budget: EUR '+data.jaarBudget.toLocaleString('nl-BE')+'</p>';
  }
  var myApps=[];
  if (key) myApps=loadAll().filter(function(a){ return a.personeelsnummer===key; });
  myApps.sort(function(a,b){ return new Date(b.submittedAt)-new Date(a.submittedAt); });
  var tbody=document.getElementById('myAppsBody');
  var empty=document.getElementById('myAppsEmpty');
  var table=document.getElementById('myAppsTable');
  if (!tbody) return;
  if (!myApps.length){
    tbody.innerHTML='';
    if (empty) empty.classList.remove('hidden');
    if (table) table.classList.add('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  if (table) table.classList.remove('hidden');
  tbody.innerHTML=myApps.map(function(a){
    var st=statusMap[a.status]||statusMap.ingediend;
    var d=a.submittedAt?new Date(a.submittedAt).toLocaleDateString('nl-BE'):'-';
    var item=a.typeAanvraag||a.item||'Aanvraag';
    var statusLabel = a.status==='afgerond' ? 'Afgehandeld' : (a.status==='verwerkt' ? 'In behandeling' : 'Lopend');
    return '<tr><td>'+escapeHtml(d)+'</td><td><strong>'+escapeHtml(item)+'</strong></td><td>EUR '+Number((a.p1||0)+(a.p2||0)+(a.p3||0)).toLocaleString('nl-BE')+'</td><td><span class="status-badge '+st.class+'">'+statusLabel+'</span></td></tr>';
  }).join('');

  var barContainer=document.getElementById('budgetBarContainer');
  if (barContainer && myApps.length){
    var total = Number(myApps[0].jaarBudget) || 0;
    var used = myApps.reduce(function(sum, a){ return sum + (Number(a.p1)||0) + (Number(a.p2)||0) + (Number(a.p3)||0); }, 0);
    var remaining = Math.max(0, total - used);
    var pct = total ? Math.round(used / total * 100) : 0;
    var html = '<div style="margin-bottom:0.6rem"><strong>Totaal budget:</strong> EUR ' + total.toLocaleString('nl-BE') + '</div>';
    html += '<div style="background:#eee;border-radius:8px;height:18px;overflow:hidden;margin-bottom:0.4rem"><div style="width:' + pct + '%;background:var(--maroon);height:100%"></div></div>';
    html += '<div style="font-size:0.85rem;color:var(--muted)">Gebruikt: EUR ' + used.toLocaleString('nl-BE') + ' (' + pct + '%) · Resterend: EUR ' + remaining.toLocaleString('nl-BE') + '</div>';
    html += '<ul style="margin:0.6rem 0 0;padding-left:1.1rem;font-size:0.85rem">';
    myApps.forEach(function(a){
      var item = a.typeAanvraag||a.item || a.opmerkingen || 'Aanvraag';
      var bedrag = (Number(a.p1)||0) + (Number(a.p2)||0) + (Number(a.p3)||0);
      if (bedrag > 0) html += '<li>' + escapeHtml(item) + ': EUR ' + bedrag.toLocaleString('nl-BE') + '</li>';
    });
    html += '</ul>';
    barContainer.innerHTML = html;
  } else if (barContainer){
    barContainer.innerHTML = '<p class="hr-empty">Nog geen budgetgegevens.</p>';
  }
}

var hrFilter='all';
var selectedHrId=null;

function renderHrOverview(){
  var list=loadAll();
  var so=document.getElementById('statOpen');
  var sb=document.getElementById('statBehandeling');
  var sa=document.getElementById('statAfgerond');
  var st=document.getElementById('statTotaal');
  if (so) so.textContent=list.filter(function(a){ return a.status==='ingediend'; }).length;
  if (sb) sb.textContent=list.filter(function(a){ return a.status==='verwerkt'; }).length;
  if (sa) sa.textContent=list.filter(function(a){ return a.status==='afgerond'; }).length;
  if (st) st.textContent=list.length;
  var filtered=hrFilter==='all'?list.slice():list.filter(function(a){ return a.status===hrFilter; });
  var tbody=document.getElementById('hrTableBody');
  var empty=document.getElementById('hrEmpty');
  if (!tbody) return;
  if (!filtered.length){
    tbody.innerHTML='';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  filtered.sort(function(a,b){ return new Date(b.submittedAt)-new Date(a.submittedAt); });
  tbody.innerHTML=filtered.map(function(a){
    var naam=[a.voornaam,a.achternaam].filter(Boolean).join(' ');
    var item=a.typeAanvraag||a.item?' ('+escapeHtml(a.typeAanvraag||a.item)+')':'';
    return '<tr data-id="'+a.id+'" class="'+(selectedHrId===a.id?'selected':'')+'" onclick="showHrDetail(\''+a.id+'\')"><td><strong>'+escapeHtml(naam)+'</strong>'+item+'</td><td>'+escapeHtml(a.personeelsnummer)+'</td><td>'+escapeHtml(a.afdeling||'-')+'</td><td>EUR '+Number(a.jaarBudget).toLocaleString('nl-BE')+'</td><td><select class="status-select" onclick="event.stopPropagation()" onchange="hrChangeStatus(\''+a.id+'\', this.value)"><option value="ingediend"'+(a.status==='ingediend'?' selected':'')+'>Openstaand</option><option value="verwerkt"'+(a.status==='verwerkt'?' selected':'')+'>In behandeling</option><option value="afgerond"'+(a.status==='afgerond'?' selected':'')+'>Afgerond</option></select></td><td><button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();showHrDetail(\''+a.id+'\')">Bewerk</button></td></tr>';
  }).join('');
}

function hrChangeStatus(id, status){
  updateStatus(id, status);
  renderHrOverview();
  if (selectedHrId===id) showHrDetail(id);
}

function showHrDetail(id){
  var app=loadAll().find(function(a){ return a.id===id; });
  if (!app) return;
  selectedHrId=id;
  var panel=document.getElementById('hrDetail');
  var body=document.getElementById('hrDetailBody');
  var title=document.getElementById('hrDetailTitle');
  var fb=document.getElementById('hrEditFeedback');
  if (fb) fb.classList.add('hidden');
  if (title) title.textContent=[app.voornaam,app.achternaam].filter(Boolean).join(' ') + (app.typeAanvraag||app.item?' – '+(app.typeAanvraag||app.item):'');
  body.innerHTML='<form id="hrEditForm" class="hr-edit-grid" onsubmit="return saveHrEdit(event, \''+app.id+'\')"><div class="form-group"><label>Voornaam *</label><input type="text" id="hr-voornaam" value="'+escapeHtml(app.voornaam)+'" /><span class="field-error" id="err-hr-voornaam"></span></div><div class="form-group"><label>Achternaam *</label><input type="text" id="hr-achternaam" value="'+escapeHtml(app.achternaam)+'" /><span class="field-error" id="err-hr-achternaam"></span></div><div class="form-group"><label>Personeelsnr. *</label><input type="text" id="hr-personeelsnummer" value="'+escapeHtml(app.personeelsnummer)+'" /><span class="field-error" id="err-hr-personeelsnummer"></span></div><div class="form-group"><label>E-mail *</label><input type="email" id="hr-email" value="'+escapeHtml(app.email)+'" /><span class="field-error" id="err-hr-email"></span></div><div class="form-group"><label>Afdeling</label><input type="text" id="hr-afdeling" value="'+escapeHtml(app.afdeling||'')+'" /></div><div class="form-group full"><label>Woonadres *</label><input type="text" id="hr-adres" value="'+escapeHtml(app.adres||'')+'" /><span class="field-error" id="err-hr-adres"></span></div><div class="form-group"><label>Budget</label><input type="number" id="hr-jaarBudget" value="'+app.jaarBudget+'" /><span class="field-error" id="err-hr-jaarBudget"></span></div><div class="form-group"><label>Pijler 1</label><input type="number" id="hr-p1" value="'+app.p1+'" /></div><div class="form-group"><label>Pijler 2</label><input type="number" id="hr-p2" value="'+app.p2+'" /></div><div class="form-group"><label>Pijler 3</label><input type="number" id="hr-p3" value="'+app.p3+'" readonly /></div><div class="form-group full"><label class="check-label"><input type="checkbox" id="hr-huisvesting"'+(app.huisvesting?' checked':'')+' /> Huisvesting in pijler 2</label><span class="field-error" id="err-hr-huisvesting"></span></div><div class="form-group full"><label>Opmerkingen</label><textarea id="hr-opmerkingen" rows="2">'+escapeHtml(app.opmerkingen||'')+'</textarea></div><div class="form-group full form-actions"><button type="submit" class="btn btn-primary btn-sm">Wijzigingen opslaan</button></div></form>';
  var hp1=document.getElementById('hr-p1'), hp2=document.getElementById('hr-p2'), hp3=document.getElementById('hr-p3'), hj=document.getElementById('hr-jaarBudget');
  function sync(){ if(hp3) hp3.value=Math.max(0,(Number(hj.value)||0)-(Number(hp1.value)||0)-(Number(hp2.value)||0)); }
  [hp1,hp2,hj].forEach(function(el){ if(el) el.addEventListener('input', sync); });
  if (panel) panel.classList.remove('hidden');
  renderHrOverview();
}

function saveHrEdit(e, id){
  e.preventDefault();
  ['voornaam','achternaam','personeelsnummer','email','adres','jaarBudget','huisvesting'].forEach(function(k){
    var err=document.getElementById('err-hr-'+k); if (err) err.textContent='';
  });
  var data={
    voornaam:document.getElementById('hr-voornaam').value.trim(),
    achternaam:document.getElementById('hr-achternaam').value.trim(),
    personeelsnummer:document.getElementById('hr-personeelsnummer').value.trim(),
    email:document.getElementById('hr-email').value.trim(),
    afdeling:document.getElementById('hr-afdeling').value.trim(),
    adres:document.getElementById('hr-adres').value.trim(),
    jaarBudget:Number(document.getElementById('hr-jaarBudget').value),
    p1:Number(document.getElementById('hr-p1').value)||0,
    p2:Number(document.getElementById('hr-p2').value)||0,
    p3:Number(document.getElementById('hr-p3').value)||0,
    huisvesting:document.getElementById('hr-huisvesting').checked,
    opmerkingen:document.getElementById('hr-opmerkingen').value.trim(),
    akkoord:true
  };
  var errors=validateApplication(data,{requireAkkoord:false});
  var fb=document.getElementById('hrEditFeedback');
  if (Object.keys(errors).length){
    Object.keys(errors).forEach(function(k){ var err=document.getElementById('err-hr-'+k); if (err) err.textContent=errors[k]; });
    fb.textContent='Corrigeer de fouten vooraleer op te slaan.';
    fb.className='feedback error';
    fb.classList.remove('hidden');
    return false;
  }
  updateApplicationById(id, data);
  fb.textContent='Dossier bijgewerkt.';
  fb.className='feedback success';
  fb.classList.remove('hidden');
  renderHrOverview();
  return false;
}

function closeHrDetail(){
  selectedHrId=null;
  var panel=document.getElementById('hrDetail');
  if (panel) panel.classList.add('hidden');
  renderHrOverview();
}

document.querySelectorAll('.filter-btn').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.filter-btn').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    hrFilter=btn.dataset.filter;
    renderHrOverview();
  });
});

var DEMO_APPLICATIONS=[
  {id:'demo_elena_fiets',voornaam:'Elena',achternaam:'Janssens',personeelsnummer:'2111',email:'elena@logimove.be',afdeling:'Administratief bediende',adres:'Kerkstraat 45, 2650 Edegem',jaarBudget:8400,p1:0,p2:1200,p3:0,huisvesting:false,opmerkingen:'',status:'afgerond',submittedAt:'2026-11-01T09:00:00',lastUpdate:'2026-11-05T10:00:00',item:'Leasefiets',typeAanvraag:'Leasing (fiets, e-bike, motorfiets,...)'},
  {id:'demo_elena_ov',voornaam:'Elena',achternaam:'Janssens',personeelsnummer:'2111',email:'elena@logimove.be',afdeling:'Administratief bediende',adres:'Kerkstraat 45, 2650 Edegem',jaarBudget:8400,p1:0,p2:600,p3:0,huisvesting:false,opmerkingen:'',status:'verwerkt',submittedAt:'2026-11-02T09:00:00',lastUpdate:'2026-11-06T10:00:00',item:'Openbaar vervoer',typeAanvraag:'Gedeeld vervoer (carpool, autodelen of gedeelde fiets)'},
  {id:'demo_elena_huur',voornaam:'Elena',achternaam:'Janssens',personeelsnummer:'2111',email:'elena@logimove.be',afdeling:'Administratief bediende',adres:'Kerkstraat 45, 2650 Edegem',jaarBudget:8400,p1:0,p2:5000,p3:0,huisvesting:true,opmerkingen:'',status:'ingediend',submittedAt:'2026-11-03T09:00:00',lastUpdate:'2026-11-07T10:00:00',item:'Huurkosten',typeAanvraag:'Huurkost'},
  {id:'demo_tom_deelauto_1',voornaam:'Tom',achternaam:'Willems',personeelsnummer:'2101',email:'tom@logimove.be',afdeling:'Marketing',adres:'Molenstraat 18, 2840 Rumst',jaarBudget:8400,p1:0,p2:420,p3:0,huisvesting:false,opmerkingen:'',status:'afgerond',submittedAt:'2026-01-15T10:00:00',lastUpdate:'2026-01-20T10:00:00',item:'Deelauto januari',typeAanvraag:'Gedeeld vervoer (carpool, autodelen of gedeelde fiets)'},
  {id:'demo_tom_deelauto_2',voornaam:'Tom',achternaam:'Willems',personeelsnummer:'2101',email:'tom@logimove.be',afdeling:'Marketing',adres:'Molenstraat 18, 2840 Rumst',jaarBudget:8400,p1:0,p2:510,p3:0,huisvesting:false,opmerkingen:'',status:'afgerond',submittedAt:'2026-02-15T10:00:00',lastUpdate:'2026-02-20T10:00:00',item:'Deelauto februari',typeAanvraag:'Gedeeld vervoer (carpool, autodelen of gedeelde fiets)'},
  {id:'demo_tom_deelauto_3',voornaam:'Tom',achternaam:'Willems',personeelsnummer:'2101',email:'tom@logimove.be',afdeling:'Marketing',adres:'Molenstraat 18, 2840 Rumst',jaarBudget:8400,p1:0,p2:380,p3:0,huisvesting:false,opmerkingen:'',status:'afgerond',submittedAt:'2026-03-15T10:00:00',lastUpdate:'2026-03-20T10:00:00',item:'Deelauto maart',typeAanvraag:'Gedeeld vervoer (carpool, autodelen of gedeelde fiets)'},
  {id:'demo_tom_deelauto_4',voornaam:'Tom',achternaam:'Willems',personeelsnummer:'2101',email:'tom@logimove.be',afdeling:'Marketing',adres:'Molenstraat 18, 2840 Rumst',jaarBudget:8400,p1:0,p2:490,p3:0,huisvesting:false,opmerkingen:'',status:'afgerond',submittedAt:'2026-04-15T10:00:00',lastUpdate:'2026-04-20T10:00:00',item:'Deelauto april',typeAanvraag:'Gedeeld vervoer (carpool, autodelen of gedeelde fiets)'},
  {id:'demo_tom_deelauto_5',voornaam:'Tom',achternaam:'Willems',personeelsnummer:'2101',email:'tom@logimove.be',afdeling:'Marketing',adres:'Molenstraat 18, 2840 Rumst',jaarBudget:8400,p1:0,p2:550,p3:0,huisvesting:false,opmerkingen:'',status:'afgerond',submittedAt:'2026-05-15T10:00:00',lastUpdate:'2026-05-20T10:00:00',item:'Deelauto mei',typeAanvraag:'Gedeeld vervoer (carpool, autodelen of gedeelde fiets)'},
  {id:'demo_tom_deelauto_6',voornaam:'Tom',achternaam:'Willems',personeelsnummer:'2101',email:'tom@logimove.be',afdeling:'Marketing',adres:'Molenstraat 18, 2840 Rumst',jaarBudget:8400,p1:0,p2:470,p3:0,huisvesting:false,opmerkingen:'',status:'afgerond',submittedAt:'2026-06-15T10:00:00',lastUpdate:'2026-06-20T10:00:00',item:'Deelauto juni',typeAanvraag:'Gedeeld vervoer (carpool, autodelen of gedeelde fiets)'},
  {id:'demo_tom_deelauto_7',voornaam:'Tom',achternaam:'Willems',personeelsnummer:'2101',email:'tom@logimove.be',afdeling:'Marketing',adres:'Molenstraat 18, 2840 Rumst',jaarBudget:8400,p1:0,p2:430,p3:0,huisvesting:false,opmerkingen:'',status:'afgerond',submittedAt:'2026-07-15T10:00:00',lastUpdate:'2026-07-20T10:00:00',item:'Deelauto juli',typeAanvraag:'Gedeeld vervoer (carpool, autodelen of gedeelde fiets)'},
  {id:'demo_tom_deelauto_8',voornaam:'Tom',achternaam:'Willems',personeelsnummer:'2101',email:'tom@logimove.be',afdeling:'Marketing',adres:'Molenstraat 18, 2840 Rumst',jaarBudget:8400,p1:0,p2:520,p3:0,huisvesting:false,opmerkingen:'',status:'afgerond',submittedAt:'2026-08-15T10:00:00',lastUpdate:'2026-08-20T10:00:00',item:'Deelauto augustus',typeAanvraag:'Gedeeld vervoer (carpool, autodelen of gedeelde fiets)'},
  {id:'demo_tom_deelauto_9',voornaam:'Tom',achternaam:'Willems',personeelsnummer:'2101',email:'tom@logimove.be',afdeling:'Marketing',adres:'Molenstraat 18, 2840 Rumst',jaarBudget:8400,p1:0,p2:460,p3:0,huisvesting:false,opmerkingen:'',status:'afgerond',submittedAt:'2026-09-15T10:00:00',lastUpdate:'2026-09-20T10:00:00',item:'Deelauto september',typeAanvraag:'Gedeeld vervoer (carpool, autodelen of gedeelde fiets)'},
  {id:'demo_tom_deelauto_10',voornaam:'Tom',achternaam:'Willems',personeelsnummer:'2101',email:'tom@logimove.be',afdeling:'Marketing',adres:'Molenstraat 18, 2840 Rumst',jaarBudget:8400,p1:0,p2:570,p3:0,huisvesting:false,opmerkingen:'',status:'ingediend',submittedAt:'2026-10-15T10:00:00',lastUpdate:'2026-10-20T10:00:00',item:'Deelauto oktober',typeAanvraag:'Gedeeld vervoer (carpool, autodelen of gedeelde fiets)'},
  {id:'demo_riadh',voornaam:'Riadh',achternaam:'Man\u00e9',personeelsnummer:'2102',email:'riadh@logimove.be',afdeling:'Accountancy',adres:'Statiestraat 42, 2630 Aartselaar',jaarBudget:14500,p1:12000,p2:1500,p3:1000,huisvesting:false,opmerkingen:'',status:'verwerkt',submittedAt:'2026-10-20T09:00:00',lastUpdate:'2026-11-03T14:20:00'}
];

function seedDemoData(){
  var list = loadAll();
  var demoIds = DEMO_APPLICATIONS.map(function(d){ return d.id; });
  list = list.filter(function(a){
    if ((a.personeelsnummer === '2111' || a.personeelsnummer === '2101') && demoIds.indexOf(a.id) === -1) return false;
    return true;
  });
  DEMO_APPLICATIONS.forEach(function(demo){
    var idx = list.findIndex(function(a){ return a.id === demo.id; });
    if (idx >= 0){
      list[idx] = Object.assign({}, demo);
    } else {
      list.push(Object.assign({}, demo));
    }
  });
  saveAll(list);
}

var seedBtn=document.getElementById('seedDemoBtn');
if (seedBtn){
  seedBtn.addEventListener('click', function(){
    seedDemoData();
    selectedHrId=null;
    var panel=document.getElementById('hrDetail');
    if (panel) panel.classList.add('hidden');
    renderHrOverview();
    if (getRole() === 'werknemer') renderDashboard();
  });
}
seedDemoData();

const FLO_MESSAGES_KEY = 'moveflow_flo_messages';
function loadFloMessages(){
  try { var r=localStorage.getItem(FLO_MESSAGES_KEY); return r?JSON.parse(r):[]; } catch(e){ return []; }
}
function saveFloMessages(list){ localStorage.setItem(FLO_MESSAGES_KEY, JSON.stringify(list)); }

var DEMO_FLO_MESSAGES = [
  {id:'flo_elena_fiets', appId:'demo_elena_fiets', personeelsnummer:'2111', type:'goedgekeurd', text:'Goedgekeurd: Leasefiets (€1.200). Betaling: €100/maand gedurende 12 maanden, startend in december 2026.', date:'2026-11-05T10:30:00', replies:[{from:'user',text:'Bedankt, dat is duidelijk.'}]},
  {id:'flo_elena_ov', appId:'demo_elena_ov', personeelsnummer:'2111', type:'info', text:'Openbaar vervoer (€600): we hebben nog een kopie van je abonnement nodig. Stuur dit door naar HR.', date:'2026-11-06T11:00:00', replies:[{from:'user',text:'Ik stuur het abonnement door.'}]},
  {id:'flo_elena_huur', appId:'demo_elena_huur', personeelsnummer:'2111', type:'info', text:'Huurkosten (€5.000): ontbrekende stukken. Voeg je huurcontract toe vooraleer we verder kunnen.', date:'2026-11-07T14:00:00'},
  {id:'flo_tom_1', appId:'demo_tom_deelauto_1', personeelsnummer:'2101', type:'goedgekeurd', text:'Deelauto januari: €420 ontvangen en afgehandeld.', date:'2026-01-18T11:00:00'},
  {id:'flo_tom_2', appId:'demo_tom_deelauto_2', personeelsnummer:'2101', type:'goedgekeurd', text:'Deelauto februari: €510 ontvangen en afgehandeld.', date:'2026-02-18T11:00:00'},
  {id:'flo_tom_3', appId:'demo_tom_deelauto_3', personeelsnummer:'2101', type:'goedgekeurd', text:'Deelauto maart: €380 ontvangen en afgehandeld.', date:'2026-03-18T11:00:00'},
  {id:'flo_tom_4', appId:'demo_tom_deelauto_4', personeelsnummer:'2101', type:'goedgekeurd', text:'Deelauto april: €490 ontvangen en afgehandeld.', date:'2026-04-18T11:00:00'},
  {id:'flo_tom_5', appId:'demo_tom_deelauto_5', personeelsnummer:'2101', type:'goedgekeurd', text:'Deelauto mei: €550 ontvangen en afgehandeld.', date:'2026-05-18T11:00:00'},
  {id:'flo_tom_6', appId:'demo_tom_deelauto_6', personeelsnummer:'2101', type:'goedgekeurd', text:'Deelauto juni: €470 ontvangen en afgehandeld.', date:'2026-06-18T11:00:00'},
  {id:'flo_tom_7', appId:'demo_tom_deelauto_7', personeelsnummer:'2101', type:'goedgekeurd', text:'Deelauto juli: €430 ontvangen en afgehandeld.', date:'2026-07-18T11:00:00'},
  {id:'flo_tom_8', appId:'demo_tom_deelauto_8', personeelsnummer:'2101', type:'goedgekeurd', text:'Deelauto augustus: €520 ontvangen en afgehandeld.', date:'2026-08-18T11:00:00'},
  {id:'flo_tom_9', appId:'demo_tom_deelauto_9', personeelsnummer:'2101', type:'goedgekeurd', text:'Deelauto september: €460 ontvangen en afgehandeld.', date:'2026-09-18T11:00:00'},
  {id:'flo_tom_10', appId:'demo_tom_deelauto_10', personeelsnummer:'2101', type:'info', text:'Deelauto oktober: €570 ontvangen en lopend.', date:'2026-10-18T11:00:00'},
  {id:'flo_riadh', appId:'demo_riadh', personeelsnummer:'2102', type:'goedgekeurd', text:'Goedgekeurd: Bedrijfswagen (pijler 1, €12.000). Betaling via loon vanaf januari 2027.', date:'2026-11-04T15:00:00', replies:[{from:'user',text:'Oké, dank je.'}]}
];

function seedFloMessages(){
  saveFloMessages(DEMO_FLO_MESSAGES.slice());
}
seedFloMessages();

function openFloThread(msgId){
  var msgs = loadFloMessages();
  var m = msgs.find(function(x){ return x.id===msgId; });
  if (!m) return;
  var c = document.getElementById('chatMessages');
  if (!c) return;
  c.innerHTML = '';
  addMessage(m.text, false);
  if (m.replies){
    m.replies.forEach(function(r){
      addMessage(r.text, r.from==='user');
    });
  }
  var input = document.getElementById('chatInput');
  if (input) input.focus();
  window.currentFloThread = msgId;
}

function renderFloHistory(){
  var container = document.getElementById('floHistory');
  if (!container) return;
  var key = getCurrentUserKey();
  var msgs = loadFloMessages().filter(function(m){ return m.personeelsnummer && m.personeelsnummer===key; }).slice().sort(function(a,b){ return new Date(b.date)-new Date(a.date); });
  if (!msgs.length){
    container.innerHTML = '<p class="hr-empty">Nog geen meldingen.</p>';
    return;
  }
  container.innerHTML = msgs.map(function(m){
    var label = m.type==='goedgekeurd'?'Goedgekeurd':(m.type==='afgewezen'?'Afgewezen':'Extra info nodig');
    var d = new Date(m.date).toLocaleString('nl-BE');
    return '<div class="panel" style="margin-bottom:0.6rem;padding:0.7rem;cursor:pointer" onclick="openFloThread(\''+m.id+'\')"><div style="font-size:0.75rem;color:var(--muted)">'+d+' · '+label+'</div><div style="margin-top:0.3rem">'+escapeHtml(m.text)+'</div></div>';
  }).join('');
}

var faq=[
  {keywords:['hoeveel','budget','2026','minimum','maximum'],answer:'In 2026: minimum <strong>EUR 3.233</strong>, maximum <strong>EUR 17.244</strong> (of 20% brutojaarloon).'},
  {keywords:['pijlers','pijler'],answer:'Drie pijlers: 1) zero-emissie wagen, 2) duurzame mobiliteit + huisvesting (max. 10 km van Kontich), 3) cash (38,07% bijdrage).'},
  {keywords:['huisvesting','huur','hypotheek','kontich'],answer:'Huisvesting in pijler 2 mag alleen als je woning max. <strong>10 km</strong> van Kontich ligt.'},
  {keywords:['bijdrage','38','cash','pijler 3'],answer:'Op pijler 3 geldt een bijzondere werknemersbijdrage van <strong>38,07%</strong>.'},
  {keywords:['contact','hr'],answer:'Voor persoonlijke dossiers: open Process manager of contacteer HR.'},
  {keywords:['hallo','hoi','hey'],answer:'Hallo! Stel je vraag over het mobiliteitsbudget.'}
];
var fallback='Geen duidelijk antwoord. Neem contact op met <strong>HR</strong>.';

function findAnswer(q){
  var n=q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  var best=null, score=0;
  faq.forEach(function(item){
    var s=0;
    item.keywords.forEach(function(kw){ if (n.indexOf(kw)!==-1) s++; });
    if (s>score){ score=s; best=item; }
  });
  return score?best.answer:fallback;
}

function addMessage(text, isUser){
  var c=document.getElementById('chatMessages');
  if (!c) return;
  var d=document.createElement('div');
  d.className='message '+(isUser?'user':'bot');
  d.innerHTML='<div class="message-avatar">'+(isUser?'Jij':'Flo')+'</div><div class="message-content">'+text+'</div>';
  c.appendChild(d);
  c.scrollTop=c.scrollHeight;
}

function handleChat(){
  var input=document.getElementById('chatInput');
  if (!input) return;
  var text=input.value.trim();
  if (!text) return;
  addMessage(escapeHtml(text), true);
  input.value='';
  setTimeout(function(){ addMessage(findAnswer(text), false); }, 350);
}

var chatSend=document.getElementById('chatSend');
var chatInput=document.getElementById('chatInput');
if (chatSend) chatSend.addEventListener('click', handleChat);
if (chatInput) chatInput.addEventListener('keydown', function(e){ if (e.key==='Enter') handleChat(); });
document.querySelectorAll('.chip').forEach(function(chip){
  chip.addEventListener('click', function(){
    var input=document.getElementById('chatInput');
    if (input) input.value=chip.dataset.q;
    handleChat();
  });
});

try {
  var loginForm=document.getElementById('loginForm');
  var btnLogout=document.getElementById('logoutBtn');
  if (loginForm){
    loginForm.addEventListener('submit', function(e){
      e.preventDefault();
      var email=document.getElementById('loginEmail');
      var pass=document.getElementById('loginPassword');
      tryLogin(email?email.value:'', pass?pass.value:'');
    });
  }
  if (btnLogout) btnLogout.addEventListener('click', logout);
  applySession();
} catch(err) {
  console.error('Init error', err);
  var ls=document.getElementById('loginScreen');
  if (ls) ls.classList.remove('hidden');
}
