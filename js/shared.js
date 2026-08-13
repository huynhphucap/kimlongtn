// ====== Cấu hình & tiện ích dùng chung cho toàn bộ trang công khai ======
// Trước đây mỗi trang (index/san-pham/chi-tiet-san-pham/lien-he/admin) dán lại
// y hệt đoạn này. Giờ chỉ cần sửa 1 lần ở đây là áp dụng cho mọi trang.
const SUPABASE_URL = "https://tvqiphlmvcbmpwexihby.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2cWlwaGxtdmNibXB3ZXhpaGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMTc2NzIsImV4cCI6MjEwMDc5MzY3Mn0.oz5-F_1UCM0aXf9T9bFd7cpDgKAa0ReZfG1kfxp5ni0";

const isConfigured = SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.startsWith('eyJ');
const sb = (isConfigured && window.supabase) ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str ?? '').replace(/[&<>"']/g, ch => map[ch]);
}

// ---------- Toast thông báo ----------
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const styles = {
    success: { bg: 'bg-emerald-600', icon: '✓' },
    error: { bg: 'bg-red-600', icon: '✕' },
    info: { bg: 'bg-navy-900', icon: 'ℹ' }
  };
  const s = styles[type] || styles.success;
  toast.className = `toast ${s.bg} text-white font-body text-sm font-medium rounded-xl px-4 py-3 flex items-center gap-2.5 max-w-xs shadow-[0_12px_28px_-12px_rgba(15,27,51,.35)]`;
  toast.innerHTML = `<span class="font-display font-800">${s.icon}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-leaving');
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

// ---------- Ghi nhớ Tên + SĐT đã dùng, để điền sẵn ở các form khác ----------
const CONTACT_INFO_KEY = 'kl_contact_info';
function getContactInfo() {
  try { return JSON.parse(localStorage.getItem(CONTACT_INFO_KEY)); } catch { return null; }
}
function saveContactInfo(info) {
  localStorage.setItem(CONTACT_INFO_KEY, JSON.stringify(info));
}

// ---------- Yêu cầu báo giá: tiền tố nhận diện + trạng thái đã gửi ----------
// QUOTE_PREFIX phải khớp với phần admin.html dùng để nhận diện tin nhắn báo giá.
const QUOTE_PREFIX = 'Yêu cầu báo giá cho:';
const QUOTE_SENT_KEY = 'kl_quote_sent';
function getSentQuoteIds() {
  try { return JSON.parse(localStorage.getItem(QUOTE_SENT_KEY)) || []; } catch { return []; }
}
function isQuoteSent(id) {
  return getSentQuoteIds().some(x => String(x) === String(id));
}
function markQuoteSent(id) {
  const ids = getSentQuoteIds();
  if (!isQuoteSent(id)) { ids.push(id); localStorage.setItem(QUOTE_SENT_KEY, JSON.stringify(ids)); }
}
// Cho phép khách bỏ đánh dấu "đã gửi yêu cầu báo giá" (bấm lại vào nút đã gửi) —
// để có thể thêm lại vào giỏ và gửi yêu cầu báo giá mới cho sản phẩm đó.
function unmarkQuoteSent(id) {
  const ids = getSentQuoteIds().filter(x => String(x) !== String(id));
  localStorage.setItem(QUOTE_SENT_KEY, JSON.stringify(ids));
}

// ---------- Giỏ báo giá: gộp nhiều sản phẩm rồi gửi 1 yêu cầu báo giá duy nhất ----------
const CART_KEY = 'kl_quote_cart';
function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
}
function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}
function isInCart(id) {
  return getCart().some(x => String(x.id) === String(id));
}
function addToCart(product) {
  const cart = getCart();
  if (!cart.some(x => String(x.id) === String(product.id))) {
    cart.push({ id: product.id, name: product.name, price: product.new_price || '' });
    saveCart(cart);
  }
  return cart;
}
function removeFromCart(id) {
  const cart = getCart().filter(x => String(x.id) !== String(id));
  saveCart(cart);
  return cart;
}
function clearCart() {
  localStorage.removeItem(CART_KEY);
}
function buildCartQuoteMessage(cart) {
  return `${QUOTE_PREFIX}\n` + cart.map(item => `- ${item.name}${item.price ? ` (${item.price})` : ''}`).join('\n');
}

// ---------- Hiệu ứng "bay vào giỏ" khi thêm sản phẩm ----------
// Tạo 1 chấm tròn bay từ vị trí bấm (sourceEl) tới nút giỏ nổi theo đường vòng cung,
// rồi làm nút giỏ + số đếm "nảy" lên khi chấm tới đích — cho người dùng thấy rõ ràng
// sản phẩm đã được thêm, thay vì chỉ đổi số đếm một cách âm thầm.
function flyToCart(sourceEl) {
  const cartBtn = document.getElementById('cart-fab-btn');
  if (!cartBtn || !sourceEl || !cartBtn.animate) return;

  const startRect = sourceEl.getBoundingClientRect();
  const endRect = cartBtn.getBoundingClientRect();
  const startX = startRect.left + startRect.width / 2;
  const startY = startRect.top + startRect.height / 2;
  const endX = endRect.left + endRect.width / 2;
  const endY = endRect.top + endRect.height / 2;
  const dx = endX - startX;
  const dy = endY - startY;
  const arcLift = -Math.max(60, Math.abs(dy) * 0.6);

  const dot = document.createElement('div');
  dot.className = 'fixed z-[200] pointer-events-none rounded-full bg-ember shadow-[0_4px_10px_rgba(194,84,10,.5)] flex items-center justify-center text-white';
  dot.style.width = '26px';
  dot.style.height = '26px';
  dot.style.left = `${startX - 13}px`;
  dot.style.top = `${startY - 13}px`;
  dot.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  document.body.appendChild(dot);

  const anim = dot.animate([
    { transform: 'translate(0px, 0px) scale(1)', opacity: 1, offset: 0 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 + arcLift}px) scale(0.9)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 0.4, offset: 1 }
  ], { duration: 600, easing: 'cubic-bezier(.4,0,.2,1)' });

  const cleanup = () => dot.remove();
  anim.onfinish = () => { cleanup(); bumpCartFab(); };
  anim.oncancel = cleanup;
}

function bumpCartFab() {
  const cartBtn = document.getElementById('cart-fab-btn');
  const badge = document.getElementById('cart-fab-badge');
  if (cartBtn?.animate) {
    cartBtn.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }],
      { duration: 320, easing: 'ease-out' }
    );
  }
  if (badge?.animate) {
    badge.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.6)' }, { transform: 'scale(1)' }],
      { duration: 320, easing: 'ease-out' }
    );
  }
}

// ---------- Modal xác nhận dùng chung (thay cho confirm() mặc định của trình duyệt) ----------
// Tự chèn HTML vào trang khi cần (giống initQuoteCartUI), chỉ 1 lần cho mỗi trang.
let confirmModalResolver = null;
function ensureConfirmModal() {
  if (document.getElementById('confirm-modal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="confirm-modal" class="hidden fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" data-close-confirm></div>
      <div class="relative bg-white rounded-2xl border border-slate-200 shadow-[0_24px_48px_-20px_rgba(0,0,0,.4)] w-full max-w-sm p-6">
        <div class="w-11 h-11 rounded-full bg-ember/10 border border-ember/20 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <h3 id="confirm-title" class="font-display font-700 text-base text-navy-950 mb-1"></h3>
        <p id="confirm-message" class="font-body text-sm text-navy-900/60 mb-5"></p>
        <div class="flex items-center justify-end gap-2">
          <button type="button" id="confirm-cancel-btn" class="focus-ring text-sm font-body font-medium text-navy-900/60 border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-150 transition-colors">Hủy</button>
          <button type="button" id="confirm-ok-btn" class="focus-ring text-sm font-display font-700 text-white bg-ember hover:bg-ember-dark rounded-xl px-4 py-2 transition-colors">Đồng ý</button>
        </div>
      </div>
    </div>
  `);
  const modal = document.getElementById('confirm-modal');
  function close(result) {
    modal.classList.add('hidden');
    if (confirmModalResolver) { confirmModalResolver(result); confirmModalResolver = null; }
  }
  document.getElementById('confirm-ok-btn').addEventListener('click', () => close(true));
  document.getElementById('confirm-cancel-btn').addEventListener('click', () => close(false));
  modal.querySelector('[data-close-confirm]').addEventListener('click', () => close(false));
}
function askConfirm(title, message, okLabel = 'Đồng ý') {
  ensureConfirmModal();
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-ok-btn').textContent = okLabel;
  document.getElementById('confirm-modal').classList.remove('hidden');
  return new Promise(resolve => { confirmModalResolver = resolve; });
}

