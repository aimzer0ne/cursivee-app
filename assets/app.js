/* ═══════════════════════════════════════════════════════════
   cursivee.app — page controller
   Wires the shared chrome (theme, toast) on every page, and the
   generator UI on any page that declares window.PAGE_CONFIG.
   ═══════════════════════════════════════════════════════════ */
(function(){
"use strict";

/* ── storage, guarded: private mode and sandboxes throw ──── */
function load(key,fallback){
  try{
    var v=localStorage.getItem(key);
    return v===null?fallback:JSON.parse(v);
  }catch(e){ return fallback; }
}
function save(key,value){
  try{ localStorage.setItem(key,JSON.stringify(value)); }catch(e){}
}

/* ── toast ──────────────────────────────────────────────── */
var toastEl=document.getElementById("toast");
var toastTimer;
/* An open modal puts everything else under it and makes it inert, so
   the toast and the copy helper move into the dialog while it is open. */
function host(){
  var d=document.querySelector("dialog[open]");
  return d||document.body;
}
function toast(msg){
  if(!toastEl) return;
  if(toastEl.parentNode!==host()) host().appendChild(toastEl);
  toastEl.textContent=msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){ toastEl.classList.remove("show"); },1900);
}

/* ── clipboard ──────────────────────────────────────────── */
function legacyCopy(text){
  var ta=document.createElement("textarea");
  ta.value=text;
  ta.setAttribute("readonly","");
  ta.style.cssText="position:fixed;top:0;left:0;opacity:0";
  var box=host();
  box.appendChild(ta);
  ta.select();
  var ok=false;
  try{ ok=document.execCommand("copy"); }catch(e){ ok=false; }
  box.removeChild(ta);
  return ok;
}
function copyText(text,label,onCopied){
  if(!text){ toast("Nothing to copy yet — write something first."); return; }
  var done=function(){ toast("Copied "+label); if(onCopied) onCopied(); };
  var failed=function(){
    if(legacyCopy(text)) done();
    else toast("Couldn’t reach the clipboard — select the text and copy manually.");
  };
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done,failed);
  }else failed();
}

