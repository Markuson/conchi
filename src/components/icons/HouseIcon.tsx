import React from 'react';
import Svg, { Path } from 'react-native-svg';

import type { IconProps } from './types';

/**
 * Bottom-nav "Home" glyph (Inici tab). Simple house silhouette — roofline +
 * body — sized/colored by the caller so it can render in either `accent`
 * (active) or `textTertiary` (inactive) per DESIGN.md's tab-state rule.
 */
export function HouseIcon({ color, size }: IconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 11.5L12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-5.5h4V20h3a1 1 0 0 0 1-1v-9"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
