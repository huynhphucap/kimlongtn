const CACHE_NAME = "techonline-cache-v17";

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

  // Chỉ được cache tài nguyên CÙNG DOMAIN với web (html, ảnh, manifest của chính site).
  // Mọi yêu cầu tới domain khác — đặc biệt là Supabase (dữ liệu sản phẩm, tin nhắn liên hệ...)
  // — phải LUÔN lấy mới từ mạng, không bao giờ được cache lại.
  const isSameOrigin = req.url.startsWith(self.location.origin);
  const isCacheable = req.method === "GET" && isSameOrigin;
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
    // Domain khác (API Supabase, ảnh CDN, font Google...) → để mạng xử lý bình thường, không can thiệp
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
