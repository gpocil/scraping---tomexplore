import { createContext, useState, useContext, ReactNode, useCallback, useRef } from 'react';
import apiClient from '../util/apiClient';
import { IResponseStructure, IPlace, IPreviewResponseStructure, IPlacesByCity, IPlaceNeedingAttention } from '../model/Interfaces';
import {
    getPlacesData, savePlacesData,
    getPreviewData, savePreviewData,
    getUncheckedPlacesByCity as getUncheckedPlacesByCityFromDB, saveUncheckedPlacesByCity,
    getPlacesNeedingAttention as getPlacesNeedingAttentionFromDB, savePlacesNeedingAttention,
    getSinglePlace, saveSinglePlace
} from '../util/indexedDBService';

interface PlaceContextType {
    data: IResponseStructure;
    previewData: IPreviewResponseStructure | null;
    uncheckedPlacesByCity: IPlacesByCity | null;
    placesNeedingAttention: IPlaceNeedingAttention[] | null;
    updatePlaces: (isAdmin: boolean) => Promise<void>;
    findPlaceById: (placeId: number) => IPlace | undefined;
    updateSinglePlace: (placeId: number) => Promise<void>;
    getPreview: (isAdmin: boolean) => Promise<void>;
    getUncheckedPlacesByCity: (cityName: string) => Promise<IPlacesByCity>;
    getPlacesNeedingAttention: () => Promise<IPlaceNeedingAttention[]>;
}

const PlaceContext = createContext<PlaceContextType | undefined>(undefined);

