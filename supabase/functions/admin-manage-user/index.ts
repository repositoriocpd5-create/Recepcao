// Supabase Edge Function: admin-manage-user
// Cria, edita e remove operadores no Supabase Auth + public.profiles
// (inclusive a matrícula usada no login, guardada em app_metadata).
// Usa a service_role somente no servidor; o navegador nunca recebe essa chave.
// Apenas usuários com profiles.role = 'admin' (e ativos) podem chamar.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ROLES = ["admin", "gestor", "recepcionista", "atendente", "unidade_escolar", "cco"];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// "Banimento" longo = conta suspensa (não consegue entrar); "none" reativa.
const BAN_SUSPENSO = "876000h";

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const texto = (value: unknown) => (typeof value === "string" ? value.trim() : "");
// Matrícula usada como login alternativo ao e-mail; fica em app_metadata (só o servidor altera).
const MATRICULA_REGEX = /^\d{3,10}$/;

/**
 * Campos do CCO: unidade da escola (papel unidade_escolar), acesso da equipe da recepção
 * ao CCO e unidades que a equipe acompanha (vazio = todas). Só entram os campos enviados.
 */
const camposCco = (payload: Record<string, unknown>, role: string) => {
  const campos: Record<string, unknown> = {};
  if ("unidade_id" in payload) {
    const unidade = texto(payload.unidade_id);
    if (unidade && !UUID_REGEX.test(unidade)) throw new HttpError(400, "Unidade escolar inválida.");
    campos.unidade_id = unidade || null;
  }
  if (typeof payload.acesso_cco === "boolean") campos.acesso_cco = payload.acesso_cco;
  if ("cco_unidades" in payload) {
    const lista = Array.isArray(payload.cco_unidades) ? payload.cco_unidades.map(texto).filter(Boolean) : [];
    if (lista.some((id) => !UUID_REGEX.test(id))) throw new HttpError(400, "Lista de unidades inválida.");
    campos.cco_unidades = lista.length ? lista : null;
  }
  if (role === "unidade_escolar" && "unidade_id" in campos && !campos.unidade_id) {
    throw new HttpError(400, "Vincule o usuário da unidade escolar a uma unidade.");
  }
  return campos;
};

type Admin = ReturnType<typeof createClient>;

/** Percorre os usuários do Auth (o projeto tem poucos operadores). */
const listarUsuarios = async (admin: Admin) => {
  const todos = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new HttpError(500, `Não foi possível consultar os usuários: ${error.message}`);
    todos.push(...data.users);
    if (data.users.length < 1000) return todos;
  }
};

