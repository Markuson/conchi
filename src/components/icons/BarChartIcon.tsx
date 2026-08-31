import React from 'react';
import Svg, { Rect } from 'react-native-svg';

import type { IconProps } from './types';

/**
 * Bottom-nav "Analytics" glyph (Estadístiques tab). Three ascending bars,
 * colored by the caller per DESIGN.md's tab-state rule (`accent` active /
 * `textTertiary` inactive).
 */
export function BarChartIcon({ color, size }: IconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={13} width={4} height={7} rx={1} fill={color} />
      <Rect x={10} y={9} width={4} height={11} rx={1} fill={color} />
      <Rect x={16} y={4} width={4} height={16} rx={1} fill={color} />
    </Svg>
  );
}
