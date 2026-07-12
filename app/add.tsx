import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useDatabase } from '../hooks/use-database';

export default function AddMedicine() {
  const { profileId } = useLocalSearchParams<{ profileId?: string }>();
  const pid = Array.isArray(profileId) ? profileId[0] : profileId;
  const profileIdNum = Number(pid);

  if (!Number.isFinite(profileIdNum)) {
    Alert.alert("Hata", "Aktif profil bulunamadı.");
    return null;
  }

  const [query, setQuery] = useState('');
  const [boxCount, setBoxCount] = useState('');
  const [unitsPerBox, setUnitsPerBox] = useState('');
  const [daily, setDaily] = useState('');

  const { addMedicine } = useDatabase();

  const boxCountNum = parseInt(boxCount, 10);
  const unitsPerBoxNum = parseInt(unitsPerBox, 10);
  const totalPreview =
    Number.isFinite(boxCountNum) && Number.isFinite(unitsPerBoxNum) && boxCountNum > 0 && unitsPerBoxNum > 0
      ? boxCountNum * unitsPerBoxNum
      : null;

  const goBackSafe = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const handleSave = async () => {
    if (!query || !boxCount || !unitsPerBox || !daily) {
      Alert.alert("Hata", "Lütfen tüm alanları eksiksiz doldurun.");
      return;
    }

    try {
      await addMedicine(
        profileIdNum,
        query,
        parseInt(boxCount, 10),
        parseInt(unitsPerBox, 10),
        parseInt(daily, 10)
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert("Başarılı", "İlaç takip listesine eklendi.", [
        { text: "Tamam", onPress: goBackSafe }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Hata", "Kaydedilirken bir sorun oluştu.");
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>Yeni İlaç Ekle</Text>
        <Text style={styles.headerSub}>İlaç bilgilerini girerek takibi başlatın.</Text>
      </View>

      <Text style={styles.label}>İlaç Adı</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Örn: Paracetamol" 
        value={query} 
        onChangeText={setQuery} 
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Kutu Adedi</Text>
          <TextInput
            style={styles.input}
            placeholder="2"
            keyboardType="numeric"
            value={boxCount}
            onChangeText={setBoxCount}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Kutu Başına Adet</Text>
          <TextInput
            style={styles.input}
            placeholder="14"
            keyboardType="numeric"
            value={unitsPerBox}
            onChangeText={setUnitsPerBox}
          />
        </View>
      </View>

      <Text style={styles.label}>Günlük Doz</Text>
      <TextInput
        style={styles.input}
        placeholder="1"
        keyboardType="numeric"
        value={daily}
        onChangeText={setDaily}
      />

      {totalPreview !== null && (
        <Text style={styles.previewText}>Toplam {totalPreview} adet takip edilecek.</Text>
      )}

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Hatırlatıcıyı Başlat</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#F8F9FA' },
  headerInfo: { marginBottom: 30, marginTop: 10 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1F2937' },
  headerSub: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: '#FFFFFF', padding: 18, borderRadius: 16, fontSize: 16, 
    borderWidth: 1.5, borderColor: '#F3F4F6', marginBottom: 20, color: '#1F2937',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2,
  },
  row: { flexDirection: 'row', gap: 16 },
  previewText: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginLeft: 4, marginTop: -8, marginBottom: 4 },
  button: {
    backgroundColor: '#4F46E5', paddingVertical: 20, borderRadius: 20, alignItems: 'center',
    marginTop: 20, shadowColor: '#4F46E5', shadowOpacity: 0.4, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});