import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Input } from '../../../core/components/ui/Input';
import { Button } from '../../../core/components/ui/Button';
import { Dropdown } from '../../../core/components/ui/Dropdown';
import { colors } from '../../../core/theme/colors';

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

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
              placeholder="Correo" 
              value={formData.correo}
              onChangeText={(text) => handleChange('correo', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              icon={<Icon name="email" size={24} color={colors.text.secondary} />}
              rightElement={<Text style={styles.domainText}>@tecnm.mx</Text>}
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
              onPress={() => console.log('Registrar', formData)}
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