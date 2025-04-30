import { createContext, useState, useContext, ReactNode, useCallback, useRef, useMemo } from 'react';
import apiClient from '../util/apiClient';
import { IResponseStructure, IPlace, IPreviewResponseStructure, IPlacesByCity, IPlaceNeedingAttention } from '../model/Interfaces';
import {
    getPlacesData, savePlacesData,
    getPreviewData, savePreviewData,
    getUncheckedPlacesByCity as getUncheckedPlacesByCityFromDB, saveUncheckedPlacesByCity,
    getPlacesNeedingAttention as getPlacesNeedingAttentionFromDB, savePlacesNeedingAttention,
    getSinglePlace, saveSinglePlace,
    clearAllData,
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
    refreshAllData: (isAdmin: boolean) => Promise<void>;
}

const PlaceContext = createContext<PlaceContextType | undefined>(undefined);

export const PlaceProvider = ({ children }: { children: ReactNode }) => {
    console.log('PlaceProvider initializing');
    const [data, setData] = useState<IResponseStructure>({ checked: {}, unchecked: {}, needs_attention: {}, to_be_deleted: {} });
    const [previewData, setPreviewData] = useState<IPreviewResponseStructure | null>(null);
    const [uncheckedPlacesByCity, setUncheckedPlacesByCity] = useState<IPlacesByCity | null>(null);
    const [placesNeedingAttention, setPlacesNeedingAttention] = useState<IPlaceNeedingAttention[] | null>(null);

    // Cache for city data to prevent redundant fetches
    const cityDataCache = useRef<{ [cityName: string]: IPlacesByCity }>({});

    // Add a ref to track ongoing fetches to prevent duplicate calls
    const fetchingRefs = useRef<{ [key: string]: boolean }>({});
    // Track requests that have already been made
    const requestsMade = useRef<{ [key: string]: boolean }>({});

    const fetchData = useCallback(async (isAdmin: boolean): Promise<void> => {
        console.log("[PlacesContext] fetchData called - Admin:", isAdmin);

        // Check if a fetch is already in progress for this request
        const fetchKey = `allPlaces_${isAdmin}`;
        if (fetchingRefs.current[fetchKey]) {
            console.log('[PlacesContext] A fetch is already in progress for:', fetchKey);
            return Promise.resolve();
        }

        try {
            console.log('[PlacesContext] Starting fetch for all places');
            fetchingRefs.current[fetchKey] = true;
            // First, try to get data from IndexedDB
            const cachedData = await getPlacesData(isAdmin);
            if (cachedData) {
                console.log('[PlacesContext] Using cached places data from IndexedDB');
                setData(cachedData);
                return Promise.resolve();
            }

            // If no cached data, fetch from API
            console.log('[PlacesContext] No cached data found, fetching from API');
            const url = `/front/getAllImages?admin=${isAdmin}`;
            const response = await apiClient.get<IResponseStructure>(url);
            console.log('[PlacesContext] API response received with data');
            setData(response.data);

            // Save to IndexedDB for future use
            console.log('[PlacesContext] Saving places data to IndexedDB');
            await savePlacesData(response.data, isAdmin);

            return Promise.resolve();
        } catch (error) {
            console.error('[PlacesContext] Error fetching places:', error);
            return Promise.reject(error);
        } finally {
            fetchingRefs.current[fetchKey] = false;
            console.log('[PlacesContext] fetchData completed');
        }
    }, []);

    const getPreview = async (isAdmin: boolean): Promise<void> => {
        console.log("[PlacesContext] getPreview called - Admin:", isAdmin);
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

    const getUncheckedPlacesByCity = useCallback(async (cityName: string): Promise<IPlacesByCity> => {
        console.log(`[PlacesContext] getUncheckedPlacesByCity called for "${cityName}"`);

        // Check if we already have this data in memory cache
        if (cityDataCache.current[cityName]) {
            console.log(`[PlacesContext] Using in-memory cached data for city: ${cityName}`);
            setUncheckedPlacesByCity(cityDataCache.current[cityName]);
            return cityDataCache.current[cityName];
        }

        // Check if this request has already been made in this session
        const requestKey = `cityRequest_${cityName}`;
        if (requestsMade.current[requestKey]) {
            console.log(`[PlacesContext] Request for ${cityName} already made in this session`);
            if (uncheckedPlacesByCity) {
                console.log(`[PlacesContext] Returning current uncheckedPlacesByCity state for ${cityName}`);
                return uncheckedPlacesByCity;
            }
        }

        // Check if a fetch is already in progress for this request
        const fetchKey = `uncheckedByCity_${cityName}`;
        if (fetchingRefs.current[fetchKey]) {
            console.log('[PlacesContext] A fetch is already in progress for:', fetchKey);
            // Return the existing data if we have it
            if (uncheckedPlacesByCity) {
                return uncheckedPlacesByCity;
            }
            // Wait for a short time and try again
            console.log('[PlacesContext] Waiting before trying again...');
            await new Promise(resolve => setTimeout(resolve, 500));
            return getUncheckedPlacesByCity(cityName);
        }

        try {
            console.log(`[PlacesContext] Starting fetch for unchecked places in ${cityName}`);
            fetchingRefs.current[fetchKey] = true;
            requestsMade.current[requestKey] = true;

            // First, try to get data from IndexedDB
            console.log(`[PlacesContext] Checking IndexedDB for ${cityName} data`);
            const cachedCityData = await getUncheckedPlacesByCityFromDB(cityName);
            if (cachedCityData) {
                console.log(`[PlacesContext] Using cached data from IndexedDB for ${cityName}`);
                setUncheckedPlacesByCity(cachedCityData);
                // Store in memory cache too
                cityDataCache.current[cityName] = cachedCityData;
                return cachedCityData;
            }

            // If no cached data, fetch from API
            console.log(`[PlacesContext] No cached data found for ${cityName}, fetching from API`);
            const response = await apiClient.get<IPlacesByCity>(`/front/getUncheckedPlacesByCity/${encodeURIComponent(cityName)}`);
            const responseData = response.data;
            console.log(`[PlacesContext] Received ${responseData.places?.length || 0} places for ${cityName}`);

            setUncheckedPlacesByCity(responseData);

            // Save to IndexedDB for future use
            console.log(`[PlacesContext] Saving ${cityName} data to IndexedDB`);
            await saveUncheckedPlacesByCity(cityName, responseData);

            // Store in memory cache
            cityDataCache.current[cityName] = responseData;
            console.log(`[PlacesContext] ${cityName} data saved to memory cache`);

            return responseData;
        } catch (error) {
            console.error(`[PlacesContext] Error fetching unchecked places for ${cityName}:`, error);
            return Promise.reject(error);
        } finally {
            fetchingRefs.current[fetchKey] = false;
            console.log(`[PlacesContext] getUncheckedPlacesByCity for ${cityName} completed`);
        }
    }, [uncheckedPlacesByCity]);

    const getPlacesNeedingAttention = async (): Promise<IPlaceNeedingAttention[]> => {
        console.log('[PlacesContext] getPlacesNeedingAttention called');
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
        console.log('[PlacesContext] findPlaceById called for ID:', placeId);

        // Logique pour trouver une place par ID
        for (const status of ['unchecked', 'needs_attention', 'checked', 'to_be_deleted'] as const) {
            for (const country of Object.keys(data[status])) {
                for (const city of Object.keys(data[status][country])) {
                    const cityPlaces = data[status][country][city] as unknown as Record<string, IPlace[]>;
                    for (const placeKey of Object.keys(cityPlaces)) {
                        const placeArray: IPlace[] = cityPlaces[placeKey];
                        const foundPlace = placeArray.find((p: IPlace) => p.place_id === placeId);
                        if (foundPlace) {
                            console.log('[PlacesContext] Found place with ID:', placeId);
                            return foundPlace;
                        }
                    }
                }
            }
        }
        console.log('[PlacesContext] Place not found with ID:', placeId);
        return undefined;
    };

    const updatePlaces = (isAdmin: boolean): Promise<void> => {
        console.log('[PlacesContext] updatePlaces called - Admin:', isAdmin);
        return fetchData(isAdmin);
    };

    const updateSinglePlace = async (placeId: number): Promise<void> => {
        console.log('[PlacesContext] updateSinglePlace called for ID:', placeId);

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

    // Add a new function to refresh all data
    const refreshAllData = useCallback(async (isAdmin: boolean): Promise<void> => {
        console.log("[PlacesContext] refreshAllData called - Admin:", isAdmin);
        const refreshKey = `refreshAll_${isAdmin}`;

        if (fetchingRefs.current[refreshKey]) {
            console.log('[PlacesContext] A refresh is already in progress');
            return Promise.resolve();
        }

        try {
            fetchingRefs.current[refreshKey] = true;
            console.log('[PlacesContext] Clearing all IndexedDB data');

            // Clear all IndexedDB data
            await clearAllData();

            // Reset cache references
            cityDataCache.current = {};
            requestsMade.current = {};

            // Fetch fresh preview data
            console.log('[PlacesContext] Fetching fresh preview data');
            const previewUrl = `/front/getPreview?admin=${isAdmin}`;
            const previewResponse = await apiClient.get<IPreviewResponseStructure>(previewUrl);
            setPreviewData(previewResponse.data);
            await savePreviewData(previewResponse.data, isAdmin);

            // Fetch fresh places data (if we're in a state where we need it)
            console.log('[PlacesContext] Fetching fresh places data');
            const placesUrl = `/front/getAllImages?admin=${isAdmin}`;
            const placesResponse = await apiClient.get<IResponseStructure>(placesUrl);
            setData(placesResponse.data);
            await savePlacesData(placesResponse.data, isAdmin);

            // Fetch fresh places needing attention
            console.log('[PlacesContext] Fetching fresh places needing attention');
            const attentionResponse = await apiClient.get<IPlaceNeedingAttention[]>('/front/getAllPlacesNeedingAttention');
            setPlacesNeedingAttention(attentionResponse.data);
            await savePlacesNeedingAttention(attentionResponse.data);

            console.log('[PlacesContext] All data refreshed successfully');
            return Promise.resolve();
        } catch (error) {
            console.error('[PlacesContext] Error refreshing data:', error);
            return Promise.reject(error);
        } finally {
            fetchingRefs.current[refreshKey] = false;
        }
    }, []);

    console.log('[PlacesContext] Context rendering with data lengths:',
        Object.keys(data.unchecked).length,
        previewData ? 'Preview data loaded' : 'No preview data');

    // Create a stable value for the context
    const contextValue = useMemo(() => ({
        data,
        previewData,
        uncheckedPlacesByCity,
        placesNeedingAttention,
        updatePlaces,
        findPlaceById,
        updateSinglePlace,
        getPreview,
        getUncheckedPlacesByCity,
        getPlacesNeedingAttention,
        refreshAllData,
    }), [
        data,
        previewData,
        uncheckedPlacesByCity,
        placesNeedingAttention,
        updatePlaces,
        findPlaceById,
        updateSinglePlace,
        getPreview,
        getUncheckedPlacesByCity,
        getPlacesNeedingAttention,
        refreshAllData
    ]);

    return (
        <PlaceContext.Provider value={contextValue}>
            {children}
        </PlaceContext.Provider>
    );
};

export const usePlaces = () => {
    const context = useContext(PlaceContext);
    if (context === undefined) {
        console.error('[PlacesContext] usePlaces called outside of PlaceProvider!');
        throw new Error('usePlaces must be used within a PlaceProvider');
    }
    return context;
};
