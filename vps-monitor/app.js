"use strict";
/* ============ narzędzia ============ */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=b=>{b=Number(b)||0;const u=["B","KB","MB","GB","TB"];let i=0;while(b>=1024&&i<4){b/=1024;i++}return (b>=100||i===0?b.toFixed(0):b.toFixed(1))+" "+u[i]};
const lvl=p=>p>=90?"bad":p>=75?"warn":"ok";
const TOKEN=$('meta[name=vps-token]').content;
const icon=(id,cls="")=>`<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const joinP=(a,b)=>(a==="/"?"":a)+"/"+b;
const cache=new Map();
const setHTML=(el,h)=>{if(cache.get(el)!==h){cache.set(el,h);el.innerHTML=h}};
const setText=(el,t)=>{if(el.textContent!==String(t))el.textContent=t};
const store={get(k,d){try{return localStorage.getItem(k)??d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const when=iso=>{const d=new Date(iso);return isNaN(d)?iso:d.toLocaleString("pl-PL",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"})};

async function api(url){const r=await fetch(url);if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}
async function post(url,body){
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","X-Token":TOKEN},body:JSON.stringify(body)});
  if(!r.ok)throw new Error("HTTP "+r.status);return r.json();
}

/* ============ toast i okna ============ */
function toast(msg,kind="ok"){
  const t=document.createElement("div");t.className="toast";t.dataset.k=kind;
  t.innerHTML=icon(kind==="ok"?"check":"alert")+`<span>${esc(msg)}</span>`;
  $("#toasts").append(t);
  setTimeout(()=>{t.classList.add("out");setTimeout(()=>t.remove(),220)},kind==="ok"?3200:6000);
}
function ask({title,body="",input=false,value="",placeholder="",confirm="OK",danger=false,typed=null}){
  return new Promise(res=>{
    const d=$("#dlg"),inp=$("#dlgInput"),ok=$("#dlgOk"),cancel=$("#dlgCancel");let done=false;
    $("#dlgTitle").textContent=title;$("#dlgBody").innerHTML=body;
    inp.hidden=!(input||typed);inp.value=value;inp.placeholder=typed?`Wpisz: ${typed}`:placeholder;
    ok.textContent=confirm;ok.dataset.danger=danger?"1":"0";ok.disabled=!!typed;
    const fin=v=>{if(done)return;done=true;if(d.open)d.close();res(v)};
    inp.oninput=()=>{if(typed)ok.disabled=inp.value!==typed};
    inp.onkeydown=e=>{if(e.key==="Enter"&&!ok.disabled){e.preventDefault();ok.click()}};
    ok.onclick=()=>fin({value:inp.value});
    cancel.onclick=()=>fin(null);
    d.oncancel=()=>fin(null);
    d.onclose=()=>fin(null);
    d.showModal();
    if(!inp.hidden){inp.focus();if(input)inp.select()}else (danger?cancel:ok).focus();
  });
}

/* ============ motyw ============ */
const THEMES=["auto","light","dark"],TLAB={auto:"Auto",light:"Jasny",dark:"Ciemny"};
let theme=store.get("vpsc-theme","auto");
function applyTheme(){
  if(theme==="auto")document.documentElement.removeAttribute("data-theme");else document.documentElement.dataset.theme=theme;
  setText($("#themeTxt"),TLAB[theme]);
  $("#theme .ic use").setAttribute("href",theme==="dark"?"#i-moon":"#i-sun");
}
$("#theme").onclick=()=>{theme=THEMES[(THEMES.indexOf(theme)+1)%3];store.set("vpsc-theme",theme);applyTheme()};
applyTheme();

/* ============ stan i akcje ============ */
const S={live:null,docker:null,services:null,packages:null,audit:[]};
async function doAction(payload,okMsg){
  let res;
  try{res=await post("/api/action",payload)}catch(e){toast("Błąd połączenia z panelem","bad");return null}
  if(res.needs_force){
    const a=await ask({title:"Ta zmiana jest ryzykowna",body:`<b>${esc(res.error)}</b><br>Na pewno kontynuować?`,confirm:"Tak, wykonaj",danger:true});
    if(!a)return null;
    try{res=await post("/api/action",{...payload,force:true})}catch(e){toast("Błąd połączenia z panelem","bad");return null}
  }
  if(res.error&&res.ok===false){toast(res.error,"bad");loadAudit();return null}
  if(res.ok===false){toast(res.msg||"Akcja nie powiodła się","bad");loadAudit();return null}
  toast(okMsg||res.msg||"Gotowe");loadAudit();return res;
}
async function loadAudit(){try{S.audit=await api("/api/audit");renderAudit()}catch(e){}}

/* ============ nawigacja ============ */
const PAGES={
  dash:["Pulpit","Stan serwera w czasie rzeczywistym"],
  files:["Pliki","Przeglądaj, wysyłaj i porządkuj pliki na serwerze"],
  containers:["Kontenery","Uruchamiaj, zatrzymuj i podglądaj logi kontenerów Docker"],
  services:["Usługi","Usługi systemowe działające na serwerze"],
  procs:["Procesy","Co obciąża serwer w tej chwili"],
  net:["Sieć i mapa","Jak wszystko jest ze sobą połączone i co jest widoczne z zewnątrz"],
  backup:["Kopie zapasowe","Zaszyfrowane kopie ważnych danych na Dysku Google, co noc"],
  soft:["Oprogramowanie","Wszystko, co jest zainstalowane na serwerze"],
  audit:["Dziennik akcji","Co zostało zmienione z tego panelu"],
};
let page="dash";
/* Historia przeglądarki: każdy krok (strona, folder, kosz, mapa dysku, podgląd pliku) to wpis w historii,
   więc „wstecz” cofa o jeden krok w panelu, a nie wychodzi ze strony. Adres: #files/home/ubuntu/studia, #files?trash, …?map */
let navCur="",navBusy=false;
const navState=()=>page==="files"?{page,path:F.cwd,mode:F.mode==="trash"||F.mode==="map"?F.mode:"dir"}:{page};
const navHash=s=>"#"+s.page+(s.page==="files"?(s.mode==="trash"?"?trash":s.path.split("/").map(encodeURIComponent).join("/")+(s.mode==="map"?"?map":"")):"");
function navParse(){
  const raw=location.hash.slice(1),q=raw.indexOf("?"),base=q<0?raw:raw.slice(0,q),flag=q<0?"":raw.slice(q+1);
  const m=base.match(/^([a-z]+)(\/.*)?$/),p=m&&PAGES[m[1]]?m[1]:"dash";
  if(p!=="files")return{page:p};
  let path=F.cwd;try{if(m[2])path=m[2].split("/").map(decodeURIComponent).join("/")}catch(e){}
  return{page:p,path,mode:flag==="trash"?"trash":flag==="map"?"map":"dir"};
}
function navPush(replace){
  if(navBusy)return;
  const s=navState(),h=navHash(s);
  if(h===navCur&&!replace)return;
  navCur=h;
  try{(replace?history.replaceState:history.pushState).call(history,s,"",h)}catch(e){}
}
function show(p,opt={}){
  if(!PAGES[p])p="dash";page=p;
  $$(".page").forEach(s=>s.hidden=s.id!=="page-"+p);
  $$("#nav button,#tabbar button").forEach(b=>b.setAttribute("aria-current",b.dataset.page===p?"page":"false"));
  setText($("#pageTitle"),PAGES[p][0]);setText($("#pageSub"),PAGES[p][1]);
  document.title=PAGES[p][0]+" · Centrum VPS";
  if(!opt.nav)navPush(opt.replace);
  if(p==="files"&&!F.loaded){F.loaded=true;loadDir(F.cwd)}
  if(p==="audit")loadAudit();
  if(p==="net")renderNet();
  if(p==="soft")loadPk();
  if(p==="backup")loadBackup();
  renderAll();
}
/* Skróty do aplikacji: adres bierzemy z tej samej nazwy hosta, pod którą otwarto panel (np. sparky-vps). */
$$("#apps a").forEach(a=>{a.href=`http://${location.hostname}${a.dataset.port?":"+a.dataset.port:""}/`;a.target="_blank";a.rel="noopener"});
$("#tabbar").innerHTML=$$("#nav button").map(b=>`<button data-page="${b.dataset.page}">${b.querySelector("svg").outerHTML}<span>${b.querySelector("span").textContent}</span></button>`).join("");
document.addEventListener("click",e=>{
  const sb=e.target.closest(".sortb");if(sb){F.sort=sb.dataset.sort;store.set("vpsc-fsort",F.sort);renderFiles();return}
  const n=e.target.closest("[data-page]");if(n){show(n.dataset.page);return}
  const g=e.target.closest("[data-go]");if(g)show(g.dataset.go);
});

