import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, MailCheck, RotateCcw, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { dataService } from '@/services/dataService';
import { cn } from '@/lib/utils';

type Etapa = 'email' | 'codigo' | 'senha' | 'pronto';

const CODIGO_DEMO = '246810';
const ESPERA_REENVIO = 60;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  'h-11 w-full rounded-md border border-[#d1d5db] bg-white pl-9 pr-3 text-sm text-[#111827] placeholder:text-[#6b7280] ' +
  'transition-shadow focus:border-[#1366e8] focus:outline-none focus:ring-2 focus:ring-[#1366e8]/25 ' +
  'dark:border-slate-700 dark:bg-[#0f1422] dark:text-slate-100 dark:placeholder:text-slate-500';
const botao =
  'flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#1366e8] text-sm font-semibold text-white transition-colors hover:bg-[#0f57c9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1366e8] disabled:cursor-not-allowed disabled:opacity-70';

/** "joe.amado@edu…" → "jo•••••@edu…" para confirmar sem expor o endereço inteiro na tela. */
const mascarar = (email: string) => {
  const [nome, dominio] = email.split('@');
  return `${nome.slice(0, 2)}${'•'.repeat(Math.max(3, nome.length - 2))}@${dominio}`;
};

const REGRAS_SENHA = [
  { id: 'tamanho', rotulo: 'Pelo menos 8 caracteres', ok: (s: string) => s.length >= 8 },
  { id: 'letra', rotulo: 'Uma letra', ok: (s: string) => /[A-Za-zÀ-ÿ]/.test(s) },
  { id: 'numero', rotulo: 'Um número', ok: (s: string) => /\d/.test(s) },
];

/** Lê a mensagem de erro devolvida pela Edge Function. */
async function erroDaFuncao(error: unknown): Promise<string> {
  const e = error as { name?: string; message?: string; context?: Response };
  if (e?.name === 'FunctionsFetchError' || /failed to send a request/i.test(e?.message || '')) {
    return navigator.onLine
      ? 'O envio de códigos ainda não está disponível. Procure o administrador do sistema.'
      : 'Sem conexão com a internet. Verifique a rede e tente novamente.';
  }
  if (e?.context instanceof Response) {
    if (e.context.status === 404) return 'O envio de códigos ainda não está disponível. Procure o administrador do sistema.';
    try {
      const corpo = await e.context.clone().json();
      if (corpo?.error) return corpo.error;
    } catch {}
  }
  return 'Não foi possível enviar o código agora. Tente novamente.';
}

