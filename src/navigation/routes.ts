/**
 * The single source of truth for route names. Never use a string literal as a
 * route name anywhere else in the codebase — always import `ROUTES`.
 *
 * `ROUTES.AppTabs` is the Stack-level wrapper around the tab navigator; it is a
 * distinct name from `ROUTES.Home` (the Tab screen) to avoid a naming collision
 * between the Stack and Tab layers.
 */
export const ROUTES = {
  Home: 'Home',
  Analytics: 'Analytics',
  AppTabs: 'AppTabs',
  Settings: 'Settings',
} as const;

export type TabParamList = {
  [ROUTES.Home]: undefined;
  [ROUTES.Analytics]: undefined;
};

export type StackParamList = {
  [ROUTES.AppTabs]: undefined;
  [ROUTES.Settings]: undefined;
};
