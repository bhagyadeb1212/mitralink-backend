import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
    return (
        <>
            <StatusBar style="light" />
            <Stack screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0f172a' }
            }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="manage/creators" options={{ headerShown: true, title: 'Manage Creators', headerStyle: { backgroundColor: '#1e293b' }, headerTintColor: '#fff' }} />
                <Stack.Screen name="manage/reels" options={{ headerShown: true, title: 'Reel Moderation', headerStyle: { backgroundColor: '#1e293b' }, headerTintColor: '#fff' }} />
                <Stack.Screen name="manage/chat" options={{ headerShown: true, title: 'Chat Moderation', headerStyle: { backgroundColor: '#1e293b' }, headerTintColor: '#fff' }} />
            </Stack>
        </>
    );
}