/** Valida a matrícula informada e garante que nenhum outro operador já a use. */
const conferirMatricula = async (admin: Admin, matricula: string, exceto?: string) => {
  if (!matricula) return;
  if (!MATRICULA_REGEX.test(matricula)) throw new HttpError(400, "A matrícula deve ter só números (de 3 a 10 dígitos).");
  const usuarios = await listarUsuarios(admin);
  if (usuarios.some((u) => u.id !== exceto && u.app_metadata?.matricula === matricula)) {
    throw new HttpError(409, "Esta matrícula já é usada por outro operador.");
  }
};

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
    if (!url || !serviceKey) throw new HttpError(500, "Função sem acesso às chaves do projeto (SUPABASE_URL / chave secreta).");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // 1) Quem está chamando precisa estar logado e ser admin ativo.
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) throw new HttpError(401, "Sessão não informada. Entre novamente no sistema.");
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const caller = authData?.user;
    if (authError || !caller) throw new HttpError(401, "Sessão expirada. Entre novamente no sistema.");

    const { data: callerProfile } = await admin.from("profiles").select("role, ativo").eq("id", caller.id).maybeSingle();
    if (callerProfile?.role !== "admin" || callerProfile.ativo === false) {
      throw new HttpError(403, "Apenas administradores podem gerenciar usuários.");
    }

    let body: { action?: string; payload?: Record<string, unknown> };
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "Requisição inválida.");
    }
    const { action, payload = {} } = body;

    // 2) Ações
    if (action === "create_operator") {
      const email = texto(payload.email).toLowerCase();
      const password = typeof payload.password === "string" ? payload.password : "";
      const nome_completo = texto(payload.nome_completo);
      const cargo = texto(payload.cargo) || "Recepcionista";
      const role = texto(payload.role) || "recepcionista";
      const ativo = payload.ativo !== false;
      const matricula = texto(payload.matricula);

      if (!nome_completo) throw new HttpError(400, "Informe o nome completo.");
      if (!EMAIL_REGEX.test(email)) throw new HttpError(400, "Informe um e-mail institucional válido.");
      if (password.length < 8) throw new HttpError(400, "A senha precisa ter pelo menos 8 caracteres.");
      if (!ROLES.includes(role)) throw new HttpError(400, "Papel (role) inválido.");
      await conferirMatricula(admin, matricula);
      const cco = camposCco(payload, role);
      if (role === "unidade_escolar" && !cco.unidade_id) throw new HttpError(400, "Vincule o usuário da unidade escolar a uma unidade.");

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome_completo, role },
        ...(matricula && { app_metadata: { matricula } }),
      });
      if (createError || !created.user) {
        const jaExiste = createError?.status === 422 || /already|registered|exists/i.test(createError?.message ?? "");
        throw new HttpError(jaExiste ? 409 : 400, jaExiste
          ? "Este e-mail já está cadastrado no Supabase."
          : `Não foi possível criar o usuário: ${createError?.message ?? "erro desconhecido"}`);
      }

      const id = created.user.id;
      // O gatilho on_auth_user_created já cria o perfil; aqui gravamos cargo/papel/situação definitivos.
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .upsert({ id, email, nome_completo, cargo, role, ativo, ...cco, updated_at: new Date().toISOString() }, { onConflict: "id" })
        .select()
        .single();
      if (profileError) {
        await admin.auth.admin.deleteUser(id); // não deixa usuário sem perfil
        throw new HttpError(500, `Usuário não criado: falha ao gravar o perfil (${profileError.message}).`);
      }
      if (!ativo) await admin.auth.admin.updateUserById(id, { ban_duration: BAN_SUSPENSO });

      return json({ profile: { ...profile, matricula: matricula || null } }, 201);
    }

    if (action === "update_operator") {
      const id = texto(payload.id);
      if (!id) throw new HttpError(400, "Usuário não informado.");

      const email = texto(payload.email).toLowerCase();
      const password = typeof payload.password === "string" ? payload.password : "";
      const nome_completo = texto(payload.nome_completo);
      const cargo = texto(payload.cargo);
      const role = texto(payload.role);
      const ativo = typeof payload.ativo === "boolean" ? payload.ativo : undefined;
      // undefined = não mexe; "" = remove a matrícula do login.
      const matricula = typeof payload.matricula === "string" ? payload.matricula.trim() : undefined;

      if (email && !EMAIL_REGEX.test(email)) throw new HttpError(400, "Informe um e-mail institucional válido.");
      if (password && password.length < 8) throw new HttpError(400, "A nova senha precisa ter pelo menos 8 caracteres.");
      if (role && !ROLES.includes(role)) throw new HttpError(400, "Papel (role) inválido.");
      if (id === caller.id && ((role && role !== "admin") || ativo === false)) {
        throw new HttpError(400, "Você não pode remover o próprio acesso de administrador nem desativar a própria conta.");
      }

      if (matricula) await conferirMatricula(admin, matricula, id);

      const authUpdate: Record<string, unknown> = {};
      if (email) { authUpdate.email = email; authUpdate.email_confirm = true; }
      if (password) authUpdate.password = password;
      if (ativo !== undefined) authUpdate.ban_duration = ativo ? "none" : BAN_SUSPENSO;
      if (matricula !== undefined) authUpdate.app_metadata = { matricula: matricula || null };
      if (nome_completo || role) authUpdate.user_metadata = { ...(nome_completo && { nome_completo }), ...(role && { role }) };

      if (Object.keys(authUpdate).length) {
        const { error } = await admin.auth.admin.updateUserById(id, authUpdate);
        if (error) {
          const jaExiste = /already|registered|exists/i.test(error.message);
          throw new HttpError(jaExiste ? 409 : 400, jaExiste ? "Este e-mail já está em uso por outro usuário." : `Não foi possível atualizar: ${error.message}`);
        }
      }

      const profileUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (email) profileUpdate.email = email;
      if (nome_completo) profileUpdate.nome_completo = nome_completo;
      if (cargo) profileUpdate.cargo = cargo;
      if (role) profileUpdate.role = role;
      if (ativo !== undefined) profileUpdate.ativo = ativo;
      Object.assign(profileUpdate, camposCco(payload, role));

      const { data: profile, error: profileError } = await admin.from("profiles").update(profileUpdate).eq("id", id).select().single();
      if (profileError) throw new HttpError(500, `Falha ao atualizar o perfil: ${profileError.message}`);
      const { data: atualizado } = await admin.auth.admin.getUserById(id);
      return json({ profile: { ...profile, matricula: atualizado?.user?.app_metadata?.matricula ?? null } });
    }

    if (action === "list_matriculas") {
      const matriculas: Record<string, string> = {};
      (await listarUsuarios(admin)).forEach((u) => {
        if (u.app_metadata?.matricula) matriculas[u.id] = u.app_metadata.matricula;
      });
      return json({ matriculas });
    }

    if (action === "delete_operator") {
      const id = texto(payload.id);
      if (!id) throw new HttpError(400, "Usuário não informado.");
      if (id === caller.id) throw new HttpError(400, "Você não pode remover o seu próprio usuário.");
      const { error } = await admin.auth.admin.deleteUser(id); // profiles é removido em cascata
      if (error) throw new HttpError(400, `Não foi possível remover: ${error.message}`);
      return json({ ok: true });
    }

    throw new HttpError(400, "Ação não suportada.");
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
