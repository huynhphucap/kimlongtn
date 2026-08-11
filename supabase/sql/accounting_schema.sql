-- ============================================================
-- Module Kế Toán & Thuế (nội bộ, tab "Kế Toán & Thuế" trong admin.html)
--
-- Repo này không dùng Supabase CLI migrations (schema được quản lý thủ công
-- qua SQL Editor) — chạy TOÀN BỘ file này 1 lần trong Supabase Dashboard ->
-- SQL Editor -> New query, trên đúng project đang dùng cho trang web.
--
-- An toàn để chạy lại (idempotent): "create table if not exists", "insert
-- ... on conflict do nothing", "drop policy if exists" trước khi tạo lại.
-- ============================================================

-- Cấu hình thuế suất áp dụng chung cho đơn hàng mới tạo (chỉ 1 dòng, id = 1).
-- Đơn hàng đã tạo lưu lại tax_rate riêng của nó nên đổi thuế suất ở đây
-- không làm thay đổi số liệu của các đơn cũ.
create table if not exists accounting_settings (
  id smallint primary key default 1,
  tax_rate numeric(5,2) not null default 8,
  updated_at timestamptz not null default now(),
  constraint accounting_settings_single_row check (id = 1)
);
insert into accounting_settings (id, tax_rate) values (1, 8)
  on conflict (id) do nothing;

-- Đơn bán hàng ghi nhận thủ công bởi admin/kế toán. Độc lập với bảng
-- "contacts" (chứa yêu cầu báo giá của khách trên web) — không phải đơn nào
-- cũng chốt từ web.
create table if not exists sales_orders (
  id bigint generated always as identity primary key,
  order_date date not null default current_date,
  customer_name text,
  customer_phone text,
  note text,
  subtotal numeric(14,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- Từng dòng sản phẩm trong 1 đơn.
create table if not exists sales_order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references sales_orders(id) on delete cascade,
  product_name text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0
);

create index if not exists sales_order_items_order_id_idx on sales_order_items (order_id);
create index if not exists sales_orders_order_date_idx on sales_orders (order_date desc);

alter table accounting_settings enable row level security;
alter table sales_orders enable row level security;
alter table sales_order_items enable row level security;

-- Vai trò của người gọi, đọc thẳng từ JWT (app_metadata.role, do edge
-- function admin-users set) — PHẢI khớp logic getRole()/getUserRole() ở
-- supabase/functions/admin-users/index.ts và admin.html:
--   - status = "pending" -> không có quyền gì (trả về null)
--   - role có giá trị    -> dùng giá trị đó
--   - còn lại (tài khoản duyệt từ trước khi có role) -> mặc định "admin"
create or replace function accounting_caller_role() returns text
language sql stable as $$
  select case
    when coalesce(auth.jwt() -> 'app_metadata' ->> 'status', 'approved') <> 'approved' then null
    else coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'admin')
  end
$$;

-- sales_orders: admin và accountant đọc/ghi/sửa/xoá như nhau.
drop policy if exists "accounting_role_select" on sales_orders;
drop policy if exists "accounting_role_insert" on sales_orders;
drop policy if exists "accounting_role_update" on sales_orders;
drop policy if exists "accounting_role_delete" on sales_orders;
create policy "accounting_role_select" on sales_orders for select
  using (accounting_caller_role() in ('admin', 'accountant'));
create policy "accounting_role_insert" on sales_orders for insert
  with check (accounting_caller_role() in ('admin', 'accountant'));
create policy "accounting_role_update" on sales_orders for update
  using (accounting_caller_role() in ('admin', 'accountant'));
create policy "accounting_role_delete" on sales_orders for delete
  using (accounting_caller_role() in ('admin', 'accountant'));

-- sales_order_items: giống sales_orders.
drop policy if exists "accounting_role_select" on sales_order_items;
drop policy if exists "accounting_role_insert" on sales_order_items;
drop policy if exists "accounting_role_update" on sales_order_items;
drop policy if exists "accounting_role_delete" on sales_order_items;
create policy "accounting_role_select" on sales_order_items for select
  using (accounting_caller_role() in ('admin', 'accountant'));
create policy "accounting_role_insert" on sales_order_items for insert
  with check (accounting_caller_role() in ('admin', 'accountant'));
create policy "accounting_role_update" on sales_order_items for update
  using (accounting_caller_role() in ('admin', 'accountant'));
create policy "accounting_role_delete" on sales_order_items for delete
  using (accounting_caller_role() in ('admin', 'accountant'));

-- accounting_settings: cả 2 role đọc được thuế suất, nhưng CHỈ admin sửa
-- được (khớp với UI: ô sửa thuế suất chỉ hiện cho admin trong admin.html).
drop policy if exists "accounting_settings_select" on accounting_settings;
drop policy if exists "accounting_settings_update" on accounting_settings;
create policy "accounting_settings_select" on accounting_settings for select
  using (accounting_caller_role() in ('admin', 'accountant'));
create policy "accounting_settings_update" on accounting_settings for update
  using (accounting_caller_role() = 'admin');
