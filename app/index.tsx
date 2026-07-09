import { MedicineCard } from '@/components/medicine-card';
import { router, useFocusEffect } from 'expo-router';
import { ChevronDown, Pencil, Pill, Plus, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useDatabase } from '../hooks/use-database';

export default function Home() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const [myMeds, setMyMeds] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState('#4F46E5');

  const PRESET_COLORS = ['#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
  const { ready, getProfiles, updateProfile, getMedicines, deleteMedicines, addProfile, deleteProfile } = useDatabase();

  const loadData = useCallback(async () => {
    if (!ready) return;
    const allProfiles = await getProfiles();
    setProfiles(allProfiles);

    if (activeProfile) {
    const stillExists = allProfiles.find((p: any) => p.id === activeProfile.id);
    if (stillExists) {
      if (activeProfile.id != null) {
        const meds = await getMedicines(activeProfile.id);
        setMyMeds(meds || []);
      }
    } else {
      setActiveProfile(null);
      setMyMeds([]);
    }
  }
}, [ready, activeProfile, getProfiles, getMedicines]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    if (ready && activeProfile) {
      getMedicines(activeProfile.id).then(setMyMeds);
    }
  }, [activeProfile, ready]);

  const activeMeds = (myMeds || []).filter(m => {
  const left = m.daysLeft ?? 0;
  return left > 0;
});

