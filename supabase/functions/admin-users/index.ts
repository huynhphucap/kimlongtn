// Edge Function: quản lý tài khoản admin (list / thêm / xóa).
//
// Trang admin.html không thể gọi thẳng Supabase Admin API (/auth/v1/admin/users)
// vì thao tác đó cần service_role key — key này không bao giờ được đưa vào code
// chạy trên trình duyệt. Function này chạy phía server, giữ service_role key an
// toàn trong biến môi trường (Supabase tự inject sẵn, không cần cấu hình thêm),
// và chỉ cho phép người gọi đã đăng nhập hợp lệ (Authorization Bearer là access
// token thật từ sb.auth.signInWithPassword) thực hiện thao tác.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ message: "Thiếu Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Xác thực người gọi là một tài khoản đã đăng nhập hợp lệ.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) return jsonResponse({ message: "Phiên đăng nhập không hợp lệ" }, 401);

    // Client quyền admin thật sự — service_role key chỉ tồn tại ở đây, phía server.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (req.method === "GET") {
      const { data, error } = await adminClient.auth.admin.listUsers();
      if (error) throw error;
      return jsonResponse({ users: data.users });
    }

    if (req.method === "POST") {
      const { email, password } = await req.json();
      if (!email || !password) return jsonResponse({ message: "Thiếu email hoặc mật khẩu" }, 400);
      const { data, error } = await adminClient.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (error) throw error;
      return jsonResponse({ user: data.user });
    }

    if (req.method === "DELETE") {
      const { id } = await req.json();
      if (!id) return jsonResponse({ message: "Thiếu id tài khoản" }, 400);
      const { error } = await adminClient.auth.admin.deleteUser(id);
      if (error) throw error;
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ message: "Method không hỗ trợ" }, 405);
  } catch (err) {
    return jsonResponse({ message: err instanceof Error ? err.message : "Lỗi không xác định" }, 500);
  }
});
