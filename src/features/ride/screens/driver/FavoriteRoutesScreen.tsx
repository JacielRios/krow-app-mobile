import { KrowAlert as Alert } from '../../../../shared/components/ui-v2/dialogService';
import { IconButton } from '../../../../shared/components/ui-v2';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';
import {
  Button,
  Card,
  FeedbackState,
  Skeleton,
} from '../../../../shared/components/ui-v2';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { spacing, typography } from '../../../../shared/theme/tokens';
import { useFavoriteRoutes } from '../../hooks';
import type { FavoriteRoute } from '../../types';
import { ScreenHeader } from '../../../../shared/components/ui-v2/ScreenHeader';

type Navigation = NativeStackNavigationProp<
  MainStackParamList,
  'FavoriteRoutes'
>;

export const FavoriteRoutesScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<Navigation>();
  const insets = useSafeAreaInsets();
  const { favorites, loading, error, reload, deleteFavorite, deleting } =
    useFavoriteRoutes();
  const [feedback, setFeedback] = useState('');

  const confirmDelete = (favorite: FavoriteRoute) => {
    Alert.alert(
      'Eliminar ruta frecuente',
      `“${favorite.name}” dejará de estar disponible como plantilla. Los viajes ya publicados no cambiarán.`,
      [
        { text: 'Conservar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void deleteFavorite(favorite.routeId)
              .then(() => setFeedback('Ruta frecuente eliminada'))
              .catch(reason =>
                setFeedback(
                  reason instanceof Error
                    ? reason.message
                    : 'No pudimos eliminar la ruta. Inténtalo de nuevo.',
                ),
              );
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
      >
        <ScreenHeader
          title="Rutas frecuentes"
          subtitle="Al usar una ruta, el viaje sale del Instituto Tecnológico de Nuevo León."
          onBack={() => navigation.goBack()}
        />
        <Button
          title="Crear ruta frecuente"
          variant="outline"
          leftIcon={
            <MaterialIcons
              name="add-road"
              size={20}
              color={theme.colors.primary}
            />
          }
          onPress={() =>
            navigation.navigate('PublishRide', { favoriteOnly: true })
          }
          style={styles.create}
        />

        {loading ? (
          <>
            <Skeleton height={150} />
            <Skeleton height={150} style={{ marginTop: spacing.md }} />
          </>
        ) : error && !favorites.length ? (
          <FeedbackState
            kind="error"
            title="No pudimos cargar tus rutas"
            description={error}
            actionLabel="Reintentar"
            onAction={() => reload()}
          />
        ) : favorites.length === 0 ? (
          <FeedbackState
            title="Aún no tienes rutas frecuentes"
            description="Guarda tu avenida y las paradas de descenso para reutilizarlas al publicar."
          />
        ) : (
          favorites.map(favorite => (
            <Card
              key={favorite.routeId}
              variant="flat"
              style={[
                styles.card,
                {
                  paddingVertical: 20,
                  borderBottomWidth: 0.5,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <MaterialIcons
                  name={favorite.hasStaleStops ? 'warning-amber' : 'route'}
                  size={24}
                  color={
                    favorite.hasStaleStops
                      ? theme.colors.status.warning
                      : theme.colors.primary
                  }
                />
                <View style={styles.cardCopy}>
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {favorite.name}
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {favorite.corridorName ? `${favorite.corridorName} · ` : ''}
                    {favorite.stops.length} paradas · {favorite.origin.address}{' '}
                    → {favorite.destination.address}
                  </Text>
                </View>
              </View>
              {favorite.hasStaleStops && (
                <Text
                  style={[
                    styles.warning,
                    { color: theme.colors.status.warning },
                  ]}
                >
                  Contiene paradas inactivas; se revalidará antes de usarla.
                </Text>
              )}
              <View style={styles.actions}>
                <Button
                  title="Usar para publicar"
                  variant="tonal"
                  size="sm"
                  fullWidth={false}
                  onPress={() =>
                    navigation.navigate('PublishRide', {
                      favoriteRouteId: favorite.routeId,
                    })
                  }
                  iconName="add-road"
                />
                <IconButton
                  variant="plain"
                  size="sm"
                  onPress={() =>
                    navigation.navigate('PublishRide', {
                      favoriteRouteId: favorite.routeId,
                      favoriteOnly: true,
                    })
                  }
                  iconName="edit"
                  accessibilityLabel={`Editar ruta ${favorite.name}`}
                  color={theme.colors.primary}
                  disabled={deleting}
                />
                <IconButton
                  variant="plain"
                  size="sm"
                  disabled={deleting}
                  onPress={() => confirmDelete(favorite)}
                  iconName="delete-outline"
                  accessibilityLabel={`Eliminar ruta ${favorite.name}`}
                  color={theme.colors.status.error}
                />
              </View>
            </Card>
          ))
        )}
        {!!error && !!favorites.length && (
          <Text
            style={{ color: theme.colors.status.error }}
            accessibilityLiveRegion="polite"
          >
            No pudimos actualizar tus rutas. Se conserva la última información.
          </Text>
        )}
        {!!feedback && (
          <Text
            style={{ color: theme.colors.textPrimary }}
            accessibilityLiveRegion="polite"
          >
            {feedback}
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: spacing.lg },
  create: { marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardCopy: { flex: 1, marginLeft: spacing.sm },
  cardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  cardSubtitle: {
    fontSize: typography.size.md,
    lineHeight: 24,
    marginTop: spacing.xs,
  },
  warning: { fontSize: typography.size.sm, marginTop: spacing.sm },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
