import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Button } from './atoms/Button';
import { DrumRoller, type DrumRollerOption } from './atoms/DrumRoller';
import { TextField } from './atoms/TextField';
import { IS_DETOX } from '../lib/constants';
import { roundTripSuccess } from '../lib/conchiCopy';
import { useTheme } from '../theme/ThemeProvider';
import type { Category } from '../lib/types/referenceData';

/**
 * Local, non-persisted mirror of `Entry` (`lib/types/entry.ts`) — deliberately
 * excludes `id`/`userId`/`origin`/`fileUrl`, which only make sense once this
 * card is wired to a real round trip (Stories 2.4/2.6). `amount` widens to
 * `number | null` (vs. `Entry`'s plain `number`) to honestly represent the
 * "amount missing/negative from extraction" edge case this card must display
 * as `0.00` (I/O matrix: "Null/negative amount").
 */
export type ConfirmationCardData = {
  amount: number | null;
  currency: string;
  category: string;
  subcategory: string;
  description: string;
  date: string;
  context?: string;
};

export type ConfirmationCardProps = {
  /** Extracted entry data to review — mock/passed-in only, this card never fetches or persists it. */
  data: ConfirmationCardData;
  categories: Category[];
  contexts: string[];
  /** Fires with the current (possibly edited) values when Acceptar is tapped with a category selected. */
  onAccept: (data: ConfirmationCardData) => void;
  /** Fires with no data when Descartar (or the backdrop) is tapped. */
  onDiscard: () => void;
  /** Fires with the current values when "Editar" is tapped — Story 3.1 wires this to the Full Edit Screen. */
  onEdit: (data: ConfirmationCardData) => void;
};

// No `currencies` prop exists on this card (only `categories`/`contexts` are
// reference data) — a small fixed local list stands in until a real currency
// reference source exists.
const CURRENCY_OPTIONS: DrumRollerOption<string>[] = [
  { label: 'EUR', value: 'EUR' },
  { label: 'USD', value: 'USD' },
  { label: 'GBP', value: 'GBP' },
];

/** Sentinel context option meaning "no context selected" (DESIGN.md: 'Shows "—" if none selected'). */
const NO_CONTEXT = '—';

/** Starting `translateY` for the slide-up spring — comfortably below the sheet's own height. */
const OFFSCREEN_TRANSLATE_Y = 480;
const SPRING_CONFIG = { damping: 18, stiffness: 180 };

/**
 * Clamps a possibly-null/negative/non-finite amount to a safe, always-displayable
 * value (I/O matrix row: "Null/negative amount"). `Number.isFinite` rejects `NaN`
 * (a valid `number` at the type level, e.g. `Number('abc')`) and `Infinity`/`-Infinity`
 * alike — without it, either could slip through `amount < 0` and render as the
 * literal string `"NaN"` or `"Infinity"`.
 */
function clampAmount(amount: number | null): number {
  if (amount === null || !Number.isFinite(amount) || amount < 0) {
    return 0;
  }
  return amount;
}

/**
 * Parses user-typed amount text, accepting a comma as the decimal separator
 * alongside a dot — the on-screen decimal-pad keyboard shows "," for many
 * device locales (Catalan/Spanish included), and `Number("24,50")` would
 * otherwise be `NaN`, silently zeroing a validly-typed amount.
 */
function parseAmountText(text: string): number {
  return Number(text.replace(',', '.'));
}

/**
 * Resolves the working category against the available list.
 * - Empty input -> no selection yet (Acceptar stays disabled; not a "mismatch").
 * - A value present in `categories` -> used as-is.
 * - A non-empty value absent from `categories` -> defaults to the first
 *   available category, flagged `mismatched` for the warning label (I/O
 *   matrix: "Unrecognized category").
 */
function resolveCategory(
  category: string,
  categories: Category[],
): { category: string; mismatched: boolean } {
  if (category === '') {
    return { category: '', mismatched: false };
  }
  if (categories.some(item => item.name === category)) {
    return { category, mismatched: false };
  }
  return { category: categories[0]?.name ?? '', mismatched: true };
}

/** Keeps `subcategory` only if it belongs to `category`'s own list — otherwise clears it. */
function resolveSubcategory(
  subcategory: string,
  category: string,
  categories: Category[],
): string {
  const options =
    categories.find(item => item.name === category)?.subcategories ?? [];
  return options.includes(subcategory) ? subcategory : '';
}

