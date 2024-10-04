import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import apiClient from '../util/apiClient';
import { IResponseStructure, IPlace } from '../model/Interfaces';

interface PlaceContextType {
    data: IResponseStructure;
    loading: boolean;
    updatePlaces: () => void;
    findPlaceById: (placeId: number) => IPlace | undefined;
    updateSinglePlace: (placeId: number) => Promise<void>;
}

const PlaceContext = createContext<PlaceContextType | undefined>(undefined);

export const PlaceProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<IResponseStructure>({ checked: {}, unchecked: {}, needs_attention: {}, to_be_deleted: {} });
    const [loading, setLoading] = useState<boolean>(true);

    const fetchData = useCallback(() => {
        const cachedData = localStorage.getItem('placesData');
        if (cachedData) {
            setData(JSON.parse(cachedData));
            setLoading(false);
        } else {
            setLoading(true);
            apiClient.get<IResponseStructure>('/front/getAllImages')
                .then((response) => {
                    setData(response.data);
                    localStorage.setItem('placesData', JSON.stringify(response.data));
                    setLoading(false);
                    console.log('Fetched places data:', response.data);
                })
                .catch((error) => {
                    console.error('Error fetching places:', error);
                    setLoading(false);
                });
        }
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
                    return updatedData;
                });
                localStorage.setItem('placesData', JSON.stringify(updatedPlace)); // Cache updated place
            })
            .catch((error) => console.error('Error fetching images for place:', error));
    };

    return (
        <PlaceContext.Provider value={{ data, loading, updatePlaces, findPlaceById, updateSinglePlace }}>
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
