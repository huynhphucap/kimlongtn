-- ============================================================
-- Cho phép ghi đè đơn vị tính riêng khi nhập kho (vd sản phẩm mặc định
-- tính theo "Cái" nhưng lần này nhập theo "Thùng"). CHẠY SAU
-- product_unit.sql (cần cột inventory_movements.unit ở đó).
-- Chạy 1 lần trong Supabase Dashboard -> SQL Editor -> New query.
-- An toàn để chạy lại (idempotent).
-- ============================================================

-- Thay hàm adjust_product_stock() (3 tham số, từ product_unit.sql) bằng
-- bản có thêm p_unit (tuỳ chọn): nếu truyền vào thì ghi log kho theo đơn vị
-- đó, không thì vẫn lấy đơn vị mặc định của sản phẩm như trước. KHÔNG quy
-- đổi số lượng — p_delta vẫn cộng/trừ thẳng vào products.stock, nên nếu
-- nhập theo đơn vị lớn hơn (vd Thùng) thì tự quy đổi ra số lượng ở đơn vị
-- gốc của sản phẩm trước khi nhập số lượng.
drop function if exists adjust_product_stock(bigint, integer, text);

create or replace function adjust_product_stock(p_product_id bigint, p_delta integer, p_reason text default null, p_unit text default null)
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
    values (p_product_id, v_name, coalesce(nullif(p_unit, ''), v_unit), p_delta, p_reason);
end;
$$;

grant execute on function adjust_product_stock(bigint, integer, text, text) to authenticated;
