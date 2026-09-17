import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AccessibilityInfo, Appearance, ColorSchemeName } from 'react-native';
import { darkTheme, lightTheme, ThemePreference } from './themes';

interface ThemeContextValue {
  theme: typeof lightTheme | typeof darkTheme;
  colorScheme: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  motionEnabled: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const resolveScheme = (
  preference: ThemePreference,
  systemScheme: ColorSchemeName | null,
): 'light' | 'dark' =>
  preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName | null>(
    Appearance.getColorScheme() ?? null,
  );
  const [motionEnabled, setMotionEnabled] = useState(true);

  useEffect(() => {
    const appearanceSubscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? null);
    });
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      setMotionEnabled(!reduced);
    });
    const motionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      reduced => setMotionEnabled(!reduced),
    );

    return () => {
      appearanceSubscription.remove();
      motionSubscription.remove();
    };
  }, []);

  const updatePreference = useCallback((next: ThemePreference) => {
    setPreference(next);
  }, []);
  const colorScheme = resolveScheme(preference, systemScheme);
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: colorScheme === 'dark' ? darkTheme : lightTheme,
      colorScheme,
      preference,
      setPreference: updatePreference,
      motionEnabled,
    }),
    [colorScheme, motionEnabled, preference, updatePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return value;
};