/* ============ wskaźniki i wykresy ============ */
function ring(el,pct,tone){
  const C=263.9;el.style.strokeDashoffset=(C*(1-Math.max(0,Math.min(100,pct))/100)).toFixed(1);
  const l=lvl(pct);el.dataset.level=l;if(tone&&l==="ok")el.dataset.tone=tone;else delete el.dataset.tone;
}
function spark(el,data,col){
  if(!data.length){el.innerHTML="";return}
  const W=300,H=56,n=Math.max(data.length,2);
  const pts=data.map((v,i)=>[i*(W/(n-1)),H-3-(Math.min(v,100)/100)*(H-6)]);
  const line=pts.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
  /* płaskie, półprzezroczyste wypełnienie działa wszędzie (gradient z var() psuł się w Safari na iOS) */
  setHTML(el,`<polygon points="0,${H} ${line} ${pts[pts.length-1][0].toFixed(1)},${H}" style="fill:var(${col});fill-opacity:.13;stroke:none"/><polyline points="${line}" style="stroke:var(${col})"/>`);
}
function exposure(addr){
  const host=addr.replace(/%.*?(?=:\d+$)/,"").replace(/:(\d+)$/,"");
  const port=addr.match(/:(\d+)$/)?.[1]||"";
  let k="warn",t="publiczny";
  if(/^(127\.|\[?::1\]?$)/.test(host)||/%lo/.test(addr))k="ok",t="lokalny";
  else if(/^100\./.test(host)||/tailscale/.test(addr)||/^\[fd7a/.test(host))k="ok",t="Tailscale";
  else if(/^(10\.|\[fe80)/.test(host))k="ok",t="sieć lokalna";
  return {port,k,t};
}
function uniquePorts(){
  const seen=new Map();
  const fw=S.live?.fw;
  (S.live?.ports||[]).forEach(p=>{
    const e=exposure(p.addr);
    /* adres 0.0.0.0 jeszcze nie znaczy "widoczny z internetu": zapora serwera może go blokować */
    if(e.t==="publiczny"&&fw?.restrictive&&!(fw.open[p.proto]||[]).includes(Number(e.port))){e.k="ok";e.t="zablokowany zaporą"}
    const k=p.proto+e.port+p.proc+e.t;if(!seen.has(k))seen.set(k,{...p,...e})});
  return [...seen.values()].sort((a,b)=>(a.k==="warn"?0:1)-(b.k==="warn"?0:1)||a.port-b.port);
}

/* ============ render: live ============ */
function renderLive(r){
  const live=$("#live"),err=$("#err");
  if(r.error){err.dataset.on="";err.textContent="Brak połączenia z VPS: "+r.error;live.dataset.state="bad";setText($("#liveTxt"),"offline")}
  else{delete err.dataset.on;live.dataset.state="ok";setText($("#liveTxt"),"na żywo · "+new Date(r.ts*1000).toLocaleTimeString("pl-PL"))}
  if(!r.live)return;S.live=r.live;
  setText($("#brandName"),S.live.hostname);setText($("#brandSub"),`${S.live.os} · ${S.live.uptime.replace("up ","")}`);
  renderAll();
}
function renderAll(){
  if(!S.live)return;
  if(page==="dash")renderDash();
  if(page==="procs")renderProcs();
  if(page==="net")renderNet();
  if(page==="containers")renderContainers();
  if(page==="services")renderServices();
}
function renderDash(){
  const L=S.live,m=L.mem,pu=100*m.used/m.total;
  ring($("#ramVal"),pu);setText($("#ramPct"),pu.toFixed(0)+"%");
  setHTML($("#ramFacts"),`<div><span class="sw" style="background:var(--accent)"></span>Używana <b>${fmt(m.used)}</b></div><div><span class="sw" style="background:var(--violet)"></span>Cache <b>${fmt(m.cache)}</b></div><div><span class="sw" style="background:var(--surface-3)"></span>Dostępna <b>${fmt(m.avail)}</b></div><div class="muted">z ${fmt(m.total)}</div>`);
  spark($("#ramSpark"),L.history.mem,"--accent");
  setText($("#swap"),m.swap_total?`Swap: ${fmt(m.swap_used)} z ${fmt(m.swap_total)}`:"Swap wyłączony");
  const c=L.cpu??0;ring($("#cpuVal"),c,"good");setText($("#cpuPct"),L.cpu==null?"–":c.toFixed(0)+"%");setText($("#cores"),L.cores+" rdz.");
  setHTML($("#cpuFacts"),`<div>Obciążenie 1 min <b>${L.load[0]}</b></div><div>5 min <b>${L.load[1]}</b></div><div>15 min <b>${L.load[2]}</b></div>`);
  spark($("#cpuSpark"),L.history.cpu,"--good");
  const d=L.disks.find(x=>x.mount==="/")||L.disks[0];
  if(d){const p=100*d.used/d.size;ring($("#dskVal"),p);setText($("#dskPct"),p.toFixed(0)+"%");
    setHTML($("#dskFacts"),`<div>Zajęte <b>${fmt(d.used)}</b></div><div>Wolne <b>${fmt(d.size-d.used)}</b></div><div class="muted">z ${fmt(d.size)} (${esc(d.mount)})</div>`)}
  const dk=S.docker?.containers||[],run=dk.filter(c=>c.state==="running").length;
  setText($("#sDocker"),dk.length?`${run}/${dk.length}`:"0");setText($("#sDockerSub"),dk.length?"działa / razem":"brak Dockera lub kontenerów");
  const sv=S.services||[],sr=sv.filter(s=>s.active==="active"&&s.sub==="running").length,sf=sv.filter(s=>s.active==="failed").length;
  setText($("#sSvc"),sv.length?sr:"–");setText($("#sSvcSub"),sf?`${sf} z błędem`:"działających");
  const ports=uniquePorts(),pub=ports.filter(p=>p.k==="warn");
  setText($("#sPorts"),new Set(ports.map(p=>p.proto+p.port)).size);setText($("#sPortsSub"),pub.length?`${pub.length} publicznych`:"żaden publiczny");
  if(S.packages)setText($("#sPkg"),S.packages.apt.length+S.packages.snap.length);
  const maxr=Math.max(...L.procs.map(p=>p.rss),1);
  setHTML($("#topProcs"),L.procs.slice(0,6).map(p=>`<div class="row"><span>${esc(p.name)} <span class="muted small">${p.cpu.toFixed(0)}% CPU</span></span><span>${fmt(p.rss)}<span class="inbar"><i style="transform:scaleX(${(p.rss/maxr).toFixed(3)})"></i></span></span></div>`).join(""));
  setHTML($("#recent"),S.audit.length?S.audit.slice(0,6).map(a=>`<div class="row"><span><span class="pill" data-k="${a.ok?"ok":"bad"}">${esc(a.action)}</span> <span class="small muted">${esc(String(a.target).slice(0,40))}</span></span><span class="small muted">${new Date(a.ts).toLocaleTimeString("pl-PL")}</span></div>`).join(""):'<p class="empty">Jeszcze nic nie zmieniałeś z panelu.</p>');
  const al=[];
  if(pu>=85)al.push(["bad","dash",`Pamięć RAM jest prawie pełna (${pu.toFixed(0)}%).`]);
  if(d&&100*d.used/d.size>=85)al.push(["bad","files",`Dysk jest zajęty w ${(100*d.used/d.size).toFixed(0)}%. Zobacz, co zajmuje miejsce.`]);
  L.procs.filter(p=>p.cpu>=80).forEach(p=>al.push(["warn","procs",`Proces ${p.name} (PID ${p.pid}) zużywa ${p.cpu.toFixed(0)}% procesora.`]));
  dk.filter(c=>c.state!=="running").forEach(c=>al.push(["warn","containers",`Kontener ${c.name} jest zatrzymany.`]));
  if(sf)al.push(["warn","services",`${sf} usług zakończyło się błędem.`]);
  if(pub.length)al.push(["warn","net",`Z internetu dostępne: ${[...new Set(pub.map(p=>p.port+(p.proc?` (${p.proc})`:"")))].join(", ")}. Pozostałe porty blokuje zapora lub są tylko w Tailscale.`]);
  if(!al.length)al.push(["ok","dash","Wszystko wygląda dobrze."]);
  setHTML($("#alerts"),al.map(([k,go,t])=>`<button class="alert" data-k="${k}" data-go="${go}" type="button">${icon(k==="ok"?"check":"alert")}<span>${esc(t)}</span></button>`).join(""));
}

/* ============ kontenery ============ */
function renderContainers(){
  const cs=S.docker?.containers||[];
  $("#cardsEmpty").hidden=cs.length>0;
  setHTML($("#cards"),cs.map(c=>{
    const up=c.state==="running",ports=(c.ports||"").split(", ").filter(Boolean).map(p=>`<span class="chip">${esc(p)}</span>`).join("");
    return `<article class="card cont"><div class="cont-head"><div class="cont-ic" data-s="${esc(c.state)}">${icon("box")}</div>
      <div style="min-width:0;flex:1"><strong>${esc(c.name)}</strong><span class="small muted">${esc(c.image)}</span></div>
      <span class="pill" data-k="${up?"ok":"warn"}">${esc(c.status)}</span></div>
      ${up?`<div class="grid g2" style="gap:.75rem"><div class="meter"><div class="t"><span>CPU</span><b style="color:var(--text)">${(c.cpu??0).toFixed(1)}%</b></div><div class="bar"><i style="transform:scaleX(${Math.min(1,(c.cpu??0)/100).toFixed(3)})"></i></div></div>
      <div class="meter"><div class="t"><span>RAM</span><b style="color:var(--text)">${esc((c.mem||"").split(" / ")[0])}</b></div><div class="bar"><i style="transform:scaleX(${Math.min(1,(c.memp??0)/100).toFixed(3)})"></i></div></div></div>
      <div class="small muted">Sieć: ${esc(c.net||"–")}</div>`:""}
      ${ports?`<div class="chips">${ports}</div>`:""}
      <div class="btns">
        ${up?`<button class="soft sm" data-c="restart" data-n="${esc(c.name)}" type="button">${icon("refresh")}Restart</button><button class="soft sm danger" data-c="stop" data-n="${esc(c.name)}" type="button">${icon("stop")}Zatrzymaj</button>`
            :`<button class="primary sm" data-c="start" data-n="${esc(c.name)}" type="button">${icon("play")}Uruchom</button>`}
        <button class="soft sm" data-c="logs" data-n="${esc(c.name)}" type="button">${icon("log")}Logi</button>
      </div></article>`}).join(""));
}
$("#cards").onclick=async e=>{
  const b=e.target.closest("[data-c]");if(!b)return;const a=b.dataset.c,n=b.dataset.n;
  if(a==="logs")return showLogs("docker",n);
  const lab={restart:"Zrestartować",stop:"Zatrzymać",start:"Uruchomić"}[a];
  const ok=await ask({title:`${lab} kontener ${n}?`,body:a==="stop"||a==="restart"?"Usługa w kontenerze będzie na chwilę niedostępna.":"Kontener zostanie uruchomiony.",confirm:lab.replace("ć","j"),danger:a==="stop"});
  if(!ok)return;b.disabled=true;
  const r=await doAction({type:"docker",action:a,name:n},`${n}: gotowe`);
  b.disabled=false;if(r)refreshDocker();
};
async function refreshDocker(){try{S.docker=await api("/api/docker");setText($("#nbContainers"),(S.docker.containers||[]).length||"");renderAll()}catch(e){}}

/* ============ usługi ============ */
let svcFilter="running",svcQuery="";
function renderServices(){
  const all=S.services||[];
  setText($("#nbServices"),all.filter(s=>s.active==="active"&&s.sub==="running").length||"");
  let l=all.filter(s=>svcFilter==="all"||(svcFilter==="running"?s.active==="active"&&s.sub==="running":s.active==="failed"));
  if(svcQuery)l=l.filter(s=>(s.unit+s.desc).toLowerCase().includes(svcQuery));
  setText($("#svcCount"),`${l.length} z ${all.length}`);
  setHTML($("#svcList"),l.slice(0,250).map(s=>{
    const run=s.active==="active"&&s.sub==="running",fail=s.active==="failed";
    return `<div class="svc"><span class="d" data-k="${run?"ok":fail?"bad":""}"></span><div class="n"><strong>${esc(s.unit.replace(/\.service$/,""))}</strong><span>${esc(s.desc)}</span></div>
      <span class="pill" data-k="${run?"ok":fail?"bad":""}">${esc(s.sub)}</span>
      ${s.protected?`<span class="pill" title="Chroniona: SSH, Tailscale, Docker i usługi systemowe">${icon("lock")}chroniona</span>`:
      `<div class="btns">${run?`<button class="soft sm" data-s="restart" data-n="${esc(s.unit)}" type="button">${icon("refresh")}Restart</button><button class="soft sm danger" data-s="stop" data-n="${esc(s.unit)}" type="button">${icon("stop")}</button>`:`<button class="primary sm" data-s="start" data-n="${esc(s.unit)}" type="button">${icon("play")}Start</button>`}</div>`}
      <button class="soft sm" data-s="logs" data-n="${esc(s.unit)}" type="button" title="Logi">${icon("log")}</button></div>`}).join("")||'<p class="empty">Nic nie znaleziono.</p>');
}
$("#svcList").onclick=async e=>{
  const b=e.target.closest("[data-s]");if(!b)return;const a=b.dataset.s,n=b.dataset.n;
  if(a==="logs")return showLogs("service",n);
  const lab={restart:"Zrestartować",stop:"Zatrzymać",start:"Uruchomić"}[a];
  const ok=await ask({title:`${lab} usługę ${n.replace(/\.service$/,"")}?`,body:"Usługa będzie na chwilę niedostępna.",confirm:lab.replace("ć","j"),danger:a==="stop"});
  if(!ok)return;b.disabled=true;
  const r=await doAction({type:"service",action:a,name:n},`${n.replace(/\.service$/,"")}: gotowe`);
  b.disabled=false;if(r)setTimeout(refreshServices,800);
};
$("#sq").oninput=e=>{svcQuery=e.target.value.toLowerCase();renderServices()};
$$("[data-sf]").forEach(b=>b.onclick=()=>{svcFilter=b.dataset.sf;$$("[data-sf]").forEach(x=>x.setAttribute("aria-pressed",x===b));renderServices()});
async function refreshServices(){try{S.services=await api("/api/services");setText($("#nbServices"),S.services.filter(s=>s.active==="active"&&s.sub==="running").length||"");renderAll()}catch(e){}}

/* ============ procesy ============ */
function renderProcs(){
  const L=S.live,maxr=Math.max(...L.procs.map(p=>p.rss),1);
  setHTML($("#procs"),L.procs.map(p=>`<tr><td>${esc(p.name)}</td><td class="u muted">${esc(p.user)}</td><td class="r muted">${p.pid}</td><td class="r">${p.cpu.toFixed(1)}%</td><td class="r">${fmt(p.rss)}<span class="inbar"><i style="transform:scaleX(${(p.rss/maxr).toFixed(3)})"></i></span></td><td class="r"><button class="soft sm danger" data-k="${p.pid}" data-n="${esc(p.name)}" type="button">Zakończ</button></td></tr>`).join(""));
}
$("#procs").onclick=async e=>{
  const b=e.target.closest("[data-k]");if(!b)return;
  const ok=await ask({title:`Zakończyć proces ${b.dataset.n}?`,body:`Wyślę sygnał zakończenia do procesu <b>${esc(b.dataset.n)}</b> (PID ${b.dataset.k}). Niezapisane dane tego procesu mogą przepaść.`,confirm:"Zakończ",danger:true});
  if(!ok)return;await doAction({type:"kill",pid:Number(b.dataset.k),sig:"TERM"});
};

/* ============ sieć i mapa serwera ============ */
const SYS_SVC=/^(systemd|getty|serial-getty|user@|dbus|polkit|udisks|multipath|irqbalance|networkd|rpcbind|snap\.|snapd|packagekit|cron|rsyslog|iscsid|unattended|cloud|fwupd|apparmor|apport|keepalive|unified|containerd|docker|lvm|open-iscsi|ModemManager|accounts|blk|console|e2scrub|finalrd|fstrim|grub|lxd|motd|multipathd|plymouth|setvtrgb|sysstat|ubuntu|ufw|vgauth|wpa|atd|chrony|ssh)/i;
function renderNet(){
  const ports=uniquePorts();
  setHTML($("#ports"),ports.map(p=>`<tr><td>${p.port}<span class="muted small"> ${p.proto}</span></td><td>${esc(p.proc||"–")}</td><td><span class="pill" data-k="${p.k}">${p.t}</span></td></tr>`).join("")||'<tr><td colspan="3" class="empty">brak</td></tr>');
  const cs=S.docker?.containers||[],sv=(S.services||[]).filter(s=>s.active==="active"&&s.sub==="running"&&!SYS_SVC.test(s.unit)).slice(0,14);
  const pr=[];const sp=new Set();ports.forEach(p=>{const k=p.port;if(!sp.has(k)){sp.add(k);pr.push(p)}});
  const W=820,H=620,cx=W/2,cy=H/2;
  const rings=[[cs,120,"--accent","box","containers",c=>c.name,c=>c.state==="running"],[sv,205,"--good","svc","services",s=>s.unit.replace(/\.service$/,""),()=>true],[pr.slice(0,22),282,null,"port","net",p=>String(p.port),()=>true]];
  let edges="",nodes="",guides="";
  rings.forEach(([list,r,col,kind,go,lab,live],ri)=>{
    guides+=`<circle class="ring-guide" cx="${cx}" cy="${cy}" r="${r}"/>`;
    list.forEach((it,i)=>{
      const a=(i/list.length)*2*Math.PI-Math.PI/2+ri*.35,x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);
      const color=col?`var(${col})`:(it.k==="warn"?"var(--warn)":"var(--violet)");
      const on=live(it);const rr=kind==="box"?13:kind==="svc"?9:7;
      edges+=`<line class="edge${on?" flow":""}" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
      const anchor=Math.cos(a)>.25?"start":Math.cos(a)<-.25?"end":"middle",dx=Math.cos(a)>.25?rr+5:Math.cos(a)<-.25?-(rr+5):0,dy=Math.abs(Math.cos(a))<=.25?(Math.sin(a)>0?rr+13:-(rr+6)):4;
      nodes+=`<g class="node" data-go="${go}" tabindex="0"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr}" fill="${color}" opacity="${on?1:.4}"/><text x="${(x+dx).toFixed(1)}" y="${(y+dy).toFixed(1)}" text-anchor="${anchor}">${esc(lab(it).slice(0,22))}</text><title>${esc(lab(it))}</title></g>`;
    });
  });
  setHTML($("#topo"),`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mapa serwera: kontenery, usługi i porty"><defs><radialGradient id="gc"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></radialGradient></defs>${guides}${edges}${nodes}
    <circle cx="${cx}" cy="${cy}" r="42" fill="url(#gc)"/><text x="${cx}" y="${cy+4}" text-anchor="middle" style="fill:#fff;stroke:none;font-weight:700;font-size:13px">${esc(S.live?.hostname||"VPS")}</text></svg>`);
}

