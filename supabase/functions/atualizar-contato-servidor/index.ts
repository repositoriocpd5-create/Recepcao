// Supabase Edge Function: atualizar-contato-servidor
// Permite que qualquer operador ativo (inclusive recepcionista) complete o telefone e o
// e-mail de um servidor no balcão. A RLS de public.servidores só libera edição para
// admin/gestor; por isso a alteração passa por aqui, restrita a esses dois campos e auditada.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Chave secreta do projeto: novas chaves (SUPABASE_SECRET_KEYS, "sb_secret_...") ou a service_role antiga.
const chaveSecreta = () => {
  try {
    const novas = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
    const chave = novas.default ?? Object.values(novas)[0];
    if (chave) return chave;
  } catch { /* variável ausente ou em outro formato */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
};

const texto = (value: unknown) => (typeof value === "string" ? value.trim() : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = chaveSecreta();
    if (!url || !serviceKey) return json({ error: "Função sem acesso às chaves do projeto." }, 500);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // Quem chama precisa estar logado e ter perfil ativo.
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: authData } = token ? await admin.auth.getUser(token) : { data: { user: null } };
    const caller = authData?.user;
    if (!caller) return json({ error: "Sessão expirada. Entre novamente no sistema." }, 401);
    const { data: perfil } = await admin.from("profiles").select("email, ativo").eq("id", caller.id).maybeSingle();
    if (!perfil || perfil.ativo === false) return json({ error: "Seu usuário não está ativo no sistema." }, 403);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Requisição inválida." }, 400);
    }
    const servidorId = texto(body.servidor_id);
    const telefone = texto(body.telefone).replace(/[^\d()+\-\s]/g, "");
    const email = texto(body.email).toLowerCase();
    const digitos = telefone.replace(/\D/g, "");

    if (!servidorId) return json({ error: "Servidor não informado." }, 400);
    if (!telefone && !email) return json({ error: "Informe o telefone ou o e-mail." }, 400);
    if (telefone && (digitos.length < 10 || digitos.length > 13)) return json({ error: "Telefone inválido. Use DDD + número." }, 400);
    if (email && !EMAIL_REGEX.test(email)) return json({ error: "E-mail inválido." }, 400);

    const { data: anterior } = await admin.from("servidores").select("id, telefone, email").eq("id", servidorId).maybeSingle();
    if (!anterior) return json({ error: "Servidor não encontrado." }, 404);

    const alteracao: Record<string, string> = {};
    if (telefone) alteracao.telefone = telefone;
    if (email) alteracao.email = email;
    const { data: servidor, error } = await admin.from("servidores").update(alteracao).eq("id", servidorId).select().single();
    if (error) return json({ error: `Não foi possível salvar o contato: ${error.message}` }, 500);

    await admin.from("auditoria_logs").insert({
      usuario_id: caller.id,
      usuario_email: perfil.email ?? caller.email ?? null,
      acao: "ATUALIZAR_CONTATO_SERVIDOR",
      tabela: "servidores",
      registro_id: servidorId,
      detalhes: { antes: { telefone: anterior.telefone, email: anterior.email }, depois: alteracao },
    });

    return json({ servidor });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
