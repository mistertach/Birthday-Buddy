import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Alert,
    Modal, Pressable, Share, Linking, ScrollView,
} from 'react-native';
import { Contact } from '../types';
import { getBirthdayStatus, daysUntilBirthday, relativeLabel, formatBirthday, ageturning } from '../utils/dates';
import { contactsApi } from '../api/contacts';

type Props = {
    contact: Contact;
    onWished: (id: string, wished: boolean) => void;
    onEdit: (contact: Contact) => void;
    onDeleted: (id: string) => void;
};

export default function ContactCard({ contact, onWished, onEdit, onDeleted }: Props) {
    const [wishModalVisible, setWishModalVisible] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState('');

    const status = getBirthdayStatus(contact.day, contact.month, contact.lastWishedYear);
    const days = daysUntilBirthday(contact.day, contact.month);
    const turningAge = ageturning(contact.day, contact.month, contact.year);
    const isWished = status === 'wished';
    const isToday = status === 'today';
    const isMissed = status === 'missed';
    const canWish = status !== 'upcoming';

    const cardStyle = isToday
        ? styles.cardToday
        : isMissed ? styles.cardMissed
        : isWished ? styles.cardWished
        : styles.card;

    const PRESETS = isMissed ? [
        `Happy belated birthday, ${contact.name}! 🎉 Sorry for the late message, hope it was amazing!`,
        `Wishing you a wonderful (belated!) birthday, ${contact.name}! Better late than never 😊`,
        `Happy belated birthday ${contact.name}! Hope the celebrations are still going! 🎂`,
    ] : [
        `Happy Birthday, ${contact.name}! 🎉 Hope you have an amazing day!`,
        `Wishing you a wonderful birthday, ${contact.name}! Hope you're surrounded by love today 🎂`,
        `Happy Birthday ${contact.name}! Have a fantastic day! 🥳`,
    ];

    const openWishSheet = () => {
        setSelectedMessage('');
        setWishModalVisible(true);
    };

    const handleWish = async () => {
        try {
            await contactsApi.markWished(contact.id, !isWished);
            onWished(contact.id, !isWished);
        } catch {
            Alert.alert('Error', 'Could not update wish status');
        }
    };

    const handleWhatsApp = (msg: string) => {
        const phone = contact.phone?.replace(/\D/g, '');
        const text = encodeURIComponent(msg);
        const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
        Linking.openURL(url);
        if (!isWished) {
            contactsApi.markWished(contact.id, true).then(() => onWished(contact.id, true));
        }
        setWishModalVisible(false);
    };

    const handleShare = async (msg: string) => {
        await Share.share({ message: msg });
    };

    const handleDelete = () => {
        setMenuVisible(false);
        Alert.alert(`Delete ${contact.name}?`, 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await contactsApi.remove(contact.id);
                        onDeleted(contact.id);
                    } catch {
                        Alert.alert('Error', 'Could not delete contact');
                    }
                }
            },
        ]);
    };

    return (
        <>
            <View style={[styles.card, cardStyle]}>
                {/* Date badge */}
                <View style={styles.dateBadge}>
                    <Text style={styles.dateDay}>{contact.day}</Text>
                    <Text style={styles.dateMonth}>
                        {new Date(2000, contact.month - 1).toLocaleString('default', { month: 'short' }).toUpperCase()}
                    </Text>
                </View>

                {/* Info */}
                <View style={styles.info}>
                    <Text style={[styles.name, isWished && styles.nameWished]} numberOfLines={1}>
                        {contact.name}
                    </Text>
                    <View style={styles.metaRow}>
                        {contact.relationship ? (
                            <Text style={styles.rel}>{contact.relationship}</Text>
                        ) : null}
                        {contact.relationship && (isToday || isMissed || days <= 14) ? (
                            <Text style={styles.dot}>·</Text>
                        ) : null}
                        {isToday && <Text style={styles.labelToday}>Today!</Text>}
                        {isMissed && <Text style={styles.labelMissed}>⏰ Missed</Text>}
                        {!isToday && !isMissed && days <= 14 && (
                            <Text style={[styles.daysText, days <= 3 && styles.daysUrgent]}>
                                {relativeLabel(days)}
                            </Text>
                        )}
                        {turningAge && (
                            <>
                                <Text style={styles.dot}>·</Text>
                                <Text style={styles.age}>Turns {turningAge}</Text>
                            </>
                        )}
                    </View>
                </View>

                {/* Days pill (for upcoming > 14 days) */}
                {!isToday && !isMissed && !isWished && days > 14 && (
                    <View style={styles.pill}>
                        <Text style={styles.pillText}>{days}d</Text>
                    </View>
                )}

                {/* Action buttons */}
                <View style={styles.actions}>
                    {/* WhatsApp/message button */}
                    {(isToday || isMissed) && (
                        <TouchableOpacity style={styles.whatsappBtn} onPress={openWishSheet}>
                            <Text style={styles.whatsappIcon}>💬</Text>
                        </TouchableOpacity>
                    )}

                    {/* Tick */}
                    <TouchableOpacity
                        style={[styles.tickBtn, isWished && styles.tickBtnWished, !canWish && styles.tickBtnHidden]}
                        onPress={canWish ? handleWish : undefined}
                        disabled={!canWish}
                    >
                        <Text style={[styles.tickIcon, isWished && styles.tickIconWished]}>✓</Text>
                    </TouchableOpacity>

                    {/* Menu */}
                    <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuVisible(true)}>
                        <Text style={styles.menuIcon}>⋯</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Wish sheet */}
            <Modal visible={wishModalVisible} transparent animationType="slide" onRequestClose={() => setWishModalVisible(false)}>
                <Pressable style={styles.overlay} onPress={() => setWishModalVisible(false)} />
                <View style={styles.sheet}>
                    <View style={styles.sheetHandle} />
                    <Text style={styles.sheetTitle}>
                        {isMissed ? `Belated wish for ${contact.name} 🕐` : `Wish ${contact.name} 🎂`}
                    </Text>
                    <Text style={styles.sheetSubtitle}>{formatBirthday(contact.day, contact.month, contact.year)}</Text>

                    {/* Preset message cards */}
                    <Text style={styles.pickLabel}>Pick a message</Text>
                    <ScrollView style={styles.presetScroll} showsVerticalScrollIndicator={false}>
                        {PRESETS.map((msg, i) => {
                            const isSelected = selectedMessage === msg;
                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                                    onPress={() => setSelectedMessage(msg)}
                                    activeOpacity={0.75}
                                >
                                    <View style={styles.presetRadio}>
                                        {isSelected && <View style={styles.presetRadioDot} />}
                                    </View>
                                    <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>
                                        {msg}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Send buttons — only when a message is picked */}
                    {selectedMessage ? (
                        <View style={styles.sendRow}>
                            <TouchableOpacity
                                style={styles.waBtn}
                                onPress={() => handleWhatsApp(selectedMessage)}
                            >
                                <Text style={styles.waBtnText}>📱 WhatsApp</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.shareBtn}
                                onPress={() => handleShare(selectedMessage)}
                            >
                                <Text style={styles.shareBtnText}>↑ Share</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.sendRowPlaceholder} />
                    )}
                </View>
            </Modal>

            {/* Menu Modal */}
            <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)} />
                <View style={styles.menu}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); onEdit(contact); }}>
                        <Text style={styles.menuItemText}>✏️  Edit contact</Text>
                    </TouchableOpacity>
                    <View style={styles.menuDivider} />
                    <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
                        <Text style={[styles.menuItemText, styles.menuItemDestructive]}>🗑  Delete contact</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 14, padding: 12, marginBottom: 8,
        borderWidth: 1, borderColor: '#f1f5f9',
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    cardToday: { backgroundColor: '#fff1f5', borderColor: '#fecdd3' },
    cardMissed: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
    cardWished: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
    dateBadge: {
        width: 42, height: 42, borderRadius: 10, backgroundColor: '#f8fafc',
        borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    dateDay: { fontSize: 15, fontWeight: '700', color: '#1e293b', lineHeight: 16 },
    dateMonth: { fontSize: 9, fontWeight: '600', color: '#94a3b8', marginTop: 1 },
    info: { flex: 1, minWidth: 0 },
    name: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 3 },
    nameWished: { color: '#94a3b8', textDecorationLine: 'line-through' },
    metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
    rel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
    dot: { fontSize: 12, color: '#cbd5e1' },
    labelToday: { fontSize: 12, fontWeight: '700', color: '#e11d48' },
    labelMissed: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
    daysText: { fontSize: 12, color: '#64748b' },
    daysUrgent: { color: '#d97706', fontWeight: '600' },
    age: { fontSize: 12, color: '#94a3b8' },
    pill: {
        backgroundColor: '#fce7f3', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6,
    },
    pillText: { fontSize: 12, color: '#be185d', fontWeight: '600' },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    whatsappBtn: {
        width: 34, height: 34, borderRadius: 17, backgroundColor: '#dcfce7',
        alignItems: 'center', justifyContent: 'center',
    },
    whatsappIcon: { fontSize: 16 },
    tickBtn: {
        width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: '#cbd5e1',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
    },
    tickBtnWished: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
    tickBtnHidden: { opacity: 0 },
    tickIcon: { fontSize: 14, color: '#94a3b8', fontWeight: '700' },
    tickIconWished: { color: '#16a34a' },
    menuBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    menuIcon: { fontSize: 18, color: '#94a3b8' },
    // Overlay
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    // Wish sheet
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: 44,
    },
    sheetHandle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    sheetTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
    sheetSubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 14 },
    pickLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 10 },
    presetScroll: { maxHeight: 200, marginBottom: 14 },
    presetCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 8,
        borderWidth: 1.5, borderColor: '#e2e8f0',
    },
    presetCardSelected: { borderColor: '#ec4899', backgroundColor: '#fdf2f8' },
    presetRadio: {
        width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#cbd5e1',
        alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
    },
    presetRadioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ec4899' },
    presetText: { flex: 1, fontSize: 14, color: '#475569', lineHeight: 20 },
    presetTextSelected: { color: '#be185d', fontWeight: '600' },
    sendRow: { flexDirection: 'row', gap: 10 },
    sendRowPlaceholder: { height: 48 },
    waBtn: {
        flex: 1, backgroundColor: '#22c55e', borderRadius: 12, padding: 14, alignItems: 'center',
    },
    waBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    shareBtn: {
        flex: 1, backgroundColor: '#6366f1', borderRadius: 12, padding: 14, alignItems: 'center',
    },
    shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    // Context menu
    menu: {
        position: 'absolute', bottom: 40, alignSelf: 'center', width: 220,
        backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
        shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
    },
    menuItem: { paddingHorizontal: 18, paddingVertical: 14 },
    menuItemText: { fontSize: 15, color: '#1e293b' },
    menuItemDestructive: { color: '#dc2626' },
    menuDivider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 12 },
});
