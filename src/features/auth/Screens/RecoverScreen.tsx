import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Config from 'react-native-config';
import {
  ScreenContainer,
  Text,
  Input,
  Button,
} from '../../../shared/components/ui-v2';
import { ScreenHeader } from '../../../shared/components/ui-v2/ScreenHeader';
import { sessionAdapter } from '../../../core/auth/sessionAdapter';
export function RecoverScreen() {
  const nav = useNavigation();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const requestPending = useRef(false);
  const [feedback, setFeedback] = useState('');
  const send = async (resend = false) => {
    if (requestPending.current) return;
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setFeedback('Escribe un correo válido');
      return;
    }
    if (!Config.KROW_AUTH_REDIRECT_URL) {
      setFeedback(
        'La recuperación requiere configurar el enlace seguro de acceso. Contacta a soporte.',
      );
      return;
    }
    requestPending.current = true;
    setBusy(true);
    try {
      const { error } = await (resend
        ? sessionAdapter.resendConfirmation(normalized)
        : sessionAdapter.requestRecovery(normalized));
      if (error) throw error;
      setFeedback(
        'Si tu cuenta es elegible, recibirás un correo. Revisa también la carpeta de spam.',
      );
    } catch {
      setFeedback(
        'No pudimos solicitar el correo. Intenta nuevamente en unos minutos.',
      );
    } finally {
      requestPending.current = false;
      setBusy(false);
    }
  };
  return (
    <ScreenContainer padded>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: 24, gap: 16 }}
        >
          <ScreenHeader
            title="Recupera tu acceso"
            subtitle="Te enviaremos un enlace seguro a tu correo."
            onBack={() => nav.goBack()}
          />
          <Input
            label="Correo institucional"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Button
            title="Recuperar contraseña"
            loading={busy}
            onPress={() => void send()}
          />
          <Button
            title="Reenviar confirmación de cuenta"
            variant="outline"
            disabled={busy}
            onPress={() => void send(true)}
          />
          {!!feedback && (
            <Text accessibilityLiveRegion="polite">{feedback}</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
