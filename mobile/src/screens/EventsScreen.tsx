import React, { useCallback, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl, Modal, Pressable,
    TextInput, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { eventsApi } from '../api/events';
import { PartyEvent, EventInput, GiftStatus, RsvpStatus } from '../types/index';

const GIFT_LABELS: Record<GiftStatus, string> = {
    NONE: 'No gift',
    IDEA: '💡 Idea',
    BOUGHT: '🛍 Bought',
    WRAPPED: '🎁 Wrapped',
};

const RSVP_LABELS: Record<RsvpStatus, string> = {
    PENDING: '⏳ Pending',
    GOING: '✅ Going',
    NOT_GOING: '❌ Not going',
};

const GIFT_STATUSES: GiftStatus[] = ['NONE', 'IDEA', 'BOUGHT', 'WRAPPED'];
const RSVP_STATUSES: RsvpStatus[] = ['PENDING', 'GOING', 'NOT_GOING'];

type FormState = {
    name: string;
    date: Date;
    location: string;
    giftStatus: GiftStatus;
    rsvpStatus: RsvpStatus;
    giftNotes: string;
};

const EMPTY_FORM: FormState = {
    name: '',
    date: new Date(),
    location: '',
    giftStatus: 'NONE',
    rsvpStatus: 'PENDING',
    giftNotes: '',
};

function eventToForm(e: PartyEvent): FormState {
    return {
        name: e.name,
        date: new Date(e.date),
        location: e.location ?? '',
        giftStatus: e.giftStatus,
        rsvpStatus: e.rsvpStatus,
        giftNotes: e.giftNotes ?? '',
    };
}

export default function EventsScreen() {
    const [events, setEvents] = useState<PartyEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [editingEvent, setEditingEvent] = useState<PartyEvent | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            setEvents(await eventsApi.list());
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const openNew = () => {
        setEditingEvent(null);
        setForm(EMPTY_FORM);
        setSheetVisible(true);
    };

    const openEdit = (event: PartyEvent) => {
        setEditingEvent(event);
        setForm(eventToForm(event));
        setSheetVisible(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { Alert.alert('Name required'); return; }
        setSaving(true);
        try {
            const payload: EventInput = {
                name: form.name.trim(),
                date: form.date.toISOString(),
                location: form.location.trim() || null,
                giftStatus: form.giftStatus,
                rsvpStatus: form.rsvpStatus,
                giftNotes: form.giftNotes.trim() || null,
            };
            if (editingEvent) {
                const updated = await eventsApi.update(editingEvent.id, payload);
                setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
            } else {
                const created = await eventsApi.create(payload);
                setEvents(prev => [...prev, created].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            }
            setSheetVisible(false);
        } catch (e: any) {
            Alert.alert('Error', e?.error || 'Could not save event');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (event: PartyEvent) => {
        Alert.alert(`Delete "${event.name}"?`, 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await eventsApi.remove(event.id);
                        setEvents(prev => prev.filter(e => e.id !== event.id));
                    } catch {
                        Alert.alert('Error', 'Could not delete event');
                    }
                },
            },
        ]);
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#ec4899" /></View>;
    }

    // Separate upcoming / past
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const upcoming = events.filter(e => new Date(e.date) >= now);
    const past = events.filter(e => new Date(e.date) < now);

    return (
        <>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#ec4899" />
                }
            >
                {events.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyEmoji}>🎉</Text>
                        <Text style={styles.emptyTitle}>No events yet</Text>
                        <Text style={styles.emptyBody}>Tap + to plan a party or event</Text>
                    </View>
                ) : null}

                {upcoming.length > 0 && (
                    <>
                        <Text style={styles.sectionLabel}>UPCOMING</Text>
                        {upcoming.map(e => <EventRow key={e.id} event={e} onEdit={openEdit} onDelete={handleDelete} />)}
                    </>
                )}

                {past.length > 0 && (
                    <>
                        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>PAST</Text>
                        {past.map(e => <EventRow key={e.id} event={e} onEdit={openEdit} onDelete={handleDelete} dimmed />)}
                    </>
                )}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={openNew}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            {/* Add / Edit Sheet */}
            <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={() => setSheetVisible(false)}>
                <Pressable style={styles.overlay} onPress={() => setSheetVisible(false)} />
                <View style={styles.sheet}>
                    <View style={styles.sheetHandle} />
                    <Text style={styles.sheetTitle}>{editingEvent ? 'Edit Event' : 'New Event'}</Text>

                    <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
                        {/* Name */}
                        <Text style={styles.fieldLabel}>Event name *</Text>
                        <TextInput
                            style={styles.input}
                            value={form.name}
                            onChangeText={v => setForm(f => ({ ...f, name: v }))}
                            placeholder="e.g. Ana's birthday party"
                            placeholderTextColor="#94a3b8"
                        />

                        {/* Date */}
                        <Text style={styles.fieldLabel}>Date &amp; time</Text>
                        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                            <Text style={styles.dateBtnText}>
                                📅 {form.date.toLocaleDateString()} · {form.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={form.date}
                                mode="datetime"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(_, d) => { setShowDatePicker(false); if (d) setForm(f => ({ ...f, date: d })); }}
                            />
                        )}

                        {/* Location */}
                        <Text style={styles.fieldLabel}>Location</Text>
                        <TextInput
                            style={styles.input}
                            value={form.location}
                            onChangeText={v => setForm(f => ({ ...f, location: v }))}
                            placeholder="e.g. The Italian Restaurant"
                            placeholderTextColor="#94a3b8"
                        />

                        {/* RSVP */}
                        <Text style={styles.fieldLabel}>RSVP</Text>
                        <View style={styles.chipRow}>
                            {RSVP_STATUSES.map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.optChip, form.rsvpStatus === s && styles.optChipActive]}
                                    onPress={() => setForm(f => ({ ...f, rsvpStatus: s }))}
                                >
                                    <Text style={[styles.optChipText, form.rsvpStatus === s && styles.optChipTextActive]}>
                                        {RSVP_LABELS[s]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Gift status */}
                        <Text style={styles.fieldLabel}>Gift status</Text>
                        <View style={styles.chipRow}>
                            {GIFT_STATUSES.map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.optChip, form.giftStatus === s && styles.optChipActive]}
                                    onPress={() => setForm(f => ({ ...f, giftStatus: s }))}
                                >
                                    <Text style={[styles.optChipText, form.giftStatus === s && styles.optChipTextActive]}>
                                        {GIFT_LABELS[s]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Gift notes */}
                        {form.giftStatus !== 'NONE' && (
                            <>
                                <Text style={styles.fieldLabel}>Gift notes</Text>
                                <TextInput
                                    style={[styles.input, styles.inputMulti]}
                                    value={form.giftNotes}
                                    onChangeText={v => setForm(f => ({ ...f, giftNotes: v }))}
                                    placeholder="Gift ideas, budget, etc."
                                    placeholderTextColor="#94a3b8"
                                    multiline
                                    numberOfLines={3}
                                />
                            </>
                        )}
                    </ScrollView>

                    <View style={styles.sheetActions}>
                        {editingEvent && (
                            <TouchableOpacity style={styles.deleteBtn} onPress={() => { setSheetVisible(false); handleDelete(editingEvent); }}>
                                <Text style={styles.deleteBtnText}>Delete</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : editingEvent ? 'Save changes' : 'Create event'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}

function EventRow({ event, onEdit, onDelete, dimmed = false }: {
    event: PartyEvent;
    onEdit: (e: PartyEvent) => void;
    onDelete: (e: PartyEvent) => void;
    dimmed?: boolean;
}) {
    const d = new Date(event.date);
    const isToday = d.toDateString() === new Date().toDateString();
    const giftColor = event.giftStatus === 'WRAPPED' ? '#16a34a'
        : event.giftStatus === 'BOUGHT' ? '#6366f1'
        : event.giftStatus === 'IDEA' ? '#d97706'
        : '#cbd5e1';

    return (
        <TouchableOpacity
            style={[styles.eventCard, isToday && styles.eventCardToday, dimmed && styles.eventCardDimmed]}
            onPress={() => onEdit(event)}
            activeOpacity={0.8}
        >
            {/* Left date column */}
            <View style={[styles.datePill, isToday && styles.datePillToday]}>
                <Text style={[styles.datePillDay, isToday && styles.datePillDayToday]}>
                    {d.getDate()}
                </Text>
                <Text style={[styles.datePillMon, isToday && styles.datePillMonToday]}>
                    {d.toLocaleString('default', { month: 'short' }).toUpperCase()}
                </Text>
            </View>

            {/* Info */}
            <View style={styles.eventInfo}>
                <Text style={[styles.eventName, dimmed && styles.eventNameDimmed]} numberOfLines={1}>
                    {event.name}
                </Text>
                <View style={styles.eventMeta}>
                    <Text style={styles.eventTime}>
                        {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {event.location ? (
                        <>
                            <Text style={styles.metaDot}>·</Text>
                            <Text style={styles.eventLoc} numberOfLines={1}>{event.location}</Text>
                        </>
                    ) : null}
                </View>
                <View style={styles.eventBadges}>
                    <View style={[styles.badge, { borderColor: giftColor + '60', backgroundColor: giftColor + '15' }]}>
                        <Text style={[styles.badgeText, { color: giftColor }]}>{GIFT_LABELS[event.giftStatus]}</Text>
                    </View>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{RSVP_LABELS[event.rsvpStatus]}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    sectionLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.2, marginBottom: 10 },
    empty: { alignItems: 'center', paddingVertical: 80 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
    emptyBody: { fontSize: 14, color: '#94a3b8' },
    // Event card
    eventCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14,
        padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9', gap: 12,
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    eventCardToday: { backgroundColor: '#fdf4ff', borderColor: '#e9d5ff' },
    eventCardDimmed: { opacity: 0.55 },
    datePill: {
        width: 44, height: 44, borderRadius: 10, backgroundColor: '#f8fafc',
        borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center',
    },
    datePillToday: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
    datePillDay: { fontSize: 15, fontWeight: '800', color: '#1e293b', lineHeight: 17 },
    datePillDayToday: { color: '#fff' },
    datePillMon: { fontSize: 9, fontWeight: '700', color: '#94a3b8', marginTop: 1 },
    datePillMonToday: { color: 'rgba(255,255,255,0.8)' },
    eventInfo: { flex: 1, minWidth: 0 },
    eventName: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
    eventNameDimmed: { color: '#94a3b8' },
    eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    eventTime: { fontSize: 12, color: '#64748b' },
    metaDot: { fontSize: 12, color: '#cbd5e1' },
    eventLoc: { fontSize: 12, color: '#64748b', flex: 1 },
    eventBadges: { flexDirection: 'row', gap: 6 },
    badge: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
        borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
    },
    badgeText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
    // FAB
    fab: {
        position: 'absolute', bottom: 32, right: 24,
        width: 58, height: 58, borderRadius: 29, backgroundColor: '#7c3aed',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#7c3aed', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },
    fabText: { color: '#fff', fontSize: 28, lineHeight: 30, marginTop: -2 },
    // Modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: 40, maxHeight: '90%',
    },
    sheetHandle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16, textAlign: 'center' },
    formScroll: { maxHeight: 480 },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 6, marginTop: 14, letterSpacing: 0.3 },
    input: {
        backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0',
        paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#1e293b',
    },
    inputMulti: { minHeight: 70, textAlignVertical: 'top', paddingTop: 10 },
    dateBtn: {
        backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0',
        paddingHorizontal: 14, paddingVertical: 12,
    },
    dateBtnText: { fontSize: 15, color: '#1e293b' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optChip: {
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
        borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
    },
    optChipActive: { borderColor: '#7c3aed', backgroundColor: '#f5f3ff' },
    optChipText: { fontSize: 13, color: '#64748b' },
    optChipTextActive: { color: '#7c3aed', fontWeight: '700' },
    sheetActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
    saveBtn: {
        flex: 1, backgroundColor: '#7c3aed', borderRadius: 12, padding: 14, alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    deleteBtn: {
        paddingHorizontal: 18, borderRadius: 12, padding: 14, alignItems: 'center',
        backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3',
    },
    deleteBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
});
