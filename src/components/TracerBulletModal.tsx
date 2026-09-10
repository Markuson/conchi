import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

/**
 * Mirrors `useTracerBullet`'s `TracerBulletStatus` union. Re-declared locally
 * rather than imported — `src/components/**` must never import from
 * `src/features/**` (AD-2); this file takes plain props only.
 */
type TracerBulletStatus = 'idle' | 'submitting' | 'success' | 'error';

export type TracerBulletModalProps = {
  visible: boolean;
  text: string;
  onChangeText: (text: string) => void;
  status: TracerBulletStatus;
  responseText: string | undefined;
  errorMessage: string | undefined;
  onSubmit: () => void;
  onClose: () => void;
};

/**
 * Minimal, unstyled full-screen modal for Story 1.6's tracer bullet: proves
 * the FAB -> n8n -> Conchita round-trip works before Epic 2 builds the real
 * Confirmation Card on top of it. Deliberately plain RN components with no
 * design tokens/colors/fonts (satisfies "no styled UI" and `no-color-literals`
 * by construction) and props-only — all business logic (the actual POST,
 * status state machine) lives in `useTracerBullet`; the only logic here is
 * the empty-text inline validation, a pure UI concern.
 */
export function TracerBulletModal({
  visible,
  text,
  onChangeText,
  status,
  responseText,
  errorMessage,
  onSubmit,
  onClose,
}: TracerBulletModalProps): React.JSX.Element {
  const [validationMessage, setValidationMessage] = useState<string | undefined>(undefined);
  const isSubmitting = status === 'submitting';

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

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityLabel="Tanca" accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
          <Text>Tanca</Text>
        </Pressable>

        <TextInput
          accessibilityLabel="Missatge"
          editable={!isSubmitting}
          multiline
          onChangeText={handleChangeText}
          placeholder="Escriu un missatge per a la Conchita..."
          style={styles.input}
          value={text}
        />

        {validationMessage !== undefined ? <Text>{validationMessage}</Text> : null}

        <Pressable
          accessibilityLabel="Envia"
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={handleSubmit}
          style={styles.submitButton}
        >
          <Text>Envia</Text>
        </Pressable>

        {isSubmitting ? <ActivityIndicator /> : null}
        {status === 'error' && errorMessage !== undefined ? <Text>{errorMessage}</Text> : null}
        {status === 'success' && responseText !== undefined ? (
          <View style={styles.responseContainer}>
            <Text>{responseText}</Text>
          </View>
        ) : null}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    padding: 16,
  },
  content: {
    flexGrow: 1,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    minHeight: 96,
    padding: 8,
  },
  responseContainer: {
    marginTop: 16,
  },
  submitButton: {
    padding: 12,
  },
});
