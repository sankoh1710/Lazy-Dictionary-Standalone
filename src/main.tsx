import { createRoot, hydrateRoot } from 'react-dom/client';
import { Router, Route, Switch } from 'wouter';

import App from './App';
import { WordPage } from './pages/WordPage';

import './index.css';

function Routes() {
  return (
    <Switch>
      <Route path="/word/:slug" component={WordPage} />
      <Route component={App} />
    </Switch>
  );
}

const rootEl = document.getElementById('root')!;

// If the root already has server-rendered content (from the build-time
// pre-render step), hydrate instead of mounting fresh so the static HTML
// survives until React takes over (fast FCP, no flash).
if (rootEl.innerHTML.trim()) {
  hydrateRoot(rootEl, <Routes />);
} else {
  createRoot(rootEl).render(<Routes />);
}

