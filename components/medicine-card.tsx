import { Activity, CheckCircle, Clock, Package, Trash2 } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

interface MedicineProps {
  id: number;
  name: string;
  daysLeft: number;
  totalDays: number;
  totalTablets?: number;
  dailyDose: number;
  activeBoxNumber?: number | null;
  daysLeftInActiveBox?: number | null;
  boxesInStock?: number | null;
  startDateText?: string | null;
  endDateText?: string | null;
  isCompleted?: boolean;
  onDelete: (id: number) => void;
}

export const MedicineCard = ({ id, name, daysLeft, totalDays, totalTablets, dailyDose, activeBoxNumber, daysLeftInActiveBox, boxesInStock, startDateText, endDateText, isCompleted, onDelete }: MedicineProps) => {
  const safeTotalDays = totalDays > 0 ? totalDays : 1;
  const safeDaysLeft = Math.max(0, Math.min(daysLeft, safeTotalDays));
  const progress = Math.min(1, Math.max(0, (safeTotalDays - safeDaysLeft) / safeTotalDays));

  const progressWidth = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progressWidth.value = withTiming(progress, { duration: 1000 });
  }, [progress]);

  const getStatusColor = (ratio: number) => {
    if (isCompleted) return { bg: '#F3F4F6', text: '#9CA3AF', bar: '#D1D5DB' };
    if (ratio <= 0.2) return { bg: '#FEF2F2', text: '#EF4444', bar: '#EF4444' };
    if (ratio <= 0.5) return { bg: '#FFFBEB', text: '#F59E0B', bar: '#F59E0B' };
    return { bg: '#F0FDF4', text: '#22C55E', bar: '#22C55E' };
  };

  const colors = getStatusColor(safeDaysLeft / safeTotalDays);
  const stockEmpty = boxesInStock === 0;

  const statusLabel = isCompleted
    ? 'Tamamlandı'
    : daysLeftInActiveBox != null
      ? `${daysLeftInActiveBox} gün sonra kutu biter`
      : `${daysLeft} gün kaldı`;

  const confirmDelete = () => {
    Alert.alert(
      'İlacı Sil',
      `${name} listenden silinecek. Emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => onDelete(id) }
      ]
    );
  };

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
    backgroundColor: colors.bar,
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: isCompleted ? 0.75 : 1,
  }));

  return (
    <Animated.View style={[styles.card, animatedCardStyle]}>
      <Pressable
        onPressIn={() => (scale.value = withSpring(0.97))}
        onPressOut={() => (scale.value = withSpring(1))}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        <View style={styles.header}>
          <Text style={[styles.name, isCompleted && styles.nameCompleted]} numberOfLines={1}>
            {name}
          </Text>
          <TouchableOpacity onPress={confirmDelete} style={styles.deleteButton} hitSlop={10}>
            <Trash2 color="#EF4444" size={18} />
          </TouchableOpacity>
        </View>

        <View style={[styles.statusPill, { backgroundColor: colors.bg }]}>
          {isCompleted ? <CheckCircle color={colors.text} size={15} /> : <Clock color={colors.text} size={15} />}
          <Text style={[styles.statusText, { color: colors.text }]} numberOfLines={1}>
            {statusLabel}
          </Text>
        </View>

        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Activity size={13} color="#6B7280" />
            <Text style={styles.chipText}>Günde {dailyDose} adet</Text>
          </View>
          {!isCompleted && boxesInStock != null && (
            <View style={[styles.chip, stockEmpty && styles.chipWarning]}>
              <Package size={13} color={stockEmpty ? '#EF4444' : '#6B7280'} />
              <Text style={[styles.chipText, stockEmpty && styles.chipTextWarning]}>
                {activeBoxNumber != null ? `${activeBoxNumber}. kutu · ` : ''}
                {stockEmpty ? 'Stok bitti!' : `Stokta ${boxesInStock} kutu`}
              </Text>
            </View>
          )}
        </View>

        {(startDateText || endDateText) && (
          <Text style={styles.dates} numberOfLines={1}>
            {startDateText}{endDateText ? ` — ${endDateText}` : ''}
            {isCompleted && totalTablets != null ? ` · ${totalTablets} adet` : ''}
          </Text>
        )}

        {!isCompleted && (
          <View style={styles.progressContainer}>
            <Animated.View style={[styles.progressBar, animatedBarStyle]} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { flex: 1, fontSize: 18, fontWeight: '800', color: '#111827', letterSpacing: -0.3, marginRight: 8 },
  nameCompleted: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  deleteButton: { padding: 6 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 10,
  },
  statusText: { fontSize: 13, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  chipWarning: { backgroundColor: '#FEF2F2' },
  chipText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  chipTextWarning: { color: '#EF4444', fontWeight: '700' },
  dates: { fontSize: 11.5, color: '#9CA3AF', fontWeight: '600', marginTop: 10 },
  progressContainer: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 10, overflow: 'hidden', marginTop: 10 },
  progressBar: { height: '100%', borderRadius: 10 },
});
