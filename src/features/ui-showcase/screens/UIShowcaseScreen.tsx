import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../core/theme/colors';
import { spacing, typography, radii } from '../../../core/theme/tokens';
import {
  Button,
  TextInput,
  DropdownInput,
  Card,
  IconButton,
  IconContainer,
  Avatar,
  StatusBadge,
  StarRating,
  SectionHeader,
} from '../../../core/components/ui';

export const UIShowcaseScreen = () => {
  const navigation = useNavigation();
  const [dropdownValue, setDropdownValue] = useState('');
  const [dropdownValue2, setDropdownValue2] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [starRating, setStarRating] = useState(3);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>UI Components</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── BUTTONS ──────────────────────────────────── */}
        <SectionHeader title="Button" />
        <Card variant="outlined" style={styles.card}>
          <Text style={styles.sub}>Variants</Text>
          <Button title="Primary" variant="primary" />
          <Button title="Secondary" variant="secondary" />
          <Button title="Outline" variant="outline" />
          <Button title="Ghost" variant="ghost" />
          <Button title="Destructive" variant="destructive" />
          <Button title="Text" variant="text" />

          <Text style={styles.sub}>Sizes</Text>
          <Button title="Small" size="sm" />
          <Button title="Medium" size="md" />
          <Button title="Large" size="lg" />

          <Text style={styles.sub}>With icons & states</Text>
          <Button
            title="Buscar"
            leftIcon={<MaterialIcons name="search" size={18} color={colors.text.inverse} />}
          />
          <Button
            title="Siguiente"
            variant="outline"
            rightIcon={<MaterialIcons name="arrow-forward" size={18} color={colors.primary} />}
          />
          <Button title="Cargando..." loading />
          <Button title="Deshabilitado" disabled />
        </Card>

        {/* ── TEXT INPUTS ───────────────────────────────── */}
        <SectionHeader title="TextInput" style={styles.headerSpacing} />
        <Card variant="outlined" style={styles.card}>
          <TextInput
            label="Nombre"
            placeholder="Ingresa tu nombre"
            value={inputValue}
            onChangeText={setInputValue}
          />
          <TextInput
            label="Correo electrónico"
            placeholder="correo@ejemplo.com"
            icon={<MaterialIcons name="email" size={18} color={colors.text.secondary} />}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            label="Contraseña"
            placeholder="••••••••"
            secureTextEntry
            icon={<MaterialIcons name="lock" size={18} color={colors.text.secondary} />}
          />
          <TextInput
            label="Campo con error"
            placeholder="Campo requerido"
            error="Este campo es obligatorio"
          />
          <TextInput
            label="Con texto de ayuda"
            placeholder="Máximo 50 caracteres..."
            helperText="Este es un texto de ayuda para el campo"
          />
          <TextInput
            label="Campo exitoso"
            placeholder="Validado correctamente"
            value="usuario@krow.co"
            success
          />
        </Card>

        {/* ── DROPDOWN ─────────────────────────────────── */}
        <SectionHeader title="DropdownInput" style={styles.headerSpacing} />
        <Card variant="outlined" style={styles.card}>
          <DropdownInput
            label="Ciudad"
            options={[
              { value: 'bogota', label: 'Bogotá' },
              { value: 'medellin', label: 'Medellín' },
              { value: 'cali', label: 'Cali' },
              { value: 'barranquilla', label: 'Barranquilla' },
              { value: 'cartagena', label: 'Cartagena' },
            ]}
            value={dropdownValue}
            onSelect={setDropdownValue}
            placeholder="Selecciona una ciudad"
            icon={<MaterialIcons name="location-city" size={18} color={colors.text.secondary} />}
          />
          <DropdownInput
            label="Tipo de vehículo"
            options={['Automóvil', 'Camioneta', 'Moto', 'Van']}
            value={dropdownValue2}
            onSelect={setDropdownValue2}
            placeholder="Selecciona el tipo"
            icon={<MaterialIcons name="directions-car" size={18} color={colors.text.secondary} />}
          />
          <DropdownInput
            label="Estado (con error)"
            options={['Activo', 'Inactivo', 'Pendiente']}
            value=""
            onSelect={() => {}}
            error="Debes seleccionar un estado"
          />
          <DropdownInput
            label="Deshabilitado"
            options={['Opción 1']}
            value="opcion1"
            onSelect={() => {}}
            disabled
          />
        </Card>

        {/* ── CARDS ────────────────────────────────────── */}
        <SectionHeader title="Card" style={styles.headerSpacing} />
        <View style={styles.cardSection}>
          <Card variant="elevated" style={styles.cardExample}>
            <Text style={styles.cardTitle}>Elevated</Text>
            <Text style={styles.cardDesc}>Con sombra suave y fondo blanco</Text>
          </Card>
          <Card variant="outlined" style={styles.cardExample}>
            <Text style={styles.cardTitle}>Outlined</Text>
            <Text style={styles.cardDesc}>Borde sutil, sin elevación</Text>
          </Card>
          <Card variant="filled" style={styles.cardExample}>
            <Text style={styles.cardTitle}>Filled</Text>
            <Text style={styles.cardDesc}>Fondo de superficie (surface)</Text>
          </Card>
          <Card variant="flat" style={styles.cardExample}>
            <Text style={styles.cardTitle}>Flat</Text>
            <Text style={styles.cardDesc}>Sin decoración adicional</Text>
          </Card>
          <Card variant="elevated" padding="lg" radius="xl" onPress={() => {}} style={styles.cardExample}>
            <View style={styles.cardRow}>
              <MaterialIcons name="touch-app" size={20} color={colors.primary} />
              <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                <Text style={styles.cardTitle}>Pressable Card</Text>
                <Text style={styles.cardDesc}>Toca para interactuar</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.text.muted} />
            </View>
          </Card>
        </View>

        {/* ── ICON BUTTONS ─────────────────────────────── */}
        <SectionHeader title="IconButton / IconContainer" style={styles.headerSpacing} />
        <Card variant="outlined" style={styles.card}>
          <Text style={styles.sub}>Variants</Text>
          <View style={styles.row}>
            <IconButton
              icon={<MaterialIcons name="favorite" size={20} color={colors.primary} />}
              variant="ghost"
              style={styles.iconSpace}
            />
            <IconButton
              icon={<MaterialIcons name="share" size={20} color={colors.text.inverse} />}
              variant="filled"
              style={styles.iconSpace}
            />
            <IconButton
              icon={<MaterialIcons name="bookmark" size={20} color={colors.primary} />}
              variant="outline"
              style={styles.iconSpace}
            />
            <IconButton
              icon={<MaterialIcons name="more-vert" size={20} color={colors.text.secondary} />}
              variant="plain"
              style={styles.iconSpace}
            />
            <IconButton
              icon={<MaterialIcons name="delete" size={20} color={colors.status.error} />}
              variant="ghost"
              color={colors.status.error}
              style={styles.iconSpace}
            />
          </View>

          <Text style={styles.sub}>Sizes</Text>
          <View style={[styles.row, { alignItems: 'center' }]}>
            <IconButton
              icon={<MaterialIcons name="star" size={14} color={colors.primary} />}
              variant="ghost"
              size="sm"
              style={styles.iconSpace}
            />
            <IconButton
              icon={<MaterialIcons name="star" size={20} color={colors.primary} />}
              variant="ghost"
              size="md"
              style={styles.iconSpace}
            />
            <IconButton
              icon={<MaterialIcons name="star" size={26} color={colors.primary} />}
              variant="ghost"
              size="lg"
              style={styles.iconSpace}
            />
          </View>

          <Text style={styles.sub}>IconContainer (no interactivo)</Text>
          <View style={styles.row}>
            <View style={styles.iconSpace}>
              <IconContainer size="md" style={{ backgroundColor: colors.surface }}>
                <MaterialIcons name="directions-car" size={20} color={colors.primary} />
              </IconContainer>
            </View>
            <View style={styles.iconSpace}>
              <IconContainer size="lg" style={{ backgroundColor: `${colors.primary}15` }}>
                <MaterialIcons name="local-taxi" size={26} color={colors.primary} />
              </IconContainer>
            </View>
            <View style={styles.iconSpace}>
              <IconContainer size="sm" style={{ backgroundColor: `${colors.status.success}20` }}>
                <MaterialIcons name="check" size={14} color={colors.status.success} />
              </IconContainer>
            </View>
          </View>
        </Card>

        {/* ── AVATAR ───────────────────────────────────── */}
        <SectionHeader title="Avatar / UserAvatar" style={styles.headerSpacing} />
        <Card variant="outlined" style={styles.card}>
          <Text style={styles.sub}>Tamaños con iniciales</Text>
          <View style={[styles.row, { alignItems: 'center' }]}>
            <Avatar name="Ana García" size="xs" style={styles.avatarSpace} />
            <Avatar name="Carlos Ruiz" size="sm" style={styles.avatarSpace} />
            <Avatar name="María López" size="md" style={styles.avatarSpace} />
            <Avatar name="Pedro Torres" size="lg" style={styles.avatarSpace} />
            <Avatar name="Juan Díaz" size="xl" style={styles.avatarSpace} />
          </View>

          <Text style={styles.sub}>Colores personalizados</Text>
          <View style={[styles.row, { alignItems: 'center' }]}>
            <Avatar name="KR" size="md" backgroundColor={colors.primaryLight} style={styles.avatarSpace} />
            <Avatar name="OK" size="md" backgroundColor={colors.status.success} style={styles.avatarSpace} />
            <Avatar name="!!" size="md" backgroundColor={colors.status.warning} style={styles.avatarSpace} />
            <Avatar name="ER" size="md" backgroundColor={colors.status.error} style={styles.avatarSpace} />
            <Avatar size="md" backgroundColor={colors.text.muted} style={styles.avatarSpace} />
          </View>

          <Text style={styles.sub}>Con imagen (URL externa)</Text>
          <View style={[styles.row, { alignItems: 'center' }]}>
            <Avatar
              uri="https://i.pravatar.cc/150?img=3"
              name="Usuario 1"
              size="lg"
              style={styles.avatarSpace}
            />
            <Avatar
              uri="https://i.pravatar.cc/150?img=7"
              name="Usuario 2"
              size="lg"
              style={styles.avatarSpace}
            />
            <Avatar
              uri="https://i.pravatar.cc/150?img=12"
              name="Usuario 3"
              size="xl"
              style={styles.avatarSpace}
            />
          </View>
        </Card>

        {/* ── STATUS BADGE ─────────────────────────────── */}
        <SectionHeader title="StatusBadge" style={styles.headerSpacing} />
        <Card variant="outlined" style={styles.card}>
          <Text style={styles.sub}>Por status (label automático)</Text>
          <View style={styles.badgeRow}>
            <StatusBadge status="completed" style={styles.badgeSpace} />
            <StatusBadge status="pending" style={styles.badgeSpace} />
            <StatusBadge status="cancelled" style={styles.badgeSpace} />
            <StatusBadge status="verified" style={styles.badgeSpace} />
            <StatusBadge status="active" style={styles.badgeSpace} />
            <StatusBadge status="inactive" style={styles.badgeSpace} />
            <StatusBadge status="in_progress" style={styles.badgeSpace} />
          </View>

          <Text style={styles.sub}>Tone personalizado + label libre</Text>
          <View style={styles.badgeRow}>
            <StatusBadge tone="success" label="Pagado" style={styles.badgeSpace} />
            <StatusBadge tone="warning" label="Revisión" style={styles.badgeSpace} />
            <StatusBadge tone="error" label="Bloqueado" style={styles.badgeSpace} />
            <StatusBadge tone="info" label="Enviado" style={styles.badgeSpace} />
            <StatusBadge tone="primary" label="Nuevo" style={styles.badgeSpace} />
            <StatusBadge tone="neutral" label="Archivado" style={styles.badgeSpace} />
          </View>

          <Text style={styles.sub}>Tamaño pequeño (sm)</Text>
          <View style={styles.badgeRow}>
            <StatusBadge status="completed" size="sm" style={styles.badgeSpace} />
            <StatusBadge status="pending" size="sm" style={styles.badgeSpace} />
            <StatusBadge status="cancelled" size="sm" style={styles.badgeSpace} />
            <StatusBadge status="in_progress" size="sm" style={styles.badgeSpace} />
          </View>

          <Text style={styles.sub}>Con ícono personalizado</Text>
          <View style={styles.badgeRow}>
            <StatusBadge
              tone="success"
              label="Verificado"
              icon={<MaterialIcons name="verified" size={12} color={colors.status.success} />}
              style={styles.badgeSpace}
            />
            <StatusBadge
              tone="warning"
              label="Alerta"
              icon={<MaterialIcons name="warning" size={12} color="#E65100" />}
              style={styles.badgeSpace}
            />
          </View>
        </Card>

        {/* ── STAR RATING ──────────────────────────────── */}
        <SectionHeader title="StarRating" style={styles.headerSpacing} />
        <Card variant="outlined" style={styles.card}>
          <Text style={styles.sub}>Solo lectura (3 / 5)</Text>
          <StarRating value={3} readOnly />

          <Text style={styles.sub}>Solo lectura — color primario (5 / 5)</Text>
          <StarRating value={5} readOnly activeColor={colors.primary} size={24} />

          <Text style={styles.sub}>Interactivo — toca para calificar</Text>
          <StarRating value={starRating} onChange={setStarRating} size={36} />
          <Text style={styles.ratingLabel}>Calificación seleccionada: {starRating} / 5</Text>

          <Text style={styles.sub}>Compacto (solo lectura, 4 / 5)</Text>
          <StarRating value={4} readOnly size={20} />
        </Card>

        {/* ── SECTION HEADER ───────────────────────────── */}
        <SectionHeader title="SectionHeader" style={styles.headerSpacing} />
        <Card variant="outlined" style={styles.card}>
          <Text style={styles.sub}>Con acción "Ver todos"</Text>
          <Card variant="filled" padding="sm" radius="md">
            <SectionHeader title="Viajes recientes" onPressAction={() => {}} />
          </Card>

          <Text style={styles.sub}>Sin acción</Text>
          <Card variant="filled" padding="sm" radius="md">
            <SectionHeader title="Información del perfil" />
          </Card>

          <Text style={styles.sub}>Acción personalizada</Text>
          <Card variant="filled" padding="sm" radius="md">
            <SectionHeader
              title="Conductores disponibles"
              actionLabel="Filtrar"
              onPressAction={() => {}}
            />
          </Card>
        </Card>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  content: {
    padding: spacing.lg,
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardSection: {
    marginBottom: spacing.sm,
  },
  headerSpacing: {
    marginTop: spacing.lg,
  },
  sub: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  iconSpace: {
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  avatarSpace: {
    marginRight: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badgeSpace: {
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardExample: {
    marginBottom: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
  },
  ratingLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
});
