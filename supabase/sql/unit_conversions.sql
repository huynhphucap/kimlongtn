-- ============================================================
-- Quy đổi đơn vị tính cho sản phẩm (vd 1 Thùng = 24 Cái). Dùng ở tab Kho
-- để: (1) hiển thị tồn kho quy đổi ra nhiều đơn vị cùng lúc — luôn tính từ
-- MỘT con số tồn kho gốc (products.stock, đơn vị products.unit) nên không
-- bao giờ lệch nhau; (2) tự tính số lượng cộng vào kho khi nhập/điều chỉnh
-- theo 1 đơn vị khác đơn vị gốc (vd nhập 10 Thùng -> tự cộng 240 Cái).
--
-- CHẠY SAU accounting_schema.sql (cần hàm accounting_caller_role()). Độc
-- lập với các file kho khác, chạy trước/sau đều được.
-- Chạy 1 lần trong Supabase Dashboard -> SQL Editor -> New query.
-- An toàn để chạy lại (idempotent).
-- ============================================================

create table if not exists product_unit_conversions (
  id bigint generated always as identity primary key,
  product_id bigint not null references products(id) on delete cascade,
  unit text not null,
  factor numeric(14,4) not null,
  created_at timestamptz not null default now(),
  constraint product_unit_conversions_factor_positive check (factor > 0),
  unique (product_id, unit)
);

create index if not exists product_unit_conversions_product_id_idx on product_unit_conversions (product_id);

alter table product_unit_conversions enable row level security;

drop policy if exists "accounting_role_select" on product_unit_conversions;
drop policy if exists "accounting_role_insert" on product_unit_conversions;
drop policy if exists "accounting_role_delete" on product_unit_conversions;
create policy "accounting_role_select" on product_unit_conversions for select
  using (accounting_caller_role() in ('admin', 'accountant'));
create policy "accounting_role_insert" on product_unit_conversions for insert
  with check (accounting_caller_role() in ('admin', 'accountant'));
create policy "accounting_role_delete" on product_unit_conversions for delete
  using (accounting_caller_role() in ('admin', 'accountant'));
