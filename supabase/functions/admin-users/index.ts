// Edge Function: quản lý tài khoản admin (list / thêm / duyệt / xóa) và
// đăng ký công khai (tự tạo tài khoản ở trạng thái "chờ duyệt").
//
// Trang admin.html không thể gọi thẳng Supabase Admin API (/auth/v1/admin/users)
// vì thao tác đó cần service_role key — key này không bao giờ được đưa vào code
// chạy trên trình duyệt. Function này chạy phía server, giữ service_role key an
// toàn trong biến môi trường (Supabase tự inject sẵn, không cần cấu hình thêm).
//
// Hai nhóm request:
// - POST { selfRegister: true, ... }: công khai, ai cũng gọi được (không cần
//   đăng nhập trước), luôn tạo tài khoản với app_metadata.status = "pending".
// - Mọi request khác (GET / POST thường / PATCH / DELETE): cần Authorization
//   Bearer là access token thật từ sb.auth.signInWithPassword, VÀ tài khoản gọi
//   phải đã được duyệt (app_metadata.status khác "pending") — tài khoản cũ tạo
//   trước khi có tính năng này không có trường status nên vẫn coi là đã duyệt.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isApproved(user: { app_metadata?: Record<string, unknown> }) {
  return user?.app_metadata?.status !== "pending";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const hasBody = req.method === "POST" || req.method === "PATCH" || req.method === "DELETE";
    const body = hasBody ? await req.json() : {};

    // ---------- Đăng ký công khai: không cần đăng nhập trước ----------
    if (req.method === "POST" && body.selfRegister) {
      const { email, password, full_name } = body;
      if (!email || !password) return jsonResponse({ message: "Thiếu email hoặc mật khẩu" }, 400);
      const { data, error } = await adminClient.auth.admin.createUser({
        email, password, email_confirm: true,
        app_metadata: { status: "pending" },
        user_metadata: full_name ? { full_name } : {},
      });
      if (error) throw error;
      return jsonResponse({ user: data.user });
    }

    // ---------- Mọi thao tác còn lại: cần đăng nhập & đã được duyệt ----------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ message: "Thiếu Authorization header" }, 401);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) return jsonResponse({ message: "Phiên đăng nhập không hợp lệ" }, 401);
    if (!isApproved(caller)) {
      return jsonResponse({ message: "Tài khoản của bạn đang chờ quản trị viên duyệt." }, 403);
    }

    if (req.method === "GET") {
      const { data, error } = await adminClient.auth.admin.listUsers();
      if (error) throw error;
      return jsonResponse({ users: data.users });
    }

    if (req.method === "POST") {
      const { email, password } = body;
      if (!email || !password) return jsonResponse({ message: "Thiếu email hoặc mật khẩu" }, 400);
      const { data, error } = await adminClient.auth.admin.createUser({
        email, password, email_confirm: true,
        app_metadata: { status: "approved" },
      });
      if (error) throw error;
      return jsonResponse({ user: data.user });
    }

    if (req.method === "PATCH") {
      const { id, status } = body;
      if (!id || status !== "approved") return jsonResponse({ message: "Thiếu id hoặc status không hợp lệ" }, 400);
      const { data, error } = await adminClient.auth.admin.updateUserById(id, {
        app_metadata: { status: "approved" },
      });
      if (error) throw error;
      return jsonResponse({ user: data.user });
    }

    if (req.method === "DELETE") {
      const { id } = body;
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
