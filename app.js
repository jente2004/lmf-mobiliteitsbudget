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
      voornaam:'Elena', achternaam:'Janssens', email:'elena@logimove.be', afdeling:'Logistiek',
      adres:'Kerkstraat 45, 2650 Edegem', leeftijd:31, thuiswerk:'woensdag',
      ancienniteit:'9 jaar', voltijds:true, rechtBedrijfswagen:true,
      gebruik:'Leasefiets + openbaar vervoer', totaalTCO:8400
    }
  },
  'tom@logimove.be': { password:'tom', role:'werknemer', name:'Tom Willems', personeelsnummer:'2101' },
  'riadh@logimove.be': { password:'riadh', role:'werknemer', name:'Riadh Man\u00e9', personeelsnummer:'2102' }
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
  var p1=Number(data.p1)||0, p2=Number(data.p2)||0, p3=Number(data.p3)||0;
  if (p1+p2+p3!==total) errors.jaarBudget=(errors.jaarBudget?errors.jaarBudget+' ':'')+'Som van de pijlers moet gelijk zijn aan het totaal.';
  if (data.huisvesting){
    if (p2<=0) errors.huisvesting='Bij huisvesting moet pijler 2 > 0 zijn.';
    if (!isInKontichZone(data.adres)){
      errors.adres='Voor huisvesting moet het adres binnen 10 km van Kontich liggen.';
      errors.huisvesting='Adres ligt buiten de toegelaten zone rond Kontich.';
    }
  }
  if (requireAkkoord && !data.akkoord) errors.akkoord='Bevestiging is verplicht.';
  return errors;
}

var form=document.getElementById('aanvraagForm');
var p1Input=document.getElementById('p1');
var p2Input=document.getElementById('p2');
var p3Input=document.getElementById('p3');
var jaarInput=document.getElementById('jaarBudget');

function updateP3(){
  if (!jaarInput||!p1Input||!p2Input||!p3Input) return;
  var total=Number(jaarInput.value)||0;
  p3Input.value=Math.max(0, total-(Number(p1Input.value)||0)-(Number(p2Input.value)||0));
}
if (jaarInput&&p1Input&&p2Input){
  [jaarInput,p1Input,p2Input].forEach(function(el){ el.addEventListener('input', updateP3); });
}

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
  document.getElementById('afdeling').value=(data&&data.afdeling)||(sap&&sap.afdeling)||'';
  document.getElementById('adres').value=(data&&data.adres)||(sap&&sap.adres)||'';
  if (data){
    jaarInput.value=data.jaarBudget||10000;
    p1Input.value=data.p1||0;
    p2Input.value=data.p2||0;
    document.getElementById('huisvesting').checked=!!data.huisvesting;
    document.getElementById('opmerkingen').value=data.opmerkingen||'';
  } else if (sap && sap.totaalTCO){
    jaarInput.value=sap.totaalTCO;
    p1Input.value=0;
    p2Input.value=0;
  }
  updateP3();
}

function resetForm(){
  if (!form) return;
  form.reset();
  jaarInput.value=10000; p1Input.value=0; p2Input.value=0;
  updateP3(); clearErrors();
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
      p1:Number(p1Input.value)||0,
      p2:Number(p2Input.value)||0,
      p3:Number(p3Input.value)||0,
      huisvesting:document.getElementById('huisvesting').checked,
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
    return '<tr><td>'+escapeHtml(d)+'</td><td>EUR '+Number(a.jaarBudget||0).toLocaleString('nl-BE')+'</td><td>EUR '+Number(a.p1||0).toLocaleString('nl-BE')+'</td><td>EUR '+Number(a.p2||0).toLocaleString('nl-BE')+'</td><td>EUR '+Number(a.p3||0).toLocaleString('nl-BE')+'</td><td><span class="status-badge '+st.class+'">'+st.label+'</span></td></tr>';
  }).join('');

  // Budget bar
  var barContainer=document.getElementById('budgetBarContainer');
  if (barContainer && data){
    var total=Number(data.jaarBudget)||0;
    var used=(Number(data.p1)||0)+(Number(data.p2)||0)+(Number(data.p3)||0);
    var remaining=Math.max(0, total-used);
    var pct=total?Math.round(used/total*100):0;
    var html='<div style="margin-bottom:0.6rem"><strong>Totaal budget:</strong> EUR '+total.toLocaleString('nl-BE')+'</div>';
    html+='<div style="background:#eee;border-radius:8px;height:18px;overflow:hidden;margin-bottom:0.4rem"><div style="width:'+pct+'%;background:var(--maroon);height:100%"></div></div>';
    html+='<div style="font-size:0.85rem;color:var(--muted)">Gebruikt: EUR '+used.toLocaleString('nl-BE')+' ('+pct+'%) · Resterend: EUR '+remaining.toLocaleString('nl-BE')+'</div>';
    if (data.breakdown && data.breakdown.length){
      html+='<ul style="margin:0.6rem 0 0;padding-left:1.1rem;font-size:0.85rem">';
      data.breakdown.forEach(function(b){
        html+='<li>'+escapeHtml(b.item)+': EUR '+Number(b.bedrag).toLocaleString('nl-BE')+' (pijler '+b.pijler+')</li>';
      });
      html+='</ul>';
    }
    if (data.p3>0){
      html+='<p style="margin:0.5rem 0 0;font-size:0.85rem"><strong>Pijler 3:</strong> EUR '+Number(data.p3).toLocaleString('nl-BE')+' uitbetalen op volgend loon.</p>';
    } else if (remaining > 0){
      html+='<p style="margin:0.5rem 0 0;font-size:0.85rem"><strong>Resterend:</strong> EUR '+remaining.toLocaleString('nl-BE')+' kan eventueel worden uitbetaald via pijler 3.</p>';
    }
    barContainer.innerHTML=html;
  } else if (barContainer){
    barContainer.innerHTML='<p class="hr-empty">Nog geen budgetgegevens.</p>';
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
    return '<tr data-id="'+a.id+'" class="'+(selectedHrId===a.id?'selected':'')+'" onclick="showHrDetail(\''+a.id+'\')"><td><strong>'+escapeHtml(naam)+'</strong></td><td>'+escapeHtml(a.personeelsnummer)+'</td><td>'+escapeHtml(a.afdeling||'-')+'</td><td>EUR '+Number(a.jaarBudget).toLocaleString('nl-BE')+'</td><td><select class="status-select" onclick="event.stopPropagation()" onchange="hrChangeStatus(\''+a.id+'\', this.value)"><option value="ingediend"'+(a.status==='ingediend'?' selected':'')+'>Openstaand</option><option value="verwerkt"'+(a.status==='verwerkt'?' selected':'')+'>In behandeling</option><option value="afgerond"'+(a.status==='afgerond'?' selected':'')+'>Afgerond</option></select></td><td><button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();showHrDetail(\''+a.id+'\')">Bewerk</button></td></tr>';
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
  if (title) title.textContent=[app.voornaam,app.achternaam].filter(Boolean).join(' ');
  body.innerHTML='<form id="hrEditForm" class="hr-edit-grid" onsubmit="return saveHrEdit(event, \''+app.id+'\')"><div class="form-group"><label>Voornaam *</label><input type="text" id="hr-voornaam" value="'+escapeHtml(app.voornaam)+'" /><span class="field-error" id="err-hr-voornaam"></span></div><div class="form-group"><label>Achternaam *</label><input type="text" id="hr-achternaam" value="'+escapeHtml(app.achternaam)+'" /><span class="field-error" id="err-hr-achternaam"></span></div><div class="form-group"><label>Personeelsnr. *</label><input type="text" id="hr-personeelsnummer" value="'+escapeHtml(app.personeelsnummer)+'" /><span class="field-error" id="err-hr-personeelsnummer"></span></div><div class="form-group"><label>E-mail *</label><input type="email" id="hr-email" value="'+escapeHtml(app.email)+'" /><span class="field-error" id="err-hr-email"></span></div><div class="form-group"><label>Afdeling</label><input type="text" id="hr-afdeling" value="'+escapeHtml(app.afdeling||'')+'" /></div><div class="form-group full"><label>Woonadres *</label><input type="text" id="hr-adres" value="'+escapeHtml(app.adres||'')+'" /><span class="field-error" id="err-hr-adres"></span></div><div class="form-group"><label>Budget</label><input type="number" id="hr-jaarBudget" value="'+app.jaarBudget+'" /><span class="field-error" id="err-hr-jaarBudget"></span></div><div class="form-group"><label>Pijler 1</label><input type="number" id="hr-p1" value="'+app.p1+'" /></div><div class="form-group"><label>Pijler 2</label><input type="number" id="hr-p2" value="'+app.p2+'" /></div><div class="form-group"><label>Pijler 3</label><input type="number" id="hr-p3" value="'+app.p3+'" readonly /></div><div class="form-group full"><label class="check-label"><input type="checkbox" id="hr-huisvesting"'+(app.huisvesting?' checked':'')+' /> Huisvesting in pijler 2</label><span class="field-error" id="err-hr-huisvesting"></span></div><div class="form-group full"><label>Opmerkingen</label><textarea id="hr-opmerkingen" rows="2">'+escapeHtml(app.opmerkingen||'')+'</textarea></div><div class="form-group full form-actions"><button type="submit" class="btn btn-primary btn-sm">Wijzigingen opslaan</button></div></form>';
  var hp1=document.getElementById('hr-p1'), hp2=document.getElementById('hr-p2'), hp3=document.getElementById('hr-p3'), hj=document.getElementById('hr-jaarBudget');
  function sync(){ hp3.value=Math.max(0,(Number(hj.value)||0)-(Number(hp1.value)||0)-(Number(hp2.value)||0)); }
  [hp1,hp2,hj].forEach(function(el){ el.addEventListener('input', sync); });
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
  {id:'demo_elena',voornaam:'Elena',achternaam:'Janssens',personeelsnummer:'2111',email:'elena@logimove.be',afdeling:'Logistiek',adres:'Kerkstraat 45, 2650 Edegem',jaarBudget:8400,p1:0,p2:6800,p3:0,huisvesting:false,opmerkingen:'Leasefiets (€1200) + busabonnement (€5600). Resterend €1600 kan eventueel worden uitbetaald via pijler 3.',status:'verwerkt',submittedAt:'2026-11-01T09:00:00',lastUpdate:'2026-11-10T14:00:00',breakdown:[{item:'Fietslease',bedrag:1200,pijler:2},{item:'Busabonnement',bedrag:5600,pijler:2}]},
  {id:'demo_tom',voornaam:'Tom',achternaam:'Willems',personeelsnummer:'2101',email:'tom@logimove.be',afdeling:'Marketing',adres:'Molenstraat 18, 2840 Rumst',jaarBudget:9000,p1:0,p2:6500,p3:2500,huisvesting:false,opmerkingen:'Geen bedrijfswagen. Deelautos + OV.',status:'ingediend',submittedAt:'2026-11-08T10:15:00',lastUpdate:'2026-11-08T10:15:00'},
  {id:'demo_riadh',voornaam:'Riadh',achternaam:'Man\u00e9',personeelsnummer:'2102',email:'riadh@logimove.be',afdeling:'Accountancy',adres:'Statiestraat 42, 2630 Aartselaar',jaarBudget:14500,p1:12000,p2:1500,p3:1000,huisvesting:false,opmerkingen:'Wil bedrijfswagen behouden (pijler 1).',status:'verwerkt',submittedAt:'2026-10-20T09:00:00',lastUpdate:'2026-11-03T14:20:00'}
];

function seedDemoData(){
  var list = loadAll();
  DEMO_APPLICATIONS.forEach(function(demo){
    var idx = list.findIndex(function(a){ return a.personeelsnummer === demo.personeelsnummer; });
    if (idx >= 0){
      list[idx] = Object.assign({}, list[idx], demo);
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
// Ensure demo records (incl. Elena) are always present
seedDemoData();

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

updateP3();

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
