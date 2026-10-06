import { AmbientBackground } from '../../../../shared/components/ui-v2';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';
import { Button, Card, FeedbackState, Skeleton } from '../../../../shared/components/ui-v2';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { spacing, typography } from '../../../../shared/theme/tokens';
import { useFavoriteRoutes } from '../../hooks';
import type { FavoriteRoute } from '../../types';

type Navigation = NativeStackNavigationProp<MainStackParamList, 'FavoriteRoutes'>;

export const FavoriteRoutesScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<Navigation>();
  const insets = useSafeAreaInsets();
  const { favorites, loading, error, reload, deleteFavorite, deleting } =
    useFavoriteRoutes();

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
            deleteFavorite(favorite.routeId).catch(reason =>
              Alert.alert('No se pudo eliminar', reason?.message ?? 'Inténtalo de nuevo.'),
            );
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <AmbientBackground />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <View style={styles.header}>
          <Button title="Volver" variant="ghost" size="sm" fullWidth={false} onPress={() => navigation.goBack()} />
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Rutas frecuentes</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Reutiliza recorridos sin modificar los viajes ya publicados.
            </Text>
          </View>
        </View>
        <Button
          title="Crear ruta frecuente"
          leftIcon={<MaterialIcons name="add-road" size={20} color={theme.colors.textInverse} />}
          onPress={() => navigation.navigate('PublishRide', { favoriteOnly: true })}
          style={styles.create}
        />

        {loading ? (
          <>
            <Skeleton height={150} />
            <Skeleton height={150} style={{ marginTop: spacing.md }} />
          </>
        ) : error ? (
          <FeedbackState kind="error" title="No pudimos cargar tus rutas" description={error} actionLabel="Reintentar" onAction={() => reload()} />
        ) : favorites.length === 0 ? (
          <FeedbackState
            title="Aún no tienes rutas frecuentes"
            description="Guarda una ruta con al menos dos paradas para reutilizarla al publicar."
          />
        ) : (
          favorites.map(favorite => (
            <Card key={favorite.routeId} variant="outlined" style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons
                  name={favorite.hasStaleStops ? 'warning-amber' : 'route'}
                  size={24}
                  color={favorite.hasStaleStops ? theme.colors.status.warning : theme.colors.primary}
                />
                <View style={styles.cardCopy}>
                  <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>{favorite.name}</Text>
                  <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                    {favorite.stops.length} paradas · {favorite.origin.address} → {favorite.destination.address}
                  </Text>
                </View>
              </View>
              {favorite.hasStaleStops && (
                <Text style={[styles.warning, { color: theme.colors.status.warning }]}>
                  Contiene paradas inactivas; se revalidará antes de usarla.
                </Text>
              )}
              <View style={styles.actions}>
                <Button
                  title="Usar"
                  size="sm"
                  onPress={() => navigation.navigate('PublishRide', { favoriteRouteId: favorite.routeId })}
                />
                <Button
                  title="Editar"
                  variant="outline"
                  size="sm"
                  onPress={() =>
                    navigation.navigate('PublishRide', {
                      favoriteRouteId: favorite.routeId,
                      favoriteOnly: true,
                    })
                  }
                />
                <Button
                  title="Eliminar"
                  variant="text"
                  size="sm"
                  disabled={deleting}
                  onPress={() => confirmDelete(favorite)}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  headerCopy: { flex: 1, marginLeft: spacing.sm },
  title: { fontSize: typography.size.xxl, fontWeight: typography.weight.bold },
  subtitle: { fontSize: typography.size.sm, lineHeight: 18, marginTop: 2 },
  create: { marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardCopy: { flex: 1, marginLeft: spacing.sm },
  cardTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  cardSubtitle: { fontSize: typography.size.sm, lineHeight: 18, marginTop: spacing.xs },
  warning: { fontSize: typography.size.sm, marginTop: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
