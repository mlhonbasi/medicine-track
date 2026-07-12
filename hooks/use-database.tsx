import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as SQLite from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useDatabase = () => {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [ready, setReady] = useState(false);

  const ensureDb = () => {
    if (!db) throw new Error('Veritabanı henüz hazır değil.');
    return db;
  };

  const ensureNotificationReady = async () => {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== 'granted') return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    return true;
  };

  useEffect(() => {
    const initDB = async () => {
      const database = await SQLite.openDatabaseAsync('meds.db');
  
      await database.execAsync('PRAGMA foreign_keys = ON;');

      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          color TEXT DEFAULT '#4F46E5'
        );
      `);

      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS medicines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          profile_id INTEGER,
          name TEXT NOT NULL,
          notification_id TEXT,
          total_tablets INTEGER,
          daily_dose INTEGER,
          start_date TEXT,
          end_date TEXT,
          box_count INTEGER,
          units_per_box INTEGER,
          FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
        );
      `);

      // Eski kurulumlarda tablo zaten vardı; yeni kutu kolonlarını sonradan ekliyoruz.
      try {
        await database.execAsync('ALTER TABLE medicines ADD COLUMN box_count INTEGER;');
      } catch {}
      try {
        await database.execAsync('ALTER TABLE medicines ADD COLUMN units_per_box INTEGER;');
      } catch {}

      setDb(database);
      setReady(true);
    };

    initDB();
  }, []);

  const addProfile = async (name: string, color: string) => {
    const db = ensureDb();
    await db.runAsync('INSERT INTO profiles (name, color) VALUES (?, ?)', [name, color]);
  };

  const updateProfile = async (id: number, name: string, color: string) => {
    const db = ensureDb();
    await db.runAsync('UPDATE profiles SET name = ?, color = ? WHERE id = ?', [name, color, id]);
  };

  const deleteProfile = async (id: number) => {
    const db = ensureDb();

    const rows: any[] = await db.getAllAsync(
      'SELECT notification_id FROM medicines WHERE profile_id = ? AND notification_id IS NOT NULL',
      [id]
    );

    for (const r of rows) {
      if (!r?.notification_id) continue;
      try {
        await Notifications.cancelScheduledNotificationAsync(r.notification_id);
      } catch {

      }
    }

    await db.runAsync('DELETE FROM profiles WHERE id = ?', [id]);
  };

  const getProfiles = async () => {
    const db = ensureDb();
    return await db.getAllAsync('SELECT * FROM profiles');
  };

  const addMedicine = async (
    profileId: number,
    name: string,
    boxCount: number,
    unitsPerBox: number,
    daily: number
  ) => {
    const db = ensureDb();

    if (!Number.isFinite(profileId)) throw new Error('Profil bulunamadı.');
    if (!name?.trim()) throw new Error('İlaç adı boş olamaz.');
    if (!Number.isFinite(boxCount) || boxCount <= 0) throw new Error('Kutu adedi 0 olamaz.');
    if (!Number.isFinite(unitsPerBox) || unitsPerBox <= 0) throw new Error('Kutu başına adet 0 olamaz.');
    if (!Number.isFinite(daily) || daily <= 0) throw new Error('Günlük doz 0 olamaz.');

    const total = boxCount * unitsPerBox;

    const profileRow: any = await db.getFirstAsync(
      'SELECT name FROM profiles WHERE id = ?', 
      [profileId]
    );
    const profileName = profileRow?.name || "Kullanıcı";


    const daysDuration = Math.ceil(total / daily);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (daysDuration - 1));

    const twoDaysBefore = new Date();
    twoDaysBefore.setDate(endDate.getDate() - 2);

    const notifyAt = new Date(endDate);
    if (notifyAt.getTime() <= Date.now()) {
      notifyAt.setDate(notifyAt.getDate() + 1);
      notifyAt.setHours(9, 0, 0, 0);
    }


    
    const result = await db.runAsync(
      'INSERT INTO medicines (profile_id, name, total_tablets, daily_dose, start_date, end_date, box_count, units_per_box) VALUES (?,?,?,?,?,?,?,?)',
      [profileId, name, total, daily, startDate.toISOString(), endDate.toISOString(), boxCount, unitsPerBox]
    );

    const ok = await ensureNotificationReady();
    let notifIds: string[] = [];

    if (ok) {
    // BİLDİRİM 1: 2 GÜN ÖNCESİ (Sadece ilaç süresi 2 günden fazlaysa)
    if (daysDuration > 2 && twoDaysBefore.getTime() > Date.now()) {
      const boxesLeftAt2Days = Math.max(1, Math.ceil((daily * 2) / unitsPerBox));
      const boxWord = boxesLeftAt2Days === 1 ? 'son kutun' : `son ${boxesLeftAt2Days} kutun`;
      const id1 = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${profileName}: İlacın Azalıyor! ⚠️`,
          body: `${name} ilacı için yaklaşık 2 günlük dozun kaldı (${boxWord}). Yenisini almayı unutma.`,
          ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
        },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: twoDaysBefore },
      });
      notifIds.push(id1);
      }

    // BİLDİRİM 2: SON GÜN
      const id2 = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${profileName}: İlaç Bitti! ⚠️`,
          body: `${profileName} için ${name} ilacı bugün bitti (0 kutu kaldı). Yenisini almalısın.`,
          ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
        },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: endDate },
      });
      notifIds.push(id2);
    }

    await db.runAsync('UPDATE medicines SET notification_id = ? WHERE id = ?', [
      notifIds.join(','),
      result.lastInsertRowId,
    ]);
  };

  const getMedicines = async (profileId: number) => {
    const db = ensureDb();

    const rows: any[] = await db.getAllAsync(
      'SELECT * FROM medicines WHERE profile_id = ?',
      [profileId]
    );

    const formatTR = (iso: string) => {
      const d = new Date(iso);
      return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return rows.map((m) => {
      const totalTablets = Number(m.total_tablets);
      const dailyDose = Number(m.daily_dose);

      const totalDays = Math.ceil(totalTablets / dailyDose);

  // 2. KALAN GÜN HESABI (Kritik nokta: Tarih farkını milisaniye bazlı değil, gün bazlı almalıyız)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Saati sıfırla ki gün tam çıksın
      
      const end = new Date(m.end_date);
      end.setHours(0, 0, 0, 0);

      // Bitiş tarihi ile bugün arasındaki farkı gün olarak bul
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Eğer bugün bittiyse (veya geçtiyse) 0 dönsün, yoksa kalan gün
      const daysLeft = Math.max(0, diffDays + 1);

      // 3. KUTU KIRILIMI (tarih bazlı tahmin — gün hesabıyla aynı toplam adet üzerinden,
      // kutu kutu ayrı yuvarlama yapmıyoruz ki gün kaybı (fire) oluşmasın).
      // "Kullanımdaki kutu" biterse stoktaki bir kutu düşer — bunu simüle ediyoruz.
      const unitsPerBox = Number(m.units_per_box) || null;
      const boxCountTotal = Number(m.box_count) || null;

      let boxesLeft: number | null = null;
      let activeBoxNumber: number | null = null;
      let daysLeftInActiveBox: number | null = null;
      let boxesInStock: number | null = null;

      if (unitsPerBox && boxCountTotal) {
        const daysPerBox = unitsPerBox / dailyDose;
        const daysPassed = Math.max(0, Math.min(totalDays, totalDays - daysLeft));
        // Kayan nokta hassasiyeti yüzünden tam kutu sınırında yanlışlıkla bir sonrakine
        // geçmemek için ufak bir tolerans (epsilon) ekliyoruz.
        const boxesFullyUsed = Math.min(boxCountTotal, Math.floor(daysPassed / daysPerBox + 1e-9));

        if (daysLeft > 0 && boxesFullyUsed < boxCountTotal) {
          activeBoxNumber = boxesFullyUsed + 1;
          const daysIntoActiveBox = daysPassed - boxesFullyUsed * daysPerBox;
          daysLeftInActiveBox = Math.max(1, Math.ceil(daysPerBox - daysIntoActiveBox));
          boxesInStock = boxCountTotal - activeBoxNumber;
          boxesLeft = boxesInStock + 1;
        } else {
          boxesInStock = 0;
          boxesLeft = 0;
        }
      }

      return {
        ...m,
        totalDays,
        daysLeft,
        boxesLeft,
        activeBoxNumber,
        daysLeftInActiveBox,
        boxesInStock,
        startDateText: m.start_date ? formatTR(m.start_date) : null,
        endDateText: m.end_date ? formatTR(m.end_date) : null,
      };
    });
  };

  const deleteMedicines = async (id: number) => {
    const db = ensureDb();
    const row: any = await db.getFirstAsync('SELECT notification_id FROM medicines WHERE id = ?', [id]);

    if (row?.notification_id) {
      const ids = row.notification_id.split(',');
      for (const notifId of ids) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notifId);
        } catch (e) {}
      }
    }

    await db.runAsync('DELETE FROM medicines WHERE id = ?', [id]);
};

  return {
    ready,
    addProfile,
    deleteProfile,
    updateProfile,
    getProfiles,
    addMedicine,
    getMedicines,
    deleteMedicines,
  };
};
