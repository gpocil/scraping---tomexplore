import { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import apiClient from '../util/apiClient';
import { IResponseStructure, IPlace, IPreviewResponseStructure, IPlacesByCity, IPlaceNeedingAttention } from '../model/Interfaces';

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

    const fetchData = useCallback((isAdmin: boolean): Promise<void> => {
        console.log("Admin : " + isAdmin);
        // Ajoute isAdmin comme paramètre de requête
        const url = `/front/getAllImages?admin=${isAdmin}`;

        return apiClient.get<IResponseStructure>(url)  // Charge les données selon le statut admin
            .then((response) => {
                setData(response.data);
                console.log('Fetched places data:', response.data);
            })
            .catch((error) => console.error('Error fetching places:', error));
    }, []);

    const getPreview = async (isAdmin: boolean): Promise<void> => {
        try {
            console.log("Fetching preview with admin:", isAdmin);
            const url = `/front/getPreview?admin=${isAdmin}`;
            const response = await apiClient.get<IPreviewResponseStructure>(url);
            setPreviewData(response.data);
            console.log('Fetched preview data:', response.data);
            return Promise.resolve();
        } catch (error) {
            console.error('Error fetching preview:', error);
            return Promise.reject(error);
        }
    };

    const getUncheckedPlacesByCity = async (cityName: string): Promise<IPlacesByCity> => {
        try {
            console.log(`Fetching unchecked places for city: ${cityName}`);
            const response = await apiClient.get<IPlacesByCity>(`/front/getUncheckedPlacesByCity/${encodeURIComponent(cityName)}`);
            setUncheckedPlacesByCity(response.data);
            console.log('Fetched unchecked places:', response.data);
            return response.data;
        } catch (error) {
            console.error(`Error fetching unchecked places for city ${cityName}:`, error);
            return Promise.reject(error);
        }
    };

    const getPlacesNeedingAttention = async (): Promise<IPlaceNeedingAttention[]> => {
        try {
            console.log('Fetching places needing attention');
            const response = await apiClient.get<IPlaceNeedingAttention[]>('/front/getAllPlacesNeedingAttention');
            setPlacesNeedingAttention(response.data);
            console.log('Fetched places needing attention:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching places needing attention:', error);
            return Promise.reject(error);
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
        return fetchData(isAdmin);  // Passe le paramètre isAdmin à fetchData
    };

    const updateSinglePlace = (placeId: number): Promise<void> => {
        console.log('Fetching images for place with ID:', placeId);
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
                    return updatedData;
                });
            })
            .catch((error) => console.error('Error fetching images for place:', error));
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
