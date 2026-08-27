// Tăng số này mỗi khi sửa js/shared.js, css/site.css hoặc các file tĩnh khác —
// đổi tên cache là cách buộc trình duyệt bỏ bản cũ và tải lại bản mới.
const CACHE_NAME = "techonline-cache-v25";

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

// Lấy mới từ mạng trước; hỏng mạng thì mới dùng bản đã lưu. Dùng cho HTML và mã nguồn.
function networkFirst(req, cacheable) {
  return fetch(req)
    .then((res) => {
      if (cacheable) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
      }
      return res;
    })
    .catch(() => caches.match(req));
}

// Dùng bản đã lưu ngay nếu có, chưa có thì tải rồi lưu lại. Dùng cho ảnh, icon, manifest.
function cacheFirst(req) {
  return caches.match(req).then((cached) => {
    if (cached) return cached;
    return fetch(req).then((res) => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
      return res;
    });
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Chỉ được cache tài nguyên CÙNG DOMAIN với web (html, ảnh, manifest của chính site).
  // Mọi yêu cầu tới domain khác — đặc biệt là Supabase (dữ liệu sản phẩm, tin nhắn liên hệ...)
  // — phải LUÔN lấy mới từ mạng, không bao giờ được cache lại.
  const isSameOrigin = req.url.startsWith(self.location.origin);
  const isCacheable = req.method === "GET" && isSameOrigin;

  if (!isCacheable) {
    // Domain khác (API Supabase, ảnh CDN, font Google...) → để mạng xử lý bình thường, không can thiệp
    return;
  }

  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  // QUAN TRỌNG: mã nguồn (.js/.css) phải lấy mới giống HTML, KHÔNG được ưu tiên bộ nhớ đệm.
  // Trước đây HTML thì lấy mới còn .js lấy từ cache, nên sau mỗi lần cập nhật web, khách nhận
  // HTML mới ghép với js/shared.js cũ. HTML mới gọi hàm chưa có trong file cũ → văng lỗi
  // JavaScript giữa chừng và toàn bộ danh sách sản phẩm không hiển thị được.
  const isCode = /\.(js|css)$/i.test(new URL(req.url).pathname);

  event.respondWith(
    (isHTML || isCode) ? networkFirst(req, true) : cacheFirst(req)
  );
});