const completedMeds = (myMeds || []).filter(m => {
  const left = m.daysLeft ?? 0;
  return left <= 0;
});
  const displayMeds = activeTab === 'active' ? activeMeds : completedMeds;

  const handleSaveProfile = async () => {
    if (!newProfileName.trim()) return;
    if (editingProfileId) {
      await updateProfile(editingProfileId, newProfileName, selectedColor);
      setEditingProfileId(null);
    } else {
      await addProfile(newProfileName, selectedColor);
    }
    setNewProfileName('');
    setSelectedColor('#4F46E5');
    setProfileModalVisible(false);
    loadData();
  };

  if (!activeProfile) {
    return (
      <SafeAreaView style={styles.fullScreenSelector}>
        <Text style={styles.welcomeTitle}>Kim Kullanıyor?</Text>
        <View style={styles.selectorGrid}>
          {profiles.map((p: any) => (
            <View key={p.id} style={styles.selectorWrapper}>
              <TouchableOpacity 
                style={[styles.selectorAvatar, { backgroundColor: p.color }]} 
                onPress={() => setActiveProfile(p)}
              >
                <Text style={styles.selectorInitial}>{p.name[0]}</Text>
              </TouchableOpacity>
              <Text style={styles.selectorName} numberOfLines={1}>{p.name}</Text>
              <View style={styles.selectorActions}>
                <TouchableOpacity onPress={() => { 
                  setEditingProfileId(p.id); 
                  setNewProfileName(p.name); 
                  setSelectedColor(p.color); 
                  setProfileModalVisible(true); 
                }}>
                  <Pencil size={14} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity style={{marginLeft: 15}} onPress={() => {
                  Alert.alert("Sil", "Emin misin?", [
                    { text: "Vazgeç" },
                    { text: "Sil", style: "destructive", onPress: async () => { 
                      await deleteProfile(p.id); 
                      loadData(); 
                    }}
                  ]);
                }}>
                  <Trash2 size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.selectorWrapper} onPress={() => { setEditingProfileId(null); setProfileModalVisible(true); }}>
            <View style={[styles.selectorAvatar, styles.addAvatar]}>
              <Plus color="#9CA3AF" size={30} />
            </View>
            <Text style={[styles.selectorName, { color: '#9CA3AF' }]}>Ekle</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={isProfileModalVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingProfileId ? 'Düzenle' : 'Yeni Profil'}</Text>
                <TouchableOpacity onPress={() => setProfileModalVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
              </View>
              <TextInput style={styles.input} placeholder="İsim..." value={newProfileName} onChangeText={setNewProfileName} />
              <View style={styles.colorPicker}>
                {PRESET_COLORS.map((c: string) => (
                  <TouchableOpacity key={c} style={[styles.colorCircle, { backgroundColor: c }, selectedColor === c && styles.selectedCircle]} onPress={() => setSelectedColor(c)} />
                ))}
              </View>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: selectedColor }]} onPress={handleSaveProfile}>
                <Text style={styles.saveButtonText}>{editingProfileId ? 'Güncelle' : 'Oluştur'}</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleText}>İlaçlarım</Text>
        <TouchableOpacity style={styles.profileBadge} onPress={() => setActiveProfile(null)}>
          <View style={[styles.dot, { backgroundColor: activeProfile.color }]} />
          <Text style={styles.profileText}>{activeProfile.name}</Text>
          <ChevronDown size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>

<View style={styles.tabContainer}>
  <TouchableOpacity 
    activeOpacity={0.7}
    style={[
      styles.tabButton, 
      activeTab === 'active' && { backgroundColor: activeProfile.color }
    ]} 
    onPress={() => setActiveTab('active')}
  >
    <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Aktif</Text>
  </TouchableOpacity>

  <TouchableOpacity 
    activeOpacity={0.7}
    style={[
      styles.tabButton, 
      activeTab === 'completed' && { backgroundColor: activeProfile.color }
    ]} 
    onPress={() => setActiveTab('completed')}
  >
    <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>Bitenler</Text>
  </TouchableOpacity>
</View>

      <FlatList
        data={displayMeds}
        contentContainerStyle={{ paddingBottom: 150, paddingTop: 10 }}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Pill size={64} color="#E5E7EB" />
            <Text style={styles.emptyText}>Burada bir şey yok.</Text>
            <Text style={styles.emptySubText}>{activeTab === 'active' ? 'Aktif bir ilacınız yok, ekleyiniz.' : 'Henüz biten bir ilacın yok.'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <MedicineCard 
            id={item.id}
            name={item.name}
            totalDays={item.totalDays}
            dailyDose={item.daily_dose}
            daysLeft={item.daysLeft}
            startDateText={item.startDateText}
            endDateText={item.endDateText}
            isCompleted={activeTab === 'completed'}
            onDelete={async (id: number) => {
              await deleteMedicines(id);
              loadData();
            }}
          />
        )}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: activeProfile.color }]}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/add', params: { profileId: String(activeProfile.id) } })}
      >
        <Plus color="white" size={32} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 20 },
  header: { paddingTop: 60, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleText: { fontSize: 28, fontWeight: '900', color: '#111827' },
  profileBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, elevation: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  profileText: { fontSize: 15, fontWeight: '700', color: '#374151', marginRight: 4 },
  
tabContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#E5E7EB', 
    borderRadius: 14, 
    padding: 4, 
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  tabButton: { 
    width: '50%',
    paddingVertical: 10, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderRadius: 11,
  },
tabText: { 
  fontWeight: '700', 
  color: '#6B7280',
  fontSize: 14,
},
activeTabText: { 
  color: '#FFF',
},

  fab: { position: 'absolute', bottom: 40, right: 25, width: 65, height: 65, borderRadius: 33, justifyContent: 'center', alignItems: 'center', elevation: 20, zIndex: 9999, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  fullScreenSelector: { flex: 1, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  welcomeTitle: { fontSize: 30, fontWeight: '900', color: '#111827', marginBottom: 50 },
  selectorGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 30 },
  selectorWrapper: { alignItems: 'center', width: 90 },
  selectorAvatar: { width: 85, height: 85, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  addAvatar: { backgroundColor: '#F3F4F6', borderStyle: 'dashed', borderWidth: 2, borderColor: '#D1D5DB' },
  selectorInitial: { fontSize: 36, fontWeight: 'bold', color: '#FFF' },
  selectorName: { fontSize: 16, fontWeight: '800', color: '#374151', marginTop: 10 },
  selectorActions: { flexDirection: 'row', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 32, padding: 28 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  input: { backgroundColor: '#F3F4F6', padding: 18, borderRadius: 16, fontSize: 16, marginBottom: 20 },
  colorPicker: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  colorCircle: { width: 38, height: 38, borderRadius: 19 },
  selectedCircle: { borderWidth: 4, borderColor: '#E5E7EB', transform: [{ scale: 1.1 }] },
  saveButton: { padding: 20, borderRadius: 18, alignItems: 'center' },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#374151', marginTop: 20 },
  emptySubText: { fontSize: 14, color: '#6B7280', marginTop: 5 }
});