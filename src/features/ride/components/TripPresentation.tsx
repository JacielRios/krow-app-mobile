import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  AnimatedPressable,
  Button,
  StatusBadge,
  Surface,
  Text,
} from '../../../shared/components/ui-v2';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { rideDate, statusText } from '../../../shared/format';
import { placeLabel } from '../../../shared/placeLabel';

export function TripStatus({ status }: { status: string }) {
  const tone =
    status === 'completed' || status === 'confirmed'
      ? 'success'
      : status === 'pending' || status === 'no_show'
      ? 'warning'
      : status === 'rejected' || status === 'interrupted'
      ? 'error'
      : status === 'cancelled' || status === 'full'
      ? 'neutral'
      : 'info';
  return <StatusBadge label={statusText(status)} tone={tone} size="sm" />;
}

export function TripRoute({
  origin,
  destination,
  compact = false,
  expandable = false,
  originLabel = 'Salida',
  destinationLabel = 'Destino',
}: {
  origin?: string | null;
  destination?: string | null;
  compact?: boolean;
  expandable?: boolean;
  originLabel?: string;
  destinationLabel?: string;
}) {
  const { theme } = useTheme();
  const [details, setDetails] = useState(false);
  const points = [
    placeLabel(origin, 'Punto de salida'),
    placeLabel(destination, 'Destino guardado'),
  ];
  return (
    <View>
      <View style={{ gap: compact ? 10 : 16 }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 1,
            left: 7,
            top: 12,
            bottom: 14,
            backgroundColor: theme.colors.controlBorder,
          }}
        />
        {points.map((point, index) => (
          <View
            key={index}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
          >
            <View
              style={{
                width: 16,
                height: 22,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {index === 0 ? (
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    borderWidth: 2,
                    borderColor: theme.colors.primary,
                  }}
                />
              ) : (
                <Icon name="place" size={18} color={theme.colors.textPrimary} />
              )}
            </View>
            <View
              style={{ flex: 1, gap: 2 }}
              accessible
              accessibilityLabel={`${index ? destinationLabel : originLabel}: ${
                point.unavailable
                  ? point.title + '. Dirección no disponible'
                  : point.full
              }`}
            >
              {!compact && (
                <Text variant="caption" tone="secondary">
                  {index ? destinationLabel : originLabel}
                </Text>
              )}
              <Text
                style={{
                  fontSize: compact ? 16 : 17,
                  lineHeight: 22,
                  fontWeight: '600',
                }}
                numberOfLines={compact ? 2 : undefined}
              >
                {point.title}
              </Text>
              {!compact && (details || point.unavailable) && !!point.detail && (
                <Text variant="caption" tone="secondary">
                  {point.detail}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
      {expandable && !points.every(point => point.unavailable) && (
        <Button
          title={details ? 'Ocultar direcciones' : 'Ver direcciones completas'}
          variant="text"
          size="sm"
          fullWidth={false}
          onPress={() => setDetails(value => !value)}
          accessibilityState={{ expanded: details }}
          style={{ alignSelf: 'flex-start', marginLeft: 16 }}
        />
      )}
    </View>
  );
}

export interface TripFact {
  icon: string;
  label: string;
  value: string;
  detail?: string;
}
export function TripFacts({ items }: { items: TripFact[] }) {
  const { theme } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const columns = width >= 360 && fontScale < 1.4;
  return (
    <View
      style={{
        flexDirection: columns ? 'row' : 'column',
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      {items.map(item => (
        <View
          key={item.label}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            width: columns ? '45%' : '100%',
            flexGrow: columns ? 1 : 0,
          }}
        >
          <Icon name={item.icon} size={20} color={theme.colors.textSecondary} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="caption" tone="secondary">
              {item.label}
            </Text>
            <Text style={{ fontSize: 16, lineHeight: 22, fontWeight: '600' }}>
              {item.value}
            </Text>
            {item.detail ? (
              <Text variant="caption" tone="secondary">
                {item.detail}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export function TripOverview({
  status,
  origin,
  destination,
  departure,
  vehicle,
  driver,
  children,
}: React.PropsWithChildren<{
  status: string;
  origin?: string | null;
  destination?: string | null;
  departure?: string;
  vehicle?: string;
  driver?: string | null;
}>) {
  const { theme } = useTheme();
  const facts: TripFact[] = [];
  if (departure)
    facts.push({
      icon: 'schedule',
      label: 'Salida',
      value: rideDate(departure),
    });
  if (vehicle || driver)
    facts.push({
      icon: 'directions-car',
      label: 'Vehículo y conductor',
      value: vehicle || 'Vehículo sin datos',
      detail: driver || undefined,
    });
  return (
    <Surface
      contentStyle={{
        padding: 16,
        gap: 16,
        backgroundColor: theme.colors.surface,
      }}
      radius={20}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text variant="caption" tone="secondary" style={{ fontWeight: '600' }}>
          TU RECORRIDO
        </Text>
        <TripStatus status={status} />
      </View>
      <TripRoute origin={origin} destination={destination} expandable />
      {!!facts.length && (
        <View
          style={{
            borderTopWidth: 0.5,
            borderColor: theme.colors.border,
            paddingTop: 16,
          }}
        >
          <TripFacts items={facts} />
        </View>
      )}
      {children}
    </Surface>
  );
}

export function TripListItem({
  origin,
  destination,
  departure,
  status,
  amount,
  onPress,
}: {
  origin?: string | null;
  destination?: string | null;
  departure: string;
  status: string;
  amount?: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <AnimatedPressable
      radius={0}
      feedback="opacity"
      onPress={onPress}
      accessibilityLabel={`${statusText(status)}. ${
        placeLabel(origin, 'Punto de salida').title
      } a ${placeLabel(destination, 'Destino guardado').title}. ${rideDate(
        departure,
      )}. Ver viaje`}
      contentStyle={{
        paddingVertical: 16,
        gap: 12,
        borderBottomWidth: 0.5,
        borderColor: theme.colors.border,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TripStatus status={status} />
        <Text variant="caption" tone="secondary">
          {rideDate(departure)}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <TripRoute origin={origin} destination={destination} compact />
        </View>
        <Icon name="chevron-right" size={24} color={theme.colors.textMuted} />
      </View>
      {amount ? (
        <Text variant="caption" style={{ fontWeight: '600', marginLeft: 28 }}>
          {amount}
        </Text>
      ) : null}
    </AnimatedPressable>
  );
}

export function TripNotice({
  icon = 'people-outline',
  title,
  description,
}: {
  icon?: string;
  title: string;
  description: string;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 16,
        borderRadius: 16,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Icon name={icon} size={28} color={theme.colors.textSecondary} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontWeight: '600' }}>{title}</Text>
        <Text variant="caption" tone="secondary">
          {description}
        </Text>
      </View>
    </View>
  );
}
