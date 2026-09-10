import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { version } from '../../package.json';
import { Button } from '../components/atoms/Button';
import { SegmentedControl } from '../components/atoms/SegmentedControl';
import { TextField } from '../components/atoms/TextField';
import type { Theme } from '../features/settings/settingsStore';
import { validateConnection } from '../features/settings/validateConnection';
import { readSecureItem, writeSecureItem } from '../lib/storage/secureStore';
import { useSettingsStore } from '../store';
import { useTheme } from '../theme/ThemeProvider';

/**
 * The auth secret is intentionally never stored in `settingsStore`/MMKV
 * (AD-5) — it lives in local component state during editing and is written
 * directly to `expo-secure-store` on a successful Acceptar (Design Notes).
 */
const AUTH_SECRET_KEY = 'settings.authSecret';

const THEME_OPTIONS: { label: string; value: Theme }[] = [
  { label: 'Fosc', value: 'dark' },
  { label: 'Clar', value: 'light' },
  { label: 'Sistema', value: 'system' },
];

type ConnectionStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export function SettingsScreen(): React.JSX.Element {
  const { colors, typography, spacing } = useTheme();
  const webhookUrl = useSettingsStore((state) => state.webhookUrl);
  const setWebhookUrl = useSettingsStore((state) => state.setWebhookUrl);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);

  const [urlDraft, setUrlDraft] = useState(webhookUrl);
  const [urlError, setUrlError] = useState<string | undefined>(undefined);
  const [secretDraft, setSecretDraft] = useState('');
  const [savedSecret, setSavedSecret] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>({ kind: 'idle' });

  // Set false in an unmount cleanup; `handleAccept` checks it after every
  // `await` so a response that arrives after the user has already navigated
  // away doesn't call `setState` on an unmounted screen.
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Hydrates the "currently persisted" secret baseline so Descartar has
  // something correct to revert to, even before this screen's own Acceptar
  // has ever run this session (Design Notes: "empty if never saved").
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const persisted = await readSecureItem(AUTH_SECRET_KEY);
        if (!cancelled && persisted) {
          setSavedSecret(persisted);
          // Only fills the visible field if the user hasn't already started
          // typing into it while this read was in flight — otherwise a late
          // resolution would clobber their in-progress input. The functional
          // updater reads the *current* value at resolution time rather than
          // the empty string this effect's closure captured at mount.
          setSecretDraft((current) => (current === '' ? persisted : current));
        }
      } catch {
        // No persisted secret to hydrate, or secure storage unavailable —
        // fields simply stay empty; Acceptar still works for a fresh connection.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAccept = async (): Promise<void> => {
    // Trimmed so a pasted value with stray leading/trailing whitespace
    // doesn't fail the format check or authenticate with a confusing error.
    const url = urlDraft.trim();
    const secret = secretDraft.trim();

    setUrlError(undefined);
    setStatus({ kind: 'saving' });

    const result = await validateConnection(url, secret);
    if (!isMountedRef.current) return;

    if (!result.ok) {
      if (result.reason === 'format') {
        setUrlError('URL no vàlida');
        setStatus({ kind: 'idle' });
        return;
      }
      setStatus({
        kind: 'error',
        message:
          result.reason === 'network'
            ? "No s'ha pogut connectar. Comprova la connexió i torna-ho a provar."
            : 'El servidor ha retornat un error. Comprova la URL i el secret.',
      });
      return;
    }

    try {
      await writeSecureItem(AUTH_SECRET_KEY, secret);
    } catch {
      if (isMountedRef.current) {
        setStatus({ kind: 'error', message: "No s'ha pogut desar el secret de forma segura." });
      }
      return;
    }
    if (!isMountedRef.current) return;

    setWebhookUrl(url);
    setSavedSecret(secret);
    setStatus({ kind: 'success' });
  };

  const handleDiscard = (): void => {
    setUrlDraft(webhookUrl);
    setUrlError(undefined);
    setSecretDraft(savedSecret);
    setStatus({ kind: 'idle' });
  };

  const dynamicStyles = StyleSheet.create({
    buttonRow: {
      marginTop: spacing.xs,
    },
    buttonSpacer: {
      marginHorizontal: spacing.xs,
    },
    content: {
      padding: spacing.xl,
    },
    fieldLabel: {
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    fieldValuePrimary: {
      color: colors.textPrimary,
    },
    section: {
      marginBottom: spacing['2xl'],
    },
    sectionHeader: {
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    statusError: {
      color: colors.danger,
      marginBottom: spacing.md,
    },
    statusSuccess: {
      color: colors.accent,
      marginBottom: spacing.md,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={dynamicStyles.content}>
        <View style={[styles.section, dynamicStyles.section]}>
          <Text style={[typography.sectionHeader, dynamicStyles.sectionHeader]}>CONNEXIÓ</Text>
          <TextField
            disabled={status.kind === 'saving'}
            error={urlError}
            keyboardType="url"
            label="URL del webhook"
            onChangeText={(text) => {
              setUrlDraft(text);
              setUrlError(undefined);
              setStatus({ kind: 'idle' });
            }}
            placeholder="https://el-teu-n8n.example.com"
            value={urlDraft}
          />
          <TextField
            disabled={status.kind === 'saving'}
            label="Secret d'autenticació"
            onChangeText={(text) => {
              setSecretDraft(text);
              setStatus({ kind: 'idle' });
            }}
            secureTextEntry
            value={secretDraft}
          />
          {status.kind === 'error' ? (
            <Text style={[typography.fieldValue, dynamicStyles.statusError]}>{status.message}</Text>
          ) : null}
          {status.kind === 'success' ? (
            <Text style={[typography.fieldValue, dynamicStyles.statusSuccess]}>Connexió desada correctament.</Text>
          ) : null}
          <View style={[styles.buttonRow, dynamicStyles.buttonRow]}>
            <View style={[styles.buttonSpacer, dynamicStyles.buttonSpacer]}>
              <Button disabled={status.kind === 'saving'} label="Descartar" onPress={handleDiscard} variant="secondary" />
            </View>
            <View style={[styles.buttonSpacer, dynamicStyles.buttonSpacer]}>
              <Button
                disabled={status.kind === 'saving'}
                label="Acceptar"
                onPress={() => {
                  void handleAccept();
                }}
                variant="primary"
              />
            </View>
          </View>
        </View>

        <View style={[styles.section, dynamicStyles.section]}>
          <Text style={[typography.sectionHeader, dynamicStyles.sectionHeader]}>VISUALITZACIÓ</Text>
          <Text style={[typography.fieldLabel, dynamicStyles.fieldLabel]}>Tema</Text>
          <SegmentedControl onChange={setTheme} options={THEME_OPTIONS} value={theme} />
        </View>

        <View style={[styles.section, dynamicStyles.section]}>
          <Text style={[typography.sectionHeader, dynamicStyles.sectionHeader]}>SOBRE</Text>
          <View style={styles.aboutRow}>
            <Text style={[typography.fieldLabel, dynamicStyles.fieldLabel]}>Versió</Text>
            <Text style={[typography.fieldValue, dynamicStyles.fieldValuePrimary]}>{version}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  aboutRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonRow: {
    flexDirection: 'row',
  },
  buttonSpacer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  section: {
    width: '100%',
  },
});
