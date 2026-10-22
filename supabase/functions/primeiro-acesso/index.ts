// Supabase Edge Function: primeiro-acesso
// Primeiro acesso e "esqueci minha senha" com código gerado pelo próprio sistema.
//
// Ações (POST { action, ... }):
//   solicitar   { email }                 → gera um código de 6 dígitos (10 min) e envia pelo SMTP do sistema
//   confirmar   { email, codigo }         → confere o código e devolve um token curto (15 min) para trocar a senha
//   redefinir   { email, token, senha }   → grava a senha (cria a conta do dirigente se ainda não existir)
//   smtp_obter / smtp_salvar / smtp_testar → configuração do e-mail do sistema (somente administrador)
//
// O código e o token ficam no banco só como hash (SHA-256 com a chave do servidor). As respostas de
// "solicitar" são iguais para e-mail cadastrado ou não. Há limite de pedidos por e-mail e por origem,
// e no máximo 5 tentativas por código.
// Publicar com --no-verify-jwt (é chamada antes do login; as ações de SMTP conferem o administrador).
// Observação: Edge Functions do Supabase não abrem conexões nas portas 25 e 587; use 465 (SSL).

import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESPOSTA_SOLICITAR = {
  ok: true,
  mensagem: "Se o e-mail estiver cadastrado, você receberá um código em instantes. Confira também a caixa de spam.",
};
const CODIGO_INVALIDO = "Código inválido ou expirado. Confira os números ou peça um novo código.";
const VALIDADE_CODIGO_MIN = 10;
const VALIDADE_TOKEN_MIN = 15;
const MAX_TENTATIVAS_CODIGO = 5;
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

const texto = (valor: unknown) => (typeof valor === "string" ? valor.trim() : "");

const hash = async (valor: string, pimenta: string) => {
  const dados = new TextEncoder().encode(`${pimenta}:${valor}`);
  const digest = await crypto.subtle.digest("SHA-256", dados);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

/** Comparação em tempo constante (não revela quantos caracteres batem). */
const iguais = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
};

/** 6 dígitos com gerador criptográfico (sem viés de módulo). */
const gerarCodigo = () => {
  const limite = 4_294_000_000; // múltiplo de 1.000.000 abaixo de 2^32
  const buffer = new Uint32Array(1);
  do crypto.getRandomValues(buffer); while (buffer[0] >= limite);
  return String(buffer[0] % 1_000_000).padStart(6, "0");
};

const gerarToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" }[c] as string));
};

const escaparHtml = (valor: string) =>
  valor.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

// Senha do SMTP cifrada (AES-GCM) com chave derivada da chave do servidor: no banco fica só "v1:iv:dados".
// Se a chave do projeto for trocada, basta o administrador informar a senha do SMTP de novo.
const chaveCifra = async (segredo: string) =>
  crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${segredo}:smtp`)), "AES-GCM", false, ["encrypt", "decrypt"]);
const paraB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const deB64 = (texto64: string) => Uint8Array.from(atob(texto64), (c) => c.charCodeAt(0));

const cifrar = async (valor: string, segredo: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const dados = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await chaveCifra(segredo), new TextEncoder().encode(valor)));
  return `v1:${paraB64(iv)}:${paraB64(dados)}`;
};

const decifrar = async (valor: string | null, segredo: string) => {
  if (!valor) return null;
  if (!valor.startsWith("v1:")) return valor; // gravada antes da cifra
  const [, iv, dados] = valor.split(":");
  try {
    const claro = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(iv) }, await chaveCifra(segredo), deB64(dados));
    return new TextDecoder().decode(claro);
  } catch {
    throw new HttpError(500, "Não foi possível ler a senha do e-mail do sistema. Informe a senha do SMTP novamente na Administração.");
  }
};

const senhaValida = (senha: string) => senha.length >= 8 && senha.length <= 72 && /[A-Za-zÀ-ÿ]/.test(senha) && /\d/.test(senha);

type ConfigSmtp = {
  host: string;
  porta: number;
  seguranca: "ssl" | "starttls" | "nenhuma";
  usuario: string | null;
  senha: string | null;
  remetente_email: string;
  remetente_nome: string;
};

const htmlEmail = (titulo: string, corpo: string, codigo: string | null, nome?: string | null) => `
<div style="margin:0;padding:24px 12px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden">
    <tr><td style="background:#1366e8;padding:22px 24px;text-align:center;color:#ffffff">
      <div style="font-size:20px;letter-spacing:.5px"><strong>SMEDU</strong> &nbsp;|&nbsp; SOLUÇÕES</div>
      <div style="font-size:12px;opacity:.85;margin-top:4px">Secretaria Municipal de Educação de Itaguaí</div>
    </td></tr>
    <tr><td style="padding:28px 24px 8px">
      <p style="margin:0 0 12px;font-size:15px">Olá${nome ? `, ${escaparHtml(nome.split(" ")[0])}` : ""},</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.5">${corpo}</p>
      ${codigo ? `<div style="text-align:center;margin:0 0 20px">
        <span style="display:inline-block;padding:14px 22px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;font-family:'Courier New',monospace;font-size:30px;font-weight:bold;letter-spacing:8px;color:#0b4fa3">${codigo}</span>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#4b5563">O código vale por <strong>${VALIDADE_CODIGO_MIN} minutos</strong> e só pode ser usado uma vez.</p>
      <p style="margin:0 0 20px;font-size:13px;color:#4b5563">Se você não pediu este código, ignore este e-mail. Ninguém consegue entrar sem ele.</p>` : ""}
    </td></tr>
    <tr><td style="padding:14px 24px 22px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;text-align:center">
      ${titulo} · Mensagem automática — não responda. Dúvidas: CPD da SMEDU.
    </td></tr>
  </table>
