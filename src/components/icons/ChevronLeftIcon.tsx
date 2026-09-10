import React from 'react';
import Svg, { Path } from 'react-native-svg';

import type { IconProps } from './types';

/**
 * Back-navigation glyph. Replaces native-stack's default header/back button
 * on Settings (DESIGN.md's "chrome is invisible" philosophy has no header
 * anywhere) — this sits standalone in the screen's top-left corner instead.
 */
export function ChevronLeftIcon({ color, size }: IconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
