import React from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { createShadow, ElevationLevel } from '../../theme/elevation';
import { useTheme } from '../../theme/ThemeProvider';

export interface SurfaceProps extends ViewProps {
  elevation?: ElevationLevel;
  radius?: number;
  bordered?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export const Surface: React.FC<SurfaceProps> = ({
  children,
  elevation = 0,
  radius,
  bordered = false,
  style,
  contentStyle,
  ...props
}) => {
  const { theme } = useTheme();
  const resolvedRadius = radius ?? theme.radii.lg;

  return (
    <View
      {...props}
      style={[
        { borderRadius: resolvedRadius },
        createShadow(elevation, theme.colors.shadow),
        style,
      ]}
    >
      <View
        style={[
          {
            overflow: 'hidden',
            borderRadius: resolvedRadius,
            backgroundColor:
              elevation > 0 ? theme.colors.surfaceRaised : theme.colors.surface,
            borderColor: theme.colors.border,
            borderWidth: bordered ? 1 : 0,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
};
