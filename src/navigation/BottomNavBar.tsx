import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '../theme/ThemeProvider';
import { darkColors, staticColors } from '../theme/colors';
import { ROUTES, type TabParamList } from './routes';
import { HouseIcon } from '../components/icons/HouseIcon';
import { BarChartIcon } from '../components/icons/BarChartIcon';
import { PlusIcon } from '../components/icons/PlusIcon';
import type { IconProps } from '../components/icons/types';

/** Bar content height, excluding the bottom safe-area inset (DESIGN.md: "64px + device safe area padding"). */
const BAR_HEIGHT = 64;
/** FAB diameter (DESIGN.md's FAB spec). */
const FAB_SIZE = 56;
/** Width of the cradle cutout at its widest (FAB diameter + padding on each side). */
const NOTCH_WIDTH = FAB_SIZE + 24;
/** How far the cutout dips below the bar's flat top edge. */
const NOTCH_DEPTH = 34;
/** Icon size inside each tab button. */
const TAB_ICON_SIZE = 22;

/**
 * Per-tab-route icon + label, keyed by route name. `MainTabs` (see
 * `navigation/index.tsx`) only ever registers `ROUTES.Home` and
 * `ROUTES.Analytics`, so a static map (rather than reading
 * `descriptors[route.key].options`) is sufficient and keeps this file free of
 * an extra indirection layer.
 */
const TAB_CONFIG: Record<keyof TabParamList, { Icon: React.ComponentType<IconProps>; label: string }> = {
  [ROUTES.Home]: { Icon: HouseIcon, label: 'Inici' },
  [ROUTES.Analytics]: { Icon: BarChartIcon, label: 'Estadístiques' },
};

/**
 * Builds the cradle-cutout bar fill path: a flat rectangle whose top edge dips
 * into a smooth cubic-Bézier notch (sized to cradle the FAB) at horizontal
 * center. No plain-View masking approach reproduces this curve, hence this
 * story's `react-native-svg` dependency.
 */
function buildBarFillPath(width: number, height: number): string {
  const centerX = width / 2;
  const left = centerX - NOTCH_WIDTH / 2;
  const right = centerX + NOTCH_WIDTH / 2;
  const curveWidth = NOTCH_WIDTH * 0.35;

  return [
    `M0,0`,
    `H${left}`,
    `C${left + curveWidth},0 ${centerX - curveWidth},${NOTCH_DEPTH} ${centerX},${NOTCH_DEPTH}`,
    `C${centerX + curveWidth},${NOTCH_DEPTH} ${right - curveWidth},0 ${right},0`,
    `H${width}`,
    `V${height}`,
    `H0`,
    `Z`,
  ].join(' ');
}

/** Same top curve as {@link buildBarFillPath}, left open (no sides/bottom) so it can be stroked as the bar's 1px top rule. */
function buildTopRulePath(width: number): string {
  const centerX = width / 2;
  const left = centerX - NOTCH_WIDTH / 2;
  const right = centerX + NOTCH_WIDTH / 2;
  const curveWidth = NOTCH_WIDTH * 0.35;

  return [
    `M0,0`,
    `H${left}`,
    `C${left + curveWidth},0 ${centerX - curveWidth},${NOTCH_DEPTH} ${centerX},${NOTCH_DEPTH}`,
    `C${centerX + curveWidth},${NOTCH_DEPTH} ${right - curveWidth},0 ${right},0`,
    `H${width}`,
  ].join(' ');
}

/**
 * Custom `tabBar` for `MainTabs` (wired in `navigation/index.tsx`). Renders the
 * notched/cradle bottom bar (DESIGN.md's Bottom Navigation Bar component) plus
 * the elevated FAB nested in the notch. The FAB is visually complete but wired
 * to a no-op `onPress` — the radial fan and any real action are out of scope
 * until Story 1.6 / Epic 2.
 */
export function BottomNavBar({ state, navigation }: BottomTabBarProps): React.JSX.Element {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const totalHeight = BAR_HEIGHT + insets.bottom;
  const barFillPath = buildBarFillPath(width, totalHeight);
  const topRulePath = buildTopRulePath(width);
  // FAB's bottom edge lands exactly at the notch's deepest point, so the cutout
  // visually cradles the circle's underside while most of it floats above the bar.
  const fabTop = -(FAB_SIZE - NOTCH_DEPTH);

  const handleFabPress = (): void => {
    // No-op by design this story — FAB is visually complete only. Wiring to the
    // radial fan / real actions is Story 1.6 (see spec-1-4's "Never" boundary).
  };

  return (
    <View style={[styles.container, { height: totalHeight }]}>
      <Svg width={width} height={totalHeight} style={StyleSheet.absoluteFill}>
        <Path d={barFillPath} fill={colors.navBg} />
        <Path d={topRulePath} stroke={colors.rule} strokeWidth={1} fill="none" />
      </Svg>

      <View style={[styles.tabRow, { height: BAR_HEIGHT }]}>
        {state.routes.map((route, index) => {
          // `BottomTabBarProps.state.routes[].name` is typed as plain `string`
          // (generic across any tab navigator), but `Tab.Navigator<TabParamList>`
          // guarantees it's actually always a `TabParamList` key at runtime.
          const config = TAB_CONFIG[route.name as keyof TabParamList];
          if (!config) {
            return null;
          }
          const { Icon, label } = config;
          const isFocused = state.index === index;
          const tintColor = isFocused ? colors.accent : colors.textTertiary;

          const onPress = (): void => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
              onPress={onPress}
              // `Pressable` has no default visual press feedback on either
              // platform — dim opacity while pressed, same convention as
              // `Button.tsx`.
              style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}
            >
              <Icon color={tintColor} size={TAB_ICON_SIZE} />
              <Text numberOfLines={1} style={[typography.navLabel, { color: tintColor }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Acció ràpida"
        onPress={handleFabPress}
        // `Pressable` has no default visual press feedback on either platform
        // — dim opacity while pressed, same convention as `Button.tsx`.
        style={({ pressed }) => [
          styles.fab,
          {
            top: fabTop,
            backgroundColor: colors.accent,
            shadowColor: colors.fabShadow,
          },
          pressed && styles.pressed,
        ]}
      >
        {/* DESIGN.md: FAB "+" icon is `bg` colored — dark-locked to `darkColors.bg`
            in both themes for contrast against the amber `accent` fill, the same
            rule `Button.tsx`'s primary variant text already follows. */}
        <PlusIcon color={darkColors.bg} size={24} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // DESIGN.md's Bottom Navigation Bar shadow: `0 -1px 0 rgba(0,0,0,0.12)`.
    // `elevation` is Android's coarser equivalent (ignores `shadowColor`,
    // per the platform limitation logged in `deferred-work.md`).
    elevation: 2,
    shadowColor: staticColors.navBarShadow,
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 1,
    shadowRadius: 0,
    width: '100%',
  },
  fab: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: FAB_SIZE / 2,
    elevation: 8,
    height: FAB_SIZE,
    justifyContent: 'center',
    position: 'absolute',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    width: FAB_SIZE,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  tabRow: {
    flexDirection: 'row',
  },
});