</div>`;

const enviarEmail = async (config: ConfigSmtp, para: string, assunto: string, html: string, textoSimples: string) => {
  const transporte = nodemailer.createTransport({
    host: config.host,
    port: config.porta,
    secure: config.seguranca === "ssl",
    requireTLS: config.seguranca === "starttls",
    auth: config.usuario ? { user: config.usuario, pass: config.senha ?? "" } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
  await transporte.sendMail({
    from: { name: config.remetente_nome, address: config.remetente_email },
    to: para,
    subject: assunto,
    text: textoSimples,
    html,
  });
};

/** Mensagem legível para falhas de SMTP (sem expor a senha). */
const erroSmtp = (error: unknown) => {
  const e = error as { code?: string; responseCode?: number; message?: string };
  if (e?.code === "EAUTH" || e?.responseCode === 535) return "O servidor de e-mail recusou o usuário ou a senha (para Gmail/Microsoft use uma senha de app).";
  if (e?.code === "ETIMEDOUT" || e?.code === "ECONNECTION" || /timed? ?out|connect/i.test(e?.message ?? "")) {
    return "Não foi possível conectar ao servidor de e-mail. Confira o servidor e use a porta 465 (SSL): as portas 25 e 587 são bloqueadas no Supabase.";
  }
  return `O servidor de e-mail recusou o envio: ${e?.message ?? "erro desconhecido"}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = chaveSecreta();
    if (!url || !serviceKey) throw new HttpError(500, "Função sem acesso às chaves do projeto.");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "Requisição inválida.");
    }
    const action = texto(body.action) || "solicitar";
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;

    /** Configuração gravada; a senha só é decifrada quando for usada no envio. */
    const lerSmtp = async (comSenha = false): Promise<ConfigSmtp | null> => {
      const { data } = await admin.from("config_smtp").select("*").eq("id", 1).maybeSingle();
      if (!data) return null;
      const config = data as ConfigSmtp;
      return comSenha ? { ...config, senha: await decifrar(config.senha, serviceKey) } : config;
    };

    // ─── Configuração de SMTP (somente administrador ativo) ───
    if (action.startsWith("smtp_")) {
      const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      const { data: authData } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
      const quem = authData?.user;
      const { data: perfil } = quem ? await admin.from("profiles").select("role, ativo, email").eq("id", quem.id).maybeSingle() : { data: null };
      if (!quem || perfil?.role !== "admin" || perfil?.ativo === false) throw new HttpError(403, "Apenas administradores configuram o e-mail do sistema.");

      if (action === "smtp_obter") {
        const config = await lerSmtp();
        if (!config) return json({ config: null });
        const { senha, ...resto } = config;
        return json({ config: { ...resto, tem_senha: Boolean(senha) } });
      }

      if (action === "smtp_salvar") {
        const c = (body.config ?? {}) as Record<string, unknown>;
        const host = texto(c.host);
        const porta = Number(c.porta);
        const seguranca = texto(c.seguranca);
        const remetente = texto(c.remetente_email).toLowerCase();
        if (!host || /\s/.test(host)) throw new HttpError(400, "Informe o servidor SMTP.");
        if (!Number.isInteger(porta) || porta < 1 || porta > 65535) throw new HttpError(400, "Porta inválida.");
        if (!["ssl", "starttls", "nenhuma"].includes(seguranca)) throw new HttpError(400, "Tipo de segurança inválido.");
        if (!EMAIL_REGEX.test(remetente)) throw new HttpError(400, "Informe o e-mail do remetente.");
        const atual = await lerSmtp();
        const novaSenha = typeof c.senha === "string" && c.senha.length ? await cifrar(c.senha, serviceKey) : atual?.senha ?? null;
        const { error } = await admin.from("config_smtp").upsert({
          id: 1,
          host,
          porta,
          seguranca,
          usuario: texto(c.usuario) || null,
          senha: novaSenha,
          remetente_email: remetente,
          remetente_nome: texto(c.remetente_nome) || "SMEDU Soluções",
          atualizado_em: new Date().toISOString(),
          atualizado_por: perfil?.email ?? quem.email,
        });
        if (error) throw new HttpError(500, `Não foi possível salvar: ${error.message}`);
        return json({ ok: true });
      }

      if (action === "smtp_testar") {
        const para = texto(body.para).toLowerCase();
        if (!EMAIL_REGEX.test(para)) throw new HttpError(400, "Informe o e-mail que vai receber o teste.");
        const config = await lerSmtp(true);
        if (!config) throw new HttpError(400, "Salve a configuração antes de testar.");
        try {
          await enviarEmail(config, para, "Teste de e-mail — SMEDU Soluções",
            htmlEmail("Teste de envio", "Este é um e-mail de teste: a configuração de envio do sistema está funcionando.", null),
            "Teste de e-mail do SMEDU Soluções: a configuração de envio do sistema está funcionando.");
        } catch (error) {
          throw new HttpError(502, erroSmtp(error));
        }
        return json({ ok: true, mensagem: `E-mail de teste enviado para ${para}.` });
      }

      throw new HttpError(400, "Ação não suportada.");
    }

    const email = texto(body.email).toLowerCase();
    if (!EMAIL_REGEX.test(email) || email.length > 254) throw new HttpError(400, "Informe um e-mail válido.");

    // ─── 1. Solicitar código ───
    if (action === "solicitar") {
      const desde = new Date(Date.now() - JANELA_MINUTOS * 60_000).toISOString();
      const [porEmail, porIp] = await Promise.all([
        admin.from("primeiro_acesso_tentativas").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", desde),
        ip
          ? admin.from("primeiro_acesso_tentativas").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", desde)
          : Promise.resolve({ count: 0 }),
      ]);
      if ((porEmail.count ?? 0) >= MAX_POR_EMAIL || (porIp.count ?? 0) >= MAX_POR_IP) {
        throw new HttpError(429, `Muitos pedidos de código. Aguarde ${JANELA_MINUTOS} minutos e tente novamente.`);
      }
      await admin.from("primeiro_acesso_tentativas").insert({ email, ip });

      // Sem SMTP, a mesma resposta para qualquer e-mail (não revela quem tem acesso).
      const config = await lerSmtp(true);
      if (!config) throw new HttpError(503, "O envio de e-mails do sistema ainda não foi configurado. Procure o administrador.");

      const [{ data: acesso }, { data: perfil }] = await Promise.all([
        admin.from("acessos_por_email").select("email, responsavel").eq("email", email).maybeSingle(),
        admin.from("profiles").select("id, ativo, nome_completo").eq("email", email).maybeSingle(),
      ]);
      // Sem liberação e sem conta, ou conta desativada: mesma resposta, sem enviar nada.
      if ((!acesso && !perfil) || perfil?.ativo === false) return json(RESPOSTA_SOLICITAR);

      const codigo = gerarCodigo();
      // Um código por vez: os anteriores deixam de valer.
      await admin.from("codigos_acesso").update({ usado_em: new Date().toISOString() }).eq("email", email).is("usado_em", null);
      const { error } = await admin.from("codigos_acesso").insert({
        email,
        codigo_hash: await hash(codigo, serviceKey),
        expira_em: new Date(Date.now() + VALIDADE_CODIGO_MIN * 60_000).toISOString(),
        ip,
      });
      if (error) throw new HttpError(500, "Não foi possível gerar o código agora. Tente novamente.");

      const nome = perfil?.nome_completo ?? acesso?.responsavel ?? null;
      try {
        await enviarEmail(config, email, `Seu código de acesso: ${codigo} — SMEDU Soluções`,
          htmlEmail("Código de acesso", "Use o código abaixo para criar ou redefinir sua senha de acesso ao sistema.", codigo, nome),
          `Seu código de acesso ao SMEDU Soluções é ${codigo}. Ele vale por ${VALIDADE_CODIGO_MIN} minutos. Se você não pediu, ignore este e-mail.`);
      } catch (error) {
        console.error("SMTP", error);
        throw new HttpError(502, "Não foi possível enviar o e-mail agora. Tente novamente em instantes ou procure o administrador.");
      }
      return json(RESPOSTA_SOLICITAR);
    }

    // ─── 2. Confirmar código ───
    if (action === "confirmar") {
      const codigo = texto(body.codigo).replace(/\D/g, "");
      if (codigo.length !== 6) throw new HttpError(400, CODIGO_INVALIDO);
      const { data: registro } = await admin
        .from("codigos_acesso")
        .select("*")
        .eq("email", email)
        .is("usado_em", null)
        .is("confirmado_em", null)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!registro || new Date(registro.expira_em) < new Date() || registro.tentativas >= MAX_TENTATIVAS_CODIGO) {
        throw new HttpError(400, CODIGO_INVALIDO);
      }
      if (!iguais(await hash(codigo, serviceKey), registro.codigo_hash)) {
        const tentativas = registro.tentativas + 1;
        await admin.from("codigos_acesso").update({ tentativas }).eq("id", registro.id);
        throw new HttpError(400, tentativas >= MAX_TENTATIVAS_CODIGO
          ? "Código incorreto várias vezes. Peça um novo código."
          : `Código incorreto. Você ainda tem ${MAX_TENTATIVAS_CODIGO - tentativas} tentativa(s).`);
      }
      const token = gerarToken();
      await admin.from("codigos_acesso").update({
        confirmado_em: new Date().toISOString(),
        token_hash: await hash(token, serviceKey),
        token_expira_em: new Date(Date.now() + VALIDADE_TOKEN_MIN * 60_000).toISOString(),
      }).eq("id", registro.id);
      return json({ ok: true, token });
    }

    // ─── 3. Redefinir senha ───
    if (action === "redefinir") {
      const token = texto(body.token);
      const senha = typeof body.senha === "string" ? body.senha : "";
      if (!token) throw new HttpError(400, "Sessão de troca de senha inválida. Peça um novo código.");
      if (!senhaValida(senha)) throw new HttpError(400, "A senha precisa ter pelo menos 8 caracteres, com letras e números.");
      const { data: registro } = await admin
        .from("codigos_acesso")
        .select("*")
        .eq("email", email)
        .eq("token_hash", await hash(token, serviceKey))
        .is("usado_em", null)
        .maybeSingle();
      if (!registro || !registro.token_expira_em || new Date(registro.token_expira_em) < new Date()) {
        throw new HttpError(400, "O prazo para criar a senha terminou. Peça um novo código.");
      }

      const [{ data: perfil }, { data: acesso }] = await Promise.all([
        admin.from("profiles").select("id, ativo").eq("email", email).maybeSingle(),
        admin.from("acessos_por_email").select("responsavel").eq("email", email).maybeSingle(),
      ]);
      if (perfil?.ativo === false) throw new HttpError(403, "Esta conta está desativada. Procure o administrador.");

      if (perfil) {
        const { error } = await admin.auth.admin.updateUserById(perfil.id, { password: senha });
        if (error) throw new HttpError(400, `Não foi possível salvar a senha: ${error.message}`);
      } else {
        const { error } = await admin.auth.admin.createUser({
          email,
          password: senha,
          email_confirm: true,
          user_metadata: { nome_completo: acesso?.responsavel ?? email.split("@")[0] },
        });
        if (error) throw new HttpError(400, `Não foi possível criar o acesso: ${error.message}`);
      }
      await admin.from("codigos_acesso").update({ usado_em: new Date().toISOString() }).eq("id", registro.id);
      return json({ ok: true });
    }

    throw new HttpError(400, "Ação não suportada.");
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error(error);
    return json({ error: "Erro inesperado. Tente novamente." }, 500);
  }
});
