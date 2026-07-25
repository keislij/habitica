import ParentPage from '@/components/parentPage.vue';

// Settings
const Settings = () => import('@/pages/settings-overview');
const GeneralSettings = () => import('@/pages/settings/generalSettings');
const Notifications = () => import('@/pages/settings/notificationSettings');
const Transactions = () => import('@/pages/settings/purchaseHistory.vue');

const SiteData = () => import('@/pages/settings/siteData.vue');

// not converted yet
const PromoCode = () => import('@/pages/settings/promoCode.vue');
const Subscription = () => import('@/components/settings/subscription');

export const USER_ROUTES = {
  path: '/user',
  component: ParentPage,
  children: [
    {
      name: 'settings',
      path: 'settings',
      component: Settings,
      children: [
        {
          name: 'general',
          path: 'general',
          component: GeneralSettings,
        },
        {
          name: 'siteData',
          path: 'siteData',
          component: SiteData,
        },
        { path: 'api', redirect: { name: 'siteData' } },
        {
          name: 'promoCode',
          path: 'promo-code',
          component: PromoCode,
        },
        {
          name: 'subscription',
          path: 'subscription',
          component: Subscription,
          beforeEnter (to, from, next) {
            // Private self-host: there is nothing to subscribe to. The route is
            // GUARDED rather than removed because handleRedirect.js still pushes
            // { name: 'subscription' }; deleting it would make vue-router throw.
            if (import.meta.env.SELF_HOST_UNLOCK_ALL === 'true') {
              next({ name: 'general' });
              return;
            }
            next();
          },
        },
        {
          name: 'transactions',
          path: 'transactions',
          component: Transactions,
          meta: {
            privilegeNeeded: [
              'userSupport',
            ],
          },
        },
        {
          name: 'notifications',
          path: 'notifications',
          component: Notifications,
        },
      ],
    },
  ],
};
