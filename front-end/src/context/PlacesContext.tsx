import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import apiClient from '../util/apiClient';
import { IResponseStructure, IPlace } from '../model/Interfaces';
import { openDB } from 'idb';

interface PlaceContextType {
    data: IResponseStructure;
    loading: boolean;
    updatePlaces: () => void;
    findPlaceById: (placeId: number) => IPlace | undefined;
    updateSinglePlace: (placeId: number) => Promise<void>;
    handleLogout: () => Promise<void>; // Ajoute la fonction de déconnexion
}

const PlaceContext = createContext<PlaceContextType | undefined>(undefined);

const dbName = 'placesDatabase';
const storeName = 'placesStore';

async function initDB() {
    return openDB(dbName, 1, {
        upgrade(db) {
            db.createObjectStore(storeName);
        },
    });
}

async function saveToIndexedDB(data: IResponseStructure) {
    const db = await initDB();
    await db.put(storeName, data, 'placesData');
}

async function getFromIndexedDB(): Promise<IResponseStructure | null> {
    const db = await initDB();
    return db.get(storeName, 'placesData');
}

async function clearIndexedDB() {
    const db = await initDB();
    await db.delete(storeName, 'placesData'); // Supprime placesData
}

export const PlaceProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<IResponseStructure>({ checked: {}, unchecked: {}, needs_attention: {}, to_be_deleted: {} });
    const [loading, setLoading] = useState<boolean>(true);

    const fetchData = useCallback(() => {
        getFromIndexedDB().then((cachedData) => {
            if (cachedData) {
                setData(cachedData);
                setLoading(false);
            } else {
                apiClient.get<IResponseStructure>('/front/getAllImages')
                    .then((response) => {
                        setData(response.data);
                        saveToIndexedDB(response.data); // Cache data in IndexedDB
                        setLoading(false);
                    })
                    .catch((error) => {
                        console.error('Error fetching places:', error);
                        setLoading(false);
                    });
            }
        });
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const findPlaceById = (placeId: number): IPlace | undefined => {
        for (const status of ['unchecked', 'needs_attention', 'checked', 'to_be_deleted'] as const) {
            for (const country of Object.keys(data[status])) {
                for (const city of Object.keys(data[status][country])) {
                    const cityPlaces = data[status][country][city] as unknown as Record<string, IPlace[]>;
                    for (const placeKey of Object.keys(cityPlaces)) {
                        const placeArray: IPlace[] = cityPlaces[placeKey];
                        const foundPlace = placeArray.find((p: IPlace) => p.place_id === placeId);
                        if (foundPlace) {
                            return foundPlace;
                        }
                    }
                }
            }
        }
        return undefined;
    };

    const updatePlaces = () => {
        fetchData();
    };

    const updateSinglePlace = (placeId: number) => {
        return apiClient.get<IPlace>(`/front/${placeId}/images`)
            .then((response) => {
                const updatedPlace = response.data;
                setData((prevData) => {
                    const updatedData = { ...prevData };
                    for (const status of ['unchecked', 'needs_attention', 'checked', 'to_be_deleted'] as const) {
                        for (const country of Object.keys(updatedData[status])) {
                            for (const city of Object.keys(updatedData[status][country])) {
                                const cityPlaces = updatedData[status][country][city] as unknown as Record<string, IPlace[]>;
                                for (const placeKey of Object.keys(cityPlaces)) {
                                    const placeArray: IPlace[] = cityPlaces[placeKey];
                                    const placeIndex = placeArray.findIndex((p: IPlace) => p.place_id === placeId);
                                    if (placeIndex !== -1) {
                                        cityPlaces[placeKey][placeIndex] = updatedPlace;
                                    }
                                }
                            }
                        }
                    }
                    saveToIndexedDB(updatedData); // Update cache with the new data
                    return updatedData;
                });
            })
            .catch((error) => console.error('Error fetching images for place:', error));
    };

    // Ajoute une fonction pour la déconnexion
    const handleLogout = async () => {
        await clearIndexedDB();  // Supprime le cache de IndexedDB
    };

    // Supprime placesData lors de la fermeture de l'onglet ou du navigateur
    useEffect(() => {
        const handleBeforeUnload = async () => {
            await clearIndexedDB();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    return (
        <PlaceContext.Provider value={{ data, loading, updatePlaces, findPlaceById, updateSinglePlace, handleLogout }}>
            {children}
        </PlaceContext.Provider>
    );
};

export const usePlaces = () => {
    const context = useContext(PlaceContext);
    if (context === undefined) {
        throw new Error('usePlaces must be used within a PlaceProvider');
    }
    return context;
};
