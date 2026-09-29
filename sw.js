// Workmana — service worker
// Caches the static app shell (HTML/CSS/JS/icons) so the interface can open
// offline, but always tries the network FIRST for the HTML page itself so a
// new deploy shows up right away instead of needing a manual cache clear.
// Firestore data still needs an internet connection to sync.

var CACHE_NAME = "workmana-shell-v4";
var APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./favicon.ico"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
            .map(function(key){ return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(event){
  var req = event.request;
  // Never intercept Firebase/Firestore/Auth network calls — those must always
  // go live so data stays real-time.
  if(req.url.indexOf("googleapis.com") !== -1 || req.url.indexOf("firebaseio.com") !== -1 || req.url.indexOf("gstatic.com") !== -1){
    return;
  }

  var isHTML = req.mode === "navigate" ||
    (req.method === "GET" && req.headers.get("accept") && req.headers.get("accept").indexOf("text/html") !== -1);

  if(isHTML){
    // Network-first: always try to fetch the latest page. Only fall back to
    // the cached copy when there's no connection.
    event.respondWith(
      fetch(req).then(function(res){
        if(res && res.status === 200){
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resClone); });
        }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(cached){
          return cached || caches.match("./index.html");
        });
      })
    );
    return;
  }

  // Everything else (css/js/icons): serve from cache instantly, but refresh
  // the cache in the background so the next load already has the new file.
  event.respondWith(
    caches.match(req).then(function(cached){
      var fetchPromise = fetch(req).then(function(res){
        if(req.method === "GET" && res && res.status === 200 && res.type === "basic"){
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resClone); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || fetchPromise;
    })
  );
});
