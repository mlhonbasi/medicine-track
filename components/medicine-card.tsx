import { Activity, Pill, Trash2 } from 'lucide-react-native'; // Activity ikonu eklendi
import React, { useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';

interface MedicineProps {
  id: number;
  name: string;
  daysLeft: number;
  totalDays: number;
  dailyDose: number;
  startDateText?: string | null;
  onDelete: (id: number) => void;
}

export const MedicineCard = ({ id, name, daysLeft, totalDays, dailyDose, startDateText, onDelete }: MedicineProps) => {
  // progress: Çubuğun ne kadar dolacağını belirler (Tüketilen miktar)
  const safeTotalDays = totalDays > 0 ? totalDays : 1;
  const safeDaysLeft = Math.max(0, Math.min(daysLeft, safeTotalDays));

  const progress = Math.min(1, Math.max(0, (safeTotalDays - safeDaysLeft) / safeTotalDays));
  const remainingRatio = safeDaysLeft / safeTotalDays;

  
  const progressWidth = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progressWidth.value = withTiming(progress, { duration: 1000 });
  }, [progress]);

  // --- ORAN BAZLI DİNAMİK RENK MANTIĞI ---
  const getStatusColor = (ratio: number) => {
    // Stok %20'nin altına düştüyse KRİTİK
    if (ratio <= 0.2) return { bg: '#FEF2F2', text: '#EF4444', bar: '#EF4444' }; 
    // Stok %20 - %50 arasındaysa DİKKAT
    if (ratio <= 0.5) return { bg: '#FFFBEB', text: '#F59E0B', bar: '#F59E0B' }; 
    // Stok %50'den fazlaysa RAHAT
    return { bg: '#F0FDF4', text: '#22C55E', bar: '#22C55E' }; 
  };

  const colors = getStatusColor(remainingRatio);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
    backgroundColor: colors.bar,
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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

  return (
    <Animated.View style={[styles.card, animatedCardStyle]}>
      <Pressable 
        onPressIn={() => (scale.value = withSpring(0.97))}
        onPressOut={() => (scale.value = withSpring(1))}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: colors.bg }]}>
            <Pill color={colors.text} size={24} />
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{name}</Text>
            
            <View style={styles.infoRow}>
               {/* Günlük Doz Bilgisi */}       
               <View style={styles.doseBadge}>
                <Activity size={12} color="#6B7280" style={{ marginRight: 4 }} />
                <Text style={styles.doseText}>Günde {dailyDose} adet</Text>
              </View>
              <Text style={[styles.status, { color: colors.text }]}>
                • {daysLeft <= 0 ? "Bitti" : `${daysLeft} gün kaldı`}
              </Text>
            </View>
            {startDateText ? (
             <Text style={styles.meta}>• Eklendi: {startDateText}</Text>
) : null}
          </View>

          <TouchableOpacity onPress={confirmDelete} style={styles.deleteButton}>
            <Trash2 color="#EF4444" size={20} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, animatedBarStyle]} />
        </View>
      </Pressable>
    </Animated.View>
  );
};

const TouchableOpacity = ({ children, onPress, style }: any) => (
  <Pressable onPress={onPress} style={({ pressed }) => [style, { opacity: pressed ? 0.6 : 1 }]}>
    {children}
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconBox: { padding: 14, borderRadius: 18, marginRight: 16 },
  name: { fontSize: 19, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  status: { fontSize: 13, fontWeight: '700', marginLeft: 6 },
  doseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  doseText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  deleteButton: { padding: 10, borderRadius: 12, backgroundColor: '#FFF5F5' },
  progressContainer: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 10, overflow: 'hidden', marginTop: 5 },
  progressBar: { height: '100%', borderRadius: 10 },
  meta: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginLeft: 8, marginTop: 8 }

});