import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import apiClient from '../util/apiClient';
import { IResponseStructure } from '../model/Interfaces';

interface PlaceContextType {
    data: IResponseStructure;
    updatePlaces: () => void;
}

const PlaceContext = createContext<PlaceContextType | undefined>(undefined);

export const PlaceProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<IResponseStructure>({ checked: {}, unchecked: {}, needs_attention: {} });

    const fetchData = useCallback(() => {
        apiClient.get<IResponseStructure>('/front/getAllImages')
            .then((response) => {
                setData(response.data);
                console.log('Fetched places data:', response.data);
            })
            .catch((error) => console.error('Error fetching places:', error));
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const updatePlaces = () => {
        fetchData();
    };

    return (
        <PlaceContext.Provider value={{ data, updatePlaces }}>
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
