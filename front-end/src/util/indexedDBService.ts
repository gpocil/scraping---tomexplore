import { openDB } from 'idb';
import { IResponseStructure, IPreviewResponseStructure, IPlacesByCity, IPlaceNeedingAttention, IPlace } from '../model/Interfaces';

const DB_NAME = 'places_db';
const DB_VERSION = 1;
const STORES = {
    ALL_PLACES: 'all_places',
    PREVIEW: 'preview',
    UNCHECKED_BY_CITY: 'unchecked_by_city',
    NEEDING_ATTENTION: 'needing_attention',
    SINGLE_PLACE: 'single_place'
};

// Initialize the database
const initDB = (): Promise<IDBDatabase> => {
    console.log('[IndexedDB] Initializing database:', DB_NAME, 'version:', DB_VERSION);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            console.log('[IndexedDB] Database upgrade needed');
            const db = (event.target as IDBOpenDBRequest).result;

            // Create object stores if they don't exist
            if (!db.objectStoreNames.contains(STORES.ALL_PLACES)) {
                console.log('[IndexedDB] Creating store:', STORES.ALL_PLACES);
                db.createObjectStore(STORES.ALL_PLACES);
            }
            if (!db.objectStoreNames.contains(STORES.PREVIEW)) {
                console.log('[IndexedDB] Creating store:', STORES.PREVIEW);
                db.createObjectStore(STORES.PREVIEW);
            }
            if (!db.objectStoreNames.contains(STORES.UNCHECKED_BY_CITY)) {
                console.log('[IndexedDB] Creating store:', STORES.UNCHECKED_BY_CITY);
                db.createObjectStore(STORES.UNCHECKED_BY_CITY);
            }
            if (!db.objectStoreNames.contains(STORES.NEEDING_ATTENTION)) {
                console.log('[IndexedDB] Creating store:', STORES.NEEDING_ATTENTION);
                db.createObjectStore(STORES.NEEDING_ATTENTION);
            }
            if (!db.objectStoreNames.contains(STORES.SINGLE_PLACE)) {
                console.log('[IndexedDB] Creating store:', STORES.SINGLE_PLACE);
                db.createObjectStore(STORES.SINGLE_PLACE);
            }
        };

        request.onsuccess = (event) => {
            console.log('[IndexedDB] Database initialized successfully');
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            console.error('[IndexedDB] Database initialization error:', (event.target as IDBOpenDBRequest).error);
            reject(`Database error: ${(event.target as IDBOpenDBRequest).error}`);
        };
    });
};

// Generic function to set data
const setData = async <T>(storeName: string, key: string, data: T): Promise<void> => {
    console.log(`[IndexedDB] Setting data in store: ${storeName}, key: ${key}`);
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data, key);

            request.onsuccess = () => {
                console.log(`[IndexedDB] Data saved successfully in store: ${storeName}, key: ${key}`);
                resolve();
            };
            request.onerror = () => {
                console.error(`[IndexedDB] Error saving data in store: ${storeName}`, request.error);
                reject(request.error);
            };
            transaction.oncomplete = () => {
                console.log(`[IndexedDB] Transaction completed for store: ${storeName}`);
                db.close();
            };
        });
    } catch (error) {
        console.error(`[IndexedDB] Error setting data in store: ${storeName}:`, error);
        throw error;
    }
};

// Generic function to get data
const getData = async <T>(storeName: string, key: string): Promise<T | null> => {
    console.log(`[IndexedDB] Getting data from store: ${storeName}, key: ${key}`);
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result || null;
                console.log(`[IndexedDB] Data retrieved from store: ${storeName}, key: ${key}, found: ${result !== null}`);
                resolve(result);
            };
            request.onerror = () => {
                console.error(`[IndexedDB] Error getting data from store: ${storeName}`, request.error);
                reject(request.error);
            };
            transaction.oncomplete = () => {
                console.log(`[IndexedDB] Transaction completed for store: ${storeName}`);
                db.close();
            };
        });
    } catch (error) {
        console.error(`[IndexedDB] Error getting data from store: ${storeName}:`, error);
        return null;
    }
};

// Specific functions for the different data types
export const savePlacesData = (data: IResponseStructure, isAdmin: boolean): Promise<void> => {
    console.log(`[IndexedDB] Saving all places data, isAdmin: ${isAdmin}`);
    return setData(STORES.ALL_PLACES, `places_${isAdmin}`, data);
};

export const getPlacesData = async (isAdmin: boolean): Promise<IResponseStructure | null> => {
    console.log(`[IndexedDB] Getting all places data, isAdmin: ${isAdmin}`);
    return getData<IResponseStructure>(STORES.ALL_PLACES, `places_${isAdmin}`);
};

export const savePreviewData = (data: IPreviewResponseStructure, isAdmin: boolean): Promise<void> => {
    console.log(`[IndexedDB] Saving preview data, isAdmin: ${isAdmin}`);
    return setData(STORES.PREVIEW, `preview_${isAdmin}`, data);
};

export const getPreviewData = async (isAdmin: boolean): Promise<IPreviewResponseStructure | null> => {
    console.log(`[IndexedDB] Getting preview data, isAdmin: ${isAdmin}`);
    return getData<IPreviewResponseStructure>(STORES.PREVIEW, `preview_${isAdmin}`);
};

export const saveUncheckedPlacesByCity = (cityName: string, data: IPlacesByCity): Promise<void> => {
    console.log(`[IndexedDB] Saving unchecked places for city: ${cityName}, count: ${data.places?.length || 0}`);
    return setData(STORES.UNCHECKED_BY_CITY, cityName, data);
};

export const getUncheckedPlacesByCity = async (cityName: string): Promise<IPlacesByCity | null> => {
    console.log(`[IndexedDB] Getting unchecked places for city: ${cityName}`);
    return getData<IPlacesByCity>(STORES.UNCHECKED_BY_CITY, cityName);
};

export const savePlacesNeedingAttention = (data: IPlaceNeedingAttention[]): Promise<void> => {
    console.log(`[IndexedDB] Saving places needing attention, count: ${data.length}`);
    return setData(STORES.NEEDING_ATTENTION, 'needs_attention', data);
};

export const getPlacesNeedingAttention = async (): Promise<IPlaceNeedingAttention[] | null> => {
    console.log(`[IndexedDB] Getting places needing attention`);
    return getData<IPlaceNeedingAttention[]>(STORES.NEEDING_ATTENTION, 'needs_attention');
};

export const saveSinglePlace = (placeId: number, data: IPlace): Promise<void> => {
    console.log(`[IndexedDB] Saving single place data, ID: ${placeId}, images: ${data.images?.length || 0}`);
    return setData(STORES.SINGLE_PLACE, `place_${placeId}`, data);
};

export const getSinglePlace = async (placeId: number): Promise<IPlace | null> => {
    console.log(`[IndexedDB] Getting single place data, ID: ${placeId}`);
    return getData<IPlace>(STORES.SINGLE_PLACE, `place_${placeId}`);
};


