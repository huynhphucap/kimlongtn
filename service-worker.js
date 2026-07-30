const CACHE_NAME = "techonline-cache-v9";
const ASSETS = [
  "./index.html",
  "./san-pham.html",
  "./khuyen-mai.html",
  "./lien-he.html",
  "./chi-tiet-san-pham.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    // Trang HTML: luôn ưu tiên lấy bản mới nhất từ mạng, chỉ dùng cache khi mất mạng
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req))
    );
  } else {
    // Ảnh, manifest...: dùng cache trước cho nhanh, nếu chưa có thì tải mạng
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  }
});
