import React from 'react';
import Svg, { Path } from 'react-native-svg';

import type { IconProps } from './types';

/**
 * FAB "+" glyph. DESIGN.md: "+ sign, 24px, weight 300" — rendered as a thin
 * stroked cross rather than a filled glyph to read as the specified light
 * weight.
 */
export function PlusIcon({ color, size }: IconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
