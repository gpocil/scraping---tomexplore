import { createContext, useState, useContext, ReactNode, useCallback, useRef, useMemo } from 'react';
import apiClient from '../util/apiClient';
import { IResponseStructure, IPlace, IPreviewResponseStructure, IPlacesByCity, IPlaceNeedingAttention } from '../model/Interfaces';
import {
    getPlacesData, savePlacesData,
    getPreviewData, savePreviewData,
    getUncheckedPlacesByCity as getUncheckedPlacesByCityFromDB, saveUncheckedPlacesByCity,
    getPlacesNeedingAttention as getPlacesNeedingAttentionFromDB, savePlacesNeedingAttention,
    getSinglePlace, saveSinglePlace,
    updatePlaceInIndexedDB
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
    updatePlace: (placeId: number, placeData: Partial<IPlace>) => Promise<IPlace>;
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

    const updatePlace = async (placeId: number, placeData: Partial<IPlace>): Promise<IPlace> => {
        console.log('[PlacesContext] updatePlace called for ID:', placeId, 'with data:', placeData);

        // Check if a fetch is already in progress for this request
        const fetchKey = `updatePlace_${placeId}`;
        if (fetchingRefs.current[fetchKey]) {
            console.log('[PlacesContext] An update is already in progress for:', fetchKey);
            return Promise.reject(new Error('An update is already in progress for this place'));
        }

        try {
            fetchingRefs.current[fetchKey] = true;

            // Send the update to the server
            const response = await apiClient.put<{ message: string, place: any }>(`/front/updatePlace/${placeId}`, placeData);
            const updatedServerPlace = response.data.place;
            console.log('[PlacesContext] Place updated on server:', updatedServerPlace);

            // Find the existing place in our data
            const existingPlace = findPlaceById(placeId);
            if (!existingPlace) {
                console.warn('[PlacesContext] Place not found in local data, updating server only');
                return updatedServerPlace;
            }

            // Create updated place with the new data but keep existing structure
            const updatedPlace: IPlace = {
                ...existingPlace,
                ...placeData,
                // Ensure these fields are present
                place_id: placeId,
                place_name: placeData.place_name || existingPlace.place_name,
                place_name_original: placeData.place_name_original || existingPlace.place_name_original,
                images: existingPlace.images // Keep the existing images
            };

            // Update IndexedDB
            await updatePlaceInIndexedDB(placeId, updatedPlace);
            console.log('[PlacesContext] Place updated in IndexedDB:', placeId);

            // Update the state
            setData(prevData => {
                const newData = { ...prevData };

                // Determine the current status category of the place
                let currentStatus: 'checked' | 'unchecked' | 'needs_attention' | 'to_be_deleted' = 'unchecked';
                let currentCountry = '';
                let currentCity = '';
                let currentPlaceKey = '';
                let placeIndex = -1;

                // Find the place in the current state
                outerLoop: for (const status of ['checked', 'unchecked', 'needs_attention', 'to_be_deleted'] as const) {
                    for (const countryName in newData[status]) {
                        for (const cityName in newData[status][countryName]) {
                            const cityPlaces = newData[status][countryName][cityName] as any;
                            for (const placeName in cityPlaces) {
                                const places = cityPlaces[placeName] as IPlace[];
                                const index = places.findIndex(p => p.place_id === placeId);
                                if (index !== -1) {
                                    currentStatus = status;
                                    currentCountry = countryName;
                                    currentCity = cityName;
                                    currentPlaceKey = placeName;
                                    placeIndex = index;
                                    break outerLoop;
                                }
                            }
                        }
                    }
                }

                // If the place was found in the data
                if (placeIndex !== -1) {
                    // Determine the new status based on the updated fields
                    let newStatus: 'checked' | 'unchecked' | 'needs_attention' | 'to_be_deleted' = currentStatus;

                    if (placeData.to_be_deleted === true) {
                        newStatus = 'to_be_deleted';
                    } else if (placeData.checked === true) {
                        newStatus = 'checked';
                    } else if (placeData.needs_attention === true) {
                        newStatus = 'needs_attention';
                    } else if (placeData.checked === false && placeData.needs_attention === false) {
                        newStatus = 'unchecked';
                    }

                    // Get the places array
                    const places = (newData[currentStatus][currentCountry][currentCity] as any)[currentPlaceKey] as IPlace[];

                    // If the status is changing
                    if (newStatus !== currentStatus) {
                        console.log(`[PlacesContext] Moving place from ${currentStatus} to ${newStatus}`);

                        // Remove from current category
                        places.splice(placeIndex, 1);

                        // Clean up empty arrays/objects
                        if (places.length === 0) {
                            delete (newData[currentStatus][currentCountry][currentCity] as any)[currentPlaceKey];

                            if (Object.keys(newData[currentStatus][currentCountry][currentCity]).length === 0) {
                                delete newData[currentStatus][currentCountry][currentCity];

                                if (Object.keys(newData[currentStatus][currentCountry]).length === 0) {
                                    delete newData[currentStatus][currentCountry];
                                }
                            }
                        }

                        // Ensure target category structure exists
                        if (!newData[newStatus][currentCountry]) {
                            newData[newStatus][currentCountry] = {};
                        }


                        // Use the updated place name if it changed
                        const newPlaceKey = placeData.place_name || currentPlaceKey;

                        if (!(newData[newStatus][currentCountry][currentCity] as any)[newPlaceKey]) {
                            (newData[newStatus][currentCountry][currentCity] as any)[newPlaceKey] = [];
                        }

                        // Add to new category
                        (newData[newStatus][currentCountry][currentCity] as any)[newPlaceKey].push(updatedPlace);
                    } else {
                        // Just update in place
                        places[placeIndex] = updatedPlace;

                        // If place name changed, we need to move it to a new key
                        if (placeData.place_name && placeData.place_name !== currentPlaceKey) {
                            console.log(`[PlacesContext] Changing place key from ${currentPlaceKey} to ${placeData.place_name}`);

                            // Remove from current key
                            places.splice(placeIndex, 1);

                            // Clean up if needed
                            if (places.length === 0) {
                                delete (newData[currentStatus][currentCountry][currentCity] as any)[currentPlaceKey];
                            }

                            // Add to new key
                            if (!(newData[currentStatus][currentCountry][currentCity] as any)[placeData.place_name]) {
                                (newData[currentStatus][currentCountry][currentCity] as any)[placeData.place_name] = [];
                            }

                            (newData[currentStatus][currentCountry][currentCity] as any)[placeData.place_name].push(updatedPlace);
                        }
                    }
                } else {
                    console.warn('[PlacesContext] Place not found in state, cannot update UI');
                }

                return newData;
            });

            return updatedPlace;
        } catch (error) {
            console.error('[PlacesContext] Error updating place:', error);
            return Promise.reject(error);
        } finally {
            fetchingRefs.current[fetchKey] = false;
        }
    };

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
        updatePlace
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
        getPlacesNeedingAttention
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
