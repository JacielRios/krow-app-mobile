import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/tokens';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  uri?: string;
  name?: string;
  size?: AvatarSize | number;
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  onPress?: () => void;
}

const SIZE_MAP: Record<AvatarSize, { container: number; fontSize: number }> = {
  xs: { container: 24, fontSize: typography.size.xs },
  sm: { container: 32, fontSize: typography.size.sm },
  md: { container: 40, fontSize: typography.size.md },
  lg: { container: 56, fontSize: typography.size.xl },
  xl: { container: 72, fontSize: typography.size.xxl },
};

const getInitials = (name?: string): string => {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size = 'md',
  backgroundColor = colors.primary,
  textColor = colors.text.inverse,
  style,
  imageStyle,
  onPress,
}) => {
  const sizeValue = typeof size === 'number' ? size : SIZE_MAP[size].container;
  const fontSize = typeof size === 'number' ? Math.round(size * 0.38) : SIZE_MAP[size].fontSize;
  const borderRadius = sizeValue / 2;

  const containerStyle: ViewStyle = {
    width: sizeValue,
    height: sizeValue,
    borderRadius,
    backgroundColor,
    overflow: 'hidden',
  };

  const content = uri ? (
    <Image source={{ uri }} style={[styles.image, imageStyle]} />
  ) : (
    <Text style={[styles.initials, { fontSize, color: textColor }]}>{getInitials(name)}</Text>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.base, containerStyle, style]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.base, containerStyle, style]}>{content}</View>;
};

export { Avatar as UserAvatar };

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  initials: {
    fontWeight: typography.weight.semibold,
  },
});
