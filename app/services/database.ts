import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<void> => {
    try {
        db = await SQLite.openDatabaseAsync('leads.db');

        // Create leads table
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT,
        phone TEXT,
        email TEXT,
        company TEXT,
        imagePath TEXT,
        audioPath TEXT,
        createdAt INTEGER NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);

        // Attempt to add imagePath column if it doesn't exist (for existing databases)
        try {
            await db.execAsync('ALTER TABLE leads ADD COLUMN imagePath TEXT;');
        } catch (e) {
            // Column likely already exists
        }

        await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_phone ON leads(phone);
      CREATE INDEX IF NOT EXISTS idx_email ON leads(email);
      CREATE INDEX IF NOT EXISTS idx_synced ON leads(synced);
      CREATE INDEX IF NOT EXISTS idx_createdAt ON leads(createdAt DESC);
    `);

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase first.');
    }
    return db;
};

export const closeDatabase = async (): Promise<void> => {
    if (db) {
        await db.closeAsync();
        db = null;
    }
};

export const resetDatabase = async (): Promise<void> => {
    const database = getDatabase();
    await database.execAsync('DROP TABLE IF EXISTS leads;');
    await initDatabase();
};
