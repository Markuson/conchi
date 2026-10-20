import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from './atoms/Button';
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

/**
 * Story 2.4's real "Escriure" text-entry overlay — replaces the Story 1.6
 * throwaway `TracerBulletModal`. Drives Phase 1 only (the POST to n8n): once
 * it succeeds, the caller (`navigation/index.tsx`) closes this overlay and
 * Phase 2 continues in the background, tracked by the Conchi Bubble instead
 * so the user stays free to navigate elsewhere while Conchita processes the
 * entry. Presentational only — all business logic lives in
 * `useEntrySubmission`; the only logic here is the empty-text inline
 * validation, a pure UI concern (mirrors `TracerBulletModal`'s own split).
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
}: EscriureOverlayProps): React.JSX.Element {
  const { colors, typography, spacing } = useTheme();
  const [validationMessage, setValidationMessage] = useState<string | undefined>(undefined);
  const isSubmitting = status === 'submitting';
  const hasError = status === 'error';

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

  const dynamicStyles = StyleSheet.create({
    closeLabel: {
      color: colors.textSecondary,
    },
    container: {
      backgroundColor: colors.bg,
      padding: spacing.xl,
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
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <ScrollView contentContainerStyle={[styles.content, dynamicStyles.container]}>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    alignSelf: 'flex-start',
  },
  content: {
    flexGrow: 1,
  },
  input: {
    borderRadius: 4,
    borderWidth: 1,
    minHeight: 96,
  },
});
