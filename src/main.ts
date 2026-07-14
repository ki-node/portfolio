import './styles/fonts.css';
import './styles/base.css';
import './styles/theme-violet.css';
import './styles/enhancements.css';
import './styles/experience.css';

import { exposeAppContext } from './app-context';
import { mountPortfolio } from './app-lifecycle';

exposeAppContext(import.meta.env.MODE);
mountPortfolio();
