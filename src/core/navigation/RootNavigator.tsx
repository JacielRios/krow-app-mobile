import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import MainNavigator from './MainNavigator';

export default function RootNavigator() {
  return (
    <NavigationContainer>
      {/* 
        Temporalmente mostrando MainNavigator para pruebas de UI.
        Luego se debe integrar con el estado de autenticación.
      */}
      <MainNavigator />
    </NavigationContainer>
  );
}
