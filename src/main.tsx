import { createRoot, hydrateRoot } from 'react-dom/client';
import { Route, Switch } from 'wouter';
import { Analytics } from '@vercel/analytics/react';

import App from './App';
import { WordPage } from './pages/WordPage';
import { GamePage } from './pages/GamePage';

import './index.css';

function Routes() {
  return (
    <Switch>
      <Route path="/play" component={GamePage} />
      <Route path="/word/:slug" component={WordPage} />
      <Route component={App} />
    </Switch>
  );
}

function RootApp() {
  return (
    <>
      <Routes />
      <Analytics />
    </>
  );
}

const rootEl = document.getElementById('root')!;

if (rootEl.innerHTML.trim()) {
  hydrateRoot(rootEl, <RootApp />);
} else {
  createRoot(rootEl).render(<RootApp />);
}
