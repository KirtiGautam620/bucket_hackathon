import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';

import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface Lead {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    company: string | null;
    imagePath: string | null;
    audioPath: string | null;
    transcription?: string | null; // Transcribed text
    summary?: string | null; // AI Summary
    jobTitle?: string | null;
    createdAt: number;
    synced: boolean;
    interests?: string[]; // Fetched from backend
    interactionHistory?: any[]; // Fetched from backend
}

export interface LeadInput {
    name?: string;
    phone?: string;
    email?: string;
    company?: string;
    imagePath?: string;
    audioPath?: string;
    transcription?: string;
    summary?: string;
}

/**
 * Check if a lead already exists based on phone or email
 * Deduplication happens locally before insert
 */
export const checkDuplicate = async (phone?: string, email?: string): Promise<Lead | null> => {
    if (!phone && !email) return null;

    const db = getDatabase();

    let query = 'SELECT * FROM leads WHERE ';
    const params: string[] = [];

    if (phone && email) {
        query += 'phone = ? OR email = ?';
        params.push(phone, email);
    } else if (phone) {
        query += 'phone = ?';
        params.push(phone);
    } else if (email) {
        query += 'email = ?';
        params.push(email);
    }

    query += ' ORDER BY createdAt ASC LIMIT 1';

    const result = await db.getFirstAsync<any>(query, params);

    if (result) {
        return {
            ...result,
            synced: Boolean(result.synced),
        };
    }

    return null;
};

/**
 * Insert a new lead into SQLite
 * Returns the created lead or null if duplicate found
 */
export const insertLead = async (leadData: LeadInput): Promise<Lead | null> => {
    // Check for duplicates
    const duplicate = await checkDuplicate(leadData.phone, leadData.email);

    if (duplicate) {
        console.log('Duplicate lead found:', duplicate);
        return null;
    }

    const db = getDatabase();
    const id = uuidv4();
    const createdAt = Date.now();

    const lead: Lead = {
        id,
        name: leadData.name || null,
        phone: leadData.phone || null,
        email: leadData.email || null,
        company: leadData.company || null,
        imagePath: leadData.imagePath || null,
        audioPath: leadData.audioPath || null,
        transcription: leadData.transcription || null,
        summary: leadData.summary || null,
        createdAt,
        synced: false,
    };

    // Note: You might need to add these columns to your SQLite table if they don't exist
    // For now, we'll try to insert. If it fails, we might need a migration strategy.
    // However, since we are in dev/proto phase, we assume the table can be recreated or we just add columns. 
    // Actually, to be safe, let's just create the columns if they don't exist or assume the user will reinstall app/reset DB.
    // Ideally we should use a migration.

    // Check if columns exist (simplified approach: just try insert, if fail, maybe alter table?)
    // But for this task, I will assume the table needs to be updated. 
    // Since I cannot easily run migrations on the device from here, I will rely on the fact that 
    // `reset-project` script exists or I can try to ADD COLUMN if missing.
    // But `runAsync` with dynamic columns is tricky. 
    // Let's just update the INSERT.

    // WAIT: If the table doesn't have these columns, this INSERT will fail.
    // I should probably check and add columns in `database.ts` or here.
    // But I don't see `database.ts` in the file list I viewed earlier, I only saw it imported.
    // Let's assume I need to handle schema update.

    // For now, updating the INSERT:
    try {
        await db.runAsync(
            `INSERT INTO leads (id, name, phone, email, company, imagePath, audioPath, transcription, summary, createdAt, synced) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                lead.id,
                lead.name || null,
                lead.phone || null,
                lead.email || null,
                lead.company || null,
                lead.imagePath || null,
                lead.audioPath || null,
                lead.transcription || null,
                lead.summary || null,
                lead.createdAt,
                0
            ]
        );
    } catch (e: any) {
        if (e.message && e.message.includes('has no column')) {
            // Quick fix: Add columns
            try {
                await db.runAsync('ALTER TABLE leads ADD COLUMN transcription TEXT');
                await db.runAsync('ALTER TABLE leads ADD COLUMN summary TEXT');
                // Retry insert
                await db.runAsync(
                    `INSERT INTO leads (id, name, phone, email, company, imagePath, audioPath, transcription, summary, createdAt, synced) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        lead.id,
                        lead.name || null,
                        lead.phone || null,
                        lead.email || null,
                        lead.company || null,
                        lead.imagePath || null,
                        lead.audioPath || null,
                        lead.transcription || null,
                        lead.summary || null,
                        lead.createdAt,
                        0
                    ]
                );
            } catch (alterError) {
                console.error('Failed to migrate table:', alterError);
                throw alterError;
            }
        } else {
            throw e;
        }
    }

    console.log('Lead inserted successfully:', lead.id);
    return lead;
};

/**
 * Get all leads from SQLite
 */
