/**
 * Punto de entrada principal de la aplicación
 * @format
 */

import { useEffect } from 'react';
import { AppState, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '../shared/theme/ThemeProvider';
import RootNavigator from './navigation/RootNavigator';
import { DialogProvider } from '../shared/components/ui-v2/DialogHost';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function App() {
  useEffect(() => {
    const listener = AppState.addEventListener('change', state =>
      focusManager.setFocused(state === 'active'),
    );
    return () => listener.remove();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

function AppContent() {
  const { colorScheme, theme } = useTheme();
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <DialogProvider>
        <RootNavigator />
      </DialogProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
