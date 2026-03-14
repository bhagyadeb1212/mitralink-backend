import { Tabs } from 'expo-router';
import { LayoutDashboard, Users, Film, Trash2 } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{
            tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155', height: 64, paddingBottom: 8 },
            tabBarActiveTintColor: '#0062E3',
            tabBarInactiveTintColor: '#94a3b8',
            headerStyle: { backgroundColor: '#1e293b' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
