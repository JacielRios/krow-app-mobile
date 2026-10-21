import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ScreenContainer,
  Text,
  Input,
  Button,
  ListRow,
} from '../../shared/components/ui-v2';
import { ScreenHeader } from '../../shared/components/ui-v2/ScreenHeader';
import { pilotApi } from './pilotApi';
import { newId } from './nativeTracking';
export function ReportIncidentScreen() {
  const navigation = useNavigation();
  const { rideId } = useRoute().params as { rideId: string };
  const [kind, setKind] = useState('other');
  const [details, setDetails] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const pending = useRef<{ id: string; kind: string; details: string } | null>(
    null,
  );
  const submitting = useRef(false);
  async function send() {
    if (submitting.current || sent) return;
    if (!details.trim()) {
      setFeedback('Describe lo ocurrido');
      return;
    }
    if (
      !pending.current ||
      pending.current.kind !== kind ||
      pending.current.details !== details.trim()
    )
      pending.current = { id: newId(), kind, details: details.trim() };
    submitting.current = true;
    setBusy(true);
    setFeedback('');
    try {
      await pilotApi.report(
        rideId,
        pending.current.id,
        pending.current.kind,
        pending.current.details,
      );
      setSent(true);
      setFeedback(
        'Reporte registrado. El equipo de KROW podrá consultarlo en su panel.',
      );
    } catch (e) {
      setFeedback(
        e instanceof Error
          ? e.message
          : 'No pudimos enviar el reporte. Puedes reintentar.',
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
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
            title="Reportar un problema"
            onBack={() => navigation.goBack()}
          />
          <Text tone="secondary">
            El reporte se enviará al equipo de KROW. Este canal no ofrece
            atención inmediata.
          </Text>
          <View style={{ gap: 8 }}>
            {[
              ['safety', 'Seguridad'],
              ['vehicle', 'Vehículo'],
              ['conduct', 'Comportamiento'],
              ['other', 'Otro problema'],
            ].map(([value, label]) => (
              <ListRow
                key={value}
                title={label}
                selected={kind === value}
                accessibilityRole="radio"
                disabled={busy || sent}
                onPress={() => setKind(value)}
              />
            ))}
          </View>
          <Input
            label="Describe lo ocurrido"
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={2000}
            editable={!busy && !sent}
          />
          {!!feedback && (
            <Text accessibilityLiveRegion="polite">{feedback}</Text>
          )}
          <Button
            title={sent ? 'Reporte enviado' : 'Enviar reporte'}
            onPress={() => void send()}
            loading={busy}
            disabled={sent}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
