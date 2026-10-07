import { AmbientBackground } from '../../../shared/components/ui-v2';
import { depth, glass } from '../../../shared/theme/materials';
import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import {
  CustomAlert,
  AlertType,
} from '../../../shared/components/ui/CustomAlert';
import { setConductorLoginGateBlocking } from '../../../app/conductorLoginGate';
import { setSessionLoginMode } from '../../../app/sessionLoginMode';
import { colors } from '../../../shared/theme/colors';
import { sessionAdapter } from '../../../core/auth/sessionAdapter';
import { userApi } from '../api/userApi';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/AuthNavigator';

type UserType = 'pasajero' | 'conductor';

export default function LoginScreen({
  navigation,
}: NativeStackScreenProps<AuthStackParamList, 'Login'>) {
  const { theme, motionEnabled } = useTheme();
  const [userType, setUserType] = useState<UserType>('pasajero');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const loginPending = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<import('react-native').TextInput>(null);
  const [formError, setFormError] = useState('');
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'error' as AlertType,
    title: '',
    message: '',
  });

  // Animation handling
  const { width } = Dimensions.get('window');
  const containerWidth = width - 48; // paddingHorizontal: 24 per side
  const slideWidth = (containerWidth - 12) / 2; // padding: 6 per side inside container
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const nextValue = userType === 'pasajero' ? 0 : slideWidth;
    if (!motionEnabled) {
      slideAnim.setValue(nextValue);
      return;
    }
    Animated.spring(slideAnim, {
      toValue: nextValue,
      useNativeDriver: true,
      bounciness: 4,
      speed: 12,
    }).start();
  }, [motionEnabled, slideAnim, userType, slideWidth]);

  const showAlert = (
    title: string,
    message: string,
    type: AlertType = 'error',
  ) => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const normalizeEmail = (value: string) => value.trim().toLowerCase();

  const handleLogin = async () => {
    if (loginPending.current) return;
    if (!email || !password) {
      setFormError('Ingresa tu correo y contraseña.');
      if (email) passwordRef.current?.focus();
      return;
    }

    setFormError('');
    loginPending.current = true;
    const isConductor = userType === 'conductor';
    if (isConductor) {
      setConductorLoginGateBlocking(true);
    }

    setLoading(true);

    try {
      const { data: signInData, error: signInError } =
        await sessionAdapter.signIn(normalizeEmail(email), password);

      if (signInError) {
        if (isConductor) {
          setConductorLoginGateBlocking(false);
        }
        showAlert('Error al iniciar sesión', signInError.message, 'error');
        return;
      }

      if (isConductor) {
        try {
          const userId = signInData.session?.user?.id;
          if (!userId) {
            await sessionAdapter.signOut();
            showAlert(
              'Sesión incompleta',
              'No se pudo verificar tu cuenta. Vuelve a intentar o confirma tu correo si aplica.',
              'error',
            );
            return;
          }

          const profile = await userApi.me();
          if (profile.role !== 'conductor') {
            await sessionAdapter.signOut();
            showAlert(
              'Sin permisos de conductor',
              'Tu cuenta no tiene perfil de conductor autorizado. Si crees que es un error, contacta a administración.',
              'error',
            );
            return;
          }

          await setSessionLoginMode('conductor');
        } catch (reason: unknown) {
          await sessionAdapter.signOut();
          showAlert(
            'Error al verificar conductor',
            reason instanceof Error
              ? reason.message
              : 'No se pudo verificar tu perfil.',
            'error',
          );
          return;
        } finally {
          setConductorLoginGateBlocking(false);
        }
      } else {
        await setSessionLoginMode('pasajero');
      }
    } catch (reason: unknown) {
      if (isConductor) setConductorLoginGateBlocking(false);
      showAlert(
        'No pudimos iniciar sesión',
        reason instanceof Error
          ? reason.message
          : 'Revisa tu conexión y vuelve a intentar.',
        'error',
      );
    } finally {
      loginPending.current = false;
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AmbientBackground />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Image
              source={require('../../../assets/Krow Logo Icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Muévete con KROW
            </Text>
          </View>

          <View style={styles.content}>
            <View
              style={[
                styles.typeSelectorContainer,
                { backgroundColor: theme.colors.surfaceOverlay },
                depth(theme, 1),
              ]}
            >
              <Animated.View
                style={[
                  styles.activeSliderIndicator,
                  {
                    width: slideWidth,
                    transform: [{ translateX: slideAnim }],
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              />
              <TouchableOpacity
                style={styles.typeButton}
                onPress={() => setUserType('pasajero')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: theme.colors.textSecondary },
                    userType === 'pasajero' && {
                      color: theme.colors.textInverse,
                    },
                  ]}
                >
                  Pasajero
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.typeButton}
                onPress={() => setUserType('conductor')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: theme.colors.textSecondary },
                    userType === 'conductor' && {
                      color: theme.colors.textInverse,
                    },
                  ]}
                >
                  Conductor
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.formContainer,
                glass(theme),
                depth(theme, 2),
                { borderRadius: 28, padding: 20 },
              ]}
            >
              <Input
                label="Correo institucional"
                placeholder="tu.nombre@campus.tecnm.mx"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                icon={
                  <Icon
                    name="email"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                }
              />

              <Input
                label="Contraseña"
                ref={passwordRef}
                autoComplete="current-password"
                onSubmitEditing={() => void handleLogin()}
                returnKeyType="go"
                error={formError || undefined}
                rightElement={
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                    style={{
                      minWidth: 48,
                      minHeight: 48,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={() => setShowPassword(v => !v)}
                  >
                    <Icon
                      name={showPassword ? 'visibility-off' : 'visibility'}
                      size={24}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                }
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                icon={
                  <Icon
                    name="lock"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                }
              />

              <Button
                title="Iniciar Sesión"
                onPress={handleLogin}
                loading={loading}
                style={styles.loginButton}
              />

              <TouchableOpacity
                style={styles.forgotPasswordContainer}
                accessibilityRole="button"
                onPress={() => navigation.navigate('Recover')}
              >
                <Text
                  style={[
                    styles.forgotPasswordText,
                    { color: theme.colors.primary },
                  ]}
                >
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>

              {userType === 'pasajero' && (
                <>
                  <View style={styles.dividerContainer}>
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: theme.colors.border },
                      ]}
                    />
                    <Text
                      style={[
                        styles.dividerText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      O
                    </Text>
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: theme.colors.border },
                      ]}
                    />
                  </View>

                  <Button
                    title="Crear cuenta"
                    variant="outline"
                    onPress={() => navigation.navigate('Register')}
                  />
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    minHeight: 210,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  logoImage: {
    width: 150,
    height: 150,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 30, // more rounded
    padding: 6,
    marginBottom: 30,
    position: 'relative',
  },
  activeSliderIndicator: {
    position: 'absolute',
    top: 6,
    left: 6,
    bottom: 6,
    backgroundColor: colors.primary,
    borderRadius: 24, // highly rounded
  },
  typeButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 24,
    zIndex: 1,
  },
  typeButtonText: {
    color: colors.text.secondary,
    fontWeight: '600',
    fontSize: 15,
  },
  textActive: {
    color: colors.text.inverse,
  },
  formContainer: {
    width: '100%',
  },
  loginButton: {
    marginTop: 10,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 5,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.default,
  },
  dividerText: {
    marginHorizontal: 15,
    color: colors.text.secondary,
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 10,
  },
});
