/**
 * Primeiro acesso / redefinição de senha com código gerado pelo backend (Edge Function
 * primeiro-acesso) e enviado pelo SMTP configurado na Administração.
 * Sem Supabase (modo demonstração), o código é sempre 246810 e nada é enviado.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const FUNCAO = 'primeiro-acesso';
export const CODIGO_DEMO = '246810';
const CHAVE_SMTP_DEMO = 'sme_config_smtp_demo';

export type SegurancaSmtp = 'ssl' | 'starttls' | 'nenhuma';

export interface ConfigSmtp {
  host: string;
  porta: number;
  seguranca: SegurancaSmtp;
  usuario: string;
  remetente_email: string;
  remetente_nome: string;
  tem_senha?: boolean;
  atualizado_em?: string;
  atualizado_por?: string;
}

/** Chama o backend e devolve a mensagem de erro dele quando houver. */
async function chamar<T>(corpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(FUNCAO, { body: corpo });
  if (!error) return data as T;
  const e = error as { name?: string; message?: string; context?: Response };
  if (e.name === 'FunctionsFetchError' || /failed to send a request/i.test(e.message || '')) {
    throw new Error(navigator.onLine ? 'O serviço de acesso não está disponível agora. Procure o administrador do sistema.' : 'Sem conexão com a internet. Verifique a rede e tente novamente.');
  }
  if (e.context instanceof Response) {
    if (e.context.status === 404) throw new Error('O serviço de acesso ainda não foi publicado. Procure o administrador do sistema.');
    try {
      const corpoErro = await e.context.clone().json();
      if (corpoErro?.error) throw new Error(corpoErro.error);
    } catch (lido) {
      if (lido instanceof Error && lido.message) throw lido;
    }
  }
  throw new Error('Não foi possível concluir agora. Tente novamente.');
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const acessoService = {
  async solicitarCodigo(email: string): Promise<string> {
    if (!isSupabaseConfigured) {
      await esperar(500);
      return `Modo demonstração: use o código ${CODIGO_DEMO}.`;
    }
    const r = await chamar<{ mensagem?: string }>({ action: 'solicitar', email });
    return r?.mensagem || 'Se o e-mail estiver cadastrado, você receberá um código em instantes.';
  },

  /** Confere o código e devolve o token que libera a troca de senha. */
  async confirmarCodigo(email: string, codigo: string): Promise<string> {
    if (!isSupabaseConfigured) {
      await esperar(400);
      if (codigo !== CODIGO_DEMO) throw new Error('Código incorreto. Confira os números ou peça um novo código.');
      return 'token-demo';
    }
    const r = await chamar<{ token: string }>({ action: 'confirmar', email, codigo });
    return r.token;
  },

  async redefinirSenha(email: string, token: string, senha: string): Promise<void> {
    if (!isSupabaseConfigured) {
      await esperar(400);
      return;
    }
    await chamar({ action: 'redefinir', email, token, senha });
  },

  // ─── Configuração do e-mail do sistema (somente administrador) ───
  async obterSmtp(): Promise<ConfigSmtp | null> {
    if (!isSupabaseConfigured) {
      try {
        const salvo = localStorage.getItem(CHAVE_SMTP_DEMO);
        return salvo ? (JSON.parse(salvo) as ConfigSmtp) : null;
      } catch {
        return null;
      }
    }
    const r = await chamar<{ config: ConfigSmtp | null }>({ action: 'smtp_obter' });
    return r.config;
  },

  async salvarSmtp(config: ConfigSmtp & { senha?: string }): Promise<void> {
    if (!isSupabaseConfigured) {
      await esperar(300);
      const { senha, ...resto } = config;
      const anterior = await this.obterSmtp();
      localStorage.setItem(CHAVE_SMTP_DEMO, JSON.stringify({ ...resto, tem_senha: Boolean(senha) || Boolean(anterior?.tem_senha), atualizado_em: new Date().toISOString() }));
      return;
    }
    await chamar({ action: 'smtp_salvar', config });
  },

  async testarSmtp(para: string): Promise<string> {
    if (!isSupabaseConfigured) {
      await esperar(500);
      return `Modo demonstração: nenhum e-mail é enviado (seria para ${para}).`;
    }
    const r = await chamar<{ mensagem?: string }>({ action: 'smtp_testar', para });
    return r?.mensagem || 'E-mail de teste enviado.';
  },
};
