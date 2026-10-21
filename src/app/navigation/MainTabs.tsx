import React from 'react';
import { View } from 'react-native';
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
function TabIcon({
  name,
  focused,
  color,
  size,
}: {
  name: string;
  focused: boolean;
  color: string;
  size: number;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        width: 64,
        height: 32,
        borderRadius: theme.radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? theme.colors.primarySoft : 'transparent',
      }}
    >
      <MaterialIcons
        name={name}
        color={color}
        size={size}
        accessible={false}
        importantForAccessibility="no"
      />
    </View>
  );
}
type TabIconProps = { focused: boolean; color: string; size: number };
const tabIcons = {
  Inicio: (props: TabIconProps) => (
    <TabIcon name={props.focused ? 'home-filled' : 'home'} {...props} />
  ),
  Viajes: (props: TabIconProps) => <TabIcon name="route" {...props} />,
  Perfil: (props: TabIconProps) => (
    <TabIcon name={props.focused ? 'person' : 'person-outline'} {...props} />
  ),
};
export function MainTabs() {
  const { theme } = useTheme();
  return (
    <Tabs.Navigator
      backBehavior="initialRoute"
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'none',
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceRaised,
          borderTopColor: theme.colors.border,
        },
        tabBarItemStyle: { minHeight: 48, paddingTop: 2 },
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
