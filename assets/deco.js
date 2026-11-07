/* ═══════════════════════════════════════════════════════════
   cursivee.app — decorations
   Symbol frames to put around already-styled text: ꧁༺ name ༻꧂.
   Pure, no DOM; extends window.CF. Ported from nickstyle.

   A pack is a theme of symbols:
     frames   curated [left, right] pairs, shown first as-is
     before   small tags that sit just before the text
     after    badges that sit just after it
     accents  [left, right] symbols that hug the text inside the frame
   Any seed other than 0 recombines them into new variations, so
   there is always another page of decorations to load.
   ═══════════════════════════════════════════════════════════ */
(function(global){
"use strict";

var CF=global.CF;
if(!CF) return;

var PACKS=[
  {id:"trending",name:"Trending",icon:"🔥",
    frames:[["꧁༺","༻꧂"],["★彡 "," 彡★"],["꧁","꧂"],["亗 "," 亗"],["『","』"],["ᴾᴿᴼ "," ツ"],
      ["⫷","⫸"],["☬ "," ☬"],["╰☆☆ "," ☆☆╮"],["🦋 "," 🦋"],["⚡","⚡"],["◥꧁","꧂◤"],
      ["✦ "," ✦"],["ᴳᵒᵈ乂",""],["꧁☆","☆꧂"],["༺","༻"]],
    before:["ᴾᴿᴼ","ᴳᵒᵈ","ᴷᶦⁿᵍ","ᵛᶦᵖ"],
    after:["ツ","✓","࿐","亗"],
    accents:[["★","★"],["☬","☬"],["⚡","⚡"],["✦","✦"]]},
  {id:"gamer",name:"Gamer",icon:"🎮",
    frames:[["꧁༺","༻꧂"],["⫷","⫸"],["【","】"],["『","』"],["亗","亗"],["乂 "," 乂"],
      ["★彡","彡★"],["╰⊱","⊰╯"],["⟦","⟧"],["◥","◤"],["▄︻デ","══━一"],[""," ✓"],
      ["⚔ "," ⚔"],["☬","☬"],["༒","༒"],["〖","〗"]],
    before:["ᴾᴿᴼ","ᴳᵒᵈ","ᴷᶦⁿᵍ","ᵛᶦᵖ","ᴮᵒˢˢ","乂"],
    after:["ツ","亗","✓","⚡","࿐"],
    accents:[["★","★"],["⚡","⚡"],["✦","✦"],["☬","☬"],["༒","༒"]]},
  {id:"royal",name:"Royal",icon:"👑",
    frames:[["♛ "," ♛"],["꧁♔","♔꧂"],["༺","༻"],["❖ "," ❖"],["『♚","♚』"],["⚜ "," ⚜"],
      ["꧁𓊈","𓊉꧂"],["☬ "," ☬"],["♔ ",""],["༺♛","♛༻"],["⟬","⟭"],["👑 "," 👑"]],
    before:["ᴷᶦⁿᵍ","ᑫᵘᵉᵉⁿ","ᴿᵒʸᵃˡ","ᴾʳᶦⁿᶜᵉ","ᴸᵒʳᵈ"],
    after:["♛","♔","👑"],
    accents:[["༒","༒"],["❀","❀"],["✦","✦"],["⚜","⚜"]]},
  {id:"attitude",name:"Attitude",icon:"😈",
    frames:[["☠ "," ☠"],["×͜× ",""],["乂 "," 乂"],["ϟ "," ϟ"],["⚡ "," ⚡"],["『","』"],
      ["▄︻デ","══━一"],["✗ "," ✗"],["🖤 "," 🖤"],["ツ "," ツ"],["┣","┫"],["😈 ",""]],
    before:["ᴮᵃᵈ","ᴮᵒˢˢ","ᴿᵉᵇᵉˡ","ˢᵃᵛᵃᵍᵉ","ᴰᵉᵛᶦˡ"],
    after:["ツ","☠","⚡","😈"],
    accents:[["×","×"],["☠","☠"],["ϟ","ϟ"]]},
  {id:"cool",name:"Cool",icon:"😎",
    frames:[["˜”*°•.˜”*°• "," •°*”˜.•°*”˜"],["•´¯`•. "," .•´¯`•"],["▀▄▀▄ "," ▄▀▄▀"],["┊ "," ┊"],
      ["〖","〗"],["◤ "," ◢"],["▸ "," ◂"],["≋ "," ≋"],["─═ "," ═─"],["⟨⟨ "," ⟩⟩"],
      ["😎 ",""],["▓▒░ "," ░▒▓"]],
    before:["ᴹʳ","ᶜᵒᵒˡ","ᴮʳᵒ"],
    after:["✓","ツ","™"],
    accents:[["✪","✪"],["◈","◈"],["✦","✦"]]},
  {id:"cute",name:"Cute",icon:"🌸",
    frames:[["˚₊‧꒰ა "," ໒꒱ ‧₊˚"],["ʚ "," ɞ"],["꒰ "," ꒱"],["✿ "," ✿"],["🌸 "," 🌸"],["ପ "," ଓ"],
      ["⋆｡°✩ "," ✩°｡⋆"],["☁ "," ☁"],["🎀 "," 🎀"],["୨ "," ୧"],["❀ "," ❀"],["🍓 "," 🍓"]],
    before:["ᶜᵘᵗᵉ","ᵇᵃᵇʸ","ˢʷᵉᵉᵗ"],
    after:["♡","🌷","✧"],
    accents:[["♡","♡"],["✧","✧"],["❀","❀"],["⋆","⋆"]]},
  {id:"love",name:"Love",icon:"💖",
    frames:[["♡ "," ♡"],["❥ ",""],["💖 "," 💖"],["₊˚⊹♡ "," ♡⊹˚₊"],["❣ "," ❣"],["💕 "," 💕"],
      ["♥ "," ♥"],["𓆩♡𓆪 ",""],["❦ "," ❦"],["💘 ",""],["ღ "," ღ"],["♡⋆ "," ⋆♡"]],
    before:["ᴸᵒᵛᵉ","ᴮᵃᵇʸ","ᴴᵉᵃʳᵗ"],
    after:["♡","♥","💞"],
    accents:[["♡","♡"],["♥","♥"],["❥","❥"]]},
  {id:"aesthetic",name:"Aesthetic",icon:"✨",
    frames:[["⋆˙⟡ "," ⟡˙⋆"],["✧˖° "," °˖✧"],["⊹ "," ⊹"],["∘₊✧ "," ✧₊∘"],["☾ "," ☽"],["༄ ",""],
      ["˗ˏˋ "," ˎˊ˗"],["⟢ "," ⟣"],["⋆⁺₊ "," ₊⁺⋆"],["☆ "," ☆"],["⌜","⌟"],["◌ "," ◌"]],
    before:[],
    after:["✧","⋆","☁"],
    accents:[["⋆","⋆"],["✦","✦"],["˚","˚"]]},
  {id:"kawaii",name:"Kawaii",icon:"(◕‿◕)",
    frames:[["ʕ•ᴥ•ʔ ",""],[""," (◕‿◕)"],["/ᐠ｡ꞈ｡ᐟ\\ ",""],[""," (˶ᵔ ᵕ ᵔ˶)"],["(っ◔◡◔)っ ",""],
      [""," ◡̈"],["(｡♥‿♥｡) ",""],["(ノ◕ヮ◕)ノ✧ ",""],["ᓚᘏᗢ ",""],["(˘ ³˘)♥ ",""],
      [""," ʕ •ᴥ• ʔ"],["( ˘ ³˘) ",""]],
    before:[],
    after:["♡","✿","✧"],
    accents:[["✿","✿"],["♡","♡"]]},
  {id:"warrior",name:"Warrior",icon:"⚔️",
    frames:[["⚔ "," ⚔"],["▄︻デ══━一 ",""],["︻デ═一 ",""],["⌐╦╦═─ ",""],["🏹 ",""],["☬ "," ☬"],
      ["✠ "," ✠"],["🛡 ",""],["༒ "," ༒"],["✞ "," ✞"],["🗡 ",""],["⚔ ",""]],
    before:["ˢⁿᶦᵖᵉʳ","ᴴᵘⁿᵗᵉʳ","ᵂᵃʳʳᶦᵒʳ"],
    after:["⚔","🎯","☠"],
    accents:[["⚔","⚔"],["✠","✠"]]}
];

/* ── seeded randomness, independent of the glitch seed ──── */
function rng(seed){
  var a=seed>>>0;
  return function(){
    a=(a+0x6D2B79F5)|0;
    var t=Math.imul(a^(a>>>15),1|a);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function fnv1a(str){
  var h=0x811C9DC5;
  for(var i=0;i<str.length;i++) h=Math.imul(h^str.charCodeAt(i),0x01000193);
  return h>>>0;
}
function pick(rand,list){ return list[Math.floor(rand()*list.length)]; }
function shuffled(rand,list){
  var deck=list.slice();
  for(var i=deck.length-1;i>0;i--){
    var j=Math.floor(rand()*(i+1)),t=deck[i];
    deck[i]=deck[j]; deck[j]=t;
  }
  return deck;
}
function randomSeed(){
  try{ return crypto.getRandomValues(new Uint32Array(1))[0]||1; }
  catch(e){ return Math.floor(Math.random()*4294967296)||1; }
}
function byId(id){
  for(var i=0;i<PACKS.length;i++) if(PACKS[i].id===id) return PACKS[i];
  return null;
}

/* Decorations for a pack. Seed 0 is the curated first page; any
   other seed gives a fresh, repeatable set of recombinations. */
function decorations(packId,seed,count){
  var pack=byId(packId);
  if(!pack) return [];
  count=count||16;
  var out=[],seen={};
  function add(left,right){
    var key=left+"\u0000"+right;
    if(!seen[key]){ seen[key]=1; out.push({left:left,right:right}); }
  }
  if(!seed) pack.frames.slice(0,count).forEach(function(f){ add(f[0],f[1]); });

  var rand=rng(seed||fnv1a(pack.id));
  var deck=shuffled(rand,pack.frames);
  for(var i=0;out.length<count&&i<count*12;i++){
    var f=deck[i%deck.length],left=f[0],right=f[1];
    if(pack.accents.length&&rand()<0.4){
      var a=pick(rand,pack.accents);
      left+=a[0]; right=a[1]+right;
    }
    var tag=rand();
    if(pack.before.length&&tag<0.4) left+=pick(rand,pack.before);
    else if(pack.after.length&&tag<0.7) right=pick(rand,pack.after)+right;
    add(left,right);
  }
  return out;
}

/* One random pack-and-frame pairing, for the endless ideas list. */
function randomDecoration(seed){
  var rand=rng(seed||randomSeed());
  var pack=pick(rand,PACKS);
  var d=decorations(pack.id,Math.floor(rand()*4294967296)||1,1)[0];
  return {pack:pack,left:d.left,right:d.right};
}

CF.packs=PACKS.map(function(p){ return {id:p.id,name:p.name,icon:p.icon}; });
CF.decorations=decorations;
CF.randomDecoration=randomDecoration;
CF.randomSeed=randomSeed;

})(typeof window!=="undefined"?window:globalThis);
