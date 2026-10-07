import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import Config from 'react-native-config';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUserRole } from '../home/hooks/useCurrentUserRole';
import { userApi } from '../auth/api/userApi';
import { sessionAdapter } from '../../core/auth/sessionAdapter';
import { setSessionLoginMode } from '../../app/sessionLoginMode';
import { registerPilotPush, unregisterPilotPush } from './pilotPush';
import { pilotTracking } from './nativeTracking';
import { pilotApi } from './pilotApi';
import { useTheme } from '../../shared/theme/ThemeProvider';
import {
  ScreenContainer,
  Text,
  Card,
  Input,
  Button,
  FeedbackState,
  Skeleton,
} from '../../shared/components/ui-v2';
import { ScreenHeader } from '../../shared/components/ui-v2/ScreenHeader';
export function ProfileScreen() {
  const { user, error, loading, reload } = useCurrentUserRole();
  const navigation = useNavigation();
  const cache = useQueryClient();
  const { preference, setPreference } = useTheme();
  const q = useQuery({
    queryKey: ['me', user?.userId],
    queryFn: () => userApi.me(),
    enabled: !!user,
  });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [institutionalId, setInstitutionalId] = useState('');
  const [program, setProgram] = useState('');
  const [busy, setBusy] = useState(false);
  const actionPending = useRef(false);
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    if (!editing && q.data) {
      setName(q.data.fullName ?? '');
      setInstitutionalId(q.data.institutionalId ?? '');
      setProgram(q.data.academicProgram ?? '');
    }
  }, [q.data, editing]);
  const save = async () => {
    if (actionPending.current) return;
    if (!name.trim()) {
      setFeedback('Escribe tu nombre');
      return;
    }
    actionPending.current = true;
    setBusy(true);
    try {
      await userApi.upsertProfile({
        fullName: name.trim(),
        institutionalId,
        academicProgram: program,
        academicPeriod: q.data?.academicPeriod ?? null,
      });
      await cache.invalidateQueries({ queryKey: ['me'] });
      setEditing(false);
      setFeedback('Perfil actualizado');
    } catch (e) {
      setFeedback(
        e instanceof Error ? e.message : 'No pudimos guardar tu perfil',
      );
    } finally {
      actionPending.current = false;
      setBusy(false);
    }
  };
  const closeAccount = () =>
    Alert.alert(
      'Solicitar cierre de cuenta',
      'Se deshabilitará tu acceso. El borrado o la anonimización se procesarán según el aviso de privacidad. No podrás cerrar la cuenta con viajes pendientes.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Cerrar cuenta',
          style: 'destructive',
          onPress: () => {
            if (actionPending.current) return;
            actionPending.current = true;
            setBusy(true);
            void (async () => {
              try {
                await pilotApi.requestClosure();
                await pilotTracking.stop();
                await unregisterPilotPush();
                const { error: signOutError } = await sessionAdapter.signOut();
                if (signOutError) throw signOutError;
                cache.clear();
              } catch (e) {
                setFeedback(
                  e instanceof Error
                    ? e.message
                    : 'No pudimos solicitar el cierre',
                );
              } finally {
                actionPending.current = false;
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  const logout = () =>
    Alert.alert(
      'Cerrar sesión',
      'El GPS del viaje se detendrá en este dispositivo.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => {
            if (actionPending.current) return;
            actionPending.current = true;
            void (async () => {
              setBusy(true);
              try {
                await pilotTracking.stop();
                await unregisterPilotPush();
                const { error } = await sessionAdapter.signOut();
                if (error) throw error;
                cache.clear();
              } catch (e) {
                setFeedback(
                  e instanceof Error ? e.message : 'No pudimos cerrar sesión',
                );
              } finally {
                actionPending.current = false;
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  if (!user)
    return (
      <ScreenContainer padded>
        <ScreenHeader
          title="Tu perfil"
          onBack={
            navigation.canGoBack() ? () => navigation.goBack() : undefined
          }
        />
        {loading ? (
          <Skeleton height={220} />
        ) : (
          <FeedbackState
            kind="error"
            title="No pudimos cargar tu cuenta"
            description={error ?? undefined}
            actionLabel="Reintentar"
            onAction={reload}
          />
        )}
        {!loading && (
          <View style={{ gap: 12 }}>
            {!!feedback && (
              <Text accessibilityLiveRegion="polite">{feedback}</Text>
            )}
            <Button
              title="Cerrar sesión"
              variant="outline"
              loading={busy}
              onPress={logout}
            />
          </View>
        )}
      </ScreenContainer>
    );
  return (
    <ScreenContainer padded safeBottom={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: 24, gap: 16 }}
        >
          <ScreenHeader
            title="Tu perfil"
            onBack={
              Config.KROW_PILOT_ENABLED !== 'true'
                ? () => navigation.goBack()
                : undefined
            }
            subtitle="Tu cuenta, preferencias y formas de viajar."
          />
          {q.error && (
            <FeedbackState
              kind="error"
              title="No pudimos cargar el perfil"
              actionLabel="Reintentar"
              onAction={() => void q.refetch()}
            />
          )}
          <Card>
            <View style={{ gap: 12 }}>
              <Text variant="title">{user?.displayName ?? 'Cargando…'}</Text>
              <Text tone="secondary">{user?.email}</Text>
              <Text tone="secondary">
                {user?.driverId
                  ? `Conductor: ${
                      user.driverStatus === 'approved'
                        ? 'aprobado'
                        : 'pendiente de revisión'
                    }`
                  : 'Cuenta de pasajero'}
              </Text>
              {editing ? (
                <>
                  <Input
                    label="Nombre completo"
                    value={name}
                    onChangeText={setName}
                    autoComplete="name"
                  />
                  <Input
                    label="Número de control"
                    value={institutionalId}
                    onChangeText={setInstitutionalId}
                  />
                  <Input
                    label="Programa académico"
                    value={program}
                    onChangeText={setProgram}
                  />
                  <Button
                    title="Guardar cambios"
                    onPress={() => void save()}
                    loading={busy}
                  />
                  <Button
                    title="Cancelar edición"
                    variant="ghost"
                    disabled={busy}
                    onPress={() => setEditing(false)}
                  />
                </>
              ) : (
                <Button
                  title="Editar perfil"
                  variant="outline"
                  disabled={!q.data}
                  onPress={() => setEditing(true)}
                />
              )}
            </View>
          </Card>
          {user?.driverId && (
            <Card>
              <View style={{ gap: 12 }}>
                <Text variant="title">Cómo quieres viajar</Text>
                <Text tone="secondary">
                  Cambiar de modo organiza tus viajes. La aprobación para
                  conducir se conserva.
                </Text>
                <Button
                  title="Como pasajero"
                  variant={user.role === 'pasajero' ? 'primary' : 'outline'}
                  onPress={() =>
                    void setSessionLoginMode('pasajero').catch(() =>
                      setFeedback(
                        'No pudimos guardar tu preferencia de viaje.',
                      ),
                    )
                  }
                />
                <Button
                  title="Como conductor"
                  variant={user.role === 'conductor' ? 'primary' : 'outline'}
                  onPress={() =>
                    void setSessionLoginMode('conductor').catch(() =>
                      setFeedback(
                        'No pudimos guardar tu preferencia de viaje.',
                      ),
                    )
                  }
                />
              </View>
            </Card>
          )}
          <Card>
            <View style={{ gap: 12 }}>
              <Text variant="title">Apariencia</Text>
              {(['system', 'light', 'dark'] as const).map((p, i) => (
                <Button
                  key={p}
                  title={['Seguir al dispositivo', 'Claro', 'Oscuro'][i]}
                  variant={preference === p ? 'primary' : 'outline'}
                  onPress={() => setPreference(p)}
                  accessibilityState={{ selected: p === preference }}
                />
              ))}
            </View>
          </Card>
          {Config.KROW_PILOT_PUSH_ENABLED === 'true' && (
            <Card>
              <View style={{ gap: 12 }}>
                <Text variant="title">Avisos del viaje</Text>
                <Text tone="secondary">
                  Recibe solicitudes, mensajes y avisos de llegada a la parada.
                </Text>
                <Button
                  title="Activar notificaciones"
                  variant="outline"
                  loading={busy}
                  onPress={() => {
                    if (actionPending.current) return;
                    actionPending.current = true;
                    setBusy(true);
                    void registerPilotPush()
                      .then(() => setFeedback('Notificaciones activadas'))
                      .catch(e =>
                        setFeedback(
                          e instanceof Error
                            ? e.message
                            : 'No pudimos activar los avisos',
                        ),
                      )
                      .finally(() => {
                        actionPending.current = false;
                        setBusy(false);
                      });
                  }}
                />
              </View>
            </Card>
          )}
          <Card>
            <View style={{ gap: 12 }}>
              <Text variant="title">Ayuda y privacidad</Text>
              <Text tone="secondary">
                Solo los participantes autorizados pueden ver la ubicación
                durante el viaje. El GPS se detiene al finalizar o cerrar
                sesión.
              </Text>
              <Button
                title="Contactar soporte"
                variant="outline"
                disabled={!Config.KROW_SUPPORT_URL}
                onPress={() =>
                  void Linking.openURL(Config.KROW_SUPPORT_URL!).catch(() =>
                    setFeedback('No pudimos abrir soporte'),
                  )
                }
              />
              <Button
                title="Aviso de privacidad"
                variant="ghost"
                disabled={!Config.KROW_PRIVACY_URL}
                onPress={() =>
                  void Linking.openURL(Config.KROW_PRIVACY_URL!).catch(() =>
                    setFeedback('No pudimos abrir el aviso'),
                  )
                }
              />
              {!Config.KROW_SUPPORT_URL && (
                <Text variant="caption" tone="secondary">
                  El contacto de soporte debe configurarse antes del piloto.
                </Text>
              )}
            </View>
          </Card>
          {!!feedback && (
            <Text accessibilityLiveRegion="polite">{feedback}</Text>
          )}
          {Config.KROW_ACCOUNT_CLOSURE_ENABLED === 'true' && (
            <Button
              title="Solicitar cierre de cuenta"
              variant="destructive"
              loading={busy}
              onPress={closeAccount}
            />
          )}
          <Button
            title="Cerrar sesión"
            variant="destructive"
            loading={busy}
            onPress={logout}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
