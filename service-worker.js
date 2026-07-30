const CACHE_NAME = "techonline-cache-v12";

self.addEventListener("install", () => {
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

  // Chỉ được cache yêu cầu kiểu GET và địa chỉ http/https
  // (bỏ qua POST gửi lên Supabase, yêu cầu từ tiện ích mở rộng trình duyệt, v.v.)
  const isCacheable = req.method === "GET" && req.url.startsWith("http");
  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (isCacheable) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  if (!isCacheable) {
    // Không phải yêu cầu nên can thiệp (VD: gọi API) → để trình duyệt tự xử lý bình thường
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      });
    })
  );
});