/* ============ oprogramowanie ============ */
let pkSig="";
async function loadPk(){try{const j=await api("/api/packages");if(j){S.packages=j;renderPk()}}catch(e){}}
function renderPk(){
  const PK=S.packages;if(!PK)return;
  setText($("#sPkg"),PK.apt.length+PK.snap.length);
  if(page!=="soft")return;
  const q=$("#q").value.toLowerCase(),man=$("#manual").checked,bs=$("#bysize").checked;
  const sig=[q,man,bs,PK.apt.length].join("|");if(sig===pkSig)return;pkSig=sig;
  let l=PK.apt.filter(p=>(!man||p.manual)&&p.name.toLowerCase().includes(q));
  if(!bs)l=[...l].sort((a,b)=>a.name.localeCompare(b.name));
  setText($("#pkgSummary"),`apt: ${PK.apt.length} pakietów (${PK.apt.filter(p=>p.manual).length} zainstalowanych ręcznie) · snap: ${PK.snap.length} · obrazy Docker: ${PK.images.length}`);
  setHTML($("#apt"),l.slice(0,400).map(p=>`<tr><td>${esc(p.name)}</td><td class="muted">${esc(p.version)}</td><td class="r">${fmt(p.size)}</td></tr>`).join("")||'<tr><td colspan="3" class="empty">Nic nie znaleziono.</td></tr>');
  let ex="";
  if(PK.snap.length)ex+=`<h2>Snap</h2><div class="chips">${PK.snap.map(s=>`<span class="chip">${esc(s.name)} <span class="muted">${esc(s.version)}</span></span>`).join("")}</div>`;
  if(PK.images.length)ex+=`<h2 style="margin-top:1rem">Obrazy Docker</h2><div class="chips">${PK.images.map(s=>`<span class="chip">${esc(s.name)} <span class="muted">${esc(s.size)}</span></span>`).join("")}</div>`;
  setHTML($("#extra"),ex);
}
["q","manual","bysize"].forEach(id=>$("#"+id).addEventListener("input",()=>{pkSig="";renderPk()}));

