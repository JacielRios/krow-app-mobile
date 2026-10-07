import React, { useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  ScreenContainer,
  Text,
  Input,
  Button,
} from '../../../shared/components/ui-v2';
import { ScreenHeader } from '../../../shared/components/ui-v2/ScreenHeader';
import { sessionAdapter } from '../../../core/auth/sessionAdapter';
export function PasswordResetScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const actionPending = useRef(false);
  const [feedback, setFeedback] = useState('');
  const save = async () => {
    if (actionPending.current) return;
    if (password.length < 8 || password !== confirm) {
      setFeedback('Usa al menos 8 caracteres y repite la misma contraseña.');
      return;
    }
    actionPending.current = true;
    setBusy(true);
    try {
      const { error } = await sessionAdapter.updatePassword(password);
      if (error) throw error;
      onDone();
    } catch {
      setFeedback(
        'No pudimos actualizar la contraseña. Solicita un enlace nuevo e intenta nuevamente.',
      );
    } finally {
      actionPending.current = false;
      setBusy(false);
    }
  };
  const cancel = async () => {
    if (actionPending.current) return;
    actionPending.current = true;
    setBusy(true);
    try {
      const { error } = await sessionAdapter.signOut();
      if (error) throw error;
      onDone();
    } catch {
      setFeedback('No pudimos cerrar la sesión. Vuelve a intentar.');
    } finally {
      actionPending.current = false;
      setBusy(false);
    }
  };
  return (
    <ScreenContainer padded>
      <ScrollView contentContainerStyle={{ paddingVertical: 24, gap: 16 }}>
        <ScreenHeader title="Elige una contraseña nueva" />
        <Input
          label="Nueva contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
        />
        <Input
          label="Confirmar contraseña"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          autoComplete="new-password"
        />
        <Button
          title="Guardar contraseña"
          loading={busy}
          onPress={() => void save()}
        />
        <Button
          title="Cancelar y cerrar sesión"
          variant="ghost"
          disabled={busy}
          onPress={() => void cancel()}
        />
        {!!feedback && (
          <Text tone="error" accessibilityLiveRegion="polite">
            {feedback}
          </Text>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
