// Cấu hình Tailwind dùng chung cho mọi trang công khai.
// Trước đây đoạn này bị dán lại y hệt ở 6 file HTML — muốn đổi 1 mã màu phải sửa 6 chỗ.
// LƯU Ý: file này phải được nạp NGAY SAU thẻ <script src="https://cdn.tailwindcss.com">.
// Nếu mạng chặn CDN thì `tailwind` không tồn tại — tạo tạm một đối tượng rỗng để
// dòng gán bên dưới không văng lỗi và làm hỏng các đoạn script sau đó của trang.
window.tailwind = window.tailwind || {};

tailwind.config = {
  // Bật chế độ tối theo class `dark` trên thẻ <html> (do js/shared.js bật/tắt),
  // thay vì tự động theo cài đặt máy — để nút chuyển sáng/tối hoạt động được.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: { 950: '#0B1220', 900: '#0F1B33', 800: '#152A4D' },
        brand: { DEFAULT: '#2563EB', light: '#5B8DFF' },
        ember: { DEFAULT: '#F97316', dark: '#C2540A' },
        slate: { 150: '#EEF1F6' }
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  }
};
