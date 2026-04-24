import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { setSkipSplashOnNextAuthMount } from '../../../core/auth/authEntryPreference';
import { clearSessionLoginMode, getSessionLoginMode, SessionLoginMode } from '../../../core/auth/sessionLoginMode';
import { colors } from '../../../core/theme/colors';
import { Button } from '../../../core/components/ui/Button';
import { supabase } from '../../../lib/supabase';

const loginModeLabel = (mode: SessionLoginMode | null) => {
  if (mode === 'conductor') return 'Conductor';
  if (mode === 'pasajero') return 'Pasajero';
  return '—';
};

export const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const [loadingSignOut, setLoadingSignOut] = useState(false);
  const [sessionLoginMode, setSessionLoginModeState] = useState<SessionLoginMode | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSessionLoginMode().then((mode) => {
        if (active) setSessionLoginModeState(mode);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const handleSignOut = async () => {
    setLoadingSignOut(true);
    setSkipSplashOnNextAuthMount(true);
    const { error } = await supabase.auth.signOut();
    if (!error) {
      await clearSessionLoginMode();
      setSessionLoginModeState(null);
    } else {
      setSkipSplashOnNextAuthMount(false);
    }
    setLoadingSignOut(false);

    if (error) {
      Alert.alert('Error', 'No se pudo cerrar la sesión. Intenta de nuevo.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Krown</Text>
      <Text style={styles.subtitle}>
        Sesión iniciada como: <Text style={styles.subtitleStrong}>{loginModeLabel(sessionLoginMode)}</Text>
      </Text>
      <View style={styles.signOutContainer}>
        <Button
          title="Cerrar sesión"
          variant="outline"
          onPress={handleSignOut}
          loading={loadingSignOut}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Desarrollo</Text>
        <View style={styles.buttonContainer}>
          <Button
            title="UI Components"
            variant="ghost"
            onPress={() => navigation.navigate('UIShowcase')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pasajero</Text>
        <View style={styles.buttonContainer}>
          <Button
            title="Viaje Iniciado"
            onPress={() => navigation.navigate('PassengerActiveRide')}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Viaje Finalizado"
            onPress={() => navigation.navigate('PassengerFinishedRide')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conductor</Text>
        <View style={styles.buttonContainer}>
          <Button
            title="Publicar viaje"
            onPress={() => navigation.navigate('PublishRide')}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Viaje Iniciado"
            variant="secondary"
            onPress={() => navigation.navigate('DriverActiveRide')}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Viaje Finalizado"
            variant="secondary"
            onPress={() => navigation.navigate('DriverFinishedRide')}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  signOutContainer: {
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  subtitleStrong: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  section: {
    marginBottom: 32,
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  buttonContainer: {
    marginBottom: 12,
  },
});