/* ============ kopie zapasowe ============ */
let BK=null;
async function loadBackup(){try{BK=await api("/api/backup");renderBackup()}catch(e){}}
function renderBackup(){
  if(!BK||page!=="backup")return;
  const s=BK.status||{},run=BK.running,st=run?"running":(s.state||"none");
  const [pk,pt]={running:["warn","Trwa kopiowanie…"],ok:["ok","Ostatnia kopia udana"],failed:["bad","Ostatnia kopia z błędami"],none:["","Jeszcze nie było kopii"]}[st]||["",st];
  const d=s.drive||{},b=s.backup||{},pu=d.total?100*(d.used||0)/d.total:0;
  const dur=s.duration_s!=null?(s.duration_s>=60?Math.round(s.duration_s/60)+" min":s.duration_s+" s"):"–";
  const srcs=(s.sources||[]);
  const warn=BK.own_client?"":`<article class="card" style="grid-column:1/-1"><h2>Ważne: klucz Google do odnowienia</h2><p class="small pretty">Połączenie z Dyskiem używa wspólnego klucza programu rclone, który Google <b>wycofuje w 2026 roku</b>. Gdy przestanie działać, kopie przestaną się wykonywać (zobaczysz błąd na tej stronie). Rozwiązaniem jest własny klucz z Google Cloud, co zajmuje ok. 10 minut. Powiedz asystentowi „zrób własny klucz do Dysku", a przeprowadzi Cię krok po kroku.</p></article>`;
  setHTML($("#bkBody"),`<div class="grid g2">
    <article class="card"><h2>Stan</h2>
      <div class="row" style="box-shadow:none"><span class="pill" data-k="${pk}">${esc(pt)}</span><span class="small muted">${s.finished?when(s.finished):""}</span></div>
      <div class="facts" style="margin:.75rem 0 1rem"><div>Ostatnia udana <b>${s.last_ok?when(s.last_ok):"–"}</b></div><div>Czas trwania <b>${dur}</b></div><div>Następna kopia <b>${esc(BK.next||"–")}</b></div></div>
      <div class="btns"><button class="primary sm" id="bkRun" type="button" ${run?"disabled":""}>${icon("up")}${run?"Trwa…":"Wykonaj teraz"}</button><button class="soft sm" id="bkLogs" type="button">${icon("log")}Logi</button></div>
    </article>
    <article class="card"><h2>Dysk Google</h2>
      <p style="font-size:1.75rem;font-weight:700;letter-spacing:-.03em">${d.total?fmt(d.used||0):"–"} <span class="muted small" style="font-weight:500">z ${d.total?fmt(d.total):"–"}</span></p>
      <div class="meter" style="margin:.5rem 0 .875rem"><div class="bar"><i style="transform:scaleX(${Math.min(1,pu/100).toFixed(3)})"></i></div></div>
      <div class="facts"><div>Rozmiar kopii <b>${b.bytes!=null?fmt(b.bytes):"–"}</b></div><div>Liczba plików <b>${b.count!=null?b.count.toLocaleString("pl-PL"):"–"}</b></div></div>
    </article>
    ${warn}
    <article class="card" style="grid-column:1/-1"><h2>Co jest kopiowane</h2>
      ${srcs.length?`<div class="chips">${srcs.map(x=>`<span class="pill" data-k="${x.rc===0?"ok":"bad"}">${icon(x.rc===0?"check":"alert")}${esc(x.name)}</span>`).join("")}</div>`:`<p class="small muted">${run?"Pierwsza kopia trwa, lista pojawi się po zakończeniu poszczególnych części.":"Brak danych."}</p>`}
      <p class="small muted pretty" style="margin-top:.875rem">Wszystko jest szyfrowane na serwerze, zanim trafi do Google: Google widzi tylko nieczytelne nazwy i dane. Zmienione lub usunięte pliki zostają w historii przez 30 dni. Klucz odzyskiwania leży na serwerze w <code>/root/KLUCZ-ODZYSKIWANIA-kopii.txt</code>. Zapisz go w menedżerze haseł, bo bez niego kopii nie da się odszyfrować.</p>
    </article></div>`);
}
$("#bkBody").addEventListener("click",async e=>{
  if(e.target.closest("#bkLogs"))return showLogs("service","vps-backup.service");
  if(e.target.closest("#bkRun")){
    const a=await ask({title:"Wykonać kopię teraz?",body:"Skopiuję ważne dane na Dysk Google. Zwykle trwa to kilka minut, a pierwszy raz dłużej. Serwer działa normalnie w tym czasie.",confirm:"Wykonaj"});
    if(!a)return;const r=await doAction({type:"backup"},"Kopia wystartowała");if(r)setTimeout(loadBackup,1500);
  }
});
setInterval(()=>{if(page==="backup")loadBackup()},5000);

/* ============ dziennik ============ */
function renderAudit(){
  if(page==="dash")renderDash();
  setHTML($("#auditList"),S.audit.length?S.audit.map(a=>`<div class="row"><span style="min-width:0"><span class="pill" data-k="${a.ok?"ok":"bad"}">${a.ok?"OK":"odmowa"}</span> <b>${esc(a.action)}</b> <span class="muted small">${esc(a.target)}</span>${a.msg?`<br><span class="small muted">${esc(a.msg)}</span>`:""}</span><span class="small muted" style="white-space:nowrap">${when(a.ts)}</span></div>`).join(""):'<p class="empty">Brak akcji. Tu pojawi się wszystko, co zmienisz z panelu.</p>');
}

