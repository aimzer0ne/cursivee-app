/* ═══════════════════════════════════════════════════════════
   cursivee.app — service worker

   Pages are network-first so edits reach people on their next
   visit; assets are cache-first because they are versioned by
   this file's CACHE name. Bump CACHE after changing any asset.
   ═══════════════════════════════════════════════════════════ */
const CACHE = "cursivee-v4";

const SHELL = [
  "./",
  "./index.html",
  "./small-text.html",
  "./glitch-text.html",
  "./cursed-text.html",
  "./weird-text.html",
  "./about.html",
  "./privacy.html",
  "./terms.html",
  "./contact.html",
  "./offline.html",
  "./404.html",
  "./manifest.webmanifest",
  "./assets/style.css",
  "./assets/palette.js",
  "./assets/engine.js",
  "./assets/app.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE).then(function(cache){
      /* Added one at a time: addAll rejects the whole install if a
         single file 404s, which would leave the app with no cache. */
      return Promise.all(SHELL.map(function(url){
        return cache.add(new Request(url, {cache:"reload"})).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(key){
        return key===CACHE?null:caches.delete(key);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(event){
  var req=event.request;
  if(req.method!=="GET") return;

  var url;
  try{ url=new URL(req.url); }catch(e){ return; }
  if(url.origin!==self.location.origin) return;

  /* Pages: fresh if possible, cached if not, offline notice as a last resort. */
  if(req.mode==="navigate"){
    event.respondWith(
      fetch(req).then(function(res){
        var copy=res.clone();
        caches.open(CACHE).then(function(c){ c.put(req,copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){
          return hit||caches.match("./offline.html")||caches.match("./index.html");
        });
      })
    );
    return;
  }

  /* Assets: cached first, then network, and store what we fetch. */
  event.respondWith(
    caches.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res&&res.status===200&&res.type==="basic"){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){ c.put(req,copy); });
        }
        return res;
      });
    })
  );
});

/* Lets the page tell a waiting worker to take over immediately. */
self.addEventListener("message", function(event){
  if(event.data==="skip-waiting") self.skipWaiting();
});
