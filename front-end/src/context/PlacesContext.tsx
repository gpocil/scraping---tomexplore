import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import apiClient from '../util/apiClient';
import { IResponseStructure, IPlace } from '../model/Interfaces';

interface PlaceContextType {
    data: IResponseStructure;
    updatePlaces: () => Promise<void>;  // Changement ici
    findPlaceById: (placeId: number) => IPlace | undefined;
    updateSinglePlace: (placeId: number) => Promise<void>;
}

const PlaceContext = createContext<PlaceContextType | undefined>(undefined);

export const PlaceProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<IResponseStructure>({ checked: {}, unchecked: {}, needs_attention: {}, to_be_deleted: {} });

    const fetchData = useCallback((): Promise<void> => {
        return apiClient.get<IResponseStructure>('/front/getAllImages')  // Retourner la promesse
            .then((response) => {
                setData(response.data);
                console.log('Fetched places data:', response.data);
            })
            .catch((error) => console.error('Error fetching places:', error));
    }, []);

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

    const updatePlaces = (): Promise<void> => {
        return fetchData();  // Retourner la promesse ici
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
        <PlaceContext.Provider value={{ data, updatePlaces, findPlaceById, updateSinglePlace }}>
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