export const getAllLeads = async (): Promise<Lead[]> => {
    const db = getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM leads ORDER BY createdAt DESC');

    return rows.map(row => ({
        ...row,
        synced: Boolean(row.synced),
    }));
};

/**
 * Get unsynced leads only
 */
export const getUnsyncedLeads = async (): Promise<Lead[]> => {
    const db = getDatabase();
    const rows = await db.getAllAsync<any>(
        'SELECT * FROM leads WHERE synced = 0 ORDER BY createdAt ASC'
    );

    return rows.map(row => ({
        ...row,
        synced: Boolean(row.synced),
    }));
};

/**
 * Get a single lead by ID
 */
export const getLeadById = async (id: string): Promise<Lead | null> => {
    const db = getDatabase();
    const result = await db.getFirstAsync<any>('SELECT * FROM leads WHERE id = ?', [id]);

    if (result) {
        return {
            ...result,
            synced: Boolean(result.synced),
        };
    }

    return null;
};

/**
 * Update specific fields of a lead in SQLite
 */
export const updateLeadLocal = async (id: string, updates: Partial<Lead>): Promise<void> => {
    const db = getDatabase();
    const fields = Object.keys(updates);
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => (updates as any)[field]);
    values.push(id);

    try {
        await db.runAsync(`UPDATE leads SET ${setClause} WHERE id = ?`, values);
        console.log(`Lead ${id} updated locally with fields: ${fields.join(', ')}`);
    } catch (e: any) {
        console.error(`Error updating lead ${id} locally:`, e);
        throw e;
    }
};

/**
 * Mark a lead as synced
 */
export const markAsSynced = async (id: string): Promise<void> => {
    const db = getDatabase();
    await db.runAsync('UPDATE leads SET synced = 1 WHERE id = ?', [id]);
    console.log('Lead marked as synced:', id);
};

/**
 * Delete a lead
 */
export const deleteLead = async (id: string): Promise<void> => {
    const db = getDatabase();
    await db.runAsync('DELETE FROM leads WHERE id = ?', [id]);
    console.log('Lead deleted:', id);
};

/**
 * Delete all synced leads
 */
export const deleteSyncedLeads = async (): Promise<void> => {
    const db = getDatabase();
    await db.runAsync('DELETE FROM leads WHERE synced = 1');
    console.log('All synced leads deleted');
};

/**
 * Get lead statistics
 */
export const getLeadStats = async (): Promise<{
    total: number;
    synced: number;
    unsynced: number;
}> => {
    const db = getDatabase();

    const totalResult = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM leads'
    );
    const syncedResult = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM leads WHERE synced = 1'
    );

    const total = totalResult?.count || 0;
    const synced = syncedResult?.count || 0;

    return {
        total,
        synced,
        unsynced: total - synced,
    };
};

/**
 * Get the backend API URL dynamically (Duplicated from syncService for independence)
 */
const getApiUrl = () => {
    if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
    if (__DEV__ && Constants.expoConfig?.hostUri) {
        const host = Constants.expoConfig.hostUri.split(':')[0];
        return `http://${host}:3000/api`;
    }
    if (Platform.OS === 'android') return 'http://10.0.2.2:3000/api';
    return 'http://10.92.220.230:3000/api';
};

/**
 * Fetch full lead details from backend (including interests and chat history)
 */
export const fetchLeadFromBackend = async (id: string): Promise<Lead | null> => {
    try {
        const apiUrl = getApiUrl();
        console.log(`Fetching remote lead details from ${apiUrl}/leads/${id}`);
        const response = await fetch(`${apiUrl}/leads/${id}`);

        if (!response.ok) {
            console.warn(`Failed to fetch remote lead: ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data; // Returns the full mongoose object which matches Lead interface structure
    } catch (error) {
        console.error('Error fetching remote lead:', error);
        return null;
    }
};

/**
 * Upload audio separately to get transcription and summary
 * This is used for "Process Audio" feature in the UI
 */
export const processAudioForLead = async (leadId: string, audioPath: string): Promise<{ transcription: string | null; summary: string | null } | null> => {
    try {
        const apiUrl = getApiUrl();
        const formData = new FormData();
        formData.append('leadId', leadId);

        // We need to fetch the file blob or use the uri directly if supported
        // React Native FormData supports { uri, name, type }
        formData.append('audio', {
            uri: audioPath,
            type: 'audio/m4a', // Adjust if needed
            name: 'audio.m4a',
        } as any);

        console.log(`Uploading audio to ${apiUrl}/upload-audio...`);
        const response = await fetch(`${apiUrl}/upload-audio`, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.ok) {
            console.error('Audio upload failed:', response.status);
            return null;
        }

        const data = await response.json();
        console.log('Audio processing response:', data);

        return {
            transcription: data.transcription,
            summary: data.summary
        };

    } catch (error) {
        console.error('Error processing audio:', error);
        return null;
    }
};
