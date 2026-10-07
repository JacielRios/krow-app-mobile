import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { HomeScreen } from '../../features/home/screens/HomeScreen';
import { ActivityScreen } from '../../features/pilot/ActivityScreen';
import { ProfileScreen } from '../../features/pilot/ProfileScreen';
import { useTheme } from '../../shared/theme/ThemeProvider';
const Tabs = createBottomTabNavigator<{
  Inicio: undefined;
  Viajes: undefined;
  Perfil: undefined;
}>();
const tabIcons = {
  Inicio: ({ color, size }: { color: string; size: number }) => (
    <MaterialIcons name="home" color={color} size={size} />
  ),
  Viajes: ({ color, size }: { color: string; size: number }) => (
    <MaterialIcons name="route" color={color} size={size} />
  ),
  Perfil: ({ color, size }: { color: string; size: number }) => (
    <MaterialIcons name="person-outline" color={color} size={size} />
  ),
};
export function MainTabs() {
  const { theme, motionEnabled } = useTheme();
  return (
    <Tabs.Navigator
      backBehavior="initialRoute"
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: motionEnabled ? 'fade' : 'none',
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceRaised,
          borderTopColor: theme.colors.border,
        },
        tabBarItemStyle: { minHeight: 48 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: tabIcons[route.name],
      })}
    >
      <Tabs.Screen name="Inicio" component={HomeScreen} />
      <Tabs.Screen name="Viajes" component={ActivityScreen} />
      <Tabs.Screen name="Perfil" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}
