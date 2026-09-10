/**
 * Shared prop type for the small `react-native-svg` glyphs in this folder
 * (`HouseIcon`, `BarChartIcon`, `PlusIcon`). Lives in its own neutral module
 * rather than being re-exported from one specific icon file, since it belongs
 * to none of them individually.
 */
export type IconProps = {
  color: string;
  size: number;
};
