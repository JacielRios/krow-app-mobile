import React from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { ElevationLevel } from '../../theme/elevation';
import { depth, glass } from '../../theme/materials';
import { useTheme } from '../../theme/ThemeProvider';

export interface SurfaceProps extends ViewProps {
  elevation?: ElevationLevel;
  radius?: number;
  bordered?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export const Surface: React.FC<SurfaceProps> = ({
  children,
  elevation = 2,
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
      style={[{ borderRadius: resolvedRadius }, depth(theme, elevation), style]}
    >
      <View
        style={[
          glass(theme),
          {
            overflow: 'hidden',
            borderRadius: resolvedRadius,
            ...(bordered ? { borderColor: theme.colors.border } : {}),
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
};
