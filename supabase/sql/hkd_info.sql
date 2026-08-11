-- ============================================================
-- Thông tin hộ kinh doanh (tên, địa chỉ) — in vào phần đầu Sổ S1-HKD khi
-- xuất Excel ở tab Kế Toán & Thuế. CHẠY SAU accounting_schema.sql (cần
-- bảng accounting_settings ở đó).
-- Chạy 1 lần trong Supabase Dashboard -> SQL Editor -> New query.
-- An toàn để chạy lại (idempotent).
-- ============================================================

alter table accounting_settings add column if not exists hkd_name text;
alter table accounting_settings add column if not exists hkd_address text;
