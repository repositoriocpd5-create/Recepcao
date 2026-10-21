import React from 'react';

/**
 * Tela de carregamento do sistema. Usa as classes .sl-* definidas no index.html, as mesmas da
 * tela que aparece antes do JavaScript carregar — assim a troca entre as duas não pisca.
 */
export const LoadingScreen: React.FC<{ mensagem?: string }> = ({ mensagem = 'Carregando o sistema' }) => (
  <div className="sl" role="status" aria-live="polite">
    <div className="sl-box">
      <div className="sl-ring">
        <span className="sl-halo" />
        <span className="sl-logo"><img src="/assets/brasao_itaguai.png" alt="" /></span>
      </div>
      <div className="sl-brand"><b>SMEDU</b><i /><span>RECEPÇÃO</span></div>
      <div className="sl-sub">Secretaria Municipal de Educação · Itaguaí</div>
      <div className="sl-bar" />
      <div className="sl-msg">{mensagem}</div>
    </div>
  </div>
);
