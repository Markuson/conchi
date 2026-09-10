/**
 * Ambient module declaration for static image imports (Metro resolves these
 * to a numeric asset id / `{ uri }` object at runtime; TS just needs to know
 * the shape for `<Image source={...}>` to typecheck).
 */
declare module '*.png' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}