/* ============ okno: logi i podgląd pliku ============ */
let logTimer=null,viewerMode="";
function openViewer(title,meta,btns){
  $("#vTitle").textContent=title;setText($("#vMeta"),meta);
  $("#vBody").hidden=false;$("#vEdit").hidden=true;$("#vBody").textContent="";
  $("#vBtns").innerHTML=btns;
  if(!$("#viewer").open)$("#viewer").showModal();
}
$("#viewer").addEventListener("close",()=>{clearInterval(logTimer);logTimer=null;viewerMode=""});
$("#viewer").addEventListener("click",e=>{if(e.target===$("#viewer"))$("#viewer").close()});
async function showLogs(kind,name){
  viewerMode="logs";let follow=true;
  const draw=async()=>{
    try{const r=await api(`/api/logs?kind=${kind}&name=${encodeURIComponent(name)}`);
      const pre=$("#vBody"),bottom=pre.scrollHeight-pre.scrollTop-pre.clientHeight<40;
      pre.textContent=r.error?("Błąd: "+r.error):(r.text||"(brak logów)");if(bottom||!pre.dataset.s){pre.scrollTop=pre.scrollHeight;pre.dataset.s=1}
      setText($("#vMeta"),"Ostatnie 300 linii · odświeżanie co 3 s");
    }catch(e){setText($("#vMeta"),"Nie udało się pobrać logów")}
  };
  openViewer(`Logi: ${name}`,"Ładowanie…",`<button class="soft sm" id="vFollow" type="button">Śledź: wł.</button><button class="soft sm" id="vClose" type="button">Zamknij</button>`);
  $("#vBody").dataset.s="";
  $("#vFollow").onclick=()=>{follow=!follow;setText($("#vFollow"),"Śledź: "+(follow?"wł.":"wył."));clearInterval(logTimer);if(follow)logTimer=setInterval(draw,3000)};
  $("#vClose").onclick=()=>$("#viewer").close();
  await draw();logTimer=setInterval(draw,3000);
}
async function showFile(path){
  viewerMode="file";
  openViewer(path,"Ładowanie…",`<button class="soft sm" id="vClose" type="button">Zamknij</button>`);
  $("#vClose").onclick=()=>$("#viewer").close();
  try{
    const r=await api("/api/cat?path="+encodeURIComponent(path));
    const dl=`<button class="soft sm" id="vDl" type="button">${icon("down")}Pobierz</button>`;
    if(r.error){setText($("#vMeta"),"Błąd: "+r.error);return}
    if(r.kind==="binary"){setText($("#vMeta"),`Plik binarny, ${fmt(r.size)}. Podgląd tekstu niedostępny.`);$("#vBtns").innerHTML=dl+`<button class="soft sm" id="vClose" type="button">Zamknij</button>`}
    else if(r.kind==="none"){setText($("#vMeta"),"To nie jest zwykły plik.")}
    else{
      setText($("#vMeta"),`${fmt(r.size)}${r.truncated?" · pokazano pierwsze 200 KB (edycja wyłączona)":""}`);$("#vBody").textContent=r.text||"(pusty plik)";
      const canEdit=!r.truncated&&r.policy!=="block"&&r.size<=500*1024;
      $("#vBtns").innerHTML=dl+(canEdit?`<button class="soft sm" id="vEditBtn" type="button">${icon("edit")}Edytuj</button>`:"")+`<button class="soft sm" id="vClose" type="button">Zamknij</button>`;
      if(canEdit)$("#vEditBtn").onclick=()=>startEdit(path,r.text);
    }
    $("#vDl").onclick=()=>download(path);$("#vClose").onclick=()=>$("#viewer").close();
  }catch(e){setText($("#vMeta"),"Nie udało się odczytać pliku")}
}
function startEdit(path,text){
  $("#vBody").hidden=true;const ta=$("#vEdit");ta.hidden=false;ta.value=text;ta.focus();setText($("#vMeta"),"Tryb edycji. Zmiany zapiszą się dopiero po kliknięciu Zapisz.");
  $("#vBtns").innerHTML=`<button class="primary sm" id="vSave" type="button">Zapisz</button><button class="soft sm" id="vCancel" type="button">Anuluj</button>`;
  $("#vCancel").onclick=()=>showFile(path);
  $("#vSave").onclick=async()=>{
    const send=async force=>post("/api/write",{path,text:ta.value,force});
    let r=await send(false);
    if(r.needs_force){const a=await ask({title:"Ta zmiana jest ryzykowna",body:`<b>${esc(r.error)}</b><br>Zapisać mimo to?`,confirm:"Zapisz",danger:true});if(!a)return;r=await send(true)}
    if(r.ok){toast("Zapisano plik");loadAudit();showFile(path)}else toast(r.error||r.msg||"Nie udało się zapisać","bad");
  };
}
function download(path){
  const a=document.createElement("a");a.href=`/api/download?path=${encodeURIComponent(path)}&token=${encodeURIComponent(TOKEN)}`;a.download="";document.body.append(a);a.click();a.remove();
}

/* ============ menedżer plików ============ */
const F={cwd:store.get("vpsc-path","/home/ubuntu"),items:[],sel:new Set(),view:store.get("vpsc-view","grid"),filter:"",hidden:false,sizes:{},mode:"dir",policy:"ok",loaded:false,total:null,trash:[],selectMode:false,sort:store.get("vpsc-fsort","name")};
const parentOf=p=>p==="/"?"/":(p.replace(/\/[^/]*$/,"")||"/");
const isTouch=()=>matchMedia("(pointer:coarse)").matches;
const PLACES=[["/","Cały dysk","hdd"],["/home/ubuntu","Dom","folder"],["/home/ubuntu/projekty","Projekty","folder"],["/home/ubuntu/studia","Studia","folder"],["/home/ubuntu/archiwa","Archiwa","folder"],["/opt","/opt (usługi)","box"],["/var/lib/docker","Docker","box"],["/var/log","Logi","log"],["/tmp","/tmp","folder"],["/etc","/etc","server"]];
const CAT={img:/^(png|jpe?g|gif|webp|svg|heic|bmp|ico|tiff?)$/i,arc:/^(zip|tar|gz|tgz|xz|bz2|7z|rar|zst|aes)$/i,code:/^(py|js|mjs|ts|tsx|jsx|json|yaml|yml|sh|zsh|sql|html|css|ps1|toml|ini|cfg|conf|env|ipynb|rb|go|rs|c|cpp|h|java|lock|xml)$/i,doc:/^(pdf|docx?|xlsx?|pptx?|md|txt|csv|rtf|odt|log)$/i};
const extOf=n=>{const m=n.match(/\.([A-Za-z0-9]{1,5})$/);return m&&n.length>m[0].length?m[1]:""};
const catOf=n=>{const e=extOf(n);if(!e)return"gen";for(const k in CAT)if(CAT[k].test(e))return k;return"gen"};
const selPaths=()=>[...F.sel].map(n=>joinP(F.cwd,n));
const itemOf=n=>F.items.find(i=>i.name===n);

$("#places").innerHTML=PLACES.map(([p,l,i])=>`<button class="place" data-p="${esc(p)}" type="button">${icon(i)}<span>${esc(l)}</span></button>`).join("");
$("#places").onclick=e=>{const b=e.target.closest("[data-p]");if(b){F.mode="dir";loadDir(b.dataset.p)}};

async function loadDir(path,keepMode){
  F.cwd=path;store.set("vpsc-path",path);F.sel.clear();F.sizes={};F.total=null;if(!keepMode)F.mode=F.mode==="trash"?"dir":F.mode;
  setText($("#fmNote"),"Ładowanie…");
  try{
    const r=await api("/api/ls?path="+encodeURIComponent(path));
    if(path!==F.cwd)return;
    if(r.error){setText($("#fmNote"),"Błąd: "+r.error);return}
    F.items=r.items;F.policy=r.policy;
    if(F.mode==="map")await loadSizes(true);
    renderFiles();
  }catch(e){setText($("#fmNote"),"Nie udało się odczytać folderu")}
}
async function loadSizes(silent){
  const path=F.cwd;if(!silent)setText($("#fmNote"),"Liczenie rozmiarów, może potrwać do minuty…");
  try{
    const r=await api("/api/du?path="+encodeURIComponent(path));
    if(path!==F.cwd)return;
    if(r.error){setText($("#fmNote"),"Błąd: "+r.error);return}
    F.sizes=r.sizes;F.total=r.total;
  }catch(e){setText($("#fmNote"),"Liczenie nie powiodło się")}
}
function visible(){
  const q=F.filter.toLowerCase(),has=Object.keys(F.sizes).length>0;
  const l=F.items.filter(i=>(F.hidden||!i.name.startsWith("."))&&(!q||i.name.toLowerCase().includes(q)));
  l.sort((a,b)=>{
    const da=a.type==="d",db=b.type==="d";if(da!==db)return da?-1:1;
    if(has&&da)return (F.sizes[b.name]||0)-(F.sizes[a.name]||0);
    if(F.sort==="added")return (b.ctime||"").localeCompare(a.ctime||"")||a.name.localeCompare(b.name,"pl",{numeric:true});
    return a.name.localeCompare(b.name,"pl",{numeric:true});
  });
  return l;
}
function sizeOf(i){return i.type==="d"?(F.sizes[i.name]!=null?F.sizes[i.name]:null):i.size}
function renderCrumbs(){
  const parts=F.cwd.split("/").filter(Boolean);let acc="";
  let h=`<button type="button" data-go-path="/">/</button>`;
  parts.forEach(p=>{acc+="/"+p;h+=`<span class="sep">›</span><button type="button" data-go-path="${esc(acc)}">${esc(p)}</button>`});
  setHTML($("#crumbs"),h);
}
$("#crumbs").onclick=e=>{const b=e.target.closest("[data-go-path]");if(b&&b.dataset.goPath!==F.cwd){F.mode=F.mode==="trash"?"dir":F.mode;loadDir(b.dataset.goPath)}};

