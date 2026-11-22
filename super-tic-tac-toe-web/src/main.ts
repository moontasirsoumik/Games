import './styles.css';
import { createApp } from './app';
import { registerServiceWorker } from './pwa';

const base = import.meta.env.BASE_URL;
document.documentElement.style.setProperty('--icon-cross', `url("${base}icons/cross.png")`);
document.documentElement.style.setProperty('--icon-circle', `url("${base}icons/circle.png")`);
document.documentElement.style.setProperty('--icon-draw', `url("${base}icons/draw.png")`);

const mount = document.getElementById('app');
if (mount) {
  createApp(mount);
  void registerServiceWorker();
}