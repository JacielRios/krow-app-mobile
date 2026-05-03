import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Input } from '../../../shared/components/ui/Input';
import { colors } from '../../../shared/theme/colors';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { usePlacesAutocomplete } from '../hooks/usePlacesAutocomplete';
import { getPlaceDetails, LatLng } from '../../../services/googleMaps';

export interface PlacesAutocompleteValue {
  address: string;
  location: LatLng;
  placeId: string;
}

interface Props {
  label?: string;
  placeholder?: string;
  value: PlacesAutocompleteValue | null;
  onChange: (value: PlacesAutocompleteValue | null) => void;
  error?: string;
  /** Sesgo geográfico para priorizar resultados cercanos. */
  bias?: LatLng | null;
  /** Icono opcional dentro del input. */
  icon?: React.ReactNode;
  /** Si false, los resultados no se cierran automáticamente al elegir. */
  closeOnSelect?: boolean;
}

/**
 * Input con autocomplete de Google Places.
 *
 * Uso:
 * <PlacesAutocompleteInput
 *   label="Origen"
 *   value={origin}
 *   onChange={setOrigin}
 * />
 *
 * El componente maneja internamente:
 * - Debounce de queries
 * - SessionToken (rota al elegir)
 * - Resolución de detalles del Place al seleccionar
 */
export const PlacesAutocompleteInput: React.FC<Props> = ({
  label,
  placeholder = 'Escribe una dirección',
  value,
  onChange,
  error,
  bias,
  icon,
  closeOnSelect = true,
}) => {
  const {
    query,
    setQuery,
    suggestions,
    loading,
    error: searchError,
    sessionToken,
    consumeSession,
    reset,
  } = usePlacesAutocomplete({ bias });

  const [resolving, setResolving] = useState(false);
  const [focused, setFocused] = useState(false);

  // Si hay un valor seleccionado, mostrarlo; si no, lo que el usuario escribe.
  const displayValue = value && !focused ? value.address : query;

  const handleSelect = async (placeId: string, fallbackLabel: string) => {
    setResolving(true);
    try {
      const details = await getPlaceDetails(placeId, { sessionToken });
      const next: PlacesAutocompleteValue = {
        address: details.formattedAddress || fallbackLabel,
        location: details.location,
        placeId: details.placeId,
      };
      consumeSession();
      onChange(next);
      setQuery('');
      if (closeOnSelect) setFocused(false);
    } catch {
      onChange(null);
    } finally {
      setResolving(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    reset();
  };

  const showSuggestions =
    focused && (suggestions.length > 0 || loading || searchError);

  return (
    <View style={styles.wrap}>
      <Input
        label={label}
        placeholder={placeholder}
        value={displayValue}
        onChangeText={text => {
          if (value) {
            // El usuario empezó a editar un valor seleccionado: lo invalidamos
            onChange(null);
          }
          setQuery(text);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // Pequeño delay para permitir que el tap a una sugerencia se procese
          setTimeout(() => setFocused(false), 150);
        }}
        error={error ?? searchError ?? undefined}
        icon={icon}
        rightElement={
          resolving || loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : value ? (
            <Pressable onPress={handleClear} hitSlop={8}>
              <MaterialIcons
                name="close"
                size={20}
                color={colors.text.muted}
              />
            </Pressable>
          ) : undefined
        }
        autoCorrect={false}
        autoCapitalize="none"
      />

      {showSuggestions && (
        <View style={styles.suggestions}>
          {loading && suggestions.length === 0 && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Buscando...</Text>
            </View>
          )}
          {searchError && (
            <Text style={styles.errorText}>{searchError}</Text>
          )}
          {suggestions.map(s => (
            <Pressable
              key={s.placeId}
              onPress={() => handleSelect(s.placeId, s.description)}
              style={({ pressed }) => [
                styles.suggestionRow,
                pressed && styles.suggestionPressed,
              ]}
            >
              <MaterialIcons
                name="place"
                size={18}
                color={colors.text.secondary}
                style={styles.suggestionIcon}
              />
              <View style={styles.suggestionTextWrap}>
                <Text style={styles.suggestionMain} numberOfLines={1}>
                  {s.mainText}
                </Text>
                {!!s.secondaryText && (
                  <Text style={styles.suggestionSecondary} numberOfLines={1}>
                    {s.secondaryText}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    zIndex: 10,
  },
  suggestions: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    marginTop: -spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  loadingText: {
    marginLeft: spacing.sm,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  errorText: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.sm,
    color: colors.status.error,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionPressed: {
    backgroundColor: colors.surface,
  },
  suggestionIcon: {
    marginRight: spacing.sm,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionMain: {
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  suggestionSecondary: {
    marginTop: 2,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
});
