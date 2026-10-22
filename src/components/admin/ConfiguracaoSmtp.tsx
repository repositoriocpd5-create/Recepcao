import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Info, Mail, Save, Send } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { acessoService, ConfigSmtp, SegurancaSmtp } from '@/services/acessoService';
import { cn } from '@/lib/utils';

const VAZIO: ConfigSmtp = { host: '', porta: 465, seguranca: 'ssl', usuario: '', remetente_email: '', remetente_nome: 'SMEDU Soluções' };
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const campo =
  'w-full min-h-11 rounded-lg border border-[#cfdbea] bg-white px-3 text-sm text-[#10233f] focus:outline-none focus:ring-2 focus:ring-[#0877c9]/40 dark:border-slate-700 dark:bg-[#121826] dark:text-slate-100';
const rotulo = 'mb-1.5 block text-xs font-semibold text-[#37475e] dark:text-slate-300';

/** E-mail do sistema: servidor SMTP usado para enviar os códigos de acesso (somente administrador). */
export const ConfiguracaoSmtp: React.FC<{ onAviso: (msg: string, tipo: 'sucesso' | 'erro') => void }> = ({ onAviso }) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<ConfigSmtp>(VAZIO);
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [temSenha, setTemSenha] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [para, setPara] = useState(user?.email || '');
  const [erro, setErro] = useState('');
  const [infoAtualizacao, setInfoAtualizacao] = useState('');

  useEffect(() => {
    acessoService.obterSmtp()
      .then((salva) => {
        if (!salva) return;
        setConfig({ ...VAZIO, ...salva, usuario: salva.usuario || '' });
        setTemSenha(Boolean(salva.tem_senha));
        if (salva.atualizado_em) {
          setInfoAtualizacao(`Atualizado em ${new Date(salva.atualizado_em).toLocaleString('pt-BR')}${salva.atualizado_por ? ` por ${salva.atualizado_por}` : ''}`);
        }
      })
      .catch((err) => setErro(err instanceof Error ? err.message : 'Não foi possível carregar a configuração.'))
      .finally(() => setCarregando(false));
  }, []);

  const mudar = (parcial: Partial<ConfigSmtp>) => {
    setConfig((atual) => ({ ...atual, ...parcial }));
    setErro('');
  };

  const mudarSeguranca = (seguranca: SegurancaSmtp) => mudar({ seguranca, porta: seguranca === 'ssl' ? 465 : seguranca === 'starttls' ? 587 : config.porta });

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.host.trim()) return setErro('Informe o servidor SMTP.');
    if (!Number.isInteger(config.porta) || config.porta < 1 || config.porta > 65535) return setErro('Porta inválida.');
    if (!EMAIL_REGEX.test(config.remetente_email.trim())) return setErro('Informe o e-mail do remetente.');
    if (config.usuario.trim() && !temSenha && !senha) return setErro('Informe a senha do usuário SMTP.');
    setSalvando(true);
    try {
      await acessoService.salvarSmtp({ ...config, host: config.host.trim(), remetente_email: config.remetente_email.trim(), ...(senha ? { senha } : {}) });
      if (senha) setTemSenha(true);
      setSenha('');
      setInfoAtualizacao(`Atualizado em ${new Date().toLocaleString('pt-BR')}`);
      onAviso('Configuração de e-mail salva.', 'sucesso');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const testar = async () => {
    if (!EMAIL_REGEX.test(para.trim())) return setErro('Informe o e-mail que vai receber o teste.');
    setTestando(true);
    setErro('');
    try {
      onAviso(await acessoService.testarSmtp(para.trim()), 'sucesso');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'O teste falhou.');
    } finally {
      setTestando(false);
    }
  };

  const portaBloqueada = config.porta === 25 || config.porta === 587;

  return (
    <Card className="overflow-hidden border-slate-800">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-emerald-400" />
            E-mail do sistema (SMTP)
          </CardTitle>
          <CardDescription>Servidor usado para enviar o código de primeiro acesso e de redefinição de senha.</CardDescription>
        </div>
      </CardHeader>

      {carregando ? (
        <p className="px-5 pb-5 text-sm text-slate-400">Carregando…</p>
      ) : (
        <form onSubmit={salvar} noValidate className="space-y-4 px-5 pb-5">
          <p className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-500/30 dark:bg-sky-950/30 dark:text-sky-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Use <strong>porta 465 com SSL</strong>: o servidor do sistema não abre as portas 25 e 587.
              Gmail institucional: <code>smtp.gmail.com</code>, 465, com <strong>senha de app</strong>. Microsoft 365: confirme com o TI se aceita 465.
            </span>
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_110px_150px]">
            <div>
              <label htmlFor="smtp-host" className={rotulo}>Servidor SMTP *</label>
              <input id="smtp-host" value={config.host} onChange={(e) => mudar({ host: e.target.value })} placeholder="smtp.gmail.com" autoComplete="off" spellCheck={false} className={campo} />
            </div>
            <div>
              <label htmlFor="smtp-porta" className={rotulo}>Porta *</label>
              <input id="smtp-porta" inputMode="numeric" value={config.porta || ''} onChange={(e) => mudar({ porta: Number(e.target.value.replace(/\D/g, '')) })} className={cn(campo, portaBloqueada && 'border-amber-400')} />
            </div>
            <div>
              <label htmlFor="smtp-seguranca" className={rotulo}>Segurança</label>
              <select id="smtp-seguranca" value={config.seguranca} onChange={(e) => mudarSeguranca(e.target.value as SegurancaSmtp)} className={campo}>
                <option value="ssl">SSL/TLS</option>
                <option value="starttls">STARTTLS</option>
                <option value="nenhuma">Nenhuma</option>
              </select>
            </div>
          </div>
          {portaBloqueada && <p className="-mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">A porta {config.porta} é bloqueada no servidor do sistema; o envio vai falhar. Use 465 (SSL).</p>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="smtp-usuario" className={rotulo}>Usuário</label>
              <input id="smtp-usuario" value={config.usuario} onChange={(e) => mudar({ usuario: e.target.value })} placeholder="nao-responda@edu.itaguai.rj.gov.br" autoComplete="off" spellCheck={false} className={campo} />
            </div>
            <div>
              <label htmlFor="smtp-senha" className={rotulo}>Senha</label>
              <div className="relative">
                <input
                  id="smtp-senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setErro(''); }}
                  placeholder={temSenha ? 'Salva — deixe em branco para manter' : 'Senha (ou senha de app)'}
                  autoComplete="new-password"
                  className={cn(campo, 'pr-10')}
                />
                <button type="button" onClick={() => setMostrarSenha((v) => !v)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded text-slate-400 hover:text-slate-600">
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">A senha fica guardada no servidor e nunca é mostrada de novo.</p>
            </div>
            <div>
              <label htmlFor="smtp-remetente" className={rotulo}>E-mail do remetente *</label>
              <input id="smtp-remetente" type="email" value={config.remetente_email} onChange={(e) => mudar({ remetente_email: e.target.value })} placeholder="nao-responda@edu.itaguai.rj.gov.br" autoComplete="off" className={campo} />
            </div>
            <div>
              <label htmlFor="smtp-nome" className={rotulo}>Nome do remetente</label>
              <input id="smtp-nome" value={config.remetente_nome} onChange={(e) => mudar({ remetente_nome: e.target.value })} className={campo} />
            </div>
          </div>

          {erro && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300">{erro}</p>}

          <div className="flex flex-col gap-3 border-t border-[#dce4f0] pt-4 lg:flex-row lg:items-end lg:justify-between dark:border-slate-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="sm:w-72">
                <label htmlFor="smtp-teste" className={rotulo}>Enviar e-mail de teste para</label>
                <input id="smtp-teste" type="email" value={para} onChange={(e) => setPara(e.target.value)} className={campo} />
              </div>
              <Button type="button" variant="outline" onClick={testar} isLoading={testando} className="min-h-11">
                {!testando && <Send className="h-4 w-4" />} Testar envio
              </Button>
            </div>
            <div className="flex flex-col items-start gap-1 lg:items-end">
              <Button type="submit" variant="primary" isLoading={salvando} className="min-h-11">
                {!salvando && <Save className="h-4 w-4" />} Salvar configuração
              </Button>
              {infoAtualizacao && <span className="text-[11px] text-slate-500">{infoAtualizacao}</span>}
            </div>
          </div>
          <p className="text-[11px] text-slate-500">Salve antes de testar: o teste usa a configuração gravada.</p>
        </form>
      )}
    </Card>
  );
};
