import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { desktop, isMacApp } from './lib/desktop';

if (desktop) document.documentElement.classList.add('desktop');
if (isMacApp) document.documentElement.classList.add('mac');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
