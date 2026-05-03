/**
 * Punto de entrada principal de la aplicación
 * @format
 */

import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';

// TEMPORAL: handler global para capturar el stack trace de errores no
// manejados (promesas rechazadas, etc.). Quitar cuando termine el debug.
declare const ErrorUtils: {
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler: (
    handler: (error: Error, isFatal?: boolean) => void,
  ) => void;
};

if (__DEV__) {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    // eslint-disable-next-line no-console
    console.log('GLOBAL ERROR:', error?.message, '\n', error?.stack);
    originalHandler(error, isFatal);
  });
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  return (
    <View style={styles.container}>
      <RootNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
