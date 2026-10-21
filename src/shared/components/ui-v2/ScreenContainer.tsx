import React from 'react';
import {
  StyleProp,
  View,
  ViewProps,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { AmbientBackground } from './AmbientBackground';

export interface ScreenContainerProps extends ViewProps {
  safeTop?: boolean;
  safeBottom?: boolean;
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  safeTop = true,
  safeBottom = true,
  padded = false,
  style,
  contentStyle,
  ...props
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  return (
    <View
      {...props}
      style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}
    >
      <AmbientBackground />
      <View
        style={[
          {
            flex: 1,
            paddingTop: safeTop ? insets.top : 0,
            paddingBottom: safeBottom ? insets.bottom : 0,
            paddingHorizontal: padded ? (width < 360 ? 16 : 20) : 0,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
};
