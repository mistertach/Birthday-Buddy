import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/types';
import { colors, radius, shadow, font } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
    const { register } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const passwordStrength = (): { label: string; color: string; width: string } => {
        if (password.length === 0) return { label: '', color: 'transparent', width: '0%' };
        if (password.length < 6) return { label: 'Too short', color: colors.danger, width: '25%' };
        if (password.length < 10) return { label: 'OK', color: colors.warning, width: '55%' };
        if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return { label: 'Strong', color: colors.success, width: '100%' };
        return { label: 'Good', color: colors.success, width: '75%' };
    };

    const onSubmit = async () => {
        if (name.trim().length < 2) {
            Alert.alert('Name too short', 'Please enter your full name (at least 2 characters).');
            return;
        }
        if (!email.includes('@')) {
            Alert.alert('Invalid email', 'Please enter a valid email address.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Password too short', 'Password must be at least 6 characters.');
            return;
        }
        setSubmitting(true);
        try {
            await register(name.trim(), email.trim().toLowerCase(), password);
        } catch (e: any) {
            Alert.alert('Sign up failed', e?.error || 'Something went wrong, please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const strength = passwordStrength();

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
                <View style={styles.hero}>
                    <View style={styles.logoRing}>
                        <Text style={styles.logoEmoji}>🎉</Text>
                    </View>
                    <Text style={styles.appName}>Create account</Text>
                    <Text style={styles.tagline}>Start tracking birthdays in seconds</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.fieldWrap}>
                        <Text style={styles.fieldLabel}>Your name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Alex Smith"
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="words"
                            value={name}
                            onChangeText={setName}
                            returnKeyType="next"
                        />
                    </View>

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
                                placeholder="At least 6 characters"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry={!showPassword}
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
                        {password.length > 0 && (
                            <View style={styles.strengthWrap}>
                                <View style={styles.strengthTrack}>
                                    <View style={[styles.strengthFill, { width: strength.width as any, backgroundColor: strength.color }]} />
                                </View>
                                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
                        onPress={onSubmit}
                        disabled={submitting}
                        activeOpacity={0.85}
                    >
                        {submitting
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.primaryBtnText}>Create account</Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.backBtnText}>← Back to login</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    hero: { alignItems: 'center', marginBottom: 32 },
    logoRing: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
        marginBottom: 12, ...shadow.sm,
    },
    logoEmoji: { fontSize: 36 },
    appName: { fontSize: font.xl, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    tagline: { fontSize: font.sm, color: colors.textMuted, marginTop: 4 },
    form: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 24, ...shadow.sm },
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
    strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    strengthTrack: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
    strengthFill: { height: '100%', borderRadius: 2 },
    strengthLabel: { fontSize: font.xs, fontWeight: '600', width: 44 },
    primaryBtn: {
        backgroundColor: colors.primary, borderRadius: radius.md,
        paddingVertical: 15, alignItems: 'center', marginTop: 8, ...shadow.primary,
    },
    primaryBtnDisabled: { opacity: 0.7 },
    primaryBtnText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
    backBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
    backBtnText: { color: colors.textSecondary, fontSize: font.base },
});