// ---------- Giỏ báo giá: UI dùng chung (nút giỏ nổi + khay giỏ + modal nhập thông tin) ----------
// Cả san-pham.html và chi-tiet-san-pham.html trước đây tự vẽ modal "nhập thông tin liên hệ"
// giống nhau. Giờ initQuoteCartUI() tự chèn toàn bộ UI này vào trang (chỉ 1 lần) — trang gọi
// hàm này 1 lần lúc tải xong, truyền vào onCartChange để tự cập nhật lại nút "Thêm vào giỏ"
// trên từng sản phẩm mỗi khi giỏ thay đổi (thêm/bớt/gửi xong).
function initQuoteCartUI(onCartChange) {
  if (document.getElementById('cart-drawer-modal')) return;

  const floatingActions = document.getElementById('floating-actions');
  const cartBtnHtml = `
    <button id="cart-fab-btn" type="button" title="Giỏ báo giá"
      class="focus-ring w-12 h-12 rounded-full bg-navy-950 text-white flex items-center justify-center shadow-lg hover:bg-navy-900 transition-colors relative">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 2-1.58l1.65-7.42H5.12"/></svg>
      <span id="cart-fab-badge" class="hidden absolute -top-1.5 -right-1.5 bg-ember text-white text-[10px] font-display font-800 rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">0</span>
    </button>`;

  if (floatingActions) {
    floatingActions.insertAdjacentHTML('afterbegin', cartBtnHtml);
  } else {
    document.body.insertAdjacentHTML('beforeend', `<div class="fixed right-4 bottom-24 flex flex-col gap-3 z-40">${cartBtnHtml}</div>`);
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div id="cart-drawer-modal" class="hidden fixed inset-0 z-[115] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" data-close-cart-drawer></div>
      <div class="relative bg-white rounded-2xl border border-slate-200 shadow-[0_24px_48px_-20px_rgba(0,0,0,.4)] w-full max-w-sm max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between px-6 pt-6 pb-3 shrink-0">
          <h3 class="font-display font-700 text-lg text-navy-950">Giỏ Báo Giá</h3>
          <button type="button" data-close-cart-drawer class="focus-ring text-navy-900/40 hover:text-navy-900 w-7 h-7 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div id="cart-drawer-list" class="flex-1 overflow-y-auto px-6 flex flex-col gap-2 pb-2"></div>
        <div id="cart-drawer-empty" class="hidden px-6 pb-8 text-center text-sm text-navy-900/50 font-body">Giỏ báo giá đang trống. Bấm "Thêm vào giỏ" trên sản phẩm bạn quan tâm.</div>
        <div class="px-6 py-4 border-t border-slate-100 shrink-0">
          <button type="button" id="cart-drawer-submit" class="focus-ring w-full bg-ember hover:bg-ember-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-display font-700 text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            Gửi Yêu Cầu Báo Giá →
          </button>
        </div>
      </div>
    </div>

    <div id="quote-info-modal" class="hidden fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" data-close-quote-modal></div>
      <div class="relative bg-white rounded-2xl border border-slate-200 shadow-[0_24px_48px_-20px_rgba(0,0,0,.4)] w-full max-w-sm p-6">
        <h3 class="font-display font-700 text-lg text-navy-950 mb-1">Gửi Yêu Cầu Báo Giá</h3>
        <p id="quote-modal-product" class="font-body text-sm text-navy-900/60 mb-4"></p>
        <form id="quote-info-form" class="flex flex-col gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="font-body text-xs font-medium text-navy-900/60">Họ và tên</label>
            <input type="text" id="qi-name" required placeholder="Nguyễn Văn A" class="form-input border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-body">
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="font-body text-xs font-medium text-navy-900/60">Số điện thoại</label>
            <input type="tel" id="qi-phone" required placeholder="09xx xxx xxx" class="form-input border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-body">
          </div>
          <p id="qi-error" class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"></p>
          <div class="flex items-center justify-end gap-2 mt-1">
            <button type="button" data-close-quote-modal class="focus-ring text-sm font-body font-medium text-navy-900/60 px-3 py-2">Hủy</button>
            <button type="submit" id="qi-submit" class="focus-ring bg-ember hover:bg-ember-dark text-white font-display font-700 text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2">Gửi Yêu Cầu →</button>
          </div>
        </form>
      </div>
    </div>
  `);

  const fabBtn = document.getElementById('cart-fab-btn');
  const fabBadge = document.getElementById('cart-fab-badge');
  const drawerModal = document.getElementById('cart-drawer-modal');
  const drawerList = document.getElementById('cart-drawer-list');
  const drawerEmpty = document.getElementById('cart-drawer-empty');
  const drawerSubmit = document.getElementById('cart-drawer-submit');
  const quoteModal = document.getElementById('quote-info-modal');
  const quoteForm = document.getElementById('quote-info-form');
  const quoteModalProduct = document.getElementById('quote-modal-product');
  const qiError = document.getElementById('qi-error');
  const qiSubmit = document.getElementById('qi-submit');

  function renderFab() {
    // Nút giỏ luôn hiện sẵn (để người dùng biết tính năng này tồn tại), chỉ số đếm
    // (badge) mới ẩn/hiện theo số sản phẩm trong giỏ.
    const count = getCart().length;
    fabBadge.classList.toggle('hidden', count === 0);
    fabBadge.textContent = count;
  }

  function renderDrawer() {
    const cart = getCart();
    drawerEmpty.classList.toggle('hidden', cart.length > 0);
    drawerSubmit.disabled = cart.length === 0;
    drawerList.innerHTML = cart.map(item => `
      <div class="flex items-center gap-3 border border-slate-100 rounded-xl px-3 py-2.5">
        <div class="flex-1 min-w-0">
          <p class="font-body text-sm font-medium text-navy-950 truncate">${escapeHtml(item.name)}</p>
          ${item.price ? `<p class="font-body text-xs text-ember-dark font-700">${escapeHtml(item.price)}</p>` : ''}
        </div>
        <button type="button" data-remove-cart-id="${escapeHtml(item.id)}" class="focus-ring shrink-0 text-navy-900/40 hover:text-red-600 w-7 h-7 flex items-center justify-center" title="Bỏ khỏi giỏ">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `).join('');
  }

  function notifyChange() {
    renderFab();
    renderDrawer();
    if (onCartChange) onCartChange(getCart());
  }

  function openDrawer() { renderDrawer(); drawerModal.classList.remove('hidden'); }
  function closeDrawer() { drawerModal.classList.add('hidden'); }

  fabBtn.addEventListener('click', openDrawer);
  drawerModal.querySelectorAll('[data-close-cart-drawer]').forEach(el => el.addEventListener('click', closeDrawer));
  drawerList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-cart-id]');
    if (!btn) return;
    removeFromCart(btn.dataset.removeCartId);
    notifyChange();
  });

  function openQuoteModal() {
    const count = getCart().length;
    quoteModalProduct.textContent = `Cho ${count} sản phẩm trong giỏ báo giá`;
    qiError.classList.add('hidden');
    quoteForm.reset();
    quoteModal.classList.remove('hidden');
    document.getElementById('qi-name').focus();
  }
  function closeQuoteModal() { quoteModal.classList.add('hidden'); }
  quoteModal.querySelectorAll('[data-close-quote-modal]').forEach(el => el.addEventListener('click', closeQuoteModal));

  async function submitCart(name, phone) {
    const cart = getCart();
    if (cart.length === 0) return null;
    const message = buildCartQuoteMessage(cart);
    const { error } = await sb.from('contacts').insert({ name, phone, message });
    if (!error) {
      cart.forEach(item => markQuoteSent(item.id));
      clearCart();
    }
    return error;
  }

  drawerSubmit.addEventListener('click', async () => {
    if (!isConfigured) { showToast('Chưa cấu hình Supabase — không thể gửi yêu cầu lúc này.', 'error'); return; }
    const cart = getCart();
    if (cart.length === 0) return;

    const info = getContactInfo();
    if (info && info.name && info.phone) {
      drawerSubmit.disabled = true;
      drawerSubmit.innerHTML = '<span class="spinner"></span> Đang gửi...';
      const count = cart.length;
      const error = await submitCart(info.name, info.phone);
      drawerSubmit.disabled = false;
      drawerSubmit.innerHTML = 'Gửi Yêu Cầu Báo Giá →';
      if (error) { showToast('Gửi yêu cầu thất bại: ' + error.message, 'error'); return; }
      showToast(`Đã gửi yêu cầu báo giá cho ${count} sản phẩm thành công!`);
      closeDrawer();
      notifyChange();
      return;
    }

    closeDrawer();
    openQuoteModal();
  });

  quoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    qiError.classList.add('hidden');
    const name = document.getElementById('qi-name').value.trim();
    const phone = document.getElementById('qi-phone').value.trim();
    if (!name || !phone) {
      qiError.textContent = 'Vui lòng nhập đầy đủ Họ tên và Số điện thoại.';
      qiError.classList.remove('hidden');
      return;
    }
    const count = getCart().length;
    qiSubmit.disabled = true;
    qiSubmit.innerHTML = '<span class="spinner"></span> Đang gửi...';
    const error = await submitCart(name, phone);
    qiSubmit.disabled = false;
    qiSubmit.innerHTML = 'Gửi Yêu Cầu →';
    if (error) {
      qiError.textContent = 'Gửi thất bại: ' + error.message;
      qiError.classList.remove('hidden');
      return;
    }
    saveContactInfo({ name, phone });
    showToast(`Đã gửi yêu cầu báo giá cho ${count} sản phẩm thành công!`);
    closeQuoteModal();
    notifyChange();
  });

  renderFab();
  return notifyChange;
}

// ---------- Hiệu ứng mờ dần hiện ra khi cuộn tới (class .reveal) ----------
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal:not(.reveal-visible)');
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('reveal-visible')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(el => io.observe(el));
}

// ---------- Đăng ký Service Worker (PWA) ----------
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}

// ====================================================================
// ====== Thông tin cửa hàng dùng chung (SEO + các nút liên hệ) ======
// ====================================================================
const SITE_URL = 'https://huynhphucap.github.io/kimlongtn';
const STORE_NAME = 'Cửa Hàng Kim Long';
const STORE_PHONE = '0364878771';
const STORE_PHONE_PRETTY = '0364.878.771';
const STORE_EMAIL = 'cskh@kimlong.vn';

// ---------- Chế độ tối (dark mode) ----------
// Class `dark` trên thẻ <html> được bật ngay trong <head> của mỗi trang (đoạn script
// nhỏ chạy trước khi trang vẽ ra, để không bị "nháy trắng"). Ở đây chỉ lo phần
// bật/tắt bằng nút và ghi nhớ lựa chọn.
const THEME_KEY = 'kl_theme';

function getTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  try { localStorage.setItem(THEME_KEY, theme); } catch {}

  // Đổi luôn màu thanh trạng thái trên điện thoại cho khớp
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#080E1A' : '#2563eb');

  document.querySelectorAll('[data-theme-toggle]').forEach(syncThemeToggleButton);
}

function toggleTheme() {
  applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

const THEME_ICON_SUN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/></svg>';
const THEME_ICON_MOON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';

function syncThemeToggleButton(btn) {
  const isDark = getTheme() === 'dark';
  // Đang ở chế độ tối thì nút mời chuyển sang sáng, và ngược lại
  const label = isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';
  btn.setAttribute('aria-label', label);
  btn.setAttribute('title', label);
  const icon = isDark ? THEME_ICON_SUN : THEME_ICON_MOON;
  const text = btn.dataset.themeToggle === 'full'
    ? `<span class="font-body text-sm">${isDark ? 'Giao diện sáng' : 'Giao diện tối'}</span>`
    : '';
  btn.innerHTML = icon + text;
}

// ---------- Ảnh dự phòng khi link ảnh hỏng ----------
// Trước đây ảnh lỗi hiện icon "ảnh vỡ" mặc định của trình duyệt, trông rất xấu.
// Giờ thay bằng một hình SVG xám nhạt cùng tông với site.
const IMG_FALLBACK = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-4.35-4.35a2 2 0 0 0-2.83 0L3 21"/></svg>'
);

function initImageFallback() {
  // Dùng capture vì sự kiện `error` của <img> không nổi bọt lên document.
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    if (img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = '1';
    img.src = IMG_FALLBACK;
    img.classList.add('img-fallback');
  }, true);
}

// ---------- Menu mobile, nút sáng/tối, nút lên đầu trang ----------
// Toàn bộ được chèn bằng JS để 6 trang HTML không phải lặp lại cùng một đoạn markup.
const NAV_LINKS = [
  { href: 'index.html', label: 'Trang Chủ' },
  { href: 'san-pham.html', label: 'Sản Phẩm' },
  { href: 'khuyen-mai.html', label: 'Khuyến Mãi' },
  { href: 'lien-he.html', label: 'Liên Hệ' }
];

function currentPageFile() {
  const file = location.pathname.split('/').pop();
  return file === '' ? 'index.html' : file;
}

function initSkipLink() {
  const target = document.querySelector('main') || document.querySelector('h1');
  if (!target) return;
  if (!target.id) target.id = 'noi-dung-chinh';
  target.setAttribute('tabindex', '-1');
  document.body.insertAdjacentHTML('afterbegin',
    `<a href="#${target.id}" class="skip-link font-display">Bỏ qua tới nội dung chính</a>`);
}

function initHeaderControls() {
  const nav = document.querySelector('header nav');
  if (!nav || document.getElementById('site-drawer')) return;

  const here = currentPageFile();

  // Nút sáng/tối (desktop) + nút ☰ (mobile), gom vào 1 ô ở cuối thanh điều hướng
  nav.insertAdjacentHTML('beforeend', `
    <div class="flex items-center gap-2 shrink-0">
      <button type="button" data-theme-toggle="icon"
        class="focus-ring hidden sm:inline-flex w-9 h-9 rounded-lg border border-white/20 text-white/70 hover:text-ember hover:border-ember items-center justify-center transition-colors"></button>
      <button type="button" id="nav-hamburger" aria-label="Mở menu" aria-expanded="false" aria-controls="site-drawer"
        class="focus-ring sm:hidden w-9 h-9 rounded-lg border border-white/20 text-white/80 hover:text-ember hover:border-ember flex items-center justify-center transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
    </div>
  `);

  // Ngăn menu trượt ra từ bên phải
  document.body.insertAdjacentHTML('beforeend', `
    <div id="site-drawer" class="hidden fixed inset-0 z-[140] sm:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div id="site-drawer-backdrop" class="absolute inset-0 bg-navy-950/70 backdrop-blur-sm"></div>
      <div id="site-drawer-panel" class="absolute top-0 right-0 h-full w-[80%] max-w-xs bg-navy-950 border-l border-white/10 flex flex-col">
        <div class="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span class="font-display font-800 text-lg tracking-tight text-white">Kim Long</span>
          <button type="button" id="site-drawer-close" aria-label="Đóng menu"
            class="focus-ring w-9 h-9 rounded-lg text-white/70 hover:text-ember flex items-center justify-center transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <nav class="flex-1 overflow-y-auto px-3 py-4">
          <ul class="flex flex-col gap-1">
            ${NAV_LINKS.map(l => `
              <li>
                <a href="${l.href}" class="focus-ring flex items-center justify-between rounded-xl px-4 py-3 font-display font-700 text-base transition-colors ${
                  l.href === here ? 'bg-ember/15 text-ember' : 'text-white/75 hover:bg-white/5 hover:text-white'
                }">
                  ${l.label}
                  <span aria-hidden="true" class="text-white/30">→</span>
                </a>
              </li>`).join('')}
          </ul>
        </nav>

        <div class="px-3 pb-3 flex flex-col gap-2 border-t border-white/10 pt-3">
          <button type="button" data-theme-toggle="full"
            class="focus-ring flex items-center gap-2.5 rounded-xl px-4 py-3 text-white/75 hover:bg-white/5 hover:text-white transition-colors"></button>
          <a href="tel:${STORE_PHONE}" class="focus-ring flex items-center justify-center gap-2 rounded-xl bg-ember hover:bg-ember-dark text-white font-display font-700 text-sm px-4 py-3 transition-colors">
            📞 Gọi ${STORE_PHONE_PRETTY}
          </a>
          <a href="https://zalo.me/${STORE_PHONE}" target="_blank" rel="noopener" class="focus-ring flex items-center justify-center gap-2 rounded-xl border border-white/20 text-white/75 hover:border-sky-400 hover:text-sky-400 font-display font-700 text-sm px-4 py-3 transition-colors">
            Nhắn Zalo
          </a>
        </div>
      </div>
    </div>
  `);

  const drawer = document.getElementById('site-drawer');
  const hamburger = document.getElementById('nav-hamburger');

  function openDrawer() {
    drawer.classList.remove('hidden');
    document.body.classList.add('drawer-open');
    hamburger.setAttribute('aria-expanded', 'true');
    // Đợi 1 khung hình để trình duyệt kịp nhận trạng thái đầu, hiệu ứng trượt mới chạy
    requestAnimationFrame(() => drawer.classList.add('drawer-visible'));
    document.getElementById('site-drawer-close').focus();
  }
  function closeDrawer() {
    drawer.classList.remove('drawer-visible');
    document.body.classList.remove('drawer-open');
    hamburger.setAttribute('aria-expanded', 'false');
    setTimeout(() => drawer.classList.add('hidden'), 280);
  }

  hamburger.addEventListener('click', openDrawer);
  document.getElementById('site-drawer-close').addEventListener('click', closeDrawer);
  document.getElementById('site-drawer-backdrop').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.classList.contains('hidden')) closeDrawer();
  });

  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    syncThemeToggleButton(btn);
    btn.addEventListener('click', toggleTheme);
  });
}

function initBackToTop() {
  if (document.getElementById('back-to-top')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <button type="button" id="back-to-top" aria-label="Lên đầu trang" title="Lên đầu trang"
      class="focus-ring fixed right-4 bottom-6 z-40 w-11 h-11 rounded-full bg-navy-950 text-white border border-white/15 shadow-lg hover:bg-brand transition-colors flex items-center justify-center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
    </button>
  `);
  const btn = document.getElementById('back-to-top');
  const onScroll = () => btn.classList.toggle('btt-visible', window.scrollY > 400);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// Gọi 1 lần cho mọi trang — không cần trang nào phải tự gọi.
function initSiteChrome() {
  initImageFallback();
  initSkipLink();
  initHeaderControls();
  initBackToTop();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSiteChrome);
} else {
  initSiteChrome();
}

