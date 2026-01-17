import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as SQLite from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Bildirimlerin nasıl görüneceğini ayarlıyoruz
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

    // Android için channel (özellikle önemli)
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

      // FK her bağlantıda açılmalı
      await database.execAsync('PRAGMA foreign_keys = ON;');

      // Önce parent tablo (profiles), sonra child (medicines) daha güvenli
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
          FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
        );
      `);

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

    // 1) Profilin tüm ilaçlarının bildirimlerini iptal et
    const rows: any[] = await db.getAllAsync(
      'SELECT notification_id FROM medicines WHERE profile_id = ? AND notification_id IS NOT NULL',
      [id]
    );

    for (const r of rows) {
      if (!r?.notification_id) continue;
      try {
        await Notifications.cancelScheduledNotificationAsync(r.notification_id);
      } catch {
        // zaten tetiklenmiş/iptal edilmiş olabilir
      }
    }

    // 2) Profili sil (cascade ile medicines de silinir)
    await db.runAsync('DELETE FROM profiles WHERE id = ?', [id]);
  };

  const getProfiles = async () => {
    const db = ensureDb();
    return await db.getAllAsync('SELECT * FROM profiles');
  };

  const addMedicine = async (profileId: number, name: string, total: number, daily: number) => {
    const db = ensureDb();

    if (!Number.isFinite(profileId)) throw new Error('Profil bulunamadı.');
    if (!name?.trim()) throw new Error('İlaç adı boş olamaz.');
    if (!Number.isFinite(total) || total <= 0) throw new Error('Toplam adet 0 olamaz.');
    if (!Number.isFinite(daily) || daily <= 0) throw new Error('Günlük doz 0 olamaz.');

    const daysDuration = Math.ceil(total / daily);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + daysDuration);

    const notifyAt = new Date(endDate);
    if (notifyAt.getTime() <= Date.now()) {
      notifyAt.setDate(notifyAt.getDate() + 1);
      notifyAt.setHours(9, 0, 0, 0);
    }


    // 1) DB'ye kaydet
    const result = await db.runAsync(
      'INSERT INTO medicines (profile_id, name, total_tablets, daily_dose, start_date, end_date) VALUES (?,?,?,?,?,?)',
      [profileId, name, total, daily, startDate.toISOString(), endDate.toISOString()]
    );

    // 2) Bildirimi planla (izin yoksa sadece DB kaydı kalır)
    let notifId: string | null = null;
    const ok = await ensureNotificationReady();

    if (ok) {
      notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'İlacın Bitti! ⚠️',
          body: `${name} için bugün son tabletleri kullandın. Yenisini almalısın.`,
          ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: notifyAt,
        },
      });
    }

// 3) notification_id'yi yaz (null olabilir)
    await db.runAsync('UPDATE medicines SET notification_id = ? WHERE id = ?', [
      notifId,
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

      const totalDays =
        Number.isFinite(totalTablets) && Number.isFinite(dailyDose) && dailyDose > 0
          ? Math.ceil(totalTablets / dailyDose)
          : 0;

      const daysLeft = m.end_date
        ? Math.max(
            0,
            Math.ceil((new Date(m.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          )
        : totalDays;

      return {
        ...m,
        totalDays,
        daysLeft,
        startDateText: m.start_date ? formatTR(m.start_date) : null,
      };
    });
  };

  const deleteMedicines = async (id: number) => {
    const db = ensureDb();

    const row: any = await db.getFirstAsync(
      'SELECT notification_id FROM medicines WHERE id = ?',
      [id]
    );

    if (row?.notification_id) {
      try {
        await Notifications.cancelScheduledNotificationAsync(row.notification_id);
      } catch {
        // zaten gitmiş olabilir
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
