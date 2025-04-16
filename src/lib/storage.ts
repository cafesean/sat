import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Dexie, { Table } from 'dexie';

// --- Core Data Types ---
export interface WordBank {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  // Add fields returned by listWordBanks tRPC procedure
  wordCount?: number;
  masteryPercentage?: number;
  lastPracticedAt?: string | null; // Match the type from tRPC (Date becomes string/null)
}

// Define the structure for the nested WordMaster object based on tRPC return type
export interface WordMasterData {
  id: string;
  baseWord: string;
  wordType: string | null;
  definition: string | null;
  sampleSentences: Record<string, string> | null; // Assuming JSON object like { default: "..." }
  translations: Record<string, string> | null;    // Assuming JSON object like { default: "..." }
  isDictionaryWord: boolean;
}

// Update Word interface to match the structure returned by vocab.listByBank
export interface Word {
  id: string;
  text: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: string; // ISO string from tRPC
  isStarred: boolean;
  notes: string | null; // Match tRPC return type
  mastery: number;
  nextDueAtReviewCount: number;
  timesSeen: number;
  successRate: number;
  wordMasterId: string | null;
  wordMaster: WordMasterData | null; // Nested object
  wordBankId: string; // Renamed from bankId for consistency with tRPC
  practiceCount: number;
  // Keep createdAt/updatedAt if needed locally, though not returned by listByBank
  // createdAt?: string; // Optional if not always present locally
  // updatedAt?: string; // Optional if not always present locally
}


export interface PracticeLog {
  id: string;
  wordId: string;
  bankId: string;
  userId: string;
  practicedAt: string;
  result: 'correct' | 'incorrect';
}

export interface Note {
  id: string;
  wordId: string;
  userId: string;
  content: string;
  updatedAt: string;
}

// --- Mutation Queue Types ---
export type MutationType =
  | 'wordBank/add' | 'wordBank/update' | 'wordBank/delete'
  | 'word/add' | 'word/addBatch' | 'word/update' | 'word/delete' | 'word/toggleStar' // Added addBatch, toggleStar
  | 'practiceLog/add'
  | 'note/add' | 'note/update' | 'note/delete';

export type MutationStatus = 'pending' | 'processing' | 'failed' | 'synced'; // 'synced' might be redundant if we delete on success

export interface QueuedMutation {
  id?: number; // Auto-incrementing primary key
  type: MutationType;
  payload: any; // Store the necessary data for the mutation (e.g., full object, ID, updates)
  timestamp: number; // Milliseconds since epoch, for ordering
  status: MutationStatus;
  attempts: number;
  userId: string; // Associate with the user
  error?: string; // Store last error message on failure
}

// Input type for adding mutations (id is optional)
export type QueuedMutationInput = Omit<QueuedMutation, 'id' | 'status' | 'attempts' | 'timestamp'> & {
  id?: number;
  status?: MutationStatus;
  attempts?: number;
  timestamp?: number;
};


// --- Dexie Database Class ---
export class SATDexie extends Dexie {
  wordBanks!: Table<WordBank, string>;
  words!: Table<Word, string>;
  practiceLogs!: Table<PracticeLog, string>;
  notes!: Table<Note, string>;
  mutationQueue!: Table<QueuedMutation, number>; // Added mutation queue table

  constructor() {
    super('SATStudyAppDB');
    this.version(3).stores({ // Increment version number AGAIN for schema change
      // Add new fields to index if needed for querying, though likely not needed for these calculated fields
      // Add new fields to index if needed for querying, though likely not needed for these calculated fields
      wordBanks: 'id, userId, name, lastPracticedAt', // Index lastPracticedAt if sorting/filtering by it locally is desired
      // Update words index: index wordBankId instead of bankId. Add other potential query fields.
      words: 'id, wordBankId, text, isStarred, nextReviewDate',
      practiceLogs: 'id, wordId, bankId, userId, practicedAt', // Keep bankId here if PracticeLog uses it
      notes: 'id, wordId, userId',
      mutationQueue: '++id, userId, status, timestamp',
    }).upgrade(tx => {
      console.log("Upgrading database schema to version 3, adding calculated fields to wordBanks table definition (no actual schema change needed for non-indexed fields).");
      // Dexie handles adding non-indexed properties automatically.
      // If we added new *indexed* fields, migration logic might go here.
    });

    // Define previous versions for Dexie's upgrade path
     this.version(2).stores({ // Previous schema before adding wordMaster/notes/SRS fields to Word interface
       wordBanks: 'id, userId, name',
       words: 'id, bankId, text', // Old index definition
       practiceLogs: 'id, wordId, bankId, userId, practicedAt',
       notes: 'id, wordId, userId',
       mutationQueue: '++id, userId, status, timestamp',
     });
     this.version(1).stores({
         wordBanks: 'id, userId, name',
         words: 'id, bankId, text',
         practiceLogs: 'id, wordId, bankId, userId, practicedAt',
         notes: 'id, wordId, userId',
     });
  }
}

