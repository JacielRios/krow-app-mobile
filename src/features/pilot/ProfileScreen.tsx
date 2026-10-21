import { NotificationSettings } from './NotificationSettings';
import { KrowAlert as Alert } from '../../shared/components/ui-v2/dialogService';
import { IconButton } from '../../shared/components/ui-v2';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Image,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import Config from 'react-native-config';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../app/navigation/MainNavigator';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUserRole } from '../home/hooks/useCurrentUserRole';
import { userApi } from '../auth/api/userApi';
import { sessionAdapter } from '../../core/auth/sessionAdapter';
import { shareDiagnostics } from '../../core/diagnostics';
import { setSessionLoginMode } from '../../app/sessionLoginMode';
import { unregisterPilotPush } from './pilotPush';
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
  ListRow,
} from '../../shared/components/ui-v2';
import { ScreenHeader } from '../../shared/components/ui-v2/ScreenHeader';
export function ProfileScreen() {
  const { user, error, loading, reload } = useCurrentUserRole();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const cache = useQueryClient();
  const { theme, preference, setPreference } = useTheme();
  const q = useQuery({
    queryKey: ['me', user?.userId],
    queryFn: () => userApi.me(),
    enabled: !!user,
  });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [institutionalId, setInstitutionalId] = useState('');
  const [program, setProgram] = useState('');
  const [period, setPeriod] = useState('');
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState(false);
  const actionPending = useRef(false);
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    if (!editing && q.data) {
      setName(q.data.fullName ?? '');
      setInstitutionalId(q.data.institutionalId ?? '');
      setProgram(q.data.academicProgram ?? '');
      setPeriod(
        q.data.academicPeriod == null ? '' : String(q.data.academicPeriod),
      );
      setPhoto(q.data.profilePhoto ?? '');
    }
  }, [q.data, editing]);
  const save = async () => {
    if (actionPending.current) return;
    if (!name.trim()) {
      setFeedback('Escribe tu nombre');
      return;
    }
    if (
      period &&
      (!/^\d{1,2}$/.test(period) || Number(period) < 1 || Number(period) > 20)
    ) {
      setFeedback('El semestre debe estar entre 1 y 20');
      return;
    }
    if (photo.trim() && !/^https:\/\/[^\s]+$/i.test(photo.trim())) {
      setFeedback('La foto debe usar una dirección HTTPS válida');
      return;
    }
    actionPending.current = true;
    setBusy(true);
    try {
      await userApi.upsertProfile({
        fullName: name.trim(),
        institutionalId,
        academicProgram: program,
        academicPeriod: period ? Number(period) : null,
        profilePhoto: photo.trim() || null,
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
              iconName="logout"
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
          contentContainerStyle={{ paddingVertical: 24, gap: 32 }}
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
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <Text variant="title" style={{ flex: 1 }}>
                  {user?.displayName ?? 'Cargando…'}
                </Text>
                {!editing && (
                  <IconButton
                    iconName="edit"
                    variant="tonal"
                    accessibilityLabel="Editar perfil"
                    disabled={!q.data}
                    onPress={() => setEditing(true)}
                  />
                )}
              </View>
              {!!q.data?.profilePhoto && (
                <Image
                  source={{ uri: q.data.profilePhoto }}
                  style={{ width: 72, height: 72, borderRadius: 36 }}
                  accessibilityLabel="Tu foto de perfil"
                />
              )}
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
                  <Input
                    label="Semestre"
                    value={period}
                    onChangeText={setPeriod}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Input
                    label="Dirección HTTPS de tu foto (opcional)"
                    value={photo}
                    onChangeText={setPhoto}
                    autoCapitalize="none"
                    keyboardType="url"
                    maxLength={500}
                  />
                  <Button
                    title="Guardar cambios"
                    onPress={() => void save()}
                    loading={busy}
                    iconName="check"
                  />
                  <Button
                    title="Cancelar edición"
                    variant="ghost"
                    disabled={busy}
                    onPress={() => setEditing(false)}
                  />
                </>
              ) : null}
            </View>
          </Card>
          {user?.driverId && (
            <Card>
              <View style={{ gap: 12 }}>
                <Text variant="title">Cómo quieres viajar</Text>
                <ListRow
                  title="Ver mis métricas"
                  iconName="bar-chart"
                  onPress={() => navigation.navigate('DriverMetrics')}
                />
                <Text tone="secondary">
                  Cambiar de modo organiza tus viajes. La aprobación para
                  conducir se conserva.
                </Text>
                <ListRow
                  title="Como pasajero"
                  iconName="person-outline"
                  accessibilityRole="radio"
                  selected={user.role === 'pasajero'}
                  onPress={() =>
                    void setSessionLoginMode('pasajero').catch(() =>
                      setFeedback(
                        'No pudimos guardar tu preferencia de viaje.',
                      ),
                    )
                  }
                />
                <ListRow
                  title="Como conductor"
                  iconName="directions-car"
                  accessibilityRole="radio"
                  selected={user.role === 'conductor'}
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
                <ListRow
                  key={p}
                  title={['Seguir al dispositivo', 'Claro', 'Oscuro'][i]}
                  iconName={['brightness-auto', 'light-mode', 'dark-mode'][i]}
                  onPress={() => setPreference(p)}
                  accessibilityRole="radio"
                  selected={p === preference}
                />
              ))}
            </View>
          </Card>
          {Config.KROW_PILOT_PUSH_ENABLED === 'true' && (
            <Card>
              <NotificationSettings />
            </Card>
          )}
          <Card>
            <View style={{ gap: 12 }}>
              <Text variant="title">Ayuda y privacidad</Text>
              <ListRow
                title="Compartir diagnóstico"
                iconName="bug-report"
                onPress={() =>
                  void shareDiagnostics().catch(() =>
                    setFeedback('No pudimos preparar el diagnóstico'),
                  )
                }
              />
              <Text tone="secondary">
                Solo los participantes autorizados pueden ver la ubicación
                durante el viaje. El GPS se detiene al finalizar o cerrar
                sesión.
              </Text>
              <ListRow
                title="Contactar soporte"
                iconName="help-outline"
                disabled={!Config.KROW_SUPPORT_URL}
                onPress={() =>
                  void Linking.openURL(Config.KROW_SUPPORT_URL!).catch(() =>
                    setFeedback('No pudimos abrir soporte'),
                  )
                }
              />
              <ListRow
                title="Aviso de privacidad"
                iconName="privacy-tip"
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
              variant="text"
              labelStyle={{ color: theme.colors.status.error }}
              loading={busy}
              onPress={closeAccount}
            />
          )}
          <Button
            title="Cerrar sesión"
            variant="outline"
            loading={busy}
            onPress={logout}
            iconName="logout"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
