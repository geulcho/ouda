/*
 * sw.js — 서비스워커 (오프라인 캐시)
 *
 * 앱 셸과 단어 데이터를 통째로 캐시한다. 데이터가 정적이라 전략이 단순하다:
 * 캐시에 있으면 캐시, 없으면 네트워크. 지하철에서도 그대로 돌아간다.
 *
 * 주의: 서비스워커는 https 또는 localhost 에서만 등록된다.
 * file:// 로 더블클릭해 여는 방식은 지금처럼 서비스워커 없이 그대로 동작해야 한다.
 */
var CACHE = 'deutsch-v1';

var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './css/styles.css',
  './data/nouns.js',
  './data/verbs.js',
  './data/adjectives.js',
  './data/functionwords.js',
  './data/grammar.js',
  './data/pronouns.js',
  './js/declension.js',
  './js/conjugation.js',
  './js/store.js',
  './js/srs.js',
  './js/grader.js',
  './js/drills.js',
  './js/grammar-drills.js',
  './js/editor.js',
  './js/meanings.js',
  './js/tables.js',
  './js/stats.js',
  './js/sync.js',
  './js/ui.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // 하나가 없어도 설치는 되게 한다 (config.js 처럼 선택적인 파일이 있다)
      return Promise.all(ASSETS.map(function (u) {
        return c.add(u)['catch'](function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches['delete'](k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);

  // 동기화 요청은 절대 캐시하면 안 된다 — 늘 최신이어야 한다
  if (url.origin !== location.origin) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) {
        // 캐시로 즉시 응답하고, 뒤에서 조용히 새 버전을 받아 둔다
        fetch(e.request).then(function (res) {
          if (res && res.ok) caches.open(CACHE).then(function (c) { c.put(e.request, res); });
        })['catch'](function () {});
        return hit;
      }
      return fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      })['catch'](function () {
        return caches.match('./index.html');
      });
    })
  );
});
