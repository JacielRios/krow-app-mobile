import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  AnimatedModal,
  AnimatedPressable,
  Button,
  Surface,
} from '../../../shared/components/ui-v2';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { LatLng, reverseGeocode } from '../api/mapsApi';
import {
  PlacesAutocompleteInput,
  PlacesAutocompleteValue,
} from './PlacesAutocompleteInput';
import { RoutePreviewMap } from './RoutePreviewMap';

interface Props {
  label: string;
  value: PlacesAutocompleteValue | null;
  onChange: (value: PlacesAutocompleteValue | null) => void;
  bias?: LatLng | null;
  placeholder?: string;
}

/** A committed location changes only after confirmation; stale geocodes cannot overwrite it. */
export const PlacePicker = ({
  label,
  value,
  onChange,
  bias,
  placeholder,
}: Props) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pin, setPin] = useState<LatLng | null>(value?.location ?? null);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current += 1;
      active.current?.abort();
    },
    [],
  );
  const dismiss = () => {
    Keyboard.dismiss();
    request.current += 1;
    active.current?.abort();
    setOpen(false);
    setResolving(false);
  };
  const pickPoint = async (point: LatLng) => {
    const id = ++request.current;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setResolving(true);
    setError(null);
    setDraft(null);
    setPin(point);
    try {
      const result = await reverseGeocode(point, { signal: controller.signal });
      if (id !== request.current) return;
      if (!result?.formattedAddress) throw new Error('missing address');
      setDraft({
        address: result.formattedAddress,
        location: point,
        placeId: result.placeId ?? '',
      });
    } catch {
      if (id === request.current)
        setError(
          'No pudimos identificar este punto. Mueve el pin o busca una dirección.',
        );
    } finally {
      if (id === request.current) setResolving(false);
    }
  };
  return (
    <>
      <AnimatedPressable
        elevation={1}
        onPress={() => {
          setDraft(value);
          setPin(value?.location ?? null);
          setError(null);
          setSearching(false);
          setOpen(true);
        }}
        contentStyle={[
          styles.location,
          {
            backgroundColor: theme.colors.surfaceOverlay,
            borderColor: theme.colors.border,
            borderWidth: 1,
          },
        ]}
        style={styles.spacing}
        accessibilityLabel={`${label}. ${
          value?.address ?? 'Elegir en el mapa'
        }`}
      >
        <View
          style={[styles.pin, { backgroundColor: theme.colors.surfaceRaised }]}
        >
          <MaterialIcons name="place" size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            {label}
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.address, { color: theme.colors.textPrimary }]}
          >
            {value?.address ?? placeholder ?? 'Elegir en el mapa'}
          </Text>
        </View>
        <MaterialIcons
          name="chevron-right"
          size={22}
          color={theme.colors.primary}
        />
      </AnimatedPressable>
      {open && (
        <AnimatedModal
          visible={open}
          onDismissRequest={dismiss}
          sheetStyle={{ paddingBottom: insets.bottom + 16 }}
        >
          <View
            style={[styles.handle, { backgroundColor: theme.colors.border }]}
          />
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {label}
            </Text>
            <Button
              title="Cerrar"
              size="sm"
              variant="text"
              fullWidth={false}
              onPress={dismiss}
            />
          </View>
          <View
            style={[
              styles.tabs,
              { backgroundColor: theme.colors.surfaceOverlay },
            ]}
          >
            {[
              { title: 'Mapa', search: false, icon: 'map' },
              { title: 'Buscar lugar', search: true, icon: 'search' },
            ].map(tab => (
              <Button
                key={tab.title}
                title={tab.title}
                fullWidth={false}
                size="sm"
                style={styles.tab}
                variant={searching === tab.search ? 'primary' : 'text'}
                accessibilityRole="tab"
                accessibilityState={{ selected: searching === tab.search }}
                leftIcon={
                  <MaterialIcons
                    name={tab.icon}
                    size={18}
                    color={
                      searching === tab.search
                        ? theme.colors.textInverse
                        : theme.colors.primary
                    }
                  />
                }
                onPress={() => {
                  if (searching === tab.search) return;
                  request.current += 1;
                  active.current?.abort();
                  setResolving(false);
                  setError(null);
                  Keyboard.dismiss();
                  setSearching(tab.search);
                }}
              />
            ))}
          </View>
          <ScrollView
            keyboardShouldPersistTaps="always"
            style={styles.scroll}
            contentContainerStyle={styles.sheet}
          >
            {!searching && (
              <Text
                style={[styles.hint, { color: theme.colors.textSecondary }]}
              >
                Toca el mapa o mantén presionado el pin para arrastrarlo.
              </Text>
            )}
            {!searching && (
              <RoutePreviewMap
                origin={pin ?? bias ?? null}
                destination={null}
                interactive
                height={280}
                onOriginDrag={point => {
                  void pickPoint(point);
                }}
                onMapPress={point => {
                  void pickPoint(point);
                }}
              />
            )}
            {!searching && (
              <Surface contentStyle={styles.selection} style={styles.spacing}>
                <Text
                  style={[styles.address, { color: theme.colors.textPrimary }]}
                >
                  {resolving
                    ? 'Ubicando punto…'
                    : draft?.address ?? 'Elige un punto del mapa'}
                </Text>
                {error && (
                  <Text
                    accessibilityRole="alert"
                    style={{ color: theme.colors.status.error }}
                  >
                    {error}
                  </Text>
                )}
              </Surface>
            )}
            {searching && (
              <PlacesAutocompleteInput
                label="Buscar lugar"
                autoFocus
                value={draft}
                bias={bias}
                onChange={next => {
                  request.current += 1;
                  active.current?.abort();
                  setResolving(false);
                  setError(null);
                  setDraft(next);
                  setPin(next?.location ?? null);
                }}
              />
            )}
          </ScrollView>
          <View style={[styles.footer, { borderColor: theme.colors.border }]}>
            <Button
              title="Usar este punto"
              loading={resolving}
              disabled={!draft || resolving || Boolean(error)}
              onPress={() => {
                if (!draft || resolving || error) return;
                onChange(draft);
                dismiss();
              }}
            />
          </View>
        </AnimatedModal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  spacing: { marginBottom: 16 },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    minHeight: 80,
  },
  pin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1 },
  label: { fontSize: 12, marginBottom: 4 },
  address: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  sheet: { padding: 20, gap: 8 },
  scroll: { flexShrink: 1 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 22,
    marginHorizontal: 20,
    gap: 4,
  },
  tab: { flex: 1 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { flex: 1, fontSize: 22, fontWeight: '700' },
  hint: { fontSize: 13, lineHeight: 20, marginBottom: 8 },
  selection: { padding: 16, gap: 8 },
});
