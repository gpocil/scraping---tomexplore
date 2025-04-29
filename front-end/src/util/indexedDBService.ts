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

export const updatePlaceInIndexedDB = async (placeId: number, updatedPlace: IPlace): Promise<void> => {
    console.log('[indexedDBService] Updating place in IndexedDB:', placeId);
    try {
        const db = await openDB(DB_NAME, DB_VERSION);

        // First, update the place in SinglePlace store if it exists
        const existingSinglePlace = await db.get('SinglePlace', placeId);
        if (existingSinglePlace) {
            await db.put('SinglePlace', {
                id: placeId,
                data: updatedPlace,
                timestamp: new Date()
            });
            console.log('[indexedDBService] Updated place in SinglePlace store');
        }

        // Update the place in PlacesData stores (both admin and regular)
        const adminData = await db.get('PlacesData', 'admin');
        if (adminData) {
            const updated = updatePlaceInDataStructure(adminData.data, placeId, updatedPlace);
            if (updated) {
                await db.put('PlacesData', {
                    key: 'admin',
                    data: adminData.data,
                    timestamp: new Date()
                });
                console.log('[indexedDBService] Updated place in admin PlacesData');
            }
        }

        const regularData = await db.get('PlacesData', 'regular');
        if (regularData) {
            const updated = updatePlaceInDataStructure(regularData.data, placeId, updatedPlace);
            if (updated) {
                await db.put('PlacesData', {
                    key: 'regular',
                    data: regularData.data,
                    timestamp: new Date()
                });
                console.log('[indexedDBService] Updated place in regular PlacesData');
            }
        }

        // Update in UncheckedPlacesByCity if it exists
        const allCityKeys = await db.getAllKeys('UncheckedPlacesByCity');
        for (const cityKey of allCityKeys) {
            const cityData = await db.get('UncheckedPlacesByCity', cityKey);
            if (cityData && cityData.places) {
                let updated = false;
                for (let i = 0; i < cityData.places.length; i++) {
                    if (cityData.places[i].place_id === placeId) {
                        cityData.places[i] = {
                            ...cityData.places[i],
                            ...updatedPlace
                        };
                        updated = true;
                        break;
                    }
                }

                if (updated) {
                    await db.put('UncheckedPlacesByCity', cityData, cityKey);
                    console.log(`[indexedDBService] Updated place in UncheckedPlacesByCity for ${cityKey}`);
                }
            }
        }

        // Update in PlacesNeedingAttention if it exists
        const attentionData = await db.get('PlacesNeedingAttention', 'all');
        if (attentionData && attentionData.data) {
            let updated = false;
            for (let i = 0; i < attentionData.data.length; i++) {
                if (attentionData.data[i].place_id === placeId) {
                    attentionData.data[i] = {
                        ...attentionData.data[i],
                        ...updatedPlace
                    };
                    updated = true;
                    break;
                }
            }

            if (updated) {
                await db.put('PlacesNeedingAttention', {
                    key: 'all',
                    data: attentionData.data,
                    timestamp: new Date()
                }, 'all');
                console.log('[indexedDBService] Updated place in PlacesNeedingAttention');
            }
        }

        console.log('[indexedDBService] Completed updating place in IndexedDB:', placeId);
    } catch (error) {
        console.error('[indexedDBService] Error updating place in IndexedDB:', error);
        throw error;
    }
};

// Helper function to update a place in the complex IResponseStructure
function updatePlaceInDataStructure(data: IResponseStructure, placeId: number, updatedPlace: IPlace): boolean {
    let updated = false;

    // Check all status categories
    for (const status of ['checked', 'unchecked', 'needs_attention', 'to_be_deleted'] as const) {
        // Check all countries
        for (const countryName in data[status]) {
            // Check all cities
            for (const cityName in data[status][countryName]) {
                const cityPlaces = data[status][countryName][cityName] as any;
                // Check all place names
                for (const placeName in cityPlaces) {
                    const places = cityPlaces[placeName] as IPlace[];
                    // Check all places with this name
                    for (let i = 0; i < places.length; i++) {
                        if (places[i].place_id === placeId) {
                            // Update the place
                            places[i] = { ...places[i], ...updatedPlace };
                            updated = true;
                            break;
                        }
                    }
                }
            }
        }
    }

    return updated;
}
