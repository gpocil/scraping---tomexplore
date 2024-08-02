import React, { useState, useEffect } from 'react';
import { usePlaces } from '../context/PlacesContext';
import { IPlace } from '../model/Interfaces';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/PlacesNeedingAttention.css'; // Custom CSS file

const PlacesNeedingAttention: React.FC = () => {
    const { data: places } = usePlaces();
    const [placesNeedingAttention, setPlacesNeedingAttention] = useState<IPlace[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPlacesNeedingAttention = () => {
            const needingAttention: IPlace[] = [];

            for (const country of Object.keys(places.needs_attention)) {
                for (const city of Object.keys(places.needs_attention[country])) {
                    for (const place of Object.values(places.needs_attention[country][city]).flat()) {
                        needingAttention.push(place);
                    }
                }
            }
            setPlacesNeedingAttention(needingAttention);
        };
        fetchPlacesNeedingAttention();
    }, [places]);

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
            {placesNeedingAttention.length === 0 ? (
                <p className="text-center">Aucun lieu pour le moment</p>
            ) : (
                <div className="d-flex justify-content-center">
                    <ul className="list-group place-list">
                        {placesNeedingAttention.map(place => (
                            <li key={place.place_id} className="list-group-item place-item">
                                <a href={`/check-place/${place.place_id}`} className="place-link">
                                    {place.place_id} - {place.place_name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default PlacesNeedingAttention;
