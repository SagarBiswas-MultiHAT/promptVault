/**
 * @project PromptVault (https://github.com/SagarBiswas-MultiHAT)
 * @author Sagar Biswas (@SagarBiswas-MultiHAT) <https://multihat.dev>
 * @copyright Copyright (c) 2026 Sagar Biswas (MultiHAT)
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App.tsx';
import { configureSessionKeyBridge } from '../hooks/useVault.ts';
import { initExtensionStorage } from './storageAdapter.ts';
import { extensionSessionBridge } from './sessionBridge.ts';
import '../index.css';

async function bootstrap() {
  await initExtensionStorage();
  configureSessionKeyBridge(extensionSessionBridge);

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void bootstrap();