export const db = new SATDexie();

// Example utility: get all word banks for a user
export async function getWordBanks(userId: string) {
  return db.wordBanks.where('userId').equals(userId).toArray();
}

// Example utility: add a word bank
export async function addWordBank(bank: WordBank) {
  return db.wordBanks.add(bank);
}

// Words - Update functions to use wordBankId
export async function getWordsByBank(wordBankId: string): Promise<Word[]> {
  return db.words.where('wordBankId').equals(wordBankId).toArray();
}
export async function addWord(word: Word) { // Assumes input 'word' matches the new Word interface
  return db.words.add(word);
}
export async function updateWord(word: Word) {
  return db.words.put(word);
}
export async function deleteWord(wordId: string) {
  return db.words.delete(wordId);
}

// Practice Logs
export async function getPracticeLogsByBank(bankId: string) {
  return db.practiceLogs.where('bankId').equals(bankId).toArray();
}
export async function getPracticeLogsByWord(wordId: string) {
  return db.practiceLogs.where('wordId').equals(wordId).toArray();
}
export async function addPracticeLog(log: PracticeLog) {
  return db.practiceLogs.add(log);
}

// Notes
export async function getNotesByWord(wordId: string) {
  return db.notes.where('wordId').equals(wordId).toArray();
}
export async function addNote(note: Note) {
  return db.notes.add(note);
}
export async function updateNote(note: Note) {
  return db.notes.put(note);
}
export async function deleteNote(noteId: string) {
  return db.notes.delete(noteId);
}

// --- Mutation Queue Utilities ---

/**
 * Adds a mutation to the offline queue.
 */
export async function queueMutation(mutationInput: QueuedMutationInput): Promise<number> {
  const mutation: QueuedMutation = {
    ...mutationInput,
    timestamp: mutationInput.timestamp ?? Date.now(),
    status: mutationInput.status ?? 'pending',
    attempts: mutationInput.attempts ?? 0,
  };
  return db.mutationQueue.add(mutation);
}

/**
 * Retrieves all pending mutations for a specific user, ordered by timestamp.
 */
export async function getPendingMutations(userId: string): Promise<QueuedMutation[]> {
  return db.mutationQueue
    .where('userId').equals(userId)
    .and(mutation => mutation.status === 'pending' || mutation.status === 'failed') // Include failed for retry logic
    .sortBy('timestamp');
}

/**
 * Updates the status and attempt count of a specific mutation in the queue.
 */
export async function updateMutationStatus(
  id: number,
  status: MutationStatus,
  attempts?: number,
  error?: string
): Promise<number> {
  const updates: Partial<QueuedMutation> = { status };
  if (attempts !== undefined) {
    updates.attempts = attempts;
  }
   if (error !== undefined) {
    updates.error = error;
  } else if (status !== 'failed') {
    // Clear error if status is no longer 'failed'
     updates.error = undefined;
   }
  return db.mutationQueue.update(id, updates);
}

/**
 * Deletes a mutation from the queue (typically after successful sync).
 */
export async function deleteMutation(id: number): Promise<void> {
  return db.mutationQueue.delete(id);
}


// --- UI Preferences (localStorage) ---
export function getUIPreference<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setUIPreference<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

interface UploadOptions {
	file: File;
	fileName: string;
	folder: string;
}

const s3Client = new S3Client({
	endpoint: process.env.S3_ENDPOINT,
	region: process.env.S3_REGION,
	credentials: {
		accessKeyId: process.env.S3_ACCESS_KEY!,
		secretAccessKey: process.env.S3_SECRET_KEY!,
	},
});

export async function uploadToS3(options: UploadOptions) {
	const { file, fileName, folder } = options;
	const key = `${folder}/${fileName}`;

	const command = new PutObjectCommand({
		Bucket: process.env.S3_BUCKET!,
		Key: key,
		Body: file,
		ContentType: file.type,
	});

	await s3Client.send(command);

	return {
		url: `https://${process.env.S3_BUCKET}/${key}`,
	};
}

export async function getUploadUrl(key: string) {
	const command = new PutObjectCommand({
		Bucket: process.env.S3_BUCKET!,
		Key: key,
	});

	return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
