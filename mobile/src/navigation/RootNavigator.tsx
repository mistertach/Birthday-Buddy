import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../auth/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ContactsScreen from '../screens/ContactsScreen';
import ContactFormScreen from '../screens/ContactFormScreen';
import CalendarScreen from '../screens/CalendarScreen';
import EventsScreen from '../screens/EventsScreen';
import type {
    AuthStackParamList,
    BirthdaysStackParamList,
    CalendarStackParamList,
    EventsStackParamList,
    AppTabParamList,
} from './types';
import { colors } from '../theme';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const BirthdaysStack = createNativeStackNavigator<BirthdaysStackParamList>();
const CalendarStack = createNativeStackNavigator<CalendarStackParamList>();
const EventsStack = createNativeStackNavigator<EventsStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

function AuthNavigator() {
    return (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
    );
}

function BirthdaysNavigator() {
    return (
        <BirthdaysStack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.primary,
                headerTitleStyle: { fontWeight: '700', color: colors.text },
                headerShadowVisible: false,
                headerBackTitle: 'Back',
            }}
        >
            <BirthdaysStack.Screen
                name="Contacts"
                component={ContactsScreen}
                options={{ headerShown: false }}
            />
            <BirthdaysStack.Screen
                name="ContactForm"
                component={ContactFormScreen}
                options={({ route }) => ({
                    title: route.params?.id ? 'Edit contact' : 'New buddy',
                })}
            />
        </BirthdaysStack.Navigator>
    );
}

function CalendarNavigator() {
    return (
        <CalendarStack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.primary,
                headerTitleStyle: { fontWeight: '700', color: colors.text },
                headerShadowVisible: false,
            }}
        >
            <CalendarStack.Screen
                name="Calendar"
                component={CalendarScreen}
                options={{ title: 'Calendar' }}
            />
        </CalendarStack.Navigator>
    );
}

function EventsNavigator() {
    return (
        <EventsStack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.primary,
                headerTitleStyle: { fontWeight: '700', color: colors.text },
                headerShadowVisible: false,
            }}
        >
            <EventsStack.Screen
                name="Events"
                component={EventsScreen}
                options={{ title: 'Events' }}
            />
        </EventsStack.Navigator>
    );
}

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
    return (
        <View style={tabStyles.iconWrap}>
            <Text style={tabStyles.iconEmoji}>{emoji}</Text>
            <Text style={[tabStyles.iconLabel, focused && tabStyles.iconLabelActive]}>{label}</Text>
        </View>
    );
}

function AppNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopColor: '#f1f5f9',
                    borderTopWidth: 1,
                    height: 72,
                    paddingBottom: 12,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: '#94a3b8',
            }}
        >
            <Tab.Screen
                name="BirthdaysTab"
                component={BirthdaysNavigator}
                options={{
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🎂" label="Birthdays" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="CalendarTab"
                component={CalendarNavigator}
                options={{
                    tabBarIcon: ({ focused }) => <TabIcon emoji="📅" label="Calendar" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="EventsTab"
                component={EventsNavigator}
                options={{
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🎉" label="Events" focused={focused} />,
                }}
            />
        </Tab.Navigator>
    );
}

export default function RootNavigator() {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#ec4899" />
            </View>
        );
    }
    return (
        <NavigationContainer>
            {user ? <AppNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
}

const tabStyles = StyleSheet.create({
    iconWrap: { alignItems: 'center', justifyContent: 'center', gap: 2 },
    iconEmoji: { fontSize: 22 },
    iconLabel: { fontSize: 10, fontWeight: '600', color: '#94a3b8' },
    iconLabelActive: { color: '#ec4899' },
});