function renderFiles(){
  navPush();
  renderCrumbs();
  $$("#places .place").forEach(b=>b.setAttribute("aria-current",b.dataset.p===F.cwd));
  $("#vGrid").setAttribute("aria-pressed",F.mode==="dir"&&F.view==="grid");$("#vList").setAttribute("aria-pressed",F.mode==="dir"&&F.view==="list");$("#vMap").setAttribute("aria-pressed",F.mode==="map");
  $("#bTrashView").classList.toggle("primary",F.mode==="trash");$("#bTrashView").classList.toggle("soft",F.mode!=="trash");
  const ro=F.policy==="block",n=F.sel.size,one=n===1?itemOf([...F.sel][0]):null;
  $("#bUpload").disabled=F.mode==="trash";$("#bMkdir").disabled=F.mode==="trash";
  $("#bUpload").dataset.ro=ro?"1":"0";$("#bMkdir").dataset.ro=ro?"1":"0";
  $("#bDown").disabled=!one;$("#bEdit").disabled=!(one&&one.type!=="d");$("#bRename").disabled=!(one&&!ro);$("#bTrash").disabled=!(n>0&&!ro);
  $("#fmActions").style.visibility=F.mode==="trash"?"hidden":"visible";
  $("#fmActions").dataset.sel=n>0?"1":"0";$("#bSelect").setAttribute("aria-pressed",F.selectMode);
  if(F.mode==="trash")return renderTrash();
  const vis=visible(),nd=F.items.filter(i=>i.type==="d").length;
  setText($("#fmNote"),`${nd} folderów, ${F.items.length-nd} plików${F.total!=null?` · razem ${fmt(F.total)}`:""}${ro?" · tutaj tylko do odczytu (poza strefą zmian)":""}${n?` · zaznaczono: ${n}`:""}`);
  if(F.mode==="map")return renderMap();
  const canUp=F.cwd!=="/"&&!F.filter;
  if(!vis.length&&!canUp){setHTML($("#fmBody"),`<div class="dropzone">${icon("up")}<strong>${F.items.length?"Nic nie pasuje do filtra":"Pusty folder"}</strong>${ro?"":"<span>Przeciągnij tu pliki, żeby je wysłać na serwer.</span>"}</div>`);return}
  const cb=F.selectMode?`<span class="cb" aria-hidden="true">${icon("check")}</span>`:"";
  if(F.view==="list"){
    const upRow=canUp?`<div class="fr up" role="button" tabindex="0" data-up="1"><div class="n">${icon("uparrow")}<span>Folder wyżej</span></div><span class="sz"></span><span class="a"></span><span class="m"></span><span class="o"></span></div>`:"";
    setHTML($("#fmBody"),`<div class="flist${F.selectMode?" sm":""}"><div class="fh"><button type="button" class="sortb" data-sort="name" aria-pressed="${F.sort!=="added"}">Nazwa</button><span>Rozmiar</span><button type="button" class="sortb" data-sort="added" aria-pressed="${F.sort==="added"}" title="Kiedy plik trafił na ten serwer. Kliknij, żeby posortować od najnowszych">Dodano ↓</button><span>Zmieniono</span><span>Właściciel</span></div>${upRow}${vis.map(i=>{
      const sz=sizeOf(i);
      return `<div class="fr" role="option" tabindex="0" aria-selected="${F.sel.has(i.name)}" data-name="${esc(i.name)}" data-t="${i.type}" data-cat="${catOf(i.name)}"><div class="n">${cb}${icon(i.type==="d"?"folder":"file")}<span>${esc(i.name)}</span></div><span class="sz">${sz==null?(i.type==="d"?"›":"–"):fmt(sz)}</span><span class="a muted">${esc(i.ctime||"")}</span><span class="m muted">${esc(i.mtime)}</span><span class="o muted">${esc(i.owner)}</span></div>`}).join("")}${vis.length?"":`<p class="empty" style="padding:1rem .625rem">${F.items.length?"Nic nie pasuje do filtra.":"Pusty folder. Przeciągnij tu pliki albo użyj „Wyślij pliki”."}</p>`}</div>`);
  }else{
    const upCell=canUp?`<div class="fi up" role="button" tabindex="0" data-up="1" title="Folder wyżej"><div class="g"><svg viewBox="0 0 24 24"><use href="#i-uparrow"/></svg></div><div class="nm">Wyżej</div><div class="sz"></div></div>`:"";
    setHTML($("#fmBody"),`<div class="fgrid${F.selectMode?" sm":""}">${upCell}${vis.map(i=>{
      const d=i.type==="d",sz=sizeOf(i),e=extOf(i.name);
      return `<div class="fi" role="option" tabindex="0" aria-selected="${F.sel.has(i.name)}" data-name="${esc(i.name)}" data-t="${i.type}" data-cat="${catOf(i.name)}" title="${esc(i.name)}">${cb}<div class="g"><svg viewBox="0 0 24 24"><use href="#i-${d?"folder":"file"}"/></svg>${!d&&e?`<b>${esc(e)}</b>`:""}</div><div class="nm">${esc(i.name)}</div><div class="sz">${sz==null?"":fmt(sz)}</div><div class="dt" title="Dodano na serwer">${esc((i.ctime||"").slice(0,16))}</div></div>`}).join("")}</div>`);
  }
}
function renderTrash(){
  setText($("#fmNote"),F.trash.length?`${F.trash.length} elementów w koszu`:"Kosz jest pusty");
  setHTML($("#fmBody"),`<div class="tools"><span class="muted small pretty">Usunięte pliki trafiają tutaj, zamiast zniknąć na zawsze. Stąd możesz je przywrócić.</span><span class="spacer"></span><button class="soft danger sm" id="bEmpty" type="button" ${F.trash.length?"":"disabled"}>${icon("trash")}Opróżnij kosz</button><button class="soft sm" id="bBack" type="button">Wróć do plików</button></div>`+
    (F.trash.length?F.trash.map(t=>`<div class="trashrow"><div class="n"><strong>${esc(t.origin.split("/").pop())}</strong><span>z ${esc(t.origin)} · ${fmt(t.size)} · ${when(new Date(t.ts*1000).toISOString())}</span></div><button class="soft sm" data-r="${esc(t.id)}" type="button">Przywróć</button></div>`).join(""):`<div class="dropzone">${icon("trash")}<strong>Kosz jest pusty</strong></div>`));
}
async function openTrash(){
  F.mode="trash";F.sel.clear();setText($("#fmNote"),"Ładowanie kosza…");
  try{const r=await api("/api/trash");F.trash=r.items||[]}catch(e){F.trash=[]}
  renderFiles();
}
$("#fmBody").addEventListener("click",async e=>{
  if(F.mode==="trash"){
    const r=e.target.closest("[data-r]");
    if(r){const res=await doAction({type:"restore",id:r.dataset.r},"Przywrócono");if(res)openTrash();return}
    if(e.target.closest("#bBack")){F.mode="dir";renderFiles();return}
    if(e.target.closest("#bEmpty")){
      const a=await ask({title:"Opróżnić kosz?",body:`Wszystkie <b>${F.trash.length}</b> elementów zostanie usuniętych <b>na zawsze</b>. Tego nie da się cofnąć.`,confirm:"Usuń na zawsze",danger:true,typed:"USUŃ"});
      if(!a)return;const res=await doAction({type:"empty_trash",confirm:"USUŃ"},"Kosz opróżniony");if(res)openTrash();
    }
    return;
  }
  const tm=e.target.closest("[data-tm]");
  if(tm){const i=itemOf(tm.dataset.tm);if(i&&i.type==="d"){loadDir(joinP(F.cwd,i.name),true)}else if(i){F.sel=new Set([i.name]);F.mode="dir";renderFiles()}return}
  if(e.target.closest("[data-up]")){F.filter="";$("#fq").value="";loadDir(parentOf(F.cwd));return}
  const el=e.target.closest("[data-name]");
  if(!el){if(F.sel.size&&!F.selectMode){F.sel.clear();renderFiles()}return}
  const nm=el.dataset.name;
  /* dotyk: jedno dotknięcie otwiera; do zaznaczania służy przycisk „Zaznacz” */
  if(F.selectMode){F.sel.has(nm)?F.sel.delete(nm):F.sel.add(nm);renderFiles();return}
  if(isTouch()){openItem(nm);return}
  if(e.metaKey||e.ctrlKey){F.sel.has(nm)?F.sel.delete(nm):F.sel.add(nm)}
  else if(e.shiftKey&&F.sel.size){const names=visible().map(i=>i.name),a=names.indexOf([...F.sel].pop()),b=names.indexOf(nm);names.slice(Math.min(a,b),Math.max(a,b)+1).forEach(x=>F.sel.add(x))}
  else F.sel=new Set([nm]);
  renderFiles();
});
/* Zaznaczanie prostokątem (myszka/rysik): przeciągnij po pustym miejscu w folderze.
   Ctrl/⌘/Shift dokłada do obecnego zaznaczenia. Dotyk zostaje przy przewijaniu i przycisku „Zaznacz”. */
