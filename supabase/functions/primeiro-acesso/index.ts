// Supabase Edge Function: primeiro-acesso
// Primeiro acesso e "esqueci minha senha" por código enviado ao e-mail.
//
// 1. O navegador envia só o e-mail.
// 2. Se o e-mail está liberado (acessos_por_email) ou já tem conta ativa, a função cria a conta
//    quando ainda não existe (sem senha; papel e unidade vêm do gatilho de perfis) e pede ao
//    Supabase Auth o envio do código de uso único (modelo "Magic Link" com {{ .Token }}).
// 3. O navegador confirma o código (auth.verifyOtp) — ou a pessoa toca no link do e-mail, que
//    volta para /primeiro-acesso?etapa=senha já com a sessão — e grava a senha (auth.updateUser).
//
// A resposta é sempre a mesma para e-mail cadastrado ou não, para a tela não revelar quem tem
// acesso. Há limite de pedidos por e-mail e por endereço de origem.
// Publicar com --no-verify-jwt (é chamada antes do login).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESPOSTA_PADRAO = {
  ok: true,
  mensagem: "Se o e-mail estiver cadastrado, você receberá um código em instantes. Confira também a caixa de spam.",
};
const JANELA_MINUTOS = 15;
const MAX_POR_EMAIL = 3;
const MAX_POR_IP = 10;

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

    let body: { email?: unknown; retorno?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Requisição inválida." }, 400);
    }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    // Para onde o link do e-mail leva (tela de criar senha). Só http(s); o Supabase ainda
    // confere com o Site URL / Redirect URLs do projeto.
    let retorno: string | undefined;
    try {
      const u = new URL(typeof body.retorno === "string" ? body.retorno : "");
      if (u.protocol === "https:" || u.protocol === "http:") retorno = u.toString();
    } catch { /* sem retorno: usa o Site URL */ }
    if (!EMAIL_REGEX.test(email) || email.length > 254) return json({ error: "Informe um e-mail válido." }, 400);

    // Limite de pedidos (por e-mail e por origem) nos últimos minutos.
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
    const desde = new Date(Date.now() - JANELA_MINUTOS * 60_000).toISOString();
    const [porEmail, porIp] = await Promise.all([
      admin.from("primeiro_acesso_tentativas").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", desde),
      ip
        ? admin.from("primeiro_acesso_tentativas").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", desde)
        : Promise.resolve({ count: 0 }),
    ]);
    if ((porEmail.count ?? 0) >= MAX_POR_EMAIL || (porIp.count ?? 0) >= MAX_POR_IP) {
      return json({ error: `Muitos pedidos de código. Aguarde ${JANELA_MINUTOS} minutos e tente novamente.` }, 429);
    }
    await admin.from("primeiro_acesso_tentativas").insert({ email, ip });

    const [{ data: acesso }, { data: perfil }] = await Promise.all([
      admin.from("acessos_por_email").select("email, responsavel").eq("email", email).maybeSingle(),
      admin.from("profiles").select("id, ativo, nome_completo").eq("email", email).maybeSingle(),
    ]);

    // Sem liberação e sem conta, ou conta desativada: resposta igual, sem enviar nada.
    if ((!acesso && !perfil) || perfil?.ativo === false) return json(RESPOSTA_PADRAO);

    if (!perfil) {
      const { error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { nome_completo: acesso?.responsavel ?? email.split("@")[0] },
      });
      if (error && !/already|registered|exists/i.test(error.message)) {
        return json({ error: "Não foi possível preparar seu acesso agora. Tente novamente em instantes." }, 500);
      }
    }

    const envio = createClient(url, serviceKey, opcoes);
    const { error } = await envio.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: retorno } });
    if (error) {
      if (error.status === 429 || /rate|seconds|security purposes/i.test(error.message)) {
        return json({ error: "Um código acabou de ser enviado. Aguarde 1 minuto para pedir outro." }, 429);
      }
      return json({ error: "Não foi possível enviar o código agora. Tente novamente em instantes." }, 502);
    }

    return json(RESPOSTA_PADRAO);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
