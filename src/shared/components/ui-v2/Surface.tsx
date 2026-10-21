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
  elevation = 0,
  radius,
  bordered = false,
  style,
  contentStyle,
  ...props
}) => {
  const { theme } = useTheme();
  const resolvedRadius = radius ?? theme.radii.md;

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
            borderWidth: bordered ? 1 : 0,
            borderColor: theme.colors.border,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
};
