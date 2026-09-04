import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        lazy: false,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.surfaceElevated },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        headerTintColor: colors.text,
        headerShadowVisible: false,
        header: (props) => (
          <AppHeader
            title={
              typeof props.options.headerTitle === 'string'
                ? props.options.headerTitle
                : props.options.title
            }
            headerRight={
              props.options.headerRight
                ? props.options.headerRight({ tintColor: colors.text, canGoBack: false })
                : undefined
            }
          />
        ),
      }}>
      <Tabs.Screen
        name="inicio"
        options={{
          title: t('tabs.inicio'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analises"
        options={{
          title: t('tabs.analises'),
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: t('tabs.historico'),
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="horarios"
        options={{
          title: t('tabs.horarios'),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="comunidade"
        options={{
          title: t('tabs.comunidade'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: t('tabs.perfil'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{ href: null, headerShown: false }}
      />
    </Tabs>
  );
}