export const PlaceProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<IResponseStructure>({ checked: {}, unchecked: {}, needs_attention: {}, to_be_deleted: {} });
    const [previewData, setPreviewData] = useState<IPreviewResponseStructure | null>(null);
    const [uncheckedPlacesByCity, setUncheckedPlacesByCity] = useState<IPlacesByCity | null>(null);
    const [placesNeedingAttention, setPlacesNeedingAttention] = useState<IPlaceNeedingAttention[] | null>(null);
    // Add a ref to track ongoing fetches to prevent duplicate calls
    const fetchingRefs = useRef<{ [key: string]: boolean }>({});

    const fetchData = useCallback(async (isAdmin: boolean): Promise<void> => {
        console.log("Admin : " + isAdmin);

        // Check if a fetch is already in progress for this request
        const fetchKey = `allPlaces_${isAdmin}`;
        if (fetchingRefs.current[fetchKey]) {
            console.log('A fetch is already in progress for:', fetchKey);
            return Promise.resolve();
        }

        try {
            fetchingRefs.current[fetchKey] = true;
            // First, try to get data from IndexedDB
            const cachedData = await getPlacesData(isAdmin);
            if (cachedData) {
                console.log('Using cached places data from IndexedDB');
                setData(cachedData);
                return Promise.resolve();
            }

            // If no cached data, fetch from API
            const url = `/front/getAllImages?admin=${isAdmin}`;
            const response = await apiClient.get<IResponseStructure>(url);
            setData(response.data);
            console.log('Fetched places data from API:', response.data);

            // Save to IndexedDB for future use
            await savePlacesData(response.data, isAdmin);

            return Promise.resolve();
        } catch (error) {
            console.error('Error fetching places:', error);
            return Promise.reject(error);
        } finally {
            fetchingRefs.current[fetchKey] = false;
        }
    }, []);

    const getPreview = async (isAdmin: boolean): Promise<void> => {
        // Check if a fetch is already in progress for this request
        const fetchKey = `preview_${isAdmin}`;
        if (fetchingRefs.current[fetchKey]) {
            console.log('A fetch is already in progress for:', fetchKey);
            return Promise.resolve();
        }

        try {
            fetchingRefs.current[fetchKey] = true;
            console.log("Fetching preview with admin:", isAdmin);

            // First, try to get data from IndexedDB
            const cachedPreview = await getPreviewData(isAdmin);
            if (cachedPreview) {
                console.log('Using cached preview data from IndexedDB');
                setPreviewData(cachedPreview);
                return Promise.resolve();
            }

            // If no cached data, fetch from API
            const url = `/front/getPreview?admin=${isAdmin}`;
            const response = await apiClient.get<IPreviewResponseStructure>(url);
            setPreviewData(response.data);
            console.log('Fetched preview data from API:', response.data);

            // Save to IndexedDB for future use
            await savePreviewData(response.data, isAdmin);

            return Promise.resolve();
        } catch (error) {
            console.error('Error fetching preview:', error);
            return Promise.reject(error);
        } finally {
            fetchingRefs.current[fetchKey] = false;
        }
    };

    const getUncheckedPlacesByCity = async (cityName: string): Promise<IPlacesByCity> => {
        // Check if a fetch is already in progress for this request
        const fetchKey = `uncheckedByCity_${cityName}`;
        if (fetchingRefs.current[fetchKey]) {
            console.log('A fetch is already in progress for:', fetchKey);
            // Return the existing data if we have it
            if (uncheckedPlacesByCity) {
                return uncheckedPlacesByCity;
            }
        }

        try {
            fetchingRefs.current[fetchKey] = true;
            console.log(`Fetching unchecked places for city: ${cityName}`);

            // First, try to get data from IndexedDB
            const cachedCityData = await getUncheckedPlacesByCityFromDB(cityName);
            if (cachedCityData) {
                console.log('Using cached unchecked places data from IndexedDB');
                setUncheckedPlacesByCity(cachedCityData);
                return cachedCityData;
            }

            // If no cached data, fetch from API
            const response = await apiClient.get<IPlacesByCity>(`/front/getUncheckedPlacesByCity/${encodeURIComponent(cityName)}`);
            setUncheckedPlacesByCity(response.data);
            console.log('Fetched unchecked places from API:', response.data);

            // Save to IndexedDB for future use
            await saveUncheckedPlacesByCity(cityName, response.data);

            return response.data;
        } catch (error) {
            console.error(`Error fetching unchecked places for city ${cityName}:`, error);
            return Promise.reject(error);
        } finally {
            fetchingRefs.current[fetchKey] = false;
        }
    };

    const getPlacesNeedingAttention = async (): Promise<IPlaceNeedingAttention[]> => {
        // Check if a fetch is already in progress for this request
        const fetchKey = `placesNeedingAttention`;
        if (fetchingRefs.current[fetchKey]) {
            console.log('A fetch is already in progress for:', fetchKey);
            return placesNeedingAttention || [];
        }

        try {
            fetchingRefs.current[fetchKey] = true;
            console.log('Fetching places needing attention');

            // First, try to get data from IndexedDB
            const cachedAttentionData = await getPlacesNeedingAttentionFromDB();
            if (cachedAttentionData) {
                console.log('Using cached places needing attention from IndexedDB');
                setPlacesNeedingAttention(cachedAttentionData);
                return cachedAttentionData;
            }

            // If no cached data, fetch from API
            const response = await apiClient.get<IPlaceNeedingAttention[]>('/front/getAllPlacesNeedingAttention');
            setPlacesNeedingAttention(response.data);
            console.log('Fetched places needing attention from API:', response.data);

            // Save to IndexedDB for future use
            await savePlacesNeedingAttention(response.data);

            return response.data;
        } catch (error) {
            console.error('Error fetching places needing attention:', error);
            return Promise.reject(error);
        } finally {
            fetchingRefs.current[fetchKey] = false;
        }
    };

    const findPlaceById = (placeId: number): IPlace | undefined => {
        // Logique pour trouver une place par ID
        console.log('Searching for place with ID:', placeId);
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

    const updatePlaces = (isAdmin: boolean): Promise<void> => {
        return fetchData(isAdmin);
    };

    const updateSinglePlace = async (placeId: number): Promise<void> => {
        console.log('Fetching images for place with ID:', placeId);

        // Check if a fetch is already in progress for this request
        const fetchKey = `singlePlace_${placeId}`;
        if (fetchingRefs.current[fetchKey]) {
            console.log('A fetch is already in progress for:', fetchKey);
            return Promise.resolve();
        }

        try {
            fetchingRefs.current[fetchKey] = true;
            // First, try to get data from IndexedDB
            const cachedPlace = await getSinglePlace(placeId);
            if (cachedPlace) {
                console.log('Using cached place data from IndexedDB');

                // Update the place in the state
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
                                        cityPlaces[placeKey][placeIndex] = cachedPlace;
                                    }
                                }
                            }
                        }
                    }
                    return updatedData;
                });

                return Promise.resolve();
            }

            // If no cached data, fetch from API
            const response = await apiClient.get<IPlace>(`/front/${placeId}/images`);
            const updatedPlace = response.data;

            // Save to IndexedDB for future use
            await saveSinglePlace(placeId, updatedPlace);

            // Update the place in the state
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
                return updatedData;
            });

            return Promise.resolve();
        } catch (error) {
            console.error('Error fetching images for place:', error);
            return Promise.reject(error);
        } finally {
            fetchingRefs.current[fetchKey] = false;
        }
    };

    return (
        <PlaceContext.Provider
            value={{
                data,
                previewData,
                uncheckedPlacesByCity,
                placesNeedingAttention,
                updatePlaces,
                findPlaceById,
                updateSinglePlace,
                getPreview,
                getUncheckedPlacesByCity,
                getPlacesNeedingAttention
            }}
        >
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