/* ── theme, shared by every page ────────────────────────── */
(function theme(){
  var btn=document.getElementById("themeBtn");
  var stored=load("cf.theme",null);
  if(stored==="dark"||stored==="light") document.documentElement.setAttribute("data-theme",stored);
  function systemDark(){
    return !!(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  function isDark(){
    var t=document.documentElement.getAttribute("data-theme");
    return t?t==="dark":systemDark();
  }
  function sync(){
    if(!btn) return;
    btn.textContent=isDark()?"Light":"Dark";
    btn.setAttribute("aria-label","Switch to "+(isDark()?"light":"dark")+" theme");
  }
  if(btn) btn.addEventListener("click",function(){
    var next=isDark()?"light":"dark";
    document.documentElement.setAttribute("data-theme",next);
    save("cf.theme",next);
    sync();
  });
  sync();
})();

/* ── progressive web app ────────────────────────────────── */
(function pwa(){
  /* Service workers need a real origin — opening the files directly
     over file:// is not an error, it just means no offline support. */
  if("serviceWorker" in navigator && location.protocol.indexOf("http")===0){
    /* Resolved against this script, not the page, so posts under
       /blog/ register the same root worker as everything else. */
    var me=document.currentScript;
    var sw=me&&me.src?new URL("../sw.js",me.src).href:"/sw.js";
    window.addEventListener("load",function(){
      navigator.serviceWorker.register(sw).catch(function(){});
    });
  }

  /* Chromium fires this instead of showing its own install prompt, so
     the site has to offer the button itself. */
  var deferred=null;
  var head=document.querySelector(".site-head");
  var themeBtn=document.getElementById("themeBtn");
  if(!head||!themeBtn) return;

  var btn=document.createElement("button");
  btn.className="btn";
  btn.type="button";
  btn.textContent="Install";
  btn.hidden=true;
  head.insertBefore(btn,themeBtn);

  window.addEventListener("beforeinstallprompt",function(e){
    e.preventDefault();
    deferred=e;
    btn.hidden=false;
  });
  btn.addEventListener("click",function(){
    if(!deferred) return;
    deferred.prompt();
    deferred.userChoice.then(function(){
      deferred=null;
      btn.hidden=true;
    });
  });
  window.addEventListener("appinstalled",function(){
    deferred=null;
    btn.hidden=true;
    toast("Installed — cursivee.app is on your home screen.");
  });
})();

/* ── tap to copy: ready-made text in guides and articles ─────
   A tap copies the whole line. A drag or double-click that picks
   out part of it is left alone, so one letter can still be copied
   by hand. */
(function tapToCopy(){
  var COPYABLE=".glyphs,.copylist li,.prose td.g,.prose p.g";
  function flat(s){ return s.replace(/\s+/g," ").trim(); }
  document.addEventListener("click",function(e){
    var el=e.target.closest?e.target.closest(COPYABLE):null;
    if(!el||e.target.closest("a")) return;
    var text=(el.innerText||el.textContent).trim();
    var sel=window.getSelection?flat(String(window.getSelection())):"";
    if(sel&&sel!==flat(text)) return;
    copyText(text,"to clipboard");
  });
})();

/* ── copied state: the button itself says it worked ─────── */
function flasher(btn){
  var timer,label=btn.textContent;
  return function(){
    clearTimeout(timer);
    btn.classList.add("is-done");
    btn.textContent="Copied";
    timer=setTimeout(function(){
      btn.classList.remove("is-done");
      btn.textContent=label;
    },1400);
  };
}

/* ── generator ──────────────────────────────────────────── */
var cfg=window.PAGE_CONFIG;
var src=document.getElementById("src");
if(!cfg||!src||!window.CF) return;

/* With the box empty, every style shows the page's sample text
   instead, so the list is never blank. */
var SAMPLE=cfg.sample||"";
function current(){ return src.value||SAMPLE; }

var heroOut=document.getElementById("heroOut");
var heroCopy=document.getElementById("heroCopy");
var countEl=document.getElementById("count");
var filterEl=document.getElementById("filter");
var ornEl=document.getElementById("orn");
var sheetBody=document.getElementById("sheetBody");
var emptyEl=document.getElementById("empty");
var knobsEl=document.getElementById("knobs");

var styles=window.CF.byPage(cfg.page);
var heroStyle=styles[0];
var ornament=window.CF.ornaments[0];
var opts={intensity:1,zones:{up:true,mid:true,down:true}};
/* Recent: the last three fonts copied, decorated or not, shown in
   their own group above the rest. Stored as {name,left,right}. */
var RECENT_MAX=3;
var recentKey="cf.recent."+cfg.page;
var recent=load(recentKey,[]);
if(!Array.isArray(recent)) recent=[];
recent=recent.filter(function(r){ return r&&byName(r.name); }).slice(0,RECENT_MAX);
var rows=[];

function byName(name){
  for(var i=0;i<styles.length;i++) if(styles[i].name===name) return styles[i];
  return null;
}

function decorate(text){
  return text?ornament.pre+text+ornament.post:"";
}
function render(style,text){
  if(!text) return "";
  return decorate(style.run(text,opts));
}

/* ── rows ───────────────────────────────────────────────── */
function build(){
  sheetBody.textContent="";
  rows=[];

  var groups=[],index={};
  styles.forEach(function(style){
    if(!index[style.group]){ index[style.group]={name:style.group,items:[]}; groups.push(index[style.group]); }
    index[style.group].items.push(style);
  });

  groups.forEach(function(group){
    var sec=groupSection(group.name);
    group.items.forEach(function(style){ makeRow(sec,style,"",""); });
    sheetBody.appendChild(sec);
  });
  buildRecent();
}

function groupSection(title){
  var sec=document.createElement("section");
  sec.className="group";
  var h=document.createElement("h2");
  h.className="group-title";
  h.textContent=title;
  sec.appendChild(h);
  return sec;
}

/* One font: name and length, the text (tap to copy), ✦, Copy.
   left/right are a decoration frame, empty for a plain font. */
function makeRow(sec,style,left,right){
  var row=document.createElement("article");
  row.className="row";

  var head=document.createElement("div");
  head.className="row-head";
  var name=document.createElement("span");
  name.className="row-name";
  name.textContent=style.name+(left||right?" · decorated":"");
  head.appendChild(name);
  var len=lengthLabel();
  head.appendChild(len);

  var cp=left||right?null:window.CF.codePoint(style);
  if(cp){
    var code=document.createElement("span");
    code.className="row-cp";
    code.textContent=cp.code;
    code.setAttribute("aria-hidden","true");
    head.appendChild(code);
  }

  var out=document.createElement("div");
  out.className="row-out";
  out.setAttribute("role","button");
  out.setAttribute("tabindex","0");
  /* Tapping a font copies it, like Copy; ✦ opens its decorations. */
  var canDecorate=!!window.CF.decorations;
  out.title="Click to copy";
  out.setAttribute("aria-label","Copy "+style.name);

  var copy=document.createElement("button");
  copy.className="btn copy";
  copy.type="button";
  copy.textContent="Copy";

  var copied=flasher(copy);
  var inRecent=sec.classList.contains("recent");
  function doCopy(){
    copyText(out.textContent,style.name,function(){
      copied();
      remember(style,left,right,row,inRecent);
    });
  }
  out.addEventListener("click",doCopy);
  out.addEventListener("keydown",function(e){
    if(e.key==="Enter"||e.key===" "){ e.preventDefault(); doCopy(); }
  });
  copy.addEventListener("click",doCopy);

  row.appendChild(head);
  row.appendChild(out);
  if(canDecorate) row.appendChild(decoButton(style));
  row.appendChild(copy);
  sec.appendChild(row);
  var rec={style:style,left:left,right:right,el:row,out:out,len:len,section:sec};
  rows.push(rec);
  return rec;
}

/* ── recent ─────────────────────────────────────────────── */
function buildRecent(){
  var old=sheetBody.querySelector(".group.recent");
  if(old){
    rows=rows.filter(function(r){ return r.section!==old; });
    old.parentNode.removeChild(old);
  }
  if(!recent.length) return;
  var sec=groupSection("Recent");
  sec.classList.add("recent");
  var text=current();
  recent.forEach(function(r){
    var rec=makeRow(sec,byName(r.name),r.left||"",r.right||"");
    rec.out.textContent=framed(rec.style,rec.left,rec.right,text);
    setLength(rec.len,rec.out.textContent);
  });
  sheetBody.insertBefore(sec,sheetBody.firstChild);
}

/* Put a copied font at the top of Recent. A copy made from Recent
   itself only reorders storage, so nothing jumps under the pointer;
   any other copy redraws Recent while keeping `anchor` where it was
   on screen. */
function remember(style,left,right,anchor,fromRecent){
  left=left||""; right=right||"";
  recent=[{name:style.name,left:left,right:right}].concat(recent.filter(function(r){
    return !(r.name===style.name&&(r.left||"")===left&&(r.right||"")===right);
  })).slice(0,RECENT_MAX);
  save(recentKey,recent);
  if(fromRecent) return;
  var before=anchor&&anchor.isConnected?anchor.getBoundingClientRect().top:null;
  buildRecent();
  if(before!==null&&anchor.isConnected){
    var shift=anchor.getBoundingClientRect().top-before;
    if(shift) window.scrollBy(0,shift);
  }
}

/* Character count of a style's output, as apps with a limit count
   it (one per code point, so 𝓐 is one, not two UTF-16 units). */
function lengthLabel(){
  var el=document.createElement("span");
  el.className="row-len";
  return el;
}
function setLength(el,text){
  var n=Array.from(text).length;
  el.textContent=n?n+(n===1?" char":" chars"):"";
}

function update(){
  var text=current();
  var n=Array.from(text).length;
  if(countEl) countEl.textContent=n+(n===1?" character":" characters");
  if(heroOut) heroOut.textContent=render(heroStyle,text);
  rows.forEach(function(r){
    r.out.textContent=framed(r.style,r.left,r.right,text);
    setLength(r.len,r.out.textContent);
  });
  ideas.forEach(function(r){
    r.out.textContent=framed(r.style,r.left,r.right,text);
    setLength(r.len,r.out.textContent);
  });
  if(decoDialog&&decoDialog.open) drawDeco();
  applyFilter();
}

function applyFilter(){
  var q=filterEl?filterEl.value.trim().toLowerCase():"";
  var any=false,seen=[];
  rows.forEach(function(r){
    var hit=!q||r.style.name.toLowerCase().indexOf(q)>-1||r.style.group.toLowerCase().indexOf(q)>-1;
    r.el.hidden=!hit;
    if(hit){ any=true; if(seen.indexOf(r.section)<0) seen.push(r.section); }
  });
  Array.prototype.forEach.call(sheetBody.children,function(sec){
    sec.hidden=seen.indexOf(sec)<0;
  });
  if(emptyEl) emptyEl.hidden=any;
}

/* ── ornament bar ───────────────────────────────────────── */
if(ornEl){
  window.CF.ornaments.forEach(function(o){
    var b=document.createElement("button");
    b.className="pill";
    b.type="button";
    b.textContent=o.label;
    b.setAttribute("aria-pressed",o===ornament?"true":"false");
    b.setAttribute("aria-label","Ornament: "+o.id);
    b.addEventListener("click",function(){
      ornament=o;
      Array.prototype.forEach.call(ornEl.children,function(el){
        el.setAttribute("aria-pressed",el===b?"true":"false");
      });
      update();
    });
    ornEl.appendChild(b);
  });
}

/* ── preview size ───────────────────────────────────────── */
var SIZES=[
  {id:"s", name:"Small",       scale:0.8},
  {id:"m", name:"Medium",      scale:1},
  {id:"l", name:"Large",       scale:1.3},
  {id:"xl",name:"Extra large", scale:1.65}
];
function applySize(id){
  var s=SIZES.filter(function(x){ return x.id===id; })[0]||SIZES[1];
  document.documentElement.style.setProperty("--out-scale",String(s.scale));
  return s;
}
(function sizeControl(){
  var controls=document.querySelector(".controls");
  if(!controls) return;

  var saved=load("cf.size","m");
  if(!SIZES.some(function(s){ return s.id===saved; })) saved="m";
  applySize(saved);

  var bar=document.createElement("div");
  bar.className="sizebar";
  var label=document.createElement("span");
  label.className="label";
  label.textContent="Size";
  var pills=document.createElement("div");
  pills.className="pills";
  pills.setAttribute("role","group");
  pills.setAttribute("aria-label","Preview size");

  SIZES.forEach(function(s){
    var b=document.createElement("button");
    b.className="pill";
    b.type="button";
    b.textContent="A";
    b.dataset.size=s.id;
    b.setAttribute("aria-pressed",s.id===saved?"true":"false");
    b.setAttribute("aria-label",s.name+" preview text");
    b.title=s.name;
    b.addEventListener("click",function(){
      applySize(s.id);
      save("cf.size",s.id);
      Array.prototype.forEach.call(pills.children,function(el){
        el.setAttribute("aria-pressed",el===b?"true":"false");
      });
    });
    pills.appendChild(b);
  });

  bar.appendChild(label);
  bar.appendChild(pills);
  controls.appendChild(bar);
})();

/* ── glitch knobs ───────────────────────────────────────── */
if(knobsEl&&cfg.knobs){
  var knobIntensity=document.createElement("div");
  knobIntensity.className="knob";
  knobIntensity.innerHTML=
    '<label class="label" for="intensity">Intensity</label>'+
    '<input id="intensity" type="range" min="0" max="200" step="10" value="100">'+
    '<output for="intensity" id="intensityOut">100%</output>';
  knobsEl.appendChild(knobIntensity);

  var slider=knobIntensity.querySelector("#intensity");
  var readout=knobIntensity.querySelector("#intensityOut");
  slider.addEventListener("input",function(){
    opts.intensity=Number(slider.value)/100;
    readout.textContent=slider.value+"%";
    update();
  });

  var zoneWrap=document.createElement("div");
  zoneWrap.className="knob";
  var zoneLabel=document.createElement("span");
  zoneLabel.className="label";
  zoneLabel.textContent="Zones";
  var zoneBar=document.createElement("div");
  zoneBar.className="zones";
  [["up","above"],["mid","through"],["down","below"]].forEach(function(pair){
    var b=document.createElement("button");
    b.className="pill";
    b.type="button";
    b.textContent=pair[1];
    b.setAttribute("aria-pressed","true");
    b.addEventListener("click",function(){
      var on=b.getAttribute("aria-pressed")!=="true";
      opts.zones[pair[0]]=on;
      /* never let all three switch off — the output would just be plain text */
      if(!opts.zones.up&&!opts.zones.mid&&!opts.zones.down){
        opts.zones[pair[0]]=true;
        toast("Keep at least one zone on, or there is nothing to glitch.");
        return;
      }
      b.setAttribute("aria-pressed",on?"true":"false");
      update();
    });
    zoneBar.appendChild(b);
  });
  zoneWrap.appendChild(zoneLabel);
  zoneWrap.appendChild(zoneBar);
  knobsEl.appendChild(zoneWrap);

  var shuffle=document.createElement("button");
  shuffle.className="btn";
  shuffle.type="button";
  shuffle.textContent="Re-scramble";
  shuffle.addEventListener("click",function(){
    window.CF.reseed();
    update();
    toast("Re-scrambled");
  });
  knobsEl.appendChild(shuffle);
}

/* ── decorations ────────────────────────────────────────
   Tapping a font (or ✦ on any row) opens a picker of symbol frames for that style,
   grouped in themed packs. The picker loads another page of
   recombined frames whenever its end scrolls into view, so it
   never runs out. Below the styles, "Decorated ideas" pairs a
   random pack frame with a random style; it loads more as you
   scroll, and Load more keeps going for as long as anyone presses it. */
var ideas=[];
var decoDialog=null;
var deco={style:null,pack:load("cf.pack","trending"),items:[],seen:{},seed:0};
var DECO_PAGE=16, IDEAS_PAGE=24, IDEAS_AUTO=4;

function framed(style,left,right,text){
  return text?left+style.run(text,opts)+right:"";
}
function charCount(s){ return Array.from(s).length; }

function decoButton(style){
  var b=document.createElement("button");
  b.className="btn deco-btn";
  b.type="button";
  b.textContent="✦";
  b.title="Decorate";
  b.setAttribute("aria-label","Decorate "+style.name);
  b.addEventListener("click",function(){ openDeco(style); });
  return b;
}

function buildDecoDialog(){
  if(decoDialog) return decoDialog;
  var d=document.createElement("dialog");
  d.className="deco";
  d.setAttribute("aria-labelledby","decoTitle");
  d.innerHTML=
    '<div class="deco-panel">'+
      '<header class="deco-head">'+
        '<div class="deco-heading"><h2 id="decoTitle">Decorate</h2><p class="deco-sub" id="decoSub"></p></div>'+
        '<button class="btn deco-close" type="button" aria-label="Close">✕</button>'+
      '</header>'+
      '<div class="pillbar deco-packs" role="group" aria-label="Decoration theme"></div>'+
      '<div class="deco-list" id="decoList"></div>'+
    '</div>';
  document.body.appendChild(d);

  var packs=d.querySelector(".deco-packs");
  if(!window.CF.packs.some(function(p){ return p.id===deco.pack; })) deco.pack=window.CF.packs[0].id;
  window.CF.packs.forEach(function(p){
    var b=document.createElement("button");
    b.className="pill";
    b.type="button";
    b.textContent=p.icon+" "+p.name;
    b.dataset.pack=p.id;
    b.setAttribute("aria-pressed",p.id===deco.pack?"true":"false");
    b.addEventListener("click",function(){
      deco.pack=p.id;
      save("cf.pack",p.id);
      Array.prototype.forEach.call(packs.children,function(el){
        el.setAttribute("aria-pressed",el===b?"true":"false");
      });
      resetDeco();
    });
    packs.appendChild(b);
  });

  d.querySelector(".deco-close").addEventListener("click",function(){ d.close(); });
  /* A click on the backdrop closes it; a drag that started inside does not. */
  var downOnBackdrop=false;
  d.addEventListener("pointerdown",function(e){ downOnBackdrop=e.target===d; });
  d.addEventListener("click",function(e){ if(downOnBackdrop&&e.target===d) d.close(); });
  d.addEventListener("close",function(){
    if(toastEl&&toastEl.parentNode!==document.body) document.body.appendChild(toastEl);
  });

  var list=d.querySelector(".deco-list");
  list.addEventListener("click",function(e){
    var item=e.target.closest(".deco-item");
    if(!item) return;
    var text=item.querySelector(".deco-text").textContent;
    var rec=deco.items.filter(function(r){ return r.el===item; })[0];
    copyText(text,"decorated "+deco.style.name,function(){
      if(rec) remember(deco.style,rec.left,rec.right,deco.opener,false);
      item.classList.add("is-done");
      setTimeout(function(){ item.classList.remove("is-done"); },1400);
    });
  });

  /* Endless: load the next page when the bottom of the list shows. */
  deco.sentinel=document.createElement("div");
  deco.sentinel.className="deco-sentinel";
  deco.sentinel.setAttribute("aria-hidden","true");
  if("IntersectionObserver" in window){
    new IntersectionObserver(function(entries){
      if(entries[0].isIntersecting&&d.open) moreDeco();
    },{root:list,rootMargin:"0px 0px 240px 0px"}).observe(deco.sentinel);
  }else{
    list.addEventListener("scroll",function(){
      if(list.scrollTop+list.clientHeight>list.scrollHeight-240) moreDeco();
    });
  }

  decoDialog=d;
  return d;
}

function resetDeco(){
  var list=document.getElementById("decoList");
  deco.items=[]; deco.seen={}; deco.seed=0;
  list.textContent="";
  list.appendChild(deco.sentinel);
  list.scrollTop=0;
  addDecoItems([{left:"",right:""}]);
  moreDeco();
  moreDeco();
}

/* Seed 0 is the pack's curated page; every later page is a fresh
   random recombination, skipping frames already on screen. */
function moreDeco(){
  var batch=window.CF.decorations(deco.pack,deco.seed,DECO_PAGE);
  deco.seed=window.CF.randomSeed();
  addDecoItems(batch);
}
function addDecoItems(batch){
  var list=document.getElementById("decoList");
  var text=current();
  batch.forEach(function(f){
    var key=f.left+"\u0000"+f.right;
    if(deco.seen[key]) return;
    deco.seen[key]=1;
    var item=document.createElement("button");
    item.className="deco-item";
    item.type="button";
    item.innerHTML='<span class="deco-text"></span><span class="deco-len"></span>';
    var rec={el:item,left:f.left,right:f.right,
      out:item.querySelector(".deco-text"),len:item.querySelector(".deco-len")};
    drawDecoItem(rec,text);
    deco.items.push(rec);
    list.insertBefore(item,deco.sentinel);
  });
}
function drawDecoItem(rec,text){
  var out=framed(deco.style,rec.left,rec.right,text);
  rec.out.textContent=out||"—";
  rec.len.textContent=out?charCount(out)+" chars":"";
  rec.el.setAttribute("aria-label","Copy "+(out||"decoration"));
}
function drawDeco(){
  var text=current();
  document.getElementById("decoSub").textContent=text?deco.style.run(text,opts):deco.style.name;
  deco.items.forEach(function(rec){ drawDecoItem(rec,text); });
}

function openDeco(style){
  var d=buildDecoDialog();
  deco.style=style;
  deco.opener=document.activeElement&&document.activeElement.closest?document.activeElement.closest(".row"):null;
  resetDeco();
  drawDeco();
  if(!d.open) d.showModal();
  var on=d.querySelector('.deco-packs [aria-pressed="true"]');
  if(on&&on.scrollIntoView) on.scrollIntoView({block:"nearest",inline:"nearest"});
}

/* ── decorated ideas: endless ───────────────────────────── */
function buildIdeas(){
  if(!window.CF.randomDecoration) return;
  /* Last thing in <main>, after the font list and anything under it. */
  var main=sheetBody.parentNode;
  var sec=document.createElement("section");
  sec.className="ideas";
  sec.setAttribute("aria-labelledby","ideasTitle");
  sec.innerHTML=
    '<h2 class="ideas-title" id="ideasTitle">Decorated ideas</h2>'+
    '<div class="ideas-list"></div>'+
    '<div class="ideas-sentinel" aria-hidden="true"></div>'+
    '<button class="btn load-more" type="button">Load more</button>';
  main.appendChild(sec);
  var list=sec.querySelector(".ideas-list");
  var more=sec.querySelector(".load-more");
  var seen={};

  function add(n){
    var text=current(),added=0,tries=0;
    while(added<n&&tries<n*20){
      tries++;
      var style=styles[Math.floor(Math.random()*styles.length)];
      var d=window.CF.randomDecoration();
      var key=style.name+"\u0000"+d.left+"\u0000"+d.right;
      if(seen[key]) continue;
      seen[key]=1;
      added++;

      var row=document.createElement("article");
      row.className="row";
      var head=document.createElement("div");
      head.className="row-head";
      var name=document.createElement("span");
      name.className="row-name";
      name.textContent=d.pack.name+" · "+style.name;
      head.appendChild(name);
      var len=lengthLabel();
      head.appendChild(len);

      var out=document.createElement("div");
      out.className="row-out";
      out.setAttribute("role","button");
      out.setAttribute("tabindex","0");
      out.title="Click to copy";
      out.textContent=framed(style,d.left,d.right,text);

      var copy=document.createElement("button");
      copy.className="btn copy";
      copy.type="button";
      copy.textContent="Copy";
      (function(out,label,copied,style,left,right,row){
        function doCopy(){
          copyText(out.textContent,label,function(){
            copied();
            remember(style,left,right,row,false);
          });
        }
        out.addEventListener("click",doCopy);
        out.addEventListener("keydown",function(e){
          if(e.key==="Enter"||e.key===" "){ e.preventDefault(); doCopy(); }
        });
        copy.addEventListener("click",doCopy);
      })(out,name.textContent,flasher(copy),style,d.left,d.right,row);

      row.appendChild(head);
      row.appendChild(out);
      row.appendChild(decoButton(style));
      row.appendChild(copy);
      list.appendChild(row);
      ideas.push({style:style,left:d.left,right:d.right,out:out,len:len});
      setLength(len,out.textContent);
    }
    return added;
  }

  /* Infinite scroll: reaching the end loads the next page by itself,
     IDEAS_AUTO pages at a time. Past that, Load more takes over (and
     re-arms the auto-loading), so the FAQ and footer below are never
     pushed out of reach for good. */
  var auto=0;
  if("IntersectionObserver" in window){
    new IntersectionObserver(function(entries){
      if(entries[0].isIntersecting&&auto<IDEAS_AUTO){ auto++; add(IDEAS_PAGE); }
    },{rootMargin:"0px 0px 600px 0px"}).observe(sec.querySelector(".ideas-sentinel"));
  }
  more.addEventListener("click",function(){
    var first=list.children.length;
    add(IDEAS_PAGE);
    auto=0;
    /* Keep the reader's place: focus the first new row's text. */
    var next=list.children[first];
    if(next) next.querySelector(".row-out").focus({preventScroll:true});
  });
  add(IDEAS_PAGE);
}

/* ── wire up ────────────────────────────────────────────── */
src.addEventListener("input",update);
if(filterEl) filterEl.addEventListener("input",applyFilter);
if(heroCopy){
  /* The visible label is just "Copy" — say what it copies for screen readers. */
  heroCopy.setAttribute("aria-label","Copy the "+heroStyle.name+" version");
  var heroCopied=flasher(heroCopy);
  heroCopy.addEventListener("click",function(){
    copyText(heroOut.textContent,heroStyle.name,heroCopied);
  });
}

build();
buildIdeas();
update();

})();