(()=>{
  const body=$("#fmBody");let st=null,box=null,raf=0,suppress=false;
  const hits=()=>{
    const b=box.getBoundingClientRect(),out=[];
    body.querySelectorAll("[data-name]").forEach(el=>{const r=el.getBoundingClientRect();
      if(r.right>b.left&&r.left<b.right&&r.bottom>b.top&&r.top<b.bottom)out.push(el)});
    return out;
  };
  const paint=()=>{
    raf=0;if(!st||!st.on)return;
    const x1=Math.min(st.x,st.cx),y1=Math.min(st.y,st.cy),x2=Math.max(st.x,st.cx),y2=Math.max(st.y,st.cy);
    Object.assign(box.style,{left:x1+"px",top:y1+"px",width:x2-x1+"px",height:y2-y1+"px"});
    const hit=new Set(hits().map(el=>el.dataset.name));
    F.sel=new Set([...st.base,...hit]);
    body.querySelectorAll("[data-name]").forEach(el=>el.setAttribute("aria-selected",String(F.sel.has(el.dataset.name))));
    /* automatyczne przewijanie strony przy krawędzi okna */
    if(st.cy<50)scrollBy(0,-14);else if(st.cy>innerHeight-50)scrollBy(0,14);
    raf=requestAnimationFrame(paint);
  };
  const end=()=>{
    removeEventListener("pointermove",move);removeEventListener("pointerup",end);removeEventListener("pointercancel",end);
    cancelAnimationFrame(raf);raf=0;
    if(st&&st.on){suppress=true;setTimeout(()=>suppress=false,0);box.remove();document.documentElement.classList.remove("marqueeing");renderFiles()}
    st=null;box=null;
  };
  const move=e=>{
    if(!st)return;st.cx=e.clientX;st.cy=e.clientY;
    if(!st.on){
      if(Math.hypot(st.cx-st.x,st.cy-st.y)<5)return;
      st.on=true;box=document.createElement("div");box.className="marquee";document.body.append(box);
      document.documentElement.classList.add("marqueeing");getSelection()?.removeAllRanges();
    }
    if(!raf)raf=requestAnimationFrame(paint);
  };
  body.addEventListener("pointerdown",e=>{
    if(e.pointerType==="touch"||e.button!==0||F.mode!=="dir"||F.selectMode)return;
    if(!body.querySelector(".fgrid,.flist"))return;
    if(e.target.closest("[data-name],[data-up],.fh,button,a,input,label"))return; /* start tylko z pustego miejsca */
    st={x:e.clientX,y:e.clientY,cx:e.clientX,cy:e.clientY,on:false,base:(e.ctrlKey||e.metaKey||e.shiftKey)?new Set(F.sel):new Set()};
    e.preventDefault();
    addEventListener("pointermove",move);addEventListener("pointerup",end);addEventListener("pointercancel",end);
  });
  /* po przeciągnięciu przeglądarka wysyła „click” na pustym miejscu: nie pozwól mu wyczyścić zaznaczenia */
  body.addEventListener("click",e=>{if(suppress){e.stopImmediatePropagation();e.preventDefault()}},true);
})();
$("#fmBody").addEventListener("dblclick",e=>{const el=e.target.closest("[data-name]");if(el)openItem(el.dataset.name)});
$("#fmBody").addEventListener("keydown",e=>{
  if(e.key!=="Enter")return;
  if(e.target.closest("[data-up]")){loadDir(parentOf(F.cwd));return}
  const el=e.target.closest("[data-name]");if(el)openItem(el.dataset.name);
});
$("#bSelect").onclick=()=>{F.selectMode=!F.selectMode;if(!F.selectMode)F.sel.clear();renderFiles()};
function openItem(name){
  const i=itemOf(name);if(!i)return;
  if(i.type==="d"){F.filter="";$("#fq").value="";loadDir(joinP(F.cwd,name))}else showFile(joinP(F.cwd,name));
}
$("#fq").oninput=e=>{F.filter=e.target.value;renderFiles()};
$("#fHidden").onchange=e=>{F.hidden=e.target.checked;renderFiles()};
$("#vGrid").onclick=()=>{F.view="grid";F.mode="dir";store.set("vpsc-view","grid");renderFiles()};
$("#vList").onclick=()=>{F.view="list";F.mode="dir";store.set("vpsc-view","list");renderFiles()};
$("#vMap").onclick=async()=>{F.mode="map";await loadSizes();renderFiles()};
$("#bSizes").onclick=async()=>{const b=$("#bSizes");b.disabled=true;await loadSizes();b.disabled=false;if(F.mode==="trash")F.mode="dir";renderFiles()};
$("#bTrashView").onclick=()=>{F.mode==="trash"?(F.mode="dir",renderFiles()):openTrash()};
$("#bDown").onclick=()=>{if(F.sel.size===1)download(selPaths()[0])};
$("#bEdit").onclick=()=>{if(F.sel.size===1)showFile(selPaths()[0])};
$("#bMkdir").onclick=async()=>{
  if(F.policy==="block")return explainRO();
  const a=await ask({title:"Nowy folder",body:`Utworzę folder w <b>${esc(F.cwd)}</b>.`,input:true,placeholder:"nazwa folderu",confirm:"Utwórz"});
  if(!a||!a.value.trim())return;const r=await doAction({type:"mkdir",dir:F.cwd,name:a.value.trim()},"Folder utworzony");if(r)loadDir(F.cwd,true);
};
$("#bRename").onclick=async()=>{
  if(F.sel.size!==1)return;const old=[...F.sel][0];
  const a=await ask({title:"Zmień nazwę",body:`Obecna nazwa: <b>${esc(old)}</b>`,input:true,value:old,confirm:"Zmień"});
  if(!a||!a.value.trim()||a.value===old)return;const r=await doAction({type:"rename",path:joinP(F.cwd,old),new_name:a.value.trim()},"Zmieniono nazwę");if(r)loadDir(F.cwd,true);
};
async function trashSelected(){
  const names=[...F.sel];if(!names.length||F.policy==="block")return;
  const a=await ask({title:`Przenieść do kosza (${names.length})?`,body:`<ul>${names.slice(0,8).map(n=>`<li>${esc(n)}</li>`).join("")}${names.length>8?`<li>…i ${names.length-8} więcej</li>`:""}</ul><br>Nic nie zniknie na zawsze, możesz to przywrócić z kosza.`,confirm:"Do kosza",danger:true});
  if(!a)return;const r=await doAction({type:"trash",paths:names.map(n=>joinP(F.cwd,n))},"Przeniesiono do kosza");if(r)loadDir(F.cwd,true);
}
$("#bTrash").onclick=trashSelected;
document.addEventListener("keydown",e=>{
  if(page!=="files"||F.mode==="trash"||$("#dlg").open||$("#viewer").open||/^(INPUT|TEXTAREA)$/.test(e.target.tagName))return;
  if(e.key==="Delete"||e.key==="Backspace"){if(F.sel.size){e.preventDefault();trashSelected()}}
  else if(e.key==="F2"&&F.sel.size===1){e.preventDefault();$("#bRename").click()}
  else if(e.key==="Escape"){F.sel.clear();renderFiles()}
  else if((e.metaKey||e.ctrlKey)&&e.key==="a"){e.preventDefault();visible().forEach(i=>F.sel.add(i.name));renderFiles()}
});

/* mapa dysku (treemap) */
function renderMap(){
  const dirs=new Map(F.items.map(i=>[i.name,i.type]));
  let arr=Object.entries(F.sizes).filter(([n,s])=>s>0&&(F.hidden||!n.startsWith("."))).map(([name,size])=>({name,size,type:dirs.get(name)||"f"})).sort((a,b)=>b.size-a.size);
  if(!arr.length){setHTML($("#fmBody"),`<div class="dropzone">${icon("map")}<strong>Brak danych o rozmiarach</strong></div>`);return}
  const top=arr.slice(0,36),rest=arr.slice(36).reduce((a,b)=>a+b.size,0);if(rest)top.push({name:"(pozostałe)",size:rest,type:"x"});
  const out=[];
  (function lay(items,x,y,w,h){
    if(items.length===1){out.push({...items[0],x,y,w,h});return}
    const tot=items.reduce((a,b)=>a+b.size,0);let acc=0,i=0;
    while(i<items.length-1&&acc+items[i].size<tot/2)acc+=items[i++].size;if(i===0)i=1;
    const a=items.slice(0,i),b=items.slice(i),sa=a.reduce((p,c)=>p+c.size,0);
    if(w>=h){const wa=w*sa/tot;lay(a,x,y,wa,h);lay(b,x+wa,y,w-wa,h)}else{const ha=h*sa/tot;lay(a,x,y,w,ha);lay(b,x,y+ha,w,h-ha)}
  })(top,0,0,100,100);
  setHTML($("#fmBody"),`<div class="tm">${out.map((o,i)=>{
    const hue=(i*47+210)%360,big=o.w>9&&o.h>11;
    const bg=o.type==="x"?"var(--surface-3)":o.type==="d"?`oklch(58% .15 ${hue})`:`oklch(52% .09 ${hue})`;
    return `<button style="left:${o.x}%;top:${o.y}%;width:${o.w}%;height:${o.h}%;background:${bg}" ${o.type==="x"?"disabled":`data-tm="${esc(o.name)}"`} title="${esc(o.name)} · ${fmt(o.size)}">${big?`<b>${esc(o.name)}</b><span>${fmt(o.size)}</span>`:""}</button>`}).join("")}</div>
    <p class="small muted" style="margin-top:.625rem">Każdy prostokąt to plik lub folder, a jego pole odpowiada zajętemu miejscu. Kliknij folder, żeby wejść głębiej.</p>`);
}

