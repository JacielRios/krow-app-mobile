import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  preference === 'system'
    ? systemScheme === 'dark'
      ? 'dark'
      : 'light'
    : preference;

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName | null>(
    Appearance.getColorScheme() ?? null,
  );
  const [motionEnabled, setMotionEnabled] = useState(true);
  const preferenceEdited = useRef(false);

  useEffect(() => {
    let alive = true;
    let receivedMotionChange = false;
    void AsyncStorage.getItem('@krow/theme')
      .then(value => {
        if (
          alive &&
          !preferenceEdited.current &&
          (value === 'light' || value === 'dark' || value === 'system')
        )
          setPreference(value);
      })
      .catch(() => undefined);
    const appearanceSubscription = Appearance.addChangeListener(
      ({ colorScheme }) => {
        if (alive) setSystemScheme(colorScheme ?? null);
      },
    );
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(reduced => {
        if (alive && !receivedMotionChange) setMotionEnabled(!reduced);
      })
      .catch(() => undefined);
    const motionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      reduced => {
        receivedMotionChange = true;
        if (alive) setMotionEnabled(!reduced);
      },
    );

    return () => {
      alive = false;
      appearanceSubscription.remove();
      motionSubscription.remove();
    };
  }, []);

  const updatePreference = useCallback((next: ThemePreference) => {
    preferenceEdited.current = true;
    setPreference(next);
    void AsyncStorage.setItem('@krow/theme', next).catch(() => undefined);
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

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return value;
};
