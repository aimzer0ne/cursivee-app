/* ═══════════════════════════════════════════════════════════
   cursivee.app — palette

   Rolls a fresh colour scheme on every load. Hue is random;
   everything else is not. Lightness and chroma are fixed per
   token so contrast holds at any hue, and the neutrals carry a
   slight bias toward the accent so the page reads as one set
   rather than grey with a colour dropped on top.

   Loaded in <head>, before the stylesheet's tokens are used, so
   the page paints once in its real colours.
   ═══════════════════════════════════════════════════════════ */
(function(global){
"use strict";

/* ── OKLCH → sRGB ───────────────────────────────────────── */
function oklchToRgb(L,C,H){
  var h=H*Math.PI/180, a=C*Math.cos(h), b=C*Math.sin(h);
  var l_=L+0.3963377774*a+0.2158037573*b;
  var m_=L-0.1055613458*a-0.0638541728*b;
  var s_=L-0.0894841775*a-1.2914855480*b;
  var l=l_*l_*l_, m=m_*m_*m_, s=s_*s_*s_;
  return [
    4.0767416621*l-3.3077115913*m+0.2309699292*s,
   -1.2684380046*l+2.6097574011*m-0.3413193965*s,
   -0.0041960863*l-0.7034186147*m+1.7076147010*s
  ];
}
function gamma(c){
  return c<=0.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-0.055;
}
function inGamut(rgb){
  return rgb.every(function(c){ return c>=-0.0001&&c<=1.0001; });
}
/* Desaturate until the colour actually exists in sRGB, rather than
   letting a clamp shift the hue. */
function hex(L,C,H){
  var rgb=oklchToRgb(L,C,H),guard=0;
  while(!inGamut(rgb)&&C>0&&guard++<60){
    C-=0.002;
    rgb=oklchToRgb(L,C,H);
  }
  return "#"+rgb.map(function(c){
    var v=Math.round(Math.min(1,Math.max(0,gamma(c)))*255);
    return (v<16?"0":"")+v.toString(16);
  }).join("");
}

/* ── token recipe ───────────────────────────────────────── */
/* [lightness, chroma, hue offset from the accent] */
var LIGHT={
  paper:      [0.940,0.011,0],
  sheet:      [0.988,0.005,0],
  ink:        [0.220,0.042,0],
  "ink-soft": [0.442,0.034,0],
  "ink-faint":[0.512,0.030,0],
  rule:       [0.845,0.038,0],
  "rule-soft":[0.912,0.024,0],
  accent:     [0.470,0.135,0],
  "accent-soft":[0.940,0.038,0],
  margin:     [0.505,0.150,165]
};
var DARK={
  paper:      [0.168,0.017,0],
  sheet:      [0.222,0.021,0],
  ink:        [0.930,0.014,0],
  "ink-soft": [0.760,0.020,0],
  "ink-faint":[0.622,0.022,0],
  rule:       [0.352,0.030,0],
  "rule-soft":[0.282,0.024,0],
  accent:     [0.780,0.115,0],
  "accent-soft":[0.272,0.040,0],
  margin:     [0.760,0.120,165]
};

function build(hue,spec){
  var out={};
  Object.keys(spec).forEach(function(name){
    var s=spec[name];
    out[name]=hex(s[0],s[1],(hue+s[2])%360);
  });
  return out;
}

/* ── state ──────────────────────────────────────────────── */
var hue=Math.floor(Math.random()*360);
var schemes={light:build(hue,LIGHT),dark:build(hue,DARK)};

function systemDark(){
  return !!(global.matchMedia&&global.matchMedia("(prefers-color-scheme: dark)").matches);
}
function stored(){
  try{ return JSON.parse(localStorage.getItem("cf.theme")); }catch(e){ return null; }
}
function isDark(){
  var t=document.documentElement.getAttribute("data-theme")||stored();
  return t==="dark"||t==="light"?t==="dark":systemDark();
}

function apply(){
  if(typeof document==="undefined") return;   /* colour math is usable headless */
  var set=schemes[isDark()?"dark":"light"];
  var root=document.documentElement;
  Object.keys(set).forEach(function(name){
    root.style.setProperty("--"+name,set[name]);
  });
  /* The shadow is tuned per mode, not per hue. */
  root.style.setProperty("--shadow",isDark()
    ? "0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.7)"
    : "0 1px 2px rgba(0,0,0,.05), 0 8px 24px -12px rgba(0,0,0,.18)");
  /* Keep the installed-app title bar in step with the page. */
  var metas=document.querySelectorAll('meta[name="theme-color"]');
  for(var i=0;i<metas.length;i++){
    var m=metas[i].getAttribute("media")||"";
    metas[i].setAttribute("content",
      m.indexOf("dark")>-1?schemes.dark.paper:schemes.light.paper);
  }
}

function roll(){
  hue=Math.floor(Math.random()*360);
  schemes={light:build(hue,LIGHT),dark:build(hue,DARK)};
  apply();
  return hue;
}

apply();
if(global.matchMedia){
  var mq=global.matchMedia("(prefers-color-scheme: dark)");
  var onChange=function(){ apply(); };
  if(mq.addEventListener) mq.addEventListener("change",onChange);
  else if(mq.addListener) mq.addListener(onChange);
}

global.CFPalette={
  apply:apply,
  roll:roll,
  hue:function(){ return hue; },
  schemes:function(){ return schemes; },
  /* exposed for the contrast tests */
  build:build,
  hex:hex,
  LIGHT:LIGHT,
  DARK:DARK
};

})(typeof window!=="undefined"?window:globalThis);
