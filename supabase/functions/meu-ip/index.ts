// Supabase Edge Function: meu-ip
// Devolve o IP público de quem chamou (mostrado no rodapé do sistema).
// O navegador não conhece o próprio IP: só o servidor que recebe a requisição sabe de onde ela veio.
//
// POST/GET → { ip: string | null }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/** Primeiro endereço de x-forwarded-for (o do usuário); depois, cabeçalhos de proxy conhecidos. */
const ipDaRequisicao = (req: Request): string | null => {
  const encaminhado = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidato = encaminhado || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
  if (!candidato) return null;
  // Aceita só IPv4/IPv6 (evita devolver texto arbitrário vindo de cabeçalho).
  return /^[0-9a-fA-F:.]{3,45}$/.test(candidato) ? candidato : null;
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(JSON.stringify({ ip: ipDaRequisicao(req) }), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
});
