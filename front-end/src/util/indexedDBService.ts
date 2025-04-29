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
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Create object stores if they don't exist
            if (!db.objectStoreNames.contains(STORES.ALL_PLACES)) {
                db.createObjectStore(STORES.ALL_PLACES);
            }
            if (!db.objectStoreNames.contains(STORES.PREVIEW)) {
                db.createObjectStore(STORES.PREVIEW);
            }
            if (!db.objectStoreNames.contains(STORES.UNCHECKED_BY_CITY)) {
                db.createObjectStore(STORES.UNCHECKED_BY_CITY);
            }
            if (!db.objectStoreNames.contains(STORES.NEEDING_ATTENTION)) {
                db.createObjectStore(STORES.NEEDING_ATTENTION);
            }
            if (!db.objectStoreNames.contains(STORES.SINGLE_PLACE)) {
                db.createObjectStore(STORES.SINGLE_PLACE);
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            reject(`Database error: ${(event.target as IDBOpenDBRequest).error}`);
        };
    });
};

// Generic function to set data
const setData = async <T>(storeName: string, key: string, data: T): Promise<void> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data, key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => db.close();
        });
    } catch (error) {
        console.error(`Error setting data in IndexedDB:`, error);
        throw error;
    }
};

// Generic function to get data
const getData = async <T>(storeName: string, key: string): Promise<T | null> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => db.close();
        });
    } catch (error) {
        console.error(`Error getting data from IndexedDB:`, error);
        return null;
    }
};

// Specific functions for the different data types
export const savePlacesData = (data: IResponseStructure, isAdmin: boolean): Promise<void> => {
    return setData(STORES.ALL_PLACES, `places_${isAdmin}`, data);
};

export const getPlacesData = async (isAdmin: boolean): Promise<IResponseStructure | null> => {
    return getData<IResponseStructure>(STORES.ALL_PLACES, `places_${isAdmin}`);
};

export const savePreviewData = (data: IPreviewResponseStructure, isAdmin: boolean): Promise<void> => {
    return setData(STORES.PREVIEW, `preview_${isAdmin}`, data);
};

export const getPreviewData = async (isAdmin: boolean): Promise<IPreviewResponseStructure | null> => {
    return getData<IPreviewResponseStructure>(STORES.PREVIEW, `preview_${isAdmin}`);
};

export const saveUncheckedPlacesByCity = (cityName: string, data: IPlacesByCity): Promise<void> => {
    return setData(STORES.UNCHECKED_BY_CITY, cityName, data);
};

export const getUncheckedPlacesByCity = async (cityName: string): Promise<IPlacesByCity | null> => {
    return getData<IPlacesByCity>(STORES.UNCHECKED_BY_CITY, cityName);
};

export const savePlacesNeedingAttention = (data: IPlaceNeedingAttention[]): Promise<void> => {
    return setData(STORES.NEEDING_ATTENTION, 'needs_attention', data);
};

export const getPlacesNeedingAttention = async (): Promise<IPlaceNeedingAttention[] | null> => {
    return getData<IPlaceNeedingAttention[]>(STORES.NEEDING_ATTENTION, 'needs_attention');
};

export const saveSinglePlace = (placeId: number, data: IPlace): Promise<void> => {
    return setData(STORES.SINGLE_PLACE, `place_${placeId}`, data);
};

export const getSinglePlace = async (placeId: number): Promise<IPlace | null> => {
    return getData<IPlace>(STORES.SINGLE_PLACE, `place_${placeId}`);
};
