import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Button } from './atoms/Button';
import { IS_DETOX } from '../lib/constants';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Mirrors `useEntrySubmission`'s `EntrySubmissionStatus` union. Re-declared
 * locally rather than imported — `src/components/**` must never import from
 * `src/features/**` (AD-2); this file takes plain props only.
 */
type EntryStatus = 'idle' | 'submitting' | 'waiting' | 'error' | 'ready';

export type EscriureOverlayProps = {
  visible: boolean;
  text: string;
  onChangeText: (text: string) => void;
  status: EntryStatus;
  errorMessage: string | undefined;
  onSubmit: () => void;
  /** Re-sends the last submitted text — shown only once `status === 'error'`. */
  onRetry: () => void;
  onClose: () => void;
};

/** Starting `translateY` for the slide-up spring — comfortably below the sheet's own height. Mirrors `ConfirmationCard.tsx`'s own constant. */
const OFFSCREEN_TRANSLATE_Y = 320;
const SPRING_CONFIG = { damping: 18, stiffness: 180 };

/**
 * Story 2.4's real "Escriure" text-entry overlay — replaces the Story 1.6
 * throwaway `TracerBulletModal`. A bottom sheet (~30% of screen height),
 * mirroring `ConfirmationCard`'s own Reanimated slide-up + backdrop pattern
 * rather than a full-screen `Modal`, so the two overlays this epic
 * introduces read as one consistent presentation style. Drives Phase 1 only
 * (the POST to n8n): once it succeeds, the caller (`navigation/index.tsx`)
 * sets `visible={false}` and Phase 2 continues in the background, tracked by
 * the Conchi Bubble instead so the user stays free to navigate elsewhere
 * while Conchita processes the entry. Presentational only — all business
 * logic lives in `useEntrySubmission`; the only logic here is the
 * empty-text inline validation, a pure UI concern.
 */
export function EscriureOverlay({
  visible,
  text,
  onChangeText,
  status,
  errorMessage,
  onSubmit,
  onRetry,
  onClose,
}: EscriureOverlayProps): React.JSX.Element | null {
  const { colors, typography, spacing } = useTheme();
  const [validationMessage, setValidationMessage] = useState<string | undefined>(undefined);
  const isSubmitting = status === 'submitting';
  const hasError = status === 'error';

  // Hooks must run unconditionally (before the `!visible` early return
  // below) -- resets offscreen while hidden so the next open's spring
  // starts from the same place every time, rather than only animating once.
  const translateY = useSharedValue(IS_DETOX || !visible ? OFFSCREEN_TRANSLATE_Y : 0);
  useEffect(() => {
    if (IS_DETOX) {
      translateY.value = visible ? 0 : OFFSCREEN_TRANSLATE_Y;
      return;
    }
    translateY.value = visible ? withSpring(0, SPRING_CONFIG) : OFFSCREEN_TRANSLATE_Y;
  }, [visible, translateY]);
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleChangeText = (value: string): void => {
    setValidationMessage(undefined);
    onChangeText(value);
  };

  const handleSubmit = (): void => {
    if (text.trim() === '') {
      setValidationMessage("Escriu un text abans d'enviar.");
      return;
    }
    setValidationMessage(undefined);
    onSubmit();
  };

  if (!visible) {
    return null;
  }

  const dynamicStyles = StyleSheet.create({
    backdrop: {
      backgroundColor: colors.bg,
    },
    closeLabel: {
      color: colors.textSecondary,
    },
    dragHandle: {
      backgroundColor: colors.textTertiary,
    },
    errorContainer: {
      marginTop: spacing.lg,
    },
    errorText: {
      color: colors.danger,
    },
    input: {
      borderColor: colors.border,
      color: colors.textPrimary,
      marginTop: spacing.lg,
      padding: spacing.md,
    },
    retryRow: {
      marginTop: spacing.sm,
    },
    sheet: {
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.xl,
    },
    spinner: {
      marginTop: spacing.lg,
    },
    submitRow: {
      marginTop: spacing.lg,
    },
    validationText: {
      color: colors.danger,
      marginTop: spacing.sm,
    },
  });

  return (
    <View style={styles.overlay}>
      <Pressable
        accessible={false}
        onPress={onClose}
        style={[styles.backdrop, dynamicStyles.backdrop]}
      />
      <Animated.View style={[styles.sheet, dynamicStyles.sheet, sheetAnimatedStyle]}>
        <View style={[styles.dragHandle, dynamicStyles.dragHandle]} />
        <ScrollView keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityLabel="Tanca"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}
          >
            <Text style={[typography.fieldValue, dynamicStyles.closeLabel]}>Tanca</Text>
          </Pressable>

          <TextInput
            accessibilityLabel="Missatge"
            editable={!isSubmitting}
            multiline
            onChangeText={handleChangeText}
            placeholder="Escriu un missatge per a la Conchita..."
            placeholderTextColor={colors.textTertiary}
            style={[typography.fieldValue, styles.input, dynamicStyles.input]}
            value={text}
          />

          {validationMessage !== undefined ? (
            <Text style={[typography.fieldValue, dynamicStyles.validationText]}>{validationMessage}</Text>
          ) : null}

          <View style={dynamicStyles.submitRow}>
            <Button disabled={isSubmitting} label="Envia" onPress={handleSubmit} variant="primary" />
          </View>

          {isSubmitting ? <ActivityIndicator color={colors.accent} style={dynamicStyles.spinner} /> : null}

          {hasError ? (
            <View style={dynamicStyles.errorContainer}>
              {errorMessage !== undefined ? (
                <Text style={[typography.fieldValue, dynamicStyles.errorText]}>{errorMessage}</Text>
              ) : null}
              <View style={dynamicStyles.retryRow}>
                <Button label="Torna-ho a provar" onPress={onRetry} variant="secondary" />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    opacity: 0.6,
  },
  closeButton: {
    alignSelf: 'flex-start',
  },
  dragHandle: {
    alignSelf: 'center',
    borderRadius: 2,
    height: 4,
    marginTop: 8,
    opacity: 0.14,
    width: 36,
  },
  input: {
    borderRadius: 4,
    borderWidth: 1,
    minHeight: 72,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    bottom: 0,
    height: '30%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
});
