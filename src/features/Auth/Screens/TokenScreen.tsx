import React, { useRef, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView 
} from 'react-native';

export default function SecurityVerification() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text.length > 0 && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Verificación de Seguridad</Text>
      
      <View style={styles.card}>
        <Text style={styles.instruction}>
          Como conductor, durante el proceso de verificación has obtenido un Folio de 6 dígitos.
        </Text>
        <Text style={styles.subInstruction}>Ingrésalo a continuación para continuar:</Text>
        
        <View style={styles.otpContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              // CORRECCIÓN: Asignación segura del ref
              ref={(input) => { inputs.current[index] = input; }}
            />
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.verifyButton}>
        <Text style={styles.buttonText}>Verificar FOLIO</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#FFF' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#002C6F' },
  card: { 
    backgroundColor: '#FFF', 
    padding: 20, 
    borderRadius: 20, 
    borderWidth: 2, 
    borderColor: '#002C6F' 
  },
  instruction: { textAlign: 'center', marginBottom: 10, color: '#333' },
  subInstruction: { textAlign: 'center', fontWeight: 'bold', marginBottom: 20, color: '#002C6F' },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  otpInput: { 
    width: 45, height: 60, borderWidth: 1, borderColor: '#002C6F', 
    borderRadius: 10, textAlign: 'center', fontSize: 20, backgroundColor: '#E8EFFF' 
  },
  verifyButton: { 
    backgroundColor: '#002C6F', 
    padding: 15, 
    borderRadius: 12, 
    marginTop: 20 
  },
  buttonText: { color: '#FFF', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }
});