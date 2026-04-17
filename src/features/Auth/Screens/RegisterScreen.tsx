import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Input } from '../../../core/components/ui/Input';
import { Button } from '../../../core/components/ui/Button';
import { Dropdown } from '../../../core/components/ui/Dropdown';
import { CustomAlert, AlertType } from '../../../core/components/ui/CustomAlert';
import { colors } from '../../../core/theme/colors';
import { supabase } from '../../../lib/supabase';

const CARRERAS = [
  'Ing Sistemas Computacionales',
  'Ing Mecatrónica',
  'Ing Ambiental',
  'Ing Industrial',
  'Ing Electromecánica',
  'Ing Administración',
  'Ing Semiconductores'
];

const SEMESTRES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export default function RegisterScreen({ navigation }: any) {
  const [formData, setFormData] = useState({
    nombre: '',
    numeroControl: '',
    correo: '',
    carrera: '',
    semestre: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'error' as AlertType,
    title: '',
    message: '',
    onCloseUrl: false, // flag to navigate back
  });

  const showAlert = (title: string, message: string, type: AlertType = 'error', onCloseUrl = false) => {
    setAlertConfig({ visible: true, title, message, type, onCloseUrl });
  };

  const handleAlertClose = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
    if (alertConfig.onCloseUrl) {
      navigation.goBack();
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const normalizeInstitutionalEmail = (input: string) => input.trim().toLowerCase();

  const isValidInstitutionalEmail = (email: string) => /^[^\s@]+@[^\s@]+\.tecnm\.mx$/i.test(email);

  const handleRegister = async () => {
    const {
      nombre,
      numeroControl,
      correo,
      carrera,
      semestre,
      password,
      confirmPassword,
    } = formData;

    if (!nombre || !numeroControl || !correo || !carrera || !semestre || !password || !confirmPassword) {
      showAlert('Campos incompletos', 'Por favor completa todos los campos.');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Contraseñas distintas', 'La contraseña y su confirmación deben coincidir.');
      return;
    }

    if (password.length < 6) {
      showAlert('Contraseña inválida', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const email = normalizeInstitutionalEmail(correo);
    if (!isValidInstitutionalEmail(email)) {
      showAlert('Correo inválido', 'Usa formato institucional: usuario@algo.tecnm.mx');
      return;
    }

    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: nombre.trim(),
          institutional_id: numeroControl.trim(),
          academic_program: carrera,
          academic_period: semestre,
        },
      },
    });

    if (signUpError || !signUpData.user) {
      setLoading(false);
      showAlert('Error al registrar', signUpError?.message ?? 'No se pudo crear la cuenta.', 'error');
      return;
    }

    const periodValue = Number.parseInt(semestre, 10);

    const { error: profileError } = await supabase.from('users').upsert(
      {
        uuid: signUpData.user.id,
        full_name: nombre.trim(),
        email_address: email,
        institutional_id: numeroControl.trim(),
        academic_program: carrera,
        academic_period: Number.isNaN(periodValue) ? null : periodValue,
        is_active: true,
      },
      {
        onConflict: 'uuid',
      },
    );

    setLoading(false);

    if (profileError) {
      console.error('Profile insert error:', {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
        hasSessionAfterSignUp: Boolean(signUpData.session),
      });

      showAlert(
        'Cuenta creada con advertencia',
        `Se creó la cuenta de acceso, pero no se guardó el perfil.\n\nError: ${profileError.message}${profileError.code ? ` (${profileError.code})` : ''}`,
        'warning'
      );
      return;
    }

    showAlert(
      'Cuenta creada',
      'Tu cuenta fue creada correctamente. Si tienes confirmación por correo, revísala antes de iniciar sesión.',
      'success',
      true
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Crear Cuenta</Text>
          </View>

          <View style={styles.formContainer}>
            <Input 
              placeholder="Nombre completo" 
              value={formData.nombre}
              onChangeText={(text) => handleChange('nombre', text)}
              icon={<Icon name="person" size={24} color={colors.text.secondary} />}
            />
            
            <Input 
              placeholder="Número de control" 
              value={formData.numeroControl}
              onChangeText={(text) => handleChange('numeroControl', text)}
              keyboardType="numeric"
              icon={<Icon name="badge" size={24} color={colors.text.secondary} />}
            />
            
            <Input 
              placeholder="ej. alumno@campus.tecnm.mx" 
              value={formData.correo}
              onChangeText={(text) => handleChange('correo', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              icon={<Icon name="email" size={24} color={colors.text.secondary} />}
            />
            
            <Dropdown 
              placeholder="Seleccionar carrera" 
              value={formData.carrera}
              options={CARRERAS}
              onSelect={(text) => handleChange('carrera', text)}
              icon={<Icon name="school" size={24} color={colors.text.secondary} />}
            />
            
            <Dropdown 
              placeholder="Seleccionar semestre" 
              value={formData.semestre}
              options={SEMESTRES}
              onSelect={(text) => handleChange('semestre', text)}
              icon={<Icon name="format-list-numbered" size={24} color={colors.text.secondary} />}
            />
            
            <Input 
              placeholder="Contraseña" 
              value={formData.password}
              onChangeText={(text) => handleChange('password', text)}
              secureTextEntry
              icon={<Icon name="lock" size={24} color={colors.text.secondary} />}
            />
            
            <Input 
              placeholder="Confirmar contraseña" 
              value={formData.confirmPassword}
              onChangeText={(text) => handleChange('confirmPassword', text)}
              secureTextEntry
              icon={<Icon name="lock-outline" size={24} color={colors.text.secondary} />}
            />

            <Button 
              title="Registrarse" 
              onPress={handleRegister}
              loading={loading}
              style={styles.registerButton}
            />

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>¿Ya tienes una cuenta? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.loginLink}>Iniciar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={handleAlertClose}
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
    padding: 24,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginVertical: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  formContainer: {
    width: '100%',
  },
  registerButton: {
    marginTop: 20,
    marginBottom: 30,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  loginLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  domainText: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
});