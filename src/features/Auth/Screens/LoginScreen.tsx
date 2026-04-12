import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Input } from '../../../core/components/ui/Input';
import { Button } from '../../../core/components/ui/Button';
import { colors } from '../../../core/theme/colors';

type UserType = 'pasajero' | 'conductor';

export default function LoginScreen({ navigation }: any) {
  const [userType, setUserType] = useState<UserType>('pasajero');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Animation handling
  const { width } = Dimensions.get('window');
  const containerWidth = width - 48; // paddingHorizontal: 24 per side
  const slideWidth = (containerWidth - 12) / 2; // padding: 6 per side inside container
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: userType === 'pasajero' ? 0 : slideWidth,
      useNativeDriver: true,
      bounciness: 4,
      speed: 12,
    }).start();
  }, [userType, slideWidth]);

  const handleLogin = () => {
    // Navigate to Home eventually, for now just log
    console.log('Login', { email, password, userType });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <Image
              source={require('../../../assets/Krow Logo Icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.title}>Bienvenido a Krow</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.typeSelectorContainer}>
              <Animated.View
                style={[
                  styles.activeSliderIndicator,
                  { width: slideWidth, transform: [{ translateX: slideAnim }] }
                ]}
              />
              <TouchableOpacity
                style={styles.typeButton}
                onPress={() => setUserType('pasajero')}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeButtonText, userType === 'pasajero' && styles.textActive]}>Pasajero</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.typeButton}
                onPress={() => setUserType('conductor')}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeButtonText, userType === 'conductor' && styles.textActive]}>Conductor</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Input
                placeholder="Correo Institucional"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                icon={<Icon name="email" size={24} color={colors.text.secondary} />}
              />

              <Input
                placeholder="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                icon={<Icon name="lock" size={24} color={colors.text.secondary} />}
              />

              <Button
                title="Iniciar Sesión"
                onPress={handleLogin}
                style={styles.loginButton}
              />

              <TouchableOpacity style={styles.forgotPasswordContainer}>
                <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              {userType === 'pasajero' && (
                <>
                  <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>O</Text>
                    <View style={styles.divider} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20
  },
  logoImage: {
    width: 200,
    height: 200,
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
    fontSize: 15
  },
  textActive: {
    color: colors.text.inverse
  },
  formContainer: {
    width: '100%'
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