// ---------- Chia sẻ sản phẩm ----------
// Trên điện thoại, navigator.share mở bảng chia sẻ sẵn có của hệ điều hành — trong đó
// đã có Zalo, Messenger, SMS... nên không cần tự làm nút cho từng ứng dụng. Máy tính
// để bàn thường không hỗ trợ, khi đó rơi về sao chép đường dẫn.
async function sharePage(title, url) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (err) {
      // Người dùng bấm hủy — không phải lỗi, đừng làm phiền họ thêm
      if (err && err.name === 'AbortError') return;
    }
  }
  copyLink(url);
}

async function copyLink(url) {
  try {
    await navigator.clipboard.writeText(url);
    showToast('Đã sao chép đường dẫn, bạn có thể dán để gửi cho người khác!');
  } catch {
    showToast('Không sao chép được. Bạn hãy copy đường dẫn trên thanh địa chỉ.', 'error');
  }
}

// ====================================================================
// ====== Dữ liệu có cấu trúc JSON-LD (giúp Google hiểu nội dung) ======
// ====================================================================

// "590.000 đ" -> 590000 ; "1.450.000 đ" -> 1450000 ; không đọc được -> null
function parsePriceNumber(str) {
  const digits = String(str ?? '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

// Chèn (hoặc cập nhật) một khối <script type="application/ld+json"> theo id.
// Trang chi tiết sản phẩm gọi lại hàm này sau khi tải xong dữ liệu từ Supabase.
function injectJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

// Thông tin cửa hàng — dùng lại ở nhiều trang
function storeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${SITE_URL}/#store`,
    name: STORE_NAME,
    url: `${SITE_URL}/`,
    image: `${SITE_URL}/icon-512.png`,
    logo: `${SITE_URL}/icon-512.png`,
    description: 'Đồ điện gia dụng chính hãng: nồi cơm điện, quạt điện, bóng đèn LED và nhiều thiết bị khác. Bảo hành rõ ràng, giao hàng nhanh.',
    telephone: `+84${STORE_PHONE.replace(/^0/, '')}`,
    email: STORE_EMAIL,
    priceRange: '20.000đ - 2.000.000đ',
    areaServed: 'VN',
    address: { '@type': 'PostalAddress', addressCountry: 'VN' },
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '08:00',
      closes: '21:00'
    }]
  };
}

// Đường dẫn phân cấp (Trang Chủ / Sản Phẩm / ...) hiện dưới tiêu đề trên Google
function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}/${it.file}`
    }))
  };
}
