// Build version: 1790777384176 — changes every build so the browser notices
// this file is different and installs the new version.
var APP_CACHE = 'trip-app-1790777384176';
var TILE_CACHE = 'trip-tiles-v1'; // survives app updates (offline map)
var TILE_HOSTS = /(tile\.openstreetmap\.org|server\.arcgisonline\.com|api\.mapbox\.com\/styles)/;

self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== APP_CACHE && k !== TILE_CACHE;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function tileKey(url) {
  // CARTO serves the same tile from a/b/c/d subdomains — store them under one key.
  return url.replace(/\/\/[abcd]\.basemaps\.cartocdn\.com/, '//a.basemaps.cartocdn.com');
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = req.url;

  if (TILE_HOSTS.test(url)) {
    var key = tileKey(url);
    event.respondWith(
      caches.open(TILE_CACHE).then(function (c) {
        return c.match(key).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (res) {
            if (res && (res.ok || res.type === 'opaque')) c.put(key, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  // Only the app's own files are cached here; live APIs (routing, weather,
  // places) go straight to the network and the app keeps its own copies.
  if (new URL(url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req, { cache: 'no-store' }).then(function (res) {
      var copy = res.clone();
      caches.open(APP_CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || caches.match('./', { ignoreSearch: true }) || caches.match('index.html', { ignoreSearch: true });
      });
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then(function (list) {
    if (list.length) return list[0].focus();
    return self.clients.openWindow('./');
  }));
});
