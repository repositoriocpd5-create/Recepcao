// Supabase Edge Function: login-matricula
// Permite entrar com a matrícula no lugar do e-mail. A matrícula de cada operador fica em
// app_metadata.matricula (gravada pela admin-manage-user). O e-mail nunca é devolvido ao
// navegador: a função faz o login aqui e devolve só a sessão, para a matrícula não servir
// para descobrir e-mails.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MATRICULA_REGEX = /^\d{3,10}$/;
// Mesma mensagem para matrícula inexistente ou senha errada.
const CREDENCIAIS_INVALIDAS = "Matrícula ou senha incorretas.";

// Chave secreta do projeto: novas chaves (SUPABASE_SECRET_KEYS, "sb_secret_...") ou a service_role antiga.
const chaveSecreta = () => {
  try {
    const novas = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
    const chave = novas.default ?? Object.values(novas)[0];
    if (chave) return chave;
  } catch { /* variável ausente ou em outro formato */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = chaveSecreta();
    if (!url || !serviceKey) return json({ error: "Função sem acesso às chaves do projeto." }, 500);
    const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };
    const admin = createClient(url, serviceKey, opcoes);

    let body: { matricula?: unknown; password?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Requisição inválida." }, 400);
    }
    const matricula = typeof body.matricula === "string" ? body.matricula.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!MATRICULA_REGEX.test(matricula) || !password) return json({ error: CREDENCIAIS_INVALIDAS }, 400);

    let email: string | undefined;
    for (let page = 1; !email; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return json({ error: "Não foi possível validar a matrícula agora. Tente novamente." }, 500);
      email = data.users.find((u) => u.app_metadata?.matricula === matricula)?.email;
      if (data.users.length < 1000) break;
    }
    if (!email) return json({ error: CREDENCIAIS_INVALIDAS }, 400);

    // Cliente separado para o login não alterar o cliente administrativo.
    const sessao = createClient(url, serviceKey, opcoes);
    const { data, error } = await sessao.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      const suspenso = /banned/i.test(error?.message ?? "");
      return json({ error: suspenso ? "Esta conta está desativada. Procure o administrador." : CREDENCIAIS_INVALIDAS }, 400);
    }

    return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
