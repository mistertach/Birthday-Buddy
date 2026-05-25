/**
 * A clean bottom-sheet style picker for selecting from a list of options.
 * Works entirely with built-in RN components — no native modules needed.
 */
import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, Pressable } from 'react-native';
import { colors, radius } from '../theme';

type Option = { label: string; value: string };

type Props = {
    visible: boolean;
    title: string;
    options: Option[];
    selected: string;
    onSelect: (value: string) => void;
    onClose: () => void;
};

export default function Picker({ visible, title, options, selected, onSelect, onClose }: Props) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose} />
            <View style={styles.sheet}>
                <View style={styles.handle} />
                <Text style={styles.title}>{title}</Text>
                <FlatList
                    data={options}
                    keyExtractor={o => o.value}
                    renderItem={({ item }) => {
                        const isSelected = item.value === selected;
                        return (
                            <TouchableOpacity
                                style={[styles.option, isSelected && styles.optionSelected]}
                                onPress={() => { onSelect(item.value); onClose(); }}
                            >
                                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                    {item.label}
                                </Text>
                                {isSelected && <Text style={styles.check}>✓</Text>}
                            </TouchableOpacity>
                        );
                    }}
                    ItemSeparatorComponent={() => <View style={styles.sep} />}
                />
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingBottom: 40, maxHeight: '70%',
    },
    handle: {
        width: 40, height: 4, backgroundColor: colors.border,
        borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16,
    },
    title: {
        fontSize: 16, fontWeight: '700', color: colors.text,
        textAlign: 'center', marginBottom: 12, paddingHorizontal: 20,
    },
    option: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14,
    },
    optionSelected: { backgroundColor: colors.primarySurface },
    optionText: { fontSize: 16, color: colors.text },
    optionTextSelected: { color: colors.primary, fontWeight: '600' },
    check: { fontSize: 16, color: colors.primary, fontWeight: '700' },
    sep: { height: 1, backgroundColor: colors.divider, marginHorizontal: 20 },
    cancelBtn: {
        marginHorizontal: 16, marginTop: 8, padding: 14,
        backgroundColor: colors.bg, borderRadius: radius.md, alignItems: 'center',
    },
    cancelText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
});
