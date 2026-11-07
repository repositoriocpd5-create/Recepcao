import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const CHAVE = 'smedu-meu-ip';

/**
 * IP público deste acesso, descoberto pela Edge Function "meu-ip" do próprio projeto
 * (o navegador não sabe o próprio IP). Guardado na sessão para não repetir a consulta.
 * No modo demonstração (sem Supabase) devolve null.
 */
export async function obterMeuIp(): Promise<string | null> {
  try {
    const salvo = sessionStorage.getItem(CHAVE);
    if (salvo) return salvo;
  } catch {}
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.functions.invoke('meu-ip', { method: 'GET' });
  const ip = !error && data && typeof data.ip === 'string' ? data.ip : null;
  if (ip) {
    try { sessionStorage.setItem(CHAVE, ip); } catch {}
  }
  return ip;
}
