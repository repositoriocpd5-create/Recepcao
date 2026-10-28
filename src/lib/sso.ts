import { supabase } from '@/lib/supabase';
import { SistemaExterno } from '@/lib/modulos';

/**
 * Abre o sistema externo já logado (login único). Se algo falhar — sem sessão, e-mail sem cadastro lá,
 * função fora do ar — abre a tela de login normal do sistema. Devolve um aviso para mostrar ao usuário, ou null.
 */
export const abrirSistemaExterno = async (sistema: SistemaExterno): Promise<string | null> => {
  // A aba é aberta já no clique, senão o navegador bloqueia o pop-up depois do await.
  const aba = window.open('about:blank', '_blank');
  const abrir = (destino: string) => { if (aba) aba.location.href = destino; else window.location.href = destino; };
  const { sso, url } = sistema;
  if (!sso) { abrir(url); return null; }
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('sem sessão');
    const resp = await fetch(sso.funcao, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: sso.anonKey, Authorization: `Bearer ${sso.anonKey}` },
      body: JSON.stringify({ access_token: token }),
    });
    const corpo = await resp.json().catch(() => ({}));
    if (!resp.ok || !corpo.token_hash) throw new Error(corpo.error || 'falha');
    abrir(`${sso.rota}#token_hash=${encodeURIComponent(corpo.token_hash)}`);
    return null;
  } catch (e) {
    abrir(url);
    return `Não foi possível entrar automaticamente em ${sistema.rotulo}${e instanceof Error && e.message ? ` (${e.message})` : ''}. Entre com seu e-mail e senha.`;
  }
};
