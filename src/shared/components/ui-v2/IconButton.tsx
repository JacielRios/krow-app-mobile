import React from 'react';
import { ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { AnimatedPressable, AnimatedPressableProps } from './AnimatedPressable';
import { useTheme } from '../../theme/ThemeProvider';

export interface IconButtonProps
  extends Omit<AnimatedPressableProps, 'children' | 'contentStyle' | 'style'> {
  accessibilityLabel: string;
  icon?: React.ReactNode;
  iconName?: string;
  iconSize?: number;
  variant?: 'ghost' | 'filled' | 'tonal' | 'outline' | 'plain';
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  selected?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  iconName,
  iconSize = 24,
  variant = 'ghost',
  size = 'md',
  color,
  selected,
  loading = false,
  disabled,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  const isSelected = selected ?? props.accessibilityState?.selected;
  const isDisabled = Boolean(disabled || loading);
  const resolvedColor = color ?? theme.colors.primary;
  const foreground =
    variant === 'filled' ? theme.colors.onPrimary : resolvedColor;
  const dimension = { sm: 48, md: 48, lg: 56 }[size];
  return (
    <AnimatedPressable
      {...props}
      disabled={isDisabled}
      accessibilityState={{
        ...props.accessibilityState,
        selected: isSelected,
        busy: loading,
        disabled: isDisabled,
      }}
      pressedScale={0.94}
      elevation={0}
      radius={theme.radii.full}
      stateLayerColor={foreground}
      style={[{ flexShrink: 0 }, style]}
      contentStyle={{
        width: dimension,
        height: dimension,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor:
          variant === 'filled'
            ? resolvedColor
            : variant === 'tonal' || isSelected
            ? theme.colors.primarySoft
            : variant === 'ghost'
            ? theme.colors.surface
            : 'transparent',
        borderWidth: variant === 'outline' ? 1 : 0,
        borderColor: isSelected ? resolvedColor : theme.colors.controlBorder,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : iconName ? (
        <MaterialIcons
          name={iconName}
          size={iconSize}
          color={foreground}
          accessible={false}
          importantForAccessibility="no"
        />
      ) : (
        icon
      )}
    </AnimatedPressable>
  );
};
