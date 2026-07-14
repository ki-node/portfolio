import './styles/fonts.css';
import './styles/base.css';
import './styles/theme-violet.css';
import './styles/enhancements.css';
import './styles/experience.css';

import { exposeAppContext } from './app-context';
import { mountPortfolio } from './app-lifecycle';
import { createPortfolioControllers, PortfolioApp } from './portfolio-app';

const context = exposeAppContext(import.meta.env.MODE);

mountPortfolio({
  createApp: () => new PortfolioApp(createPortfolioControllers(context)),
});
