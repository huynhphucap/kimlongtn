-- ============================================================
-- Module Kế Toán & Thuế — bổ sung: chọn sản phẩm có sẵn khi lập đơn bán
-- hàng + theo dõi tồn kho. CHẠY SAU accounting_schema.sql (cần bảng
-- sales_orders/sales_order_items và hàm accounting_caller_role() ở đó).
-- Chạy 1 lần trong Supabase Dashboard -> SQL Editor -> New query.
-- An toàn để chạy lại (idempotent).
-- ============================================================

-- Tồn kho của từng sản phẩm — sửa tay ở tab "Sản Phẩm" (đặt số ban đầu),
-- sau đó tự động trừ khi lập đơn / hoàn lại khi sửa hoặc xóa đơn ở tab
-- "Kế Toán & Thuế".
alter table products add column if not exists stock integer not null default 0;

-- Liên kết dòng đơn hàng với đúng sản phẩm trong danh mục (để trừ tồn kho
-- đúng sản phẩm khi lưu đơn). NULL nếu dòng đó là hàng/dịch vụ nhập tay,
-- không có trong danh mục sản phẩm — dòng như vậy không theo dõi tồn kho.
alter table sales_order_items add column if not exists product_id bigint references products(id) on delete set null;

-- Cộng/trừ tồn kho theo p_delta (âm khi bán, dương khi hoàn lại do sửa/xóa
-- đơn). Dùng SECURITY DEFINER để kế toán trừ được kho khi bán hàng mà
-- KHÔNG cần cấp quyền UPDATE trực tiếp trên bảng products (giữ nguyên các
-- quyền/RLS khác của bảng products như hiện tại — hàm tự kiểm tra quyền
-- bằng accounting_caller_role()). Không cho tồn kho âm.
create or replace function adjust_product_stock(p_product_id bigint, p_delta integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_product_id is null then
    return;
  end if;
  if accounting_caller_role() not in ('admin', 'accountant') then
    raise exception 'Không có quyền cập nhật tồn kho';
  end if;
  update products set stock = greatest(coalesce(stock, 0) + p_delta, 0) where id = p_product_id;
end;
$$;

grant execute on function adjust_product_stock(bigint, integer) to authenticated;
