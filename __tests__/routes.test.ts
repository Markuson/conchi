import { ROUTES } from '../src/navigation/routes';

test('ROUTES.AppTabs is distinct from ROUTES.Home', () => {
  expect(ROUTES.AppTabs).not.toBe(ROUTES.Home);
  expect(ROUTES).toEqual({
    Home: 'Home',
    Analytics: 'Analytics',
    AppTabs: 'AppTabs',
    Settings: 'Settings',
  });
});
