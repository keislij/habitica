import Vue from 'vue';
import axios from 'axios';
import {
  ModalPlugin,
  DropdownPlugin,
  PopoverPlugin,
  FormPlugin,
  FormInputPlugin,
  FormRadioPlugin,
  TooltipPlugin,
  NavbarPlugin,
  CollapsePlugin,
} from 'bootstrap-vue';
import AppComponent from './app';
import { setUpLogging } from '@/libs/logging';
import router from './router/index';
import getStore from './store';
import StoreModule from './libs/store';
import './filters/registerGlobals';
import i18n from './libs/i18n';

const IS_PRODUCTION = import.meta.env.NODE_ENV === 'production'; // eslint-disable-line no-process-env

// Configure Vue global options, see https://vuejs.org/v2/api/#Global-Config

// Enable perf timeline measuring for Vue components in Chrome Dev Tools
// Note: this has been disabled because it caused some perf issues
// if rendering becomes too slow in dev mode, we should turn it off
// See https://github.com/vuejs/vue/issues/5174
Vue.config.performance = !IS_PRODUCTION;
// Disable annoying reminder abour production build in dev mode
Vue.config.productionTip = IS_PRODUCTION;

// window['habitica-i18n] is injected by the server
Vue.use(i18n, { i18nData: window && window['habitica-i18n'] });
Vue.use(StoreModule);
Vue.use(ModalPlugin);
Vue.use(DropdownPlugin);
Vue.use(PopoverPlugin);
Vue.use(FormPlugin);
Vue.use(FormInputPlugin);
Vue.use(FormRadioPlugin);
Vue.use(TooltipPlugin);
Vue.use(NavbarPlugin);
Vue.use(CollapsePlugin);

// A chunk that fails to preload otherwise aborts the router navigation and
// leaves the app on its splash screen with no error surfaced. The common cause
// is a redeploy invalidating hashed asset names while a client -- especially an
// installed PWA holding a cached index.html -- still references the old ones.
// Reloading once picks up the new index.html and its current asset hashes.
// Guarded so a genuinely broken build cannot reload-loop.
window.addEventListener('vite:preloadError', event => {
  event.preventDefault();
  const KEY = 'habitica:preloadReloadAt';
  const last = Number(window.sessionStorage?.getItem(KEY) || 0);
  if (Date.now() - last > 15000) {
    window.sessionStorage?.setItem(KEY, String(Date.now()));
    window.location.reload();
  } else {
    console.error('Asset preload failed twice; not reloading again', event); // eslint-disable-line no-console
  }
});

// Service worker: offline tolerance plus Chrome/Android installability, which
// requires a fetch handler. iOS Add-to-Home-Screen never needed this. The
// worker is network-first throughout, so it cannot serve a stale build to an
// online device -- see website/client/public/sw.js for why that matters here.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      // Registration failing must never be fatal: the app works fine without it.
      console.warn('Service worker registration failed', err); // eslint-disable-line no-console
    });
  });
}

setUpLogging();
const store = getStore();

if (import.meta.env.TIME_TRAVEL_ENABLED === 'true') {
  (async () => {
    const sinon = await import('sinon');
    if (axios.defaults.headers.common['x-api-user']) {
      const response = await axios.get('/api/v4/debug/time-travel-time');
      const time = new Date(response.data.data.time);
      Vue.config.clock = sinon.useFakeTimers({
        now: time,
        shouldAdvanceTime: true,
      });
    }
  })();
}

const vueInstance = new Vue({
  el: '#app',
  router,
  store,
  render: h => h(AppComponent),
});

export default vueInstance;

window.externalLink = url => {
  vueInstance.$root.$emit('habitica:external-link', url);
};
