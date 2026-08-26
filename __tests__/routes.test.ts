import { ROUTES } from '../src/navigation/routes';

test('ROUTES.Main is distinct from ROUTES.Home', () => {
  expect(ROUTES.Main).not.toBe(ROUTES.Home);
  expect(ROUTES).toEqual({
    Home: 'Home',
    Analytics: 'Analytics',
    Main: 'Main',
    Settings: 'Settings',
  });
});
