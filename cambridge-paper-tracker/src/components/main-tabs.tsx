import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useColors } from './ui-kit';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { route: string; label: string; icon: IoniconName; activeIcon: IoniconName }[] = [
  { route: '/dashboard', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { route: '/papers', label: 'Papers', icon: 'document-text-outline', activeIcon: 'document-text' },
  { route: '/subjects', label: 'Subjects', icon: 'book-outline', activeIcon: 'book' },
  { route: '/progress', label: 'Progress', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
  { route: '/settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
];

export default function MainTabs() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: c.card,
          borderTopColor: c.border,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.route;
        return (
          <Pressable
            key={tab.route}
            onPress={() => {
              if (!active) router.replace(tab.route as never);
            }}
            style={styles.tab}
          >
            <Ionicons name={active ? tab.activeIcon : tab.icon} size={22} color={active ? c.accent : c.subtext} />
            <Text
              style={[styles.label, { color: active ? c.accent : c.subtext }, active && { fontWeight: '700' }]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tab: { flex: 1, alignItems: 'center' },
  label: { fontSize: 10, marginTop: 3 },
});
