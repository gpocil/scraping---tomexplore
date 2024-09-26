import React, { useState, useEffect } from 'react';
import { usePlaces } from '../context/PlacesContext';
import { IPlace } from '../model/Interfaces';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/PlacesNeedingAttention.css';
import { useUser } from '../context/UserContext';

const PlacesNeedingAttention: React.FC = () => {
    const { data: places } = usePlaces();
    const [businessPlaces, setBusinessPlaces] = useState<IPlace[]>([]);
    const [touristAttractions, setTouristAttractions] = useState<IPlace[]>([]);
    const navigate = useNavigate();
    const { user } = useUser();


    useEffect(() => {
        const fetchPlacesNeedingAttention = () => {
            const business: IPlace[] = [];
            const tourist: IPlace[] = [];
            for (const country of Object.keys(places.needs_attention)) {
                for (const city of Object.keys(places.needs_attention[country])) {
                    for (const place of Object.values(places.needs_attention[country][city]).flat()) {
                        // Ne pas ajouter les lieux fermés si l'utilisateur n'est pas admin
                        const isClosed = place.details && place.details.toLowerCase().includes('fermé');
                        if (!isClosed || user?.admin) {
                            if (place.type === 'Tourist Attraction') {
                                tourist.push(place);
                            } else {
                                business.push(place);
                            }
                        }
                    }
                }
            }
            setBusinessPlaces(business);
            setTouristAttractions(tourist);
        };
        fetchPlacesNeedingAttention();
    }, [places]);

    const getPlaceClass = (details: string | undefined) => {
        if (details && details.toLowerCase().includes('fermé')) {
            return 'text-danger';  // Ligne rouge si le lieu est fermé
        }
        return 'text-secondary';  // Ligne grise par défaut
    };

    return (
        <div className="container mt-5">
            <div className="d-flex justify-content-start mb-4">
                <button className="btn btn-primary" onClick={() => navigate('/')}>
                    Home
                </button>
            </div>
            <div className="d-flex justify-content-center mb-4">
                <h1 className="text-center">Lieux nécessitant une attention</h1>
            </div>
            {businessPlaces.length === 0 && touristAttractions.length === 0 ? (
                <p className="text-center">Aucun lieu pour le moment</p>
            ) : (
                <div className="row">
                    <div className="col-md-6">
                        <h2 className="text-center">Business</h2>
                        <ul className="list-group place-list">
                            {businessPlaces.map(place => (
                                <li
                                    key={place.place_id}
                                    className={`list-group-item place-item ${getPlaceClass(place.details)}`}
                                    onClick={() => navigate(`/check-place/${place.place_id}`, { state: { place } })}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {place.place_id} - {place.place_name}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="col-md-6">
                        <h2 className="text-center">Tourist Attraction</h2>
                        <ul className="list-group place-list">
                            {touristAttractions.map(place => (
                                <li
                                    key={place.place_id}
                                    className={`list-group-item place-item ${getPlaceClass(place.details)}`}
                                    onClick={() => navigate(`/check-place/${place.place_id}`, { state: { place } })}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {place.place_id} - {place.place_name}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlacesNeedingAttention;
