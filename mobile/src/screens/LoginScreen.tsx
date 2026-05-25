import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/types';
import { colors, radius, shadow, font } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async () => {
        if (!email.trim() || !password) {
            Alert.alert('Missing info', 'Please enter your email and password.');
            return;
        }
        setSubmitting(true);
        try {
            await login(email.trim().toLowerCase(), password);
        } catch (e: any) {
            Alert.alert('Could not log in', e?.error || 'Check your email and password and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                bounces={false}
            >
                {/* Logo area */}
                <View style={styles.hero}>
                    <View style={styles.logoRing}>
                        <Text style={styles.logoEmoji}>🎂</Text>
                    </View>
                    <Text style={styles.appName}>Birthday Buddy</Text>
                    <Text style={styles.tagline}>Never forget a birthday again</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <Text style={styles.formTitle}>Welcome back</Text>

                    <View style={styles.fieldWrap}>
                        <Text style={styles.fieldLabel}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="you@example.com"
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                            value={email}
                            onChangeText={setEmail}
                            returnKeyType="next"
                        />
                    </View>

                    <View style={styles.fieldWrap}>
                        <Text style={styles.fieldLabel}>Password</Text>
                        <View style={styles.passwordWrap}>
                            <TextInput
                                style={[styles.input, styles.passwordInput]}
                                placeholder="Your password"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry={!showPassword}
                                autoComplete="password"
                                value={password}
                                onChangeText={setPassword}
                                returnKeyType="done"
                                onSubmitEditing={onSubmit}
                            />
                            <TouchableOpacity
                                style={styles.eyeBtn}
                                onPress={() => setShowPassword(s => !s)}
                            >
                                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
                        onPress={onSubmit}
                        disabled={submitting}
                        activeOpacity={0.85}
                    >
                        {submitting
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.primaryBtnText}>Log in</Text>
                        }
                    </TouchableOpacity>

                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => navigation.navigate('Register')}
                    >
                        <Text style={styles.secondaryBtnText}>Create a new account</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    hero: { alignItems: 'center', marginBottom: 40 },
    logoRing: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
        marginBottom: 14, ...shadow.sm,
    },
    logoEmoji: { fontSize: 40 },
    appName: { fontSize: font.xxl, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    tagline: { fontSize: font.sm, color: colors.textMuted, marginTop: 4 },
    form: {
        backgroundColor: colors.surface, borderRadius: radius.xl,
        padding: 24, ...shadow.sm,
    },
    formTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text, marginBottom: 20 },
    fieldWrap: { marginBottom: 16 },
    fieldLabel: { fontSize: font.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
    input: {
        backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1.5,
        borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12,
        fontSize: font.base, color: colors.text,
    },
    passwordWrap: { position: 'relative' },
    passwordInput: { paddingRight: 48 },
    eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
    eyeIcon: { fontSize: 18 },
    primaryBtn: {
        backgroundColor: colors.primary, borderRadius: radius.md,
        paddingVertical: 15, alignItems: 'center', marginTop: 8, ...shadow.primary,
    },
    primaryBtnDisabled: { opacity: 0.7 },
    primaryBtnText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
    dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 10 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { fontSize: font.sm, color: colors.textMuted },
    secondaryBtn: {
        borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
        borderWidth: 1.5, borderColor: colors.border,
    },
    secondaryBtnText: { color: colors.textSecondary, fontSize: font.base, fontWeight: '600' },
});
