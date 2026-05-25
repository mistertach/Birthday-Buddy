import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { radius, font, shadow } from '../theme';

function GoogleLogo() {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </Svg>
    );
}

function AppleLogo() {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="white">
            <Path d="M16.365 1.43c0 0-2.083.155-3.83 1.18-.926.54-1.841 1.41-2.34 2.277-.47.825-.683 1.705-.62 2.456 0 0 2.066-.021 3.882-1.234 1.48-1.002 2.23-2.153 2.456-2.904.093-.306.452-1.775.452-1.775zm-3.082 8.283c-1.41-.035-2.738.835-3.477.835-.742 0-1.821-.765-2.96-.732-1.503.036-2.883.87-3.645 2.2-1.554 2.684-.395 6.666 1.11 8.847.74 1.07 1.623 2.27 2.766 2.23 1.107-.035 1.54-.707 2.875-.707 1.334 0 1.733.707 2.898.683 1.2-.023 1.956-1.096 2.683-2.156.845-1.236 1.196-2.43 1.196-2.43s-2.316-.887-2.338-3.535c-.021-2.215 1.808-3.266 1.808-3.266-1.026-1.502-2.617-1.688-3.184-1.745z" />
        </Svg>
    );
}

type Props = {
    onGoogle: () => void;
    onApple: () => void;
    loading?: boolean;
};

export default function SocialAuthButtons({ onGoogle, onApple, loading }: Props) {
    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.btn, styles.googleBtn]}
                onPress={onGoogle}
                disabled={loading}
                activeOpacity={0.8}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#5f6368" />
                ) : (
                    <>
                        <GoogleLogo />
                        <Text style={styles.googleText}>Continue with Google</Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.btn, styles.appleBtn]}
                onPress={onApple}
                disabled={loading}
                activeOpacity={0.8}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <>
                        <AppleLogo />
                        <Text style={styles.appleText}>Continue with Apple</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 12 },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: radius.md,
        borderWidth: 1.5,
        ...shadow.sm,
    },
    googleBtn: {
        backgroundColor: '#fff',
        borderColor: '#dadce0',
    },
    appleBtn: {
        backgroundColor: '#000',
        borderColor: '#000',
    },
    googleText: {
        fontSize: font.base,
        fontWeight: '600',
        color: '#3c4043',
        letterSpacing: 0.1,
    },
    appleText: {
        fontSize: font.base,
        fontWeight: '600',
        color: '#fff',
        letterSpacing: 0.1,
    },
});