/* menu kontekstowe */
const ctx=$("#ctx");
function hideCtx(){ctx.hidden=true}
$("#fmBody").addEventListener("contextmenu",e=>{
  if(F.mode!=="dir")return;
  const el=e.target.closest("[data-name]");
  if(!el)return;e.preventDefault();
  if(!F.sel.has(el.dataset.name)){F.sel=new Set([el.dataset.name]);renderFiles()}
  const one=F.sel.size===1,i=one?itemOf([...F.sel][0]):null,ro=F.policy==="block";
  ctx.innerHTML=(one?`<button data-a="open">${icon(i.type==="d"?"folder":"file")}Otwórz</button><button data-a="down">${icon("down")}${i.type==="d"?"Pobierz jako .tar.gz":"Pobierz"}</button>`:"")+
    (one&&i.type!=="d"?`<button data-a="edit">${icon("edit")}Edytuj</button>`:"")+
    (one&&!ro?`<button data-a="rename">Zmień nazwę</button>`:"")+(ro?"":`<hr><button class="danger" data-a="trash">${icon("trash")}Do kosza</button>`);
  ctx.hidden=false;
  const w=ctx.offsetWidth,h=ctx.offsetHeight;
  ctx.style.left=Math.min(e.clientX,innerWidth-w-8)+"px";ctx.style.top=Math.min(e.clientY,innerHeight-h-8)+"px";
});
ctx.onclick=e=>{
  const b=e.target.closest("[data-a]");if(!b)return;hideCtx();const a=b.dataset.a,nm=[...F.sel][0];
  if(a==="open")openItem(nm);else if(a==="down")download(joinP(F.cwd,nm));else if(a==="edit")showFile(joinP(F.cwd,nm));
  else if(a==="rename")$("#bRename").click();else if(a==="trash")trashSelected();
};
document.addEventListener("click",e=>{if(!e.target.closest("#ctx"))hideCtx()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")hideCtx()});
addEventListener("scroll",hideCtx,true);addEventListener("blur",hideCtx);

/* wysyłanie plików */
async function explainRO(){
  const a=await ask({title:"Tu nie można zmieniać plików",body:`Folder <b>${esc(F.cwd)}</b> jest poza strefą zmian. Wysyłać pliki i tworzyć foldery możesz w <b>/home/ubuntu</b>, <b>/opt</b>, <b>/srv</b>, <b>/tmp</b>, <b>/var/www</b> i <b>/root</b>. Przejść do swojego folderu?`,confirm:"Przejdź do /home/ubuntu"});
  if(a){F.mode="dir";loadDir("/home/ubuntu")}
}
$("#bUpload").onclick=()=>{if(F.policy==="block")return explainRO();$("#fileInput").click()};
$("#fileInput").onchange=e=>{uploadFiles([...e.target.files]);e.target.value=""};
let upBusy=false;const upQueue=[];
function uploadFiles(files){
  if(F.policy==="block"){toast("W tym miejscu nie można wysyłać plików.","bad");return}
  files.forEach(f=>upQueue.push({file:f,dir:F.cwd}));pump();
}
async function pump(){
  if(upBusy)return;upBusy=true;const box=$("#uploads");box.hidden=false;
  while(upQueue.length){
    const {file,dir}=upQueue.shift();
    const row=document.createElement("div");row.className="up";row.innerHTML=`<div class="t"><span>${esc(file.name)}</span><span class="muted">0%</span></div><div class="b"><i></i></div>`;
    box.append(row);
    await sendOne(file,dir,row,0,false);
  }
  upBusy=false;setTimeout(()=>{if(!upBusy){box.hidden=true;box.innerHTML=""}},3500);
  if(page==="files"&&F.mode==="dir")loadDir(F.cwd,true);
}
function sendOne(file,dir,row,ow,force){
  return new Promise(res=>{
    const x=new XMLHttpRequest();
    x.open("POST",`/api/upload?path=${encodeURIComponent(dir)}&name=${encodeURIComponent(file.name)}&overwrite=${ow}&force=${force?1:0}`);
    x.setRequestHeader("X-Token",TOKEN);
    x.upload.onprogress=e=>{if(e.lengthComputable){const p=e.loaded/e.total;row.querySelector("i").style.transform=`scaleX(${p})`;row.querySelector(".t span:last-child").textContent=Math.round(p*100)+"%"}};
    x.onload=async()=>{
      let r={};try{r=JSON.parse(x.responseText)}catch(e){}
      const mark=(k,t)=>{row.dataset.done=k;row.querySelector(".t span:last-child").textContent=t;row.querySelector("i").style.transform="scaleX(1)"};
      if(r.ok){mark(1,"gotowe");toast(`Wysłano ${file.name}`);loadAudit();return res()}
      if(r.exists){
        const a=await ask({title:"Taki plik już istnieje",body:`<b>${esc(file.name)}</b> jest już w folderze docelowym. Zastąpić go nowym?`,confirm:"Zastąp",danger:true});
        if(a){row.querySelector("i").style.transform="scaleX(0)";await sendOne(file,dir,row,1,force);return res()}
        mark(2,"pominięto");return res();
      }
      if(r.needs_force){
        const a=await ask({title:"Ta zmiana jest ryzykowna",body:`<b>${esc(r.error)}</b><br>Wysłać plik mimo to?`,confirm:"Wyślij",danger:true});
        if(a){row.querySelector("i").style.transform="scaleX(0)";await sendOne(file,dir,row,ow,true);return res()}
        mark(2,"anulowano");return res();
      }
      mark(2,"błąd");toast(r.error||"Nie udało się wysłać pliku","bad");loadAudit();res();
    };
    x.onerror=()=>{row.dataset.done=2;toast("Błąd połączenia podczas wysyłania","bad");res()};
    x.send(file);
  });
}
let dragDepth=0;
const hasFiles=e=>[...(e.dataTransfer?.types||[])].includes("Files");
addEventListener("dragenter",e=>{if(page!=="files"||!hasFiles(e))return;e.preventDefault();dragDepth++;if(F.policy!=="block"){setText($("#dropTo"),"do "+F.cwd);$("#dropveil").hidden=false}});
addEventListener("dragover",e=>{if(page==="files"&&hasFiles(e))e.preventDefault()});
addEventListener("dragleave",e=>{if(page!=="files")return;dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)$("#dropveil").hidden=true});
addEventListener("drop",e=>{
  if(page!=="files"||!hasFiles(e))return;e.preventDefault();dragDepth=0;$("#dropveil").hidden=true;
  const items=[...e.dataTransfer.items||[]],files=[];let skipped=0;
  items.forEach((it,i)=>{const en=it.webkitGetAsEntry&&it.webkitGetAsEntry();if(en&&en.isDirectory)skipped++;else{const f=e.dataTransfer.files[i];if(f)files.push(f)}});
  if(skipped)toast("Foldery wysyłaj jako archiwum (.zip), samych folderów nie przesyłam.","bad");
  if(files.length)uploadFiles(files);
});

/* ============ polling i start ============ */
async function tick(){
  try{renderLive(await api("/api/live"))}
  catch(e){$("#live").dataset.state="bad";setText($("#liveTxt"),"offline")}
}
async function boot(){
  const s=navParse();
  if(s.page==="files"){F.cwd=s.path;F.mode=s.mode==="trash"?"dir":s.mode}
  show(s.page,{replace:true});
  navCur="";navPush(true);
  tick();refreshDocker();refreshServices();loadAudit();loadPk();
  setInterval(tick,2000);setInterval(refreshDocker,5000);setInterval(refreshServices,8000);setInterval(()=>{if(page==="soft")loadPk()},15000);
}
/* „Wstecz/Dalej” przeglądarki, myszki (przycisk boczny) i gest swipe: przywróć dokładnie ten krok */
async function navApply(s){
  navBusy=true;
  try{
    if($("#viewer").open)$("#viewer").close();
    if($("#dlg").open)$("#dlg").close();
    if(s.page!==page)show(s.page,{nav:true});
    if(s.page==="files"){
      F.loaded=true;F.filter="";$("#fq").value="";
      if(s.mode==="trash")await openTrash();
      else{
        F.mode=s.mode==="map"?"map":"dir";
        if(s.path!==F.cwd||!F.items.length)await loadDir(s.path,true);
        else{if(F.mode==="map")await loadSizes();renderFiles()}
      }
    }
  }finally{navBusy=false;navCur=navHash(s)}
}
addEventListener("popstate",e=>navApply(e.state&&e.state.page?e.state:navParse()));
/* Podgląd pliku/logów też jest krokiem: „wstecz” go zamyka, a zamknięcie krzyżykiem/Esc cofa ten wpis */
(()=>{
  const v=$("#viewer"),open=v.showModal.bind(v),shut=v.close.bind(v);
  let popping=false;
  const popViewer=()=>{if(navBusy||popping||!(history.state&&history.state.viewer))return;popping=true;history.back()};
  v.showModal=()=>{open();if(!navBusy&&!(history.state&&history.state.viewer))try{history.pushState({...navState(),viewer:true},"",location.hash)}catch(e){}};
  v.close=(...a)=>{const was=v.open;shut(...a);if(was)popViewer()};   /* krzyżyk, klik w tło, kod panelu */
  v.addEventListener("close",popViewer);                               /* Esc (natywne zamknięcie) */
  addEventListener("popstate",()=>{popping=false});
})();
/* Okienka potwierdzeń/zmiany nazwy: „wstecz” je anuluje, zamknięcie przyciskiem cofa ten wpis */
(()=>{
  const d=$("#dlg"),open=d.showModal.bind(d),shut=d.close.bind(d);
  let popping=false;
  const pop=()=>{if(navBusy||popping||!(history.state&&history.state.dlg))return;popping=true;history.back()};
  d.showModal=()=>{open();if(!navBusy&&!(history.state&&(history.state.viewer||history.state.dlg)))try{history.pushState({...navState(),dlg:true},"",location.hash)}catch(e){}};
  d.close=(...a)=>{const was=d.open;shut(...a);if(was)pop()};
  d.addEventListener("close",pop);
  addEventListener("popstate",()=>{popping=false});
})();
boot();
