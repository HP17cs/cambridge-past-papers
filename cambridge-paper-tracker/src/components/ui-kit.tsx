import React, { type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '../lib/colors';
import type { AppColors } from '../lib/colors';
import { useTheme } from '../contexts/ThemeContext';

export function useColors(): AppColors {
  const { theme, isDark } = useTheme();
  return palette(theme, isDark);
}

interface ScreenProps extends ScrollViewProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, contentContainerStyle, ...rest }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.screenContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        {...rest}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function ScreenView({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }, style]}>
      {children}
    </View>
  );
}

export function Title({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[styles.title, { color: c.text }, style]}>{children}</Text>;
}

export function Subtitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[styles.subtitle, { color: c.subtext }, style]}>{children}</Text>;
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[styles.sectionTitle, { color: c.text }, style]}>{children}</Text>;
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const c = useColors();
  const content = <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>;
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
        {content}
      </Pressable>
    );
  }
  return content;
}

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'success' | 'successSoft';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style, textStyle }: ButtonProps) {
  const c = useColors();
  const bg: StyleProp<ViewStyle> =
    variant === 'danger'
      ? { backgroundColor: '#dc2626' }
      : variant === 'success'
        ? { backgroundColor: c.good }
        : variant === 'successSoft'
          ? { backgroundColor: c.accentSoft, borderColor: c.good }
          : variant === 'outline'
            ? { backgroundColor: 'transparent', borderColor: c.border }
            : variant === 'ghost'
              ? { backgroundColor: 'transparent', borderColor: 'transparent' }
              : {};
  const fg = variant === 'primary' || variant === 'danger' || variant === 'success' ? '#ffffff' : c.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        bg,
        variant === 'outline' && { borderWidth: 1 },
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }, textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Badge({ label, color, bg, style }: { label: string; color: string; bg: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  const c = useColors();
  return verified ? (
    <Badge label="Verified" color={c.good} bg={c.good + '22'} />
  ) : (
    <Badge label="Unverified" color={c.subtext} bg={c.border} />
  );
}

export function GradientBar({ value, height = 10, colors }: { value: number; height?: number; colors?: [string, string] }) {
  const c = useColors();
  const grad = colors || c.gradient;
  const width = Math.max(0, Math.min(100, value * 100));
  return (
    <View style={[styles.barTrack, { height, backgroundColor: c.border }]}>
      <LinearGradient
        colors={grad}
        style={[styles.barFill, { width: `${width}%` as `${number}%`, height }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
    </View>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={[styles.label, { color: c.textMuted }]}>{children}</Text>;
}

export function TextField(props: React.ComponentProps<typeof TextInput>) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.subtext}
      style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
      {...props}
    />
  );
}

export function Checkbox({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.checkbox,
        {
          borderColor: c.border,
          backgroundColor: c.card,
          ...(checked ? { backgroundColor: c.good, borderColor: c.good } : {}),
        },
      ]}
    >
      {checked && <Text style={[styles.checkboxMark, { color: '#fff' }]}>✓</Text>}
    </Pressable>
  );
}

export function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.headerRow}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={c.accent} />
        </Pressable>
      ) : (
        <View style={styles.headerSide} />
      )}
      <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>
        {title}
      </Text>
      {right ? <View style={[styles.headerSide, styles.headerRight]}>{right}</View> : <View style={styles.headerSide} />}
    </View>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: ComponentProps<typeof Ionicons>['name']; title: string; subtitle: string }) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIconWrap, { backgroundColor: c.accentSoft }]}>
        <Ionicons name={icon} size={28} color={c.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.text }]}>{title}</Text>
      <Text style={[styles.emptySubtitle, { color: c.subtext }]}>{subtitle}</Text>
    </View>
  );
}

export function LoadingScreen() {
  const c = useColors();
  return (
    <View style={[styles.root, styles.centered, { backgroundColor: c.bg }]}>
      <ActivityIndicator size="large" color={c.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  screenContent: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '600', marginTop: 20, marginBottom: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  buttonText: { fontSize: 15, fontWeight: '600' },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  barTrack: { borderRadius: 999, overflow: 'hidden', width: '100%' },
  barFill: { borderRadius: 999 },
  label: { fontSize: 13, marginBottom: 6, fontWeight: '500' },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: { fontSize: 16, fontWeight: '800', lineHeight: 18 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  headerSide: { width: 40 },
  headerRight: { minWidth: 40, alignItems: 'flex-end' },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'left', fontSize: 18, fontWeight: '700' },
  empty: { alignItems: 'center', padding: 32 },
  emptyIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyIcon: { fontSize: 26 },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },
});
