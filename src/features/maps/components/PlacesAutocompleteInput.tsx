import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Input } from '../../../shared/components/ui/Input';
import { spacing, typography } from '../../../shared/theme/tokens';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { depth } from '../../../shared/theme/materials';
import { usePlacesAutocomplete } from '../hooks/usePlacesAutocomplete';
import { getPlaceDetails, LatLng } from '../api/mapsApi';

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
  autoFocus?: boolean;
  /** Keep the field visible while results scroll inside a bounded picker. */
  scrollResults?: boolean;
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
  autoFocus = false,
  scrollResults = false,
}) => {
  const { theme } = useTheme();
  const {
    query,
    setQuery,
    suggestions,
    loading,
    error: searchError,
    sessionToken,
    consumeSession,
    reset,
    retry,
  } = usePlacesAutocomplete({ bias });

  const [resolving, setResolving] = useState(false);
  const [focused, setFocused] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const selection = useRef(0);
  const activeDetails = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      selection.current += 1;
      activeDetails.current?.abort();
    },
    [],
  );
  const cancelSelection = () => {
    selection.current += 1;
    activeDetails.current?.abort();
    setResolving(false);
    setDetailError(null);
  };

  // Si hay un valor seleccionado, mostrarlo; si no, lo que el usuario escribe.
  const displayValue = value && !focused ? value.address : query;

  const handleSelect = async (placeId: string, fallbackLabel: string) => {
    cancelSelection();
    const id = selection.current;
    const controller = new AbortController();
    activeDetails.current = controller;
    setFocused(true);
    setResolving(true);
    try {
      const details = await getPlaceDetails(placeId, {
        sessionToken,
        signal: controller.signal,
      });
      if (id !== selection.current || controller.signal.aborted) return;
      const next: PlacesAutocompleteValue = {
        address: details.formattedAddress || fallbackLabel,
        location: details.location,
        placeId: details.placeId,
      };
      consumeSession();
      onChange(next);
      setQuery('');
      if (closeOnSelect) {
        setFocused(false);
        Keyboard.dismiss();
      }
    } catch {
      if (id === selection.current && !controller.signal.aborted) {
        setDetailError(
          'No pudimos cargar este lugar. Tócalo de nuevo para reintentar.',
        );
      }
    } finally {
      if (id === selection.current) setResolving(false);
    }
  };

  const handleClear = () => {
    cancelSelection();
    onChange(null);
    reset();
  };

  // Keep results tappable when the keyboard loses focus during a scroll or tap.
  const showSuggestions = !value && query.trim().length >= 2;
  const ResultsContainer = scrollResults ? ScrollView : View;

  return (
    <View style={[styles.wrap, scrollResults && styles.bounded]}>
      <Input
        label={label}
        placeholder={placeholder}
        value={displayValue}
        onChangeText={text => {
          cancelSelection();
          if (value) {
            // El usuario empezó a editar un valor seleccionado: lo invalidamos
            onChange(null);
          }
          setQuery(text);
        }}
        onFocus={() => {
          if (value) setQuery(value.address);
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        returnKeyType="search"
        onSubmitEditing={() => Keyboard.dismiss()}
        maxLength={200}
        error={error ?? detailError ?? searchError ?? undefined}
        icon={icon}
        rightElement={
          resolving || loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : value || query ? (
            <Pressable
              onPress={handleClear}
              hitSlop={8}
              style={styles.clear}
              accessibilityRole="button"
              accessibilityLabel="Borrar dirección"
            >
              <MaterialIcons
                name="close"
                size={20}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          ) : undefined
        }
        autoCorrect={false}
        autoCapitalize="none"
      />

      {showSuggestions && (
        <ResultsContainer
          {...(scrollResults
            ? {
                keyboardShouldPersistTaps: 'always' as const,
                keyboardDismissMode: 'none' as const,
              }
            : {})}
          accessibilityLabel="Resultados de búsqueda"
          style={[
            styles.suggestions,
            scrollResults && styles.resultsScroll,
            depth(theme, 1),
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
            },
          ]}
        >
          {loading && suggestions.length === 0 && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text
                style={[
                  styles.loadingText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Buscando lugares…
              </Text>
            </View>
          )}
          {searchError && (
            <Pressable onPress={retry} accessibilityRole="button">
              <Text style={[styles.errorText, { color: theme.colors.primary }]}>
                Reintentar búsqueda
              </Text>
            </Pressable>
          )}
          {!loading && !searchError && suggestions.length === 0 && (
            <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
              Sin resultados. Prueba con la calle y la ciudad.
            </Text>
          )}
          {suggestions.map(s => (
            <Pressable
              key={s.placeId}
              accessibilityRole="button"
              accessibilityLabel={s.description}
              disabled={resolving}
              onPress={() => handleSelect(s.placeId, s.description)}
              style={({ pressed }) => [
                styles.suggestionRow,
                {
                  backgroundColor: pressed
                    ? theme.colors.primarySoft
                    : 'transparent',
                  opacity: resolving ? 0.6 : 1,
                },
              ]}
            >
              <MaterialIcons
                name="place"
                size={18}
                color={theme.colors.primary}
                style={styles.suggestionIcon}
              />
              <View style={styles.suggestionTextWrap}>
                <Text
                  style={[
                    styles.suggestionMain,
                    { color: theme.colors.textPrimary },
                  ]}
                  numberOfLines={2}
                >
                  {s.mainText}
                </Text>
                {!!s.secondaryText && (
                  <Text
                    style={[
                      styles.suggestionSecondary,
                      { color: theme.colors.textSecondary },
                    ]}
                    numberOfLines={2}
                  >
                    {s.secondaryText}
                  </Text>
                )}
              </View>
              <MaterialIcons
                name="north-west"
                size={18}
                color={theme.colors.textMuted}
              />
            </Pressable>
          ))}
        </ResultsContainer>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    zIndex: 10,
  },
  bounded: { flex: 1, minHeight: 0 },
  resultsScroll: { flexShrink: 1, minHeight: 0 },
  suggestions: {
    borderWidth: 1,
    marginTop: -spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    overflow: 'hidden',
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
  },
  errorText: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.sm,
    minHeight: 48,
    textAlignVertical: 'center',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 64,
    gap: 8,
  },
  suggestionIcon: {
    marginRight: spacing.sm,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionMain: {
    fontSize: typography.size.md,
    fontWeight: '600',
  },
  suggestionSecondary: {
    marginTop: 2,
    fontSize: typography.size.sm,
  },
  clear: {
    minWidth: 32,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { padding: 16, fontSize: 14, lineHeight: 21 },
});
