-- ============================================================
-- Thêm "đơn vị tính" (ĐVT) cho sản phẩm — dùng ở tab Sản Phẩm, Kế Toán &
-- Thuế, và Kho. CHẠY SAU inventory_movements.sql (cần hàm
-- adjust_product_stock() và bảng inventory_movements ở đó).
-- Chạy 1 lần trong Supabase Dashboard -> SQL Editor -> New query.
-- An toàn để chạy lại (idempotent).
-- ============================================================

-- Đơn vị tính của sản phẩm (Cái, Hộp, Thùng, Kg...), sửa ở tab Sản Phẩm.
alter table products add column if not exists unit text not null default 'Cái';

-- Lưu lại ĐVT tại thời điểm lập đơn/ghi nhận kho — giữ đúng lịch sử kể cả
-- khi sau này đổi đơn vị tính của sản phẩm trong danh mục.
alter table sales_order_items add column if not exists unit text;
alter table inventory_movements add column if not exists unit text;

update sales_order_items set unit = 'Cái' where unit is null;

-- Thay hàm adjust_product_stock() (3 tham số, từ inventory_movements.sql)
-- bằng bản mới: vẫn cộng/trừ tồn kho + ghi nhật ký như cũ, chỉ thêm việc
-- lưu kèm đơn vị tính hiện tại của sản phẩm vào inventory_movements.unit.
drop function if exists adjust_product_stock(bigint, integer, text);

create or replace function adjust_product_stock(p_product_id bigint, p_delta integer, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_unit text;
begin
  if p_product_id is null then
    return;
  end if;
  if accounting_caller_role() not in ('admin', 'accountant') then
    raise exception 'Không có quyền cập nhật tồn kho';
  end if;

  select name, unit into v_name, v_unit from products where id = p_product_id;
  update products set stock = greatest(coalesce(stock, 0) + p_delta, 0) where id = p_product_id;
  insert into inventory_movements (product_id, product_name, unit, delta, reason)
    values (p_product_id, v_name, v_unit, p_delta, p_reason);
end;
$$;

grant execute on function adjust_product_stock(bigint, integer, text) to authenticated;
