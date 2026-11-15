import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import './styles/motion.css';
import App from './App.jsx';
import LanguageProvider from './i18n/LanguageProvider.jsx';

async function start() {
  // Modo de demonstração (VITE_DEMO_MODE=true): instala a reprodução de respostas gravadas ANTES
  // do primeiro render, para que nenhum pedido chegue à rede. A comparação é feita directamente
  // com `import.meta.env` (constante no build): sem a variável, o `import()` é eliminado e o
  // código e os dados de demonstração não entram no bundle de produção.
  let demo = null;
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    const { activateDemoMode } = await import('./demo/index.js');
    demo = activateDemoMode();
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <LanguageProvider>
        <App demo={demo} />
      </LanguageProvider>
    </StrictMode>,
  );
}

start();
