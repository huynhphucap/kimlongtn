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