/**
 * Bottom-sheet card reviewing Conchita's extracted entry data before it's
 * saved. Props-only (AD-2: no `store/`/`features/` imports) — `categories`/
 * `contexts`/`data` all arrive from the caller, and `onAccept`/`onDiscard`/
 * `onEdit` are the card's only way out. No navigation, no persistence: it's
 * the reusable building block Stories 2.4/2.6 wire to the real round trip.
 *
 * Renders as an absolutely-positioned overlay (backdrop + sheet) rather than
 * an RN `Modal` — `TracerBulletModal.tsx`'s `Modal` usage was an explicit
 * Story 1.6 throwaway, not a precedent to reuse here. The slide-up itself is
 * a Reanimated spring on `translateY`, skipped (instant) under `IS_DETOX`
 * per the existing determinism convention.
 */
export function ConfirmationCard({
  data,
  categories,
  contexts,
  onAccept,
  onDiscard,
  onEdit,
}: ConfirmationCardProps): React.JSX.Element {
  const { colors, typography, spacing } = useTheme();

  const [amountText, setAmountText] = useState(() =>
    clampAmount(data.amount).toFixed(2),
  );
  const [description, setDescription] = useState(data.description);
  const [date, setDate] = useState(data.date);

  const [category, setCategory] = useState(
    () => resolveCategory(data.category, categories).category,
  );
  const [categoryMismatched, setCategoryMismatched] = useState(
    () => resolveCategory(data.category, categories).mismatched,
  );
  const [subcategory, setSubcategory] = useState(() =>
    resolveSubcategory(
      data.subcategory,
      resolveCategory(data.category, categories).category,
      categories,
    ),
  );

  const [currency, setCurrency] = useState(() =>
    CURRENCY_OPTIONS.some(option => option.value === data.currency)
      ? data.currency
      : CURRENCY_OPTIONS[0]?.value ?? 'EUR',
  );

  const hasContexts = contexts.length > 0;
  const [context, setContext] = useState(() =>
    data.context !== undefined && contexts.includes(data.context)
      ? data.context
      : NO_CONTEXT,
  );

  // Tracks which of the four Drum Rollers below (by `label`) is currently
  // open, so opening one closes any other that was already open.
  const [openRollerLabel, setOpenRollerLabel] = useState<string | null>(null);

  // Picked once on mount; stable for the card's lifetime (I/O rows don't
  // require re-rolling it, and re-picking on every render would be jarring).
  const [quote] = useState(
    () => roundTripSuccess[Math.floor(Math.random() * roundTripSuccess.length)],
  );

  const translateY = useSharedValue(IS_DETOX ? 0 : OFFSCREEN_TRANSLATE_Y);
  useEffect(() => {
    if (!IS_DETOX) {
      translateY.value = withSpring(0, SPRING_CONFIG);
    }
  }, [translateY]);
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const categoryOptions: DrumRollerOption<string>[] = categories.map(item => ({
    label: item.name,
    value: item.name,
  }));
  const subcategoryOptions: DrumRollerOption<string>[] = (
    categories.find(item => item.name === category)?.subcategories ?? []
  ).map(name => ({ label: name, value: name }));
  const contextOptions: DrumRollerOption<string>[] = [
    { label: NO_CONTEXT, value: NO_CONTEXT },
    ...contexts.map(name => ({ label: name, value: name })),
  ];

  const handleCategoryChange = (value: string): void => {
    setCategory(value);
    setCategoryMismatched(false);
    setSubcategory('');
  };

  const buildData = (): ConfirmationCardData => ({
    // Routed through the same `clampAmount` guard applied at mount — a pasted or
    // typed negative/non-finite value must not reach `onAccept`/`onEdit` unclamped.
    amount: clampAmount(parseAmountText(amountText)),
    currency,
    category,
    subcategory,
    description,
    date,
    context: context === NO_CONTEXT ? undefined : context,
  });

  const canAccept = category !== '';

  const handleAccept = (): void => {
    if (!canAccept) {
      return;
    }
    onAccept(buildData());
  };

  const handleEdit = (): void => {
    onEdit(buildData());
  };

  const dynamicStyles = StyleSheet.create({
    amountInput: {
      borderBottomColor: colors.accentUnderline,
      color: colors.textPrimary,
      paddingVertical: spacing.xs,
    },
    backdrop: {
      backgroundColor: colors.bg,
    },
    buttonRow: {
      gap: spacing.sm,
      paddingBottom: spacing.xl,
      paddingTop: spacing.md,
    },
    dragHandle: {
      backgroundColor: colors.textTertiary,
      marginTop: spacing.sm,
    },
    editLink: {
      color: colors.accent,
    },
    editLinkWrapper: {
      paddingVertical: spacing.sm,
    },
    missingCategoryMessage: {
      color: colors.danger,
      marginBottom: spacing.sm,
    },
    pickerRow: {
      gap: spacing.md,
    },
    quote: {
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    separator: {
      backgroundColor: colors.rule,
    },
    sheet: {
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.xl,
    },
  });

  return (
    <View style={styles.overlay}>
      <Pressable
        accessibilityLabel="Tanca"
        accessibilityRole="button"
        onPress={onDiscard}
        style={[styles.backdrop, dynamicStyles.backdrop]}
      />
      <Animated.View
        style={[styles.sheet, dynamicStyles.sheet, cardAnimatedStyle]}
      >
        <View style={[styles.dragHandle, dynamicStyles.dragHandle]} />
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.amountRow}>
            <TextInput
              accessibilityLabel="Import"
              keyboardType="decimal-pad"
              onChangeText={setAmountText}
              style={[
                typography.confirmationAmount,
                styles.amountInput,
                dynamicStyles.amountInput,
              ]}
              value={amountText}
            />
          </View>

          <DrumRoller
            label="Divisa"
            onChange={setCurrency}
            onOpenChange={isOpen =>
              setOpenRollerLabel(isOpen ? 'Divisa' : null)
            }
            open={openRollerLabel === 'Divisa'}
            options={CURRENCY_OPTIONS}
            selected={currency}
          />

          <View style={[styles.pickerRow, dynamicStyles.pickerRow]}>
            <View style={styles.pickerColumn}>
              <DrumRoller
                label="Categoria"
                onChange={handleCategoryChange}
                onOpenChange={isOpen =>
                  setOpenRollerLabel(isOpen ? 'Categoria' : null)
                }
                open={openRollerLabel === 'Categoria'}
                options={categoryOptions}
                selected={category}
                warning={categoryMismatched}
              />
            </View>
            <View style={[styles.separator, dynamicStyles.separator]} />
            <View style={styles.pickerColumn}>
              <DrumRoller
                label="Subcategoria"
                onChange={setSubcategory}
                onOpenChange={isOpen =>
                  setOpenRollerLabel(isOpen ? 'Subcategoria' : null)
                }
                open={openRollerLabel === 'Subcategoria'}
                options={subcategoryOptions}
                selected={subcategory}
              />
            </View>
          </View>

          {!canAccept ? (
            <Text
              style={[
                typography.fieldValue,
                dynamicStyles.missingCategoryMessage,
              ]}
            >
              Cal seleccionar una categoria per continuar.
            </Text>
          ) : null}

          <TextField
            keyboardType="default"
            label="Data"
            onChangeText={setDate}
            value={date}
          />
          <TextField
            keyboardType="default"
            label="Descripció"
            onChangeText={setDescription}
            value={description}
          />

          {hasContexts ? (
            <DrumRoller
              label="Context"
              onChange={setContext}
              onOpenChange={isOpen =>
                setOpenRollerLabel(isOpen ? 'Context' : null)
              }
              open={openRollerLabel === 'Context'}
              options={contextOptions}
              selected={context}
            />
          ) : null}

          <Text style={[typography.conchiQuote, dynamicStyles.quote]}>
            {quote}
          </Text>
        </ScrollView>

        <Pressable
          accessibilityLabel="Editar"
          accessibilityRole="button"
          onPress={handleEdit}
          style={[styles.editLinkWrapper, dynamicStyles.editLinkWrapper]}
        >
          <Text style={[typography.fieldValue, dynamicStyles.editLink]}>
            Editar
          </Text>
        </Pressable>

        <View style={[styles.buttonRow, dynamicStyles.buttonRow]}>
          <View style={styles.buttonSlot}>
            <Button label="Descartar" onPress={onDiscard} variant="danger" />
          </View>
          <View style={styles.buttonSlot}>
            <Button
              disabled={!canAccept}
              label="Acceptar"
              onPress={handleAccept}
              variant="primary"
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  amountInput: {
    borderBottomWidth: 2,
  },
  amountRow: {
    alignItems: 'flex-start',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    opacity: 0.6,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  buttonSlot: {
    flex: 1,
  },
  dragHandle: {
    alignSelf: 'center',
    borderRadius: 2,
    height: 4,
    // 14% opacity per DESIGN.md's drag-handle spec — a numeric `opacity`,
    // not a color literal, layered on top of the reused `textTertiary` token.
    opacity: 0.14,
    width: 36,
  },
  editLinkWrapper: {
    alignSelf: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerRow: {
    flexDirection: 'row',
  },
  separator: {
    width: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
});
