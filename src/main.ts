import './styles/fonts.css';
import './styles/base.css';
import './styles/theme-violet.css';
import './styles/enhancements.css';
import './styles/experience.css';

import { PortfolioApp } from './portfolio-app';

document.addEventListener('DOMContentLoaded', () => {
  const app = new PortfolioApp();

  app.init();
  window.addEventListener('pagehide', () => app.destroy(), { once: true });
});