const Etapas: React.FC<{ atual: Etapa }> = ({ atual }) => {
  const lista: { id: Etapa; rotulo: string }[] = [
    { id: 'email', rotulo: 'E-mail' },
    { id: 'codigo', rotulo: 'Código' },
    { id: 'senha', rotulo: 'Senha' },
  ];
  const indice = atual === 'pronto' ? 3 : lista.findIndex((e) => e.id === atual);
  return (
    <ol className="mb-5 flex items-center justify-center gap-1.5" aria-label="Etapas do primeiro acesso">
      {lista.map((etapa, i) => (
        <li key={etapa.id} className="flex items-center gap-2" aria-current={i === indice ? 'step' : undefined}>
          <span
            className={cn(
              'grid h-7 w-7 place-items-center rounded-full text-xs font-bold',
              i < indice ? 'bg-green-600 text-white' : i === indice ? 'bg-[#1366e8] text-white' : 'bg-[#e5e7eb] text-[#6b7280] dark:bg-slate-800 dark:text-slate-400',
            )}
          >
            {i < indice ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
          </span>
          <span className={cn('whitespace-nowrap text-xs font-semibold', i === indice ? 'text-[#1f2937] dark:text-slate-100' : 'text-[#6b7280] dark:text-slate-400')}>{etapa.rotulo}</span>
          {i < lista.length - 1 && <span aria-hidden="true" className="h-px w-3 bg-[#d1d5db] min-[380px]:w-5 dark:bg-slate-700" />}
        </li>
      ))}
    </ol>
  );
};

/** Primeiro acesso / esqueci minha senha: código no e-mail → senha própria. */
export const PrimeiroAcessoPage: React.FC = () => {
  const navigate = useNavigate();
  const { isSupabaseLive, user, entrarComSessaoAtual } = useAuth();
  const [etapa, setEtapa] = useState<Etapa>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [espera, setEspera] = useState(0);
  const titulo = useRef<HTMLHeadingElement>(null);

  // Já logado (e não no meio deste fluxo): vai para o sistema.
  useEffect(() => {
    if (user && etapa === 'email') navigate('/', { replace: true });
  }, [user, etapa, navigate]);

  // Cada etapa abre com o foco no campo dela (autoFocus); na conclusão, no título.
  useEffect(() => { if (etapa === 'pronto') titulo.current?.focus(); }, [etapa]);

  useEffect(() => {
    if (espera <= 0) return;
    const t = window.setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [espera]);

  const regras = useMemo(() => REGRAS_SENHA.map((r) => ({ ...r, cumprida: r.ok(senha) })), [senha]);
  const senhaValida = regras.every((r) => r.cumprida);

  const pedirCodigo = async (reenvio = false) => {
    const alvo = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(alvo)) {
      setErro('Informe um e-mail válido, por exemplo nome.sobrenome@edu.itaguai.rj.gov.br.');
      return;
    }
    setCarregando(true);
    setErro('');
    setAviso('');
    try {
      if (isSupabaseLive) {
        const { data, error } = await supabase.functions.invoke('primeiro-acesso', { body: { email: alvo } });
        if (error) throw new Error(await erroDaFuncao(error));
        setAviso(data?.mensagem || 'Se o e-mail estiver cadastrado, você receberá um código em instantes.');
      } else {
        await new Promise((r) => setTimeout(r, 500));
        setAviso(`Modo demonstração: use o código ${CODIGO_DEMO}.`);
      }
      setEmail(alvo);
      setEspera(ESPERA_REENVIO);
      if (reenvio) setCodigo('');
      setEtapa('codigo');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar o código.');
    } finally {
      setCarregando(false);
    }
  };

  const confirmarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = codigo.replace(/\D/g, '');
    if (token.length < 6) {
      setErro('Digite o código de 6 dígitos enviado ao seu e-mail.');
      return;
    }
    setCarregando(true);
    setErro('');
    try {
      if (isSupabaseLive) {
        const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
        if (error) throw new Error(/expired|invalid/i.test(error.message) ? 'Código inválido ou expirado. Confira os números ou peça um novo código.' : error.message);
      } else if (token !== CODIGO_DEMO) {
        throw new Error('Código inválido ou expirado. Confira os números ou peça um novo código.');
      }
      setAviso('');
      setEtapa('senha');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível confirmar o código.');
    } finally {
      setCarregando(false);
    }
  };

  const definirSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senhaValida) {
      setErro('A senha ainda não atende a todos os requisitos.');
      return;
    }
    if (senha !== confirmacao) {
      setErro('As duas senhas não são iguais.');
      return;
    }
    setCarregando(true);
    setErro('');
    try {
      if (isSupabaseLive) {
        const { error } = await supabase.auth.updateUser({ password: senha });
        if (error) {
          throw new Error(/different from the old/i.test(error.message)
            ? 'A nova senha precisa ser diferente da anterior.'
            : /weak|least/i.test(error.message) ? 'Senha fraca. Use pelo menos 8 caracteres, com letras e números.' : error.message);
        }
        const perfil = await entrarComSessaoAtual();
        await dataService.registrarLogAuditoria({
          usuario_email: email,
          acao: 'SENHA_DEFINIDA',
          tabela: 'profiles',
          registro_id: perfil?.id,
          detalhes: { metodo: 'codigo_por_email' },
        });
        setEtapa('pronto');
        window.setTimeout(() => navigate('/', { replace: true }), 1500);
      } else {
        await new Promise((r) => setTimeout(r, 500));
        setEtapa('pronto');
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar a senha.');
    } finally {
      setCarregando(false);
    }
  };

  const tituloClasse = 'text-center text-[15px] font-semibold text-[#1f2937] outline-none dark:text-slate-100';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f4f6] p-4 dark:bg-[#0b0f19]">
      <main className="w-full max-w-[380px] overflow-hidden rounded-lg bg-white shadow-[0_14px_34px_-14px_rgba(16,24,40,.28)] dark:bg-[#121826] dark:shadow-black/50">
        <header className="flex flex-col items-center gap-3 bg-[#1366e8] px-6 pb-7 pt-5 text-white">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white p-1 shadow-[0_4px_12px_rgba(0,0,0,.18)]">
            <img src="/assets/brasao_itaguai.png" alt="Brasão do Município de Itaguaí" className="h-10 w-10 object-contain" />
          </span>
          <p className="flex items-center gap-2 text-xl leading-none">
            <span className="font-extrabold tracking-tight">SMEDU</span>
            <span aria-hidden="true" className="h-6 w-px bg-white/90" />
            <span className="font-light tracking-wide">SOLUÇÕES</span>
          </p>
        </header>

        <div className="px-6 pb-6 pt-5">
          <Etapas atual={etapa} />

          {erro && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#b91c1c] dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{erro}</span>
            </div>
          )}

          {etapa === 'email' && (
            <form onSubmit={(e) => { e.preventDefault(); void pedirCodigo(); }} noValidate className="space-y-4">
              <div>
                <h1 ref={titulo} tabIndex={-1} className={tituloClasse}>Primeiro acesso ou nova senha</h1>
                <p className="mt-1.5 text-center text-xs leading-relaxed text-[#6b7280] dark:text-slate-400">
                  Informe o e-mail cadastrado pela Secretaria. Enviaremos um código para você criar sua senha.
                </p>
              </div>
              <div>
                <label htmlFor="pa-email" className="mb-1.5 block text-[11px] font-medium text-[#374151] dark:text-slate-300">E-mail</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" aria-hidden="true" />
                  <input
                    id="pa-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErro(''); }}
                    placeholder="nome.sobrenome@edu.itaguai.rj.gov.br"
                    className={inputClass}
                  />
                </div>
              </div>
              <button type="submit" disabled={carregando} className={botao}>
                {carregando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MailCheck className="h-4 w-4" aria-hidden="true" />}
                {carregando ? 'Enviando…' : 'Enviar código'}
              </button>
            </form>
          )}

          {etapa === 'codigo' && (
            <form onSubmit={confirmarCodigo} noValidate className="space-y-4">
              <div>
                <h1 ref={titulo} tabIndex={-1} className={tituloClasse}>Digite o código</h1>
                <p className="mt-1.5 text-center text-xs leading-relaxed text-[#6b7280] dark:text-slate-400">
                  Enviado para <strong className="text-[#374151] dark:text-slate-200">{mascarar(email)}</strong>. O código vale por 10 minutos.
                </p>
              </div>
              {aviso && (
                <p role="status" className="rounded-md border border-[#bfdbfe] bg-[#eff6ff] p-2.5 text-center text-xs text-[#1e40af] dark:border-sky-500/30 dark:bg-sky-950/30 dark:text-sky-200">{aviso}</p>
              )}
              <div>
                <label htmlFor="pa-codigo" className="mb-1.5 block text-[11px] font-medium text-[#374151] dark:text-slate-300">Código de verificação</label>
                <input
                  id="pa-codigo"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={10}
                  value={codigo}
                  onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, '')); setErro(''); }}
                  placeholder="••••••"
                  className="h-14 w-full rounded-md border border-[#d1d5db] bg-white text-center font-mono text-2xl font-bold tracking-[0.5em] text-[#111827] focus:border-[#1366e8] focus:outline-none focus:ring-2 focus:ring-[#1366e8]/25 dark:border-slate-700 dark:bg-[#0f1422] dark:text-slate-100"
                />
              </div>
              <button type="submit" disabled={carregando} className={botao}>
                {carregando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                {carregando ? 'Confirmando…' : 'Confirmar código'}
              </button>
              <div className="flex items-center justify-between gap-2 text-xs">
                <button type="button" onClick={() => { setEtapa('email'); setErro(''); setCodigo(''); }} className="inline-flex min-h-9 items-center gap-1 rounded px-1 font-semibold text-[#4b5563] hover:text-[#1366e8] dark:text-slate-400">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Trocar e-mail
                </button>
                <button
                  type="button"
                  disabled={espera > 0 || carregando}
                  onClick={() => void pedirCodigo(true)}
                  className="inline-flex min-h-9 items-center gap-1 rounded px-1 font-semibold text-[#1366e8] hover:underline disabled:cursor-not-allowed disabled:text-[#9ca3af] disabled:no-underline dark:text-sky-300"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  {espera > 0 ? `Reenviar em ${espera}s` : 'Reenviar código'}
                </button>
              </div>
            </form>
          )}

          {etapa === 'senha' && (
            <form onSubmit={definirSenha} noValidate className="space-y-4">
              <div>
                <h1 ref={titulo} tabIndex={-1} className={tituloClasse}>Crie sua senha</h1>
                <p className="mt-1.5 text-center text-xs leading-relaxed text-[#6b7280] dark:text-slate-400">Ela será usada nos próximos acessos, junto com o seu e-mail.</p>
              </div>
              <div>
                <label htmlFor="pa-senha" className="mb-1.5 block text-[11px] font-medium text-[#374151] dark:text-slate-300">Nova senha</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" aria-hidden="true" />
                  <input
                    id="pa-senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoFocus
                    value={senha}
                    onChange={(e) => { setSenha(e.target.value); setErro(''); }}
                    aria-describedby="pa-regras"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded text-[#6b7280] hover:text-[#1366e8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1366e8]"
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={mostrarSenha}
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <ul id="pa-regras" className="mt-2 space-y-1">
                  {regras.map((r) => (
                    <li key={r.id} className={cn('flex items-center gap-1.5 text-xs', r.cumprida ? 'text-green-700 dark:text-green-400' : 'text-[#6b7280] dark:text-slate-400')}>
                      {r.cumprida ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <span aria-hidden="true" className="ml-[3px] mr-[2px] h-2 w-2 rounded-full border border-current" />}
                      {r.rotulo}<span className="sr-only">{r.cumprida ? ': atendido' : ': pendente'}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <label htmlFor="pa-confirmacao" className="mb-1.5 block text-[11px] font-medium text-[#374151] dark:text-slate-300">Repita a senha</label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" aria-hidden="true" />
                  <input
                    id="pa-confirmacao"
                    type={mostrarSenha ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmacao}
                    onChange={(e) => { setConfirmacao(e.target.value); setErro(''); }}
                    className={inputClass}
                  />
                </div>
                {confirmacao && confirmacao !== senha && <p className="mt-1.5 text-xs text-[#b91c1c] dark:text-rose-300">As senhas ainda não são iguais.</p>}
              </div>
              <button type="submit" disabled={carregando} className={botao}>
                {carregando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                {carregando ? 'Salvando…' : 'Salvar senha e entrar'}
              </button>
            </form>
          )}

          {etapa === 'pronto' && (
            <div className="space-y-4 text-center" role="status">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
              <h1 ref={titulo} tabIndex={-1} className={tituloClasse}>Senha criada!</h1>
              <p className="text-xs leading-relaxed text-[#6b7280] dark:text-slate-400">
                {isSupabaseLive ? 'Abrindo o sistema…' : 'Modo demonstração: a senha não é gravada. Volte ao login para entrar.'}
              </p>
              {!isSupabaseLive && <Link to="/login" className={botao}>Ir para o login</Link>}
            </div>
          )}

          {etapa !== 'pronto' && (
            <Link to="/login" className="mt-4 flex min-h-10 items-center justify-center gap-1.5 text-xs font-semibold text-[#4b5563] hover:text-[#1366e8] dark:text-slate-400">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Voltar ao login
            </Link>
          )}
        </div>
      </main>
      <p className="mt-5 text-center text-[11px] text-[#6b7280] dark:text-slate-500">
        Secretaria Municipal de Educação de Itaguaí{!isSupabaseLive && ' · Modo de demonstração'}
      </p>
    </div>
  );
};
