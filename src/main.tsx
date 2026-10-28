import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initPwa } from './pwa/pwa';
import { initKeyboardInset } from './lib/keyboardInset';

// Registra cedo para capturar o convite de instalação do navegador.
initPwa();
initKeyboardInset();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
