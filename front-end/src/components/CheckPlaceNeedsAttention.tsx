import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlaces } from '../context/PlacesContext';
import { IPlace } from '../model/Interfaces';

const CheckPlaceNeedsAttention: React.FC = () => {
    const { placeId } = useParams<{ placeId: string }>();
    const { findPlaceById } = usePlaces();
    const navigate = useNavigate();

    console.log('placeId from params:', placeId);

    const place: IPlace | undefined = React.useMemo(() => {
        if (!placeId) return undefined;
        return findPlaceById(Number(placeId));
    }, [findPlaceById, placeId]);

    console.log('Place found:', place);

    if (!placeId || !place) {
        return <div className="container mt-5">Lieu non trouvé</div>;
    }

    if (place.details) {
        console.log('Place details:', place.details);
    }

    const handleBackClick = () => {
        navigate('/places-needing-attention');
    };

    return (
        <div className="container mt-5">
            <button className="btn btn-primary mb-4" onClick={handleBackClick}>
                Retour
            </button>
            <h1 className="mb-4 text-center">{place.place_name}</h1>
            {place.details && <h2 className="mb-4 text-center">🚨 {place.details}</h2>}
            <div className="mb-4 text-center">
                {place.wikipedia_link && (
                    <a className="btn btn-secondary mr-2 mb-2" href={place.wikipedia_link} target="_blank" rel="noopener noreferrer">
                        Wikipedia
                    </a>
                )}
                {place.google_maps_link && (
                    <a className="btn btn-secondary mr-2 mb-2" href={place.google_maps_link} target="_blank" rel="noopener noreferrer">
                        Google Maps
                    </a>
                )}
                {place.instagram_link && (
                    <a className="btn btn-secondary mr-2 mb-2" href={place.instagram_link} target="_blank" rel="noopener noreferrer">
                        Instagram
                    </a>
                )}
                {place.unsplash_link && (
                    <a className="btn btn-secondary mb-2" href={place.unsplash_link} target="_blank" rel="noopener noreferrer">
                        Unsplash
                    </a>
                )}
            </div>
            <div className="row">
                {place.images.map((image, index) => (
                    <div key={index} className="col-md-4 mb-4">
                        <img src={image.url} className="img-fluid rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CheckPlaceNeedsAttention;
