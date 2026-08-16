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
function toast(msg){
  if(!toastEl) return;
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
  document.body.appendChild(ta);
  ta.select();
  var ok=false;
  try{ ok=document.execCommand("copy"); }catch(e){ ok=false; }
  document.body.removeChild(ta);
  return ok;
}
function copyText(text,label){
  if(!text){ toast("Nothing to copy yet — write something first."); return; }
  var done=function(){ toast("Copied "+label); };
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
  function repaint(){
    /* The palette is generated, so the theme swap has to re-derive it. */
    if(window.CFPalette) window.CFPalette.apply();
  }
  if(btn) btn.addEventListener("click",function(){
    var next=isDark()?"light":"dark";
    document.documentElement.setAttribute("data-theme",next);
    save("cf.theme",next);
    repaint();
    sync();
  });
  sync();

  /* Re-roll the hue without a reload. */
  if(btn&&window.CFPalette){
    var shuffle=document.createElement("button");
    shuffle.className="btn";
    shuffle.type="button";
    shuffle.textContent="Shuffle";
    shuffle.title="New colour scheme";
    shuffle.setAttribute("aria-label","Shuffle the colour scheme");
    btn.parentNode.insertBefore(shuffle,btn);
    shuffle.addEventListener("click",function(){
      var h=window.CFPalette.roll();
      toast("New colour scheme — hue "+h+"°");
    });
  }
})();

/* ── progressive web app ────────────────────────────────── */
(function pwa(){
  /* Service workers need a real origin — opening the files directly
     over file:// is not an error, it just means no offline support. */
  if("serviceWorker" in navigator && location.protocol.indexOf("http")===0){
    window.addEventListener("load",function(){
      navigator.serviceWorker.register("sw.js").catch(function(){});
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

/* ── generator ──────────────────────────────────────────── */
var cfg=window.PAGE_CONFIG;
var src=document.getElementById("src");
if(!cfg||!src||!window.CF) return;

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
var favKey="cf.fav."+cfg.page;
var favorites=load(favKey,[]);
if(!Array.isArray(favorites)) favorites=[];
var rows=[];

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
    var key=favorites.indexOf(style.name)>-1?"Pinned":style.group;
    if(!index[key]){ index[key]={name:key,items:[]}; groups.push(index[key]); }
    index[key].items.push(style);
  });
  groups.sort(function(a,b){
    return (a.name==="Pinned"?0:1)-(b.name==="Pinned"?0:1);
  });

  groups.forEach(function(group){
    var sec=document.createElement("section");
    sec.className="group";

    var h=document.createElement("h2");
    h.className="group-title";
    h.textContent=group.name;
    sec.appendChild(h);

    group.items.forEach(function(style){
      var row=document.createElement("article");
      row.className="row";

      var head=document.createElement("div");
      head.className="row-head";

      var pinned=favorites.indexOf(style.name)>-1;
      var star=document.createElement("button");
      star.className="star";
      star.type="button";
      star.textContent="★";
      star.setAttribute("aria-pressed",pinned?"true":"false");
      star.setAttribute("aria-label",(pinned?"Unpin ":"Pin ")+style.name);
      star.addEventListener("click",function(){
        var i=favorites.indexOf(style.name);
        if(i>-1) favorites.splice(i,1); else favorites.push(style.name);
        save(favKey,favorites);
        build();
        update();
      });

      var name=document.createElement("span");
      name.className="row-name";
      name.textContent=style.name;

      head.appendChild(star);
      head.appendChild(name);

      var out=document.createElement("div");
      out.className="row-out";
      out.setAttribute("role","button");
      out.setAttribute("tabindex","0");
      out.title="Click to copy";

      var copy=document.createElement("button");
      copy.className="btn copy";
      copy.type="button";
      copy.textContent="Copy";

      function doCopy(){ copyText(out.textContent,style.name); }
      out.addEventListener("click",doCopy);
      out.addEventListener("keydown",function(e){
        if(e.key==="Enter"||e.key===" "){ e.preventDefault(); doCopy(); }
      });
      copy.addEventListener("click",doCopy);

      row.appendChild(head);
      row.appendChild(out);
      row.appendChild(copy);
      sec.appendChild(row);
      rows.push({style:style,el:row,out:out,section:sec});
    });

    sheetBody.appendChild(sec);
  });
}

function update(){
  var text=src.value;
  var n=Array.from(text).length;
  if(countEl) countEl.textContent=n+(n===1?" character":" characters");
  if(heroOut) heroOut.textContent=render(heroStyle,text);
  rows.forEach(function(r){ r.out.textContent=render(r.style,text); });
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

/* ── wire up ────────────────────────────────────────────── */
src.addEventListener("input",update);
if(filterEl) filterEl.addEventListener("input",applyFilter);
if(heroCopy){
  /* The visible label is just "Copy" — say what it copies for screen readers. */
  heroCopy.setAttribute("aria-label","Copy the "+heroStyle.name+" version");
  heroCopy.addEventListener("click",function(){
    copyText(heroOut.textContent,heroStyle.name);
  });
}

build();
update();

})();
