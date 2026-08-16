/* ═══════════════════════════════════════════════════════════
   cursivee.app — transform engine
   Pure text transforms, no DOM. Exposes window.CF.
   ═══════════════════════════════════════════════════════════ */
(function(global){
"use strict";

var UP="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var LO="abcdefghijklmnopqrstuvwxyz";
var DI="0123456789";

/* ── map construction ───────────────────────────────────── */
function seq(start,n){
  var s="";
  for(var i=0;i<n;i++) s+=String.fromCodePoint(start+i);
  return s;
}
function fill(map,src,spec){
  if(spec==null) return;
  var out=Array.from(typeof spec==="number"?seq(spec,src.length):spec);
  Array.from(src).forEach(function(ch,i){
    if(out[i]&&out[i]!=="·") map.set(ch,out[i]);   /* · = "no such glyph, leave alone" */
  });
}
function alphabet(def){
  var map=new Map();
  fill(map,UP,def.u);
  fill(map,LO,def.l);
  fill(map,DI,def.d);
  if(def.ex) Object.keys(def.ex).forEach(function(k){ map.set(k,def.ex[k]); });
  return map;
}
function mapper(def){
  var map=alphabet(def);
  return function(text){
    return Array.from(text).map(function(c){ return map.get(c)||c; }).join("");
  };
}
function combiner(mark){
  return function(text){
    return Array.from(text).map(function(c){
      return (c===" "||c==="\n")?c:c+mark;
    }).join("");
  };
}
function flipper(def){
  var map=alphabet(def);
  if(def.punct) Object.keys(def.punct).forEach(function(k){ map.set(k,def.punct[k]); });
  return function(text){
    var chars=Array.from(text),out=[],i;
    for(i=chars.length-1;i>=0;i--) out.push(map.get(chars[i])||chars[i]);
    return out.join("");
  };
}

/* ── seeded randomness (so glitch output is stable per keystroke) ── */
var seed=0x9E3779B9;
function reseed(){ seed=(Math.random()*0xFFFFFFFF)>>>0; }
function rngFor(salt){
  var a=(seed^(salt*0x85EBCA6B))>>>0;
  return function(){
    a=(a+0x6D2B79F5)>>>0;
    var t=a;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

/* ── zalgo ──────────────────────────────────────────────── */
function marks(ranges){
  var out=[];
  ranges.forEach(function(r){
    for(var c=r[0];c<=(r[1]===undefined?r[0]:r[1]);c++) out.push(String.fromCharCode(c));
  });
  return out;
}
var ZALGO={
  up:marks([[0x0300,0x0314],[0x033D,0x0344],[0x0346],[0x034A,0x034C],[0x0350,0x0352],[0x0357],[0x035B],[0x0363,0x036F]]),
  mid:marks([[0x0315],[0x031B],[0x0334,0x0338],[0x035C,0x0362]]),
  down:marks([[0x0316,0x031A],[0x031C,0x0333],[0x0339,0x033C],[0x0345],[0x0347,0x0349],[0x034D,0x034E],[0x0353,0x0356],[0x0359,0x035A]])
};
function zalgo(cfg){
  return function(text,opts){
    opts=opts||{};
    var scale=typeof opts.intensity==="number"?opts.intensity:1;
    var zones=opts.zones||{up:true,mid:true,down:true};
    var chars=Array.from(text),out=[];
    chars.forEach(function(ch,i){
      out.push(ch);
      if(ch===" "||ch==="\n") return;
      var rand=rngFor(i+1+cfg.salt*7919);
      [["up",cfg.up],["mid",cfg.mid],["down",cfg.down]].forEach(function(pair){
        var zone=pair[0],base=pair[1];
        if(!zones[zone]) return;
        var count=Math.round(base*scale);
        for(var k=0;k<count;k++){
          var pool=ZALGO[zone];
          out.push(pool[Math.floor(rand()*pool.length)]);
        }
      });
    });
    return out.join("");
  };
}

/* ── codes ──────────────────────────────────────────────── */
var MORSE={
  a:".-",b:"-...",c:"-.-.",d:"-..",e:".",f:"..-.",g:"--.",h:"....",i:"..",j:".---",
  k:"-.-",l:".-..",m:"--",n:"-.",o:"---",p:".--.",q:"--.-",r:".-.",s:"...",t:"-",
  u:"..-",v:"...-",w:".--",x:"-..-",y:"-.--",z:"--..",
  "0":"-----","1":".----","2":"..---","3":"...--","4":"....-",
  "5":".....","6":"-....","7":"--...","8":"---..","9":"----.",
  ".":".-.-.-",",":"--..--","?":"..--..","!":"-.-.--","'":".----.",
  "/":"-..-.","(":"-.--.",")":"-.--.-","&":".-...",":":"---...",
  "=":"-...-","+":".-.-.","-":"-....-",'"':".-..-.","@":".--.-."
};
function toMorse(text){
  return text.split(/\s+/).filter(Boolean).map(function(word){
    return Array.from(word).map(function(c){
      return MORSE[c.toLowerCase()]||"";
    }).filter(Boolean).join(" ");
  }).join(" / ");
}
function toBinary(text){
  return Array.from(text).map(function(c){
    var cp=c.codePointAt(0);
    if(cp>0xFF) return c;
    return cp.toString(2).padStart(8,"0");
  }).join(" ");
}

/* ── misc transforms ────────────────────────────────────── */
function alternating(text){
  var n=0;
  return Array.from(text).map(function(c){
    if(!/[a-z]/i.test(c)) return c;
    n++;
    return n%2?c.toLowerCase():c.toUpperCase();
  }).join("");
}
function reversed(text){ return Array.from(text).reverse().join(""); }
function spaced(text){ return Array.from(text).join(" "); }
function separated(sep){
  return function(text){
    return text.split(/(\s+)/).map(function(part){
      return /\s/.test(part)?part:Array.from(part).join(sep);
    }).join("");
  };
}
function wrap(pre,post,inner){
  return function(text,opts){
    if(!text) return "";
    return pre+(inner?inner(text,opts):text)+post;
  };
}

/* ── style registry ─────────────────────────────────────── */
var STYLES=[];
function add(page,group,name,run){
  STYLES.push({page:page,group:group,name:name,id:page+"/"+name,run:run});
}

/* cursive ------------------------------------------------- */
add("cursive","Cursive & script","Script",mapper({u:0x1D49C,l:0x1D4B6,
  ex:{B:"ℬ",E:"ℰ",F:"ℱ",H:"ℋ",I:"ℐ",L:"ℒ",M:"ℳ",R:"ℛ",e:"ℯ",g:"ℊ",o:"ℴ"}}));
add("cursive","Cursive & script","Bold script",mapper({u:0x1D4D0,l:0x1D4EA}));
add("cursive","Cursive & script","Italic",mapper({u:0x1D434,l:0x1D44E,ex:{h:"ℎ"}}));
add("cursive","Cursive & script","Bold italic",mapper({u:0x1D468,l:0x1D482}));
add("cursive","Cursive & script","Sans italic",mapper({u:0x1D608,l:0x1D622}));
add("cursive","Cursive & script","Sans bold italic",mapper({u:0x1D63C,l:0x1D656}));

add("cursive","Blackletter","Old English",mapper({u:0x1D504,l:0x1D51E,
  ex:{C:"ℭ",H:"ℌ",I:"ℑ",R:"ℜ",Z:"ℨ"}}));
add("cursive","Blackletter","Bold gothic",mapper({u:0x1D56C,l:0x1D586}));
add("cursive","Blackletter","Double-struck",mapper({u:0x1D538,l:0x1D552,d:0x1D7D8,
  ex:{C:"ℂ",H:"ℍ",N:"ℕ",P:"ℙ",Q:"ℚ",R:"ℝ",Z:"ℤ"}}));

add("cursive","Weights","Bold serif",mapper({u:0x1D400,l:0x1D41A,d:0x1D7CE}));
add("cursive","Weights","Sans",mapper({u:0x1D5A0,l:0x1D5BA,d:0x1D7E2}));
add("cursive","Weights","Sans bold",mapper({u:0x1D5D4,l:0x1D5EE,d:0x1D7EC}));
add("cursive","Weights","Monospace",mapper({u:0x1D670,l:0x1D68A,d:0x1D7F6}));

add("cursive","Blocks & bubbles","Bubbles",mapper({u:0x24B6,l:0x24D0,d:"⓪①②③④⑤⑥⑦⑧⑨"}));
add("cursive","Blocks & bubbles","Filled bubbles",mapper({u:0x1F150,l:0x1F150,d:"⓿❶❷❸❹❺❻❼❽❾"}));
add("cursive","Blocks & bubbles","Squares",mapper({u:0x1F130,l:0x1F130}));
add("cursive","Blocks & bubbles","Filled squares",mapper({u:0x1F170,l:0x1F170}));
add("cursive","Blocks & bubbles","Wide",mapper({u:0xFF21,l:0xFF41,d:0xFF10,ex:{" ":"　"}}));

add("cursive","Effects","Strikethrough",combiner("̶"));
add("cursive","Effects","Underline",combiner("̲"));
add("cursive","Effects","Slashed",combiner("̸"));

/* small --------------------------------------------------- */
var SUP_UP="ᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾ·ᴿˢᵀᵁⱽᵂˣʸᶻ";
var SUP_LO="ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖ·ʳˢᵗᵘᵛʷˣʸᶻ";
var SUB_LO="ₐ···ₑ··ₕᵢⱼₖₗₘₙₒₚ·ᵣₛₜᵤᵥ·ₓ··";
var SMALL_CAPS="ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘ·ʀꜱᴛᴜᴠᴡ·ʏᴢ";

add("small","Raised & lowered","Superscript",mapper({u:SUP_UP,l:SUP_LO,d:"⁰¹²³⁴⁵⁶⁷⁸⁹"}));
/* subscript has no capitals in Unicode, so capitals fall to the lowercase form */
add("small","Raised & lowered","Subscript",mapper({u:SUB_LO,l:SUB_LO,d:"₀₁₂₃₄₅₆₇₈₉"}));
add("small","Capitals","Small caps",mapper({u:UP,l:SMALL_CAPS}));
add("small","Capitals","Tiny caps",mapper({u:SUP_UP,l:SUP_UP,d:"⁰¹²³⁴⁵⁶⁷⁸⁹"}));
add("small","Capitals","Small caps, spaced",function(text){
  var m=mapper({u:UP,l:SMALL_CAPS});
  return spaced(m(text));
});

/* glitch -------------------------------------------------- */
add("glitch","Corruption","Light",       zalgo({salt:1,up:1,mid:0,down:1}));
add("glitch","Corruption","Medium",      zalgo({salt:2,up:3,mid:1,down:3}));
add("glitch","Corruption","Heavy",       zalgo({salt:3,up:7,mid:2,down:7}));
add("glitch","Corruption","Maximum",     zalgo({salt:4,up:14,mid:4,down:14}));
add("glitch","Directional","Rising",     zalgo({salt:5,up:9,mid:0,down:0}));
add("glitch","Directional","Sinking",    zalgo({salt:6,up:0,mid:0,down:9}));
add("glitch","Directional","Crossed out",zalgo({salt:7,up:0,mid:4,down:0}));
add("glitch","Static","Scratched",       combiner("̶̵"));
add("glitch","Static","Buzzing",         combiner("҉"));
add("glitch","Static","Shattered",       combiner("̴͓"));

/* weird --------------------------------------------------- */
var FLIP={
  u:"∀𐐒ƆpƎℲפHIſʞ˥WNOԀQᴚS⊥∩ᴧMX⅄Z",
  l:"ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz",
  d:"0ƖᄅƐㄣϛ9ㄥ86",
  punct:{".":"˙",",":"'","?":"¿","!":"¡","'":",",'"':"„","(":")",")":"(",
         "[":"]","]":"[","{":"}","}":"{","<":">",">":"<","&":"⅋","_":"‾",";":"؛"}
};
var MIRROR={
  u:"AᙠƆᗡƎꟻӘHIႱ⋊⅃MИOꟼΌЯƧTUVWXYZ",
  l:"ɒdɔbɘꟻǫʜiႱʞlmnoqpɿꙅƚuvwxʏz"
};
var LOOKALIKE={
  u:"ΔΒϾĎΞŦĢĤĪĴĶĹϺŇØÞǪŘŞŤŬѴŴЖŶŻ",
  l:"αҍçժҽƒցհïյҟӀʍղօթզɾʂէմѵա×վՀ"
};
var BRAILLE={
  l:"⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵",
  d:"⠴⠂⠆⠒⠲⠢⠖⠶⠦⠔"
};

add("weird","Flipped & reversed","Upside down",flipper(FLIP));
add("weird","Flipped & reversed","Mirrored",flipper(MIRROR));
add("weird","Flipped & reversed","Reversed",reversed);

add("weird","Novelty","Alternating caps",alternating);
add("weird","Novelty","Spaced out",spaced);
add("weird","Novelty","Dot separated",separated("·"));
add("weird","Novelty","Vaporwave",wrap("【 "," 】",function(t){
  return spaced(mapper({u:0xFF21,l:0xFF41,d:0xFF10})(t));
}));
add("weird","Novelty","Bracketed",wrap("「","」"));
add("weird","Novelty","Lookalike",mapper({u:LOOKALIKE.u,l:LOOKALIKE.l}));
add("weird","Novelty","Cursed",zalgo({salt:8,up:2,mid:1,down:2}));

add("weird","Codes","Morse",toMorse);
add("weird","Codes","Braille",mapper({u:BRAILLE.l,l:BRAILLE.l,d:BRAILLE.d}));
add("weird","Codes","Binary",toBinary);

/* ── ornaments ──────────────────────────────────────────── */
var ORNAMENTS=[
  {id:"none",label:"none",pre:"",post:""},
  {id:"stars",label:"✧ ✧",pre:"✧ ",post:" ✧"},
  {id:"moon",label:"˚୨୧˚",pre:"˚୨ ",post:" ୧˚"},
  {id:"sparkle",label:"⋆｡‧˚",pre:"⋆｡‧˚ ",post:" ˚‧｡⋆"},
  {id:"quote",label:"❝ ❞",pre:"❝ ",post:" ❞"},
  {id:"heart",label:"♡ ♡",pre:"♡ ",post:" ♡"},
  {id:"leaf",label:"❃ ❃",pre:"❃ ",post:" ❃"}
];

global.CF={
  styles:STYLES,
  ornaments:ORNAMENTS,
  byPage:function(page){
    return STYLES.filter(function(s){ return s.page===page; });
  },
  reseed:reseed
};

})(typeof window!=="undefined"?window:globalThis);
