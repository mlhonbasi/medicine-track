import { Activity, CheckCircle, Pill, Trash2 } from 'lucide-react-native';
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
  startDateText?: string | null;
  endDateText?: string | null;
  isCompleted?: boolean;
  onDelete: (id: number) => void;
}

export const MedicineCard = ({ id, name, daysLeft, totalDays, totalTablets, dailyDose, startDateText, endDateText, isCompleted, onDelete }: MedicineProps) => {
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

  const confirmDelete = () => {
    Alert.alert(
      "İlacı Sil",
      `${name} listenden silinecek. Emin misin?`,
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Sil", style: "destructive", onPress: () => onDelete(id) }
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
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: colors.bg }]}>
            {isCompleted ? <CheckCircle color={colors.text} size={24} /> : <Pill color={colors.text} size={24} />}
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, isCompleted && { color: '#6B7280', textDecorationLine: 'line-through' }]}>{name}</Text>
            
            <View style={styles.infoRow}>    
               <View style={styles.doseBadge}>
                <Activity size={12} color="#6B7280" style={{ marginRight: 4 }} />
                <Text style={styles.doseText}>Günde {dailyDose} adet</Text>
              </View>
              <Text style={[styles.status, { color: colors.text }]}>
                • {isCompleted ? "Tamamlandı" : `${daysLeft} gün kaldı`}
              </Text>
            </View>
            <View style={styles.metaRow}>
              {startDateText && <Text style={styles.meta}>Başlangıç: {startDateText}</Text>}
              {endDateText && <Text style={styles.meta}>Bitiş: {endDateText}</Text>}
              {isCompleted && <Text style={styles.meta}>Adet: {totalTablets ?? '-'}</Text>}
            </View>
          </View>

          <TouchableOpacity onPress={confirmDelete} style={styles.deleteButton}>
            <Trash2 color="#EF4444" size={20} />
          </TouchableOpacity>
        </View>
        
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
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconBox: { padding: 14, borderRadius: 18, marginRight: 16 },
  name: { fontSize: 19, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  status: { fontSize: 13, fontWeight: '700', marginLeft: 6 },
  doseBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  doseText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  deleteButton: { padding: 10, borderRadius: 12, backgroundColor: '#FFF5F5' },
  progressContainer: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 10, overflow: 'hidden', marginTop: 5 },
  progressBar: { height: '100%', borderRadius: 10 },
  metaRow: { marginTop: 8 },
  meta: { fontSize: 12, color: '#9CA3AF', fontWeight: '700' }
});