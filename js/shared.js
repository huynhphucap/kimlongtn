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
    error: { bg: 'bg-red-600', icon: '✕' }
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
