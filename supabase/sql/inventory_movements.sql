-- ============================================================
-- Module Kế Toán & Thuế — bổ sung: tab "Kho" (xem tồn kho tất cả sản phẩm
-- 1 chỗ, nhập/xuất kho không qua đơn bán hàng, nhật ký thay đổi tồn kho).
-- CHẠY SAU accounting_inventory.sql (cần bảng products.stock, hàm
-- accounting_caller_role() và hàm adjust_product_stock() cũ ở đó).
-- Chạy 1 lần trong Supabase Dashboard -> SQL Editor -> New query.
-- An toàn để chạy lại (idempotent).
-- ============================================================

-- Nhật ký MỌI thay đổi tồn kho: bán hàng qua đơn, hoàn kho khi sửa/xóa
-- đơn (tự động ghi từ tab Kế Toán & Thuế), và điều chỉnh tay ở tab "Kho"
-- (nhập hàng mới về, kiểm kê, hàng hỏng...). product_name lưu lại tại thời
-- điểm ghi để lịch sử vẫn đọc được kể cả khi sản phẩm bị đổi tên/xóa sau đó.
create table if not exists inventory_movements (
  id bigint generated always as identity primary key,
  product_id bigint references products(id) on delete set null,
  product_name text,
  delta integer not null,
  reason text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_product_id_idx on inventory_movements (product_id);
create index if not exists inventory_movements_created_at_idx on inventory_movements (created_at desc);

alter table inventory_movements enable row level security;

drop policy if exists "accounting_role_select" on inventory_movements;
drop policy if exists "accounting_role_insert" on inventory_movements;
create policy "accounting_role_select" on inventory_movements for select
  using (accounting_caller_role() in ('admin', 'accountant'));
create policy "accounting_role_insert" on inventory_movements for insert
  with check (accounting_caller_role() in ('admin', 'accountant'));

-- Thay hàm adjust_product_stock() cũ (2 tham số, từ accounting_inventory.sql)
-- bằng bản mới có thêm p_reason — vẫn cộng/trừ tồn kho như cũ, nhưng giờ tự
-- ghi 1 dòng vào inventory_movements mỗi lần gọi, nên MỌI nơi đang gọi hàm
-- này (tạo/sửa/xóa đơn bán hàng ở tab Kế Toán & Thuế) tự động có lịch sử ở
-- tab Kho mà không cần sửa gì thêm ngoài phần admin.html đã cập nhật.
drop function if exists adjust_product_stock(bigint, integer);

create or replace function adjust_product_stock(p_product_id bigint, p_delta integer, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if p_product_id is null then
    return;
  end if;
  if accounting_caller_role() not in ('admin', 'accountant') then
    raise exception 'Không có quyền cập nhật tồn kho';
  end if;

  select name into v_name from products where id = p_product_id;
  update products set stock = greatest(coalesce(stock, 0) + p_delta, 0) where id = p_product_id;
  insert into inventory_movements (product_id, product_name, delta, reason)
    values (p_product_id, v_name, p_delta, p_reason);
end;
$$;

grant execute on function adjust_product_stock(bigint, integer, text) to authenticated;
