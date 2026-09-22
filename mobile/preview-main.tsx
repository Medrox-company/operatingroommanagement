import React from 'react';
import { createRoot } from 'react-dom/client';
import '../app/globals.css';
import AppStorePreview from './AppStorePreview';

const root = document.getElementById('root');
if (!root) throw new Error('Kořen náhledu nebyl nalezen');

createRoot(root).render(
  <React.StrictMode>
    <AppStorePreview />
  </React.StrictMode>,
);
