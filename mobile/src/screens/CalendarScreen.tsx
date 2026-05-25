import React, { useCallback, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { contactsApi } from '../api/contacts';
import { Contact } from '../types/index';
import { getBirthdayStatus } from '../utils/dates';

// 12 months starting from the current month
function getMonthOrder() {
    const current = new Date().getMonth(); // 0-based
    return Array.from({ length: 12 }, (_, i) => (current + i) % 12);
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const REL_COLORS: Record<string, string> = {
    Family: '#ec4899',
    Friend: '#6366f1',
    Partner: '#f43f5e',
    Colleague: '#0ea5e9',
    Other: '#94a3b8',
};

function dotColor(contact: Contact) {
    const status = getBirthdayStatus(contact.day, contact.month, contact.lastWishedYear);
    if (status === 'today') return '#e11d48';
    if (status === 'missed') return '#dc2626';
    if (status === 'wished') return '#16a34a';
    return REL_COLORS[contact.relationship ?? 'Other'] ?? '#6366f1';
}

export default function CalendarScreen() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            setContacts(await contactsApi.list());
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#ec4899" /></View>;
    }

    const monthOrder = getMonthOrder();
    const today = new Date();
    const currentMonthIdx = today.getMonth();
    const currentYear = today.getFullYear();

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#ec4899" />
            }
        >
            <Text style={styles.heading}>📅 Year at a glance</Text>

            {monthOrder.map(mIdx => {
                const monthContacts = contacts
                    .filter(c => c.month - 1 === mIdx)
                    .sort((a, b) => a.day - b.day);

                if (monthContacts.length === 0) return null;

                // Year label: if the month has already passed this year, show next year
                const displayYear = mIdx < currentMonthIdx ? currentYear + 1 : currentYear;
                const isCurrentMonth = mIdx === currentMonthIdx;
                const monthLabel = MONTH_NAMES[mIdx] + (displayYear !== currentYear ? ` ${displayYear}` : '');

                return (
                    <View key={mIdx} style={styles.monthBlock}>
                        <View style={styles.monthHeader}>
                            <Text style={[styles.monthName, isCurrentMonth && styles.monthNameCurrent]}>
                                {monthLabel.toUpperCase()}
                            </Text>
                            {isCurrentMonth && <View style={styles.nowBadge}><Text style={styles.nowText}>NOW</Text></View>}
                            <Text style={styles.monthCount}>{monthContacts.length}</Text>
                        </View>
                        <View style={styles.chipsRow}>
                            {monthContacts.map(c => {
                                const status = getBirthdayStatus(c.day, c.month, c.lastWishedYear);
                                const isToday = status === 'today';
                                const isWished = status === 'wished';
                                const isMissed = status === 'missed';
                                const color = dotColor(c);

                                return (
                                    <View
                                        key={c.id}
                                        style={[
                                            styles.chip,
                                            isToday && styles.chipToday,
                                            isWished && styles.chipWished,
                                            isMissed && styles.chipMissed,
                                        ]}
                                    >
                                        <View style={[styles.dot, { backgroundColor: color }]} />
                                        <Text style={styles.chipDay}>{c.day}</Text>
                                        <Text style={[styles.chipName, isWished && styles.chipNameWished]} numberOfLines={1}>
                                            {c.name.split(' ')[0]}
                                        </Text>
                                        {isToday && <Text style={styles.chipBadge}>🎉</Text>}
                                        {isMissed && <Text style={styles.chipBadge}>⏰</Text>}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                );
            })}

            <View style={styles.legend}>
                <Text style={styles.legendTitle}>Legend</Text>
                <View style={styles.legendRow}>
                    {Object.entries(REL_COLORS).map(([rel, col]) => (
                        <View key={rel} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: col }]} />
                            <Text style={styles.legendLabel}>{rel}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    heading: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 20, letterSpacing: 0.2 },
    monthBlock: { marginBottom: 24 },
    monthHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
        paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    },
    monthName: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.5, flex: 1 },
    monthNameCurrent: { color: '#ec4899' },
    nowBadge: {
        backgroundColor: '#fce7f3', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2,
    },
    nowText: { fontSize: 9, fontWeight: '800', color: '#be185d', letterSpacing: 0.5 },
    monthCount: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
        borderWidth: 1, borderColor: '#e2e8f0',
        shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1,
        maxWidth: 160,
    },
    chipToday: { backgroundColor: '#fff1f5', borderColor: '#fecdd3' },
    chipWished: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
    chipMissed: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
    dot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
    chipDay: { fontSize: 12, fontWeight: '700', color: '#475569', minWidth: 16, textAlign: 'center' },
    chipName: { fontSize: 13, fontWeight: '500', color: '#1e293b', flexShrink: 1 },
    chipNameWished: { color: '#86efac', textDecorationLine: 'line-through' },
    chipBadge: { fontSize: 12 },
    legend: {
        backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 8,
        borderWidth: 1, borderColor: '#f1f5f9',
    },
    legendTitle: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 8 },
    legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendLabel: { fontSize: 12, color: '#64748b' },
});
