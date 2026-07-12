import './styles/base.css';
import './styles/theme-violet.css';
import './styles/enhancements.css';
import './styles/experience.css';

import { PortfolioApp } from './portfolio-app';

document.addEventListener('DOMContentLoaded', () => {
  new PortfolioApp().init();
});
