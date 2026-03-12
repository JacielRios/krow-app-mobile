import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView 
} from 'react-native';

// 1. Definimos el tipo fuera del componente
type UserType = 'pasajero' | 'conductor';

export default function LoginScreen() {
  const [userType, setUserType] = useState<UserType>('pasajero');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoText}>KROW</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.typeSelectorContainer}>
          <TouchableOpacity 
            style={[styles.typeButton, userType === 'pasajero' && styles.typeButtonActive]}
            onPress={() => setUserType('pasajero')}
          >
            <Text style={[styles.typeButtonText, userType === 'pasajero' && styles.textActive]}>👤 Pasajero</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.typeButton, userType === 'conductor' && styles.typeButtonActive]}
            onPress={() => setUserType('conductor')}
          >
            <Text style={[styles.typeButtonText, userType === 'conductor' && styles.textActive]}>👤 Conductor</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <TextInput placeholder="Correo Electronico" style={styles.input} />
          <TextInput placeholder="Contraseña" secureTextEntry style={styles.input} />
        </View>

        <TouchableOpacity style={styles.loginButton}>
          <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Constante Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { height: '25%', backgroundColor: '#002C6F', justifyContent: 'center', alignItems: 'center' },
  logoText: { color: '#FFF', fontSize: 48, fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: 30, paddingTop: 30 },
  typeSelectorContainer: { flexDirection: 'row', backgroundColor: '#E8EFFF', borderRadius: 12, padding: 4, marginBottom: 30 },
  typeButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  typeButtonActive: { backgroundColor: '#002C6F' },
  typeButtonText: { color: '#002C6F', fontWeight: '600' },
  textActive: { color: '#FFF' },
  inputContainer: { width: '100%' },
  input: { borderWidth: 1.5, borderColor: '#002C6F', borderRadius: 12, padding: 15, marginBottom: 15, fontSize: 16 },
  loginButton: { backgroundColor: '#002C6F', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  loginButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});