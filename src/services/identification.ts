/**
 * Contratos para integrações de identificação. A implementação biométrica
 * permanece desabilitada até existir leitor, SDK oficial e agente local aprovado.
 */
export type IdentificationMethod = 'matricula' | 'cpf' | 'biometria' | 'qr_code' | 'codigo_barras';

export type DeviceStatus =
  | 'nao_configurado'
  | 'desconectado'
  | 'conectado'
  | 'aguardando_leitura'
  | 'processando'
  | 'identificado'
  | 'nao_encontrado'
  | 'falha_comunicacao';

export interface IdentificationResult {
  method: IdentificationMethod;
  status: 'identified' | 'not_found' | 'unavailable' | 'cancelled' | 'error';
  subjectId?: string;
  message: string;
  occurredAt: string;
}

export interface IdentificationProvider {
  readonly method: IdentificationMethod;
  getDeviceStatus(): Promise<DeviceStatus>;
  identify(input: string): Promise<IdentificationResult>;
  cancel(): Promise<void>;
}

export interface BiometricProvider extends IdentificationProvider {
  readonly method: 'biometria';
  getStationId(): Promise<string | null>;
  startIdentification(): Promise<IdentificationResult>;
}

type BiometricAgentResponse = {
  status?: DeviceStatus;
  stationId?: string | null;
  subjectId?: string;
  message?: string;
};

const biometricAgentUrl = import.meta.env.VITE_BIOMETRIC_AGENT_URL?.replace(/\/$/, '');

function isDeviceStatus(value: unknown): value is DeviceStatus {
  return typeof value === 'string' && [
    'nao_configurado', 'desconectado', 'conectado', 'aguardando_leitura',
    'processando', 'identificado', 'nao_encontrado', 'falha_comunicacao',
  ].includes(value);
}

/**
 * Ponte para um agente instalado na estação de recepção. O navegador jamais
 * conversa diretamente com SDKs ou drivers do leitor; o agente precisa expor
 * somente HTTPS/local seguro e validar a sessão do operador por conta própria.
 */
export class LocalAgentBiometricProvider implements BiometricProvider {
  readonly method = 'biometria' as const;

  constructor(private readonly baseUrl: string) {}

  private async request(path: string, init?: RequestInit): Promise<BiometricAgentResponse> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { Accept: 'application/json', ...init?.headers },
        credentials: 'omit',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Agente respondeu ${response.status}`);
      return await response.json() as BiometricAgentResponse;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async getDeviceStatus(): Promise<DeviceStatus> {
    try {
      const result = await this.request('/status');
      return isDeviceStatus(result.status) ? result.status : 'desconectado';
    } catch {
      return 'falha_comunicacao';
    }
  }

  async getStationId(): Promise<string | null> {
    try {
      return (await this.request('/status')).stationId || null;
    } catch {
      return null;
    }
  }

  async startIdentification(): Promise<IdentificationResult> {
    try {
      const result = await this.request('/identify', { method: 'POST' });
      return {
        method: 'biometria',
        status: result.subjectId ? 'identified' : result.status === 'nao_encontrado' ? 'not_found' : 'unavailable',
        subjectId: result.subjectId,
        message: result.message || (result.subjectId ? 'Pessoa identificada pelo leitor.' : 'Aguardando leitura no dispositivo.'),
        occurredAt: new Date().toISOString(),
      };
    } catch {
      return {
        method: 'biometria', status: 'error',
        message: 'Não foi possível comunicar com o agente biométrico desta estação.',
        occurredAt: new Date().toISOString(),
      };
    }
  }

  async identify(): Promise<IdentificationResult> { return this.startIdentification(); }

  async cancel(): Promise<void> {
    try { await this.request('/identify/cancel', { method: 'POST' }); } catch { /* leitura já encerrada */ }
  }
}

/** Provider seguro por padrão: não simula uma leitura biométrica. */
export class UnconfiguredBiometricProvider implements BiometricProvider {
  readonly method = 'biometria' as const;

  async getDeviceStatus(): Promise<DeviceStatus> {
    return 'nao_configurado';
  }

  async getStationId(): Promise<string | null> {
    return null;
  }

  async startIdentification(): Promise<IdentificationResult> {
    return {
      method: 'biometria',
      status: 'unavailable',
      message: 'Leitor biométrico não configurado nesta estação. Utilize identificação manual.',
      occurredAt: new Date().toISOString(),
    };
  }

  async identify(): Promise<IdentificationResult> {
    return this.startIdentification();
  }

  async cancel(): Promise<void> {
    // Não há sessão de leitura ativa sem um agente local confiável.
  }
}

export const biometricProvider: BiometricProvider = biometricAgentUrl
  ? new LocalAgentBiometricProvider(biometricAgentUrl)
  : new UnconfiguredBiometricProvider();

export const isBiometricAgentConfigured = Boolean(biometricAgentUrl);
