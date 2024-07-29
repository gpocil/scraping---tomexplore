import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlaces } from '../context/PlacesContext';
import { IPlace } from '../model/Interfaces';

interface ImageResponse {
    url: string;
    description: string;
}

interface PlaceResponse {
    place_id: number;
    place_name: string;
    wikipedia_link?: string;
    google_maps_link: string;
    instagram_link?: string;
    unsplash_link?: string;
    images: ImageResponse[];
    checked: boolean;
    needs_attention: boolean | undefined;
}

const CheckPlaceNeedsAttention: React.FC = () => {
    const { placeId } = useParams<{ placeId: string }>();
    const { data: places } = usePlaces();
    const navigate = useNavigate();

    const place: IPlace | undefined = React.useMemo(() => {
        for (const country of Object.keys(places.unchecked)) {
            for (const city of Object.keys(places.unchecked[country])) {
                const foundPlace = places.unchecked[country][city].find((p: IPlace) => p.place_id.toString() === placeId);
                if (foundPlace) return foundPlace;
            }
        }
        return undefined;
    }, [places, placeId]);

    if (!place) {
        return <div className="container mt-5">Lieu non trouvé</div>;
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
            <div className="mb-4">
                {place.wikipedia_link && (
                    <a className="btn btn-secondary mr-2" href={place.wikipedia_link} target="_blank" rel="noopener noreferrer">
                        Wikipedia
                    </a>
                )}
                {place.google_maps_link && (
                    <a className="btn btn-secondary mr-2" href={place.google_maps_link} target="_blank" rel="noopener noreferrer">
                        Google Maps
                    </a>
                )}
                {place.instagram_link && (
                    <a className="btn btn-secondary mr-2" href={place.instagram_link} target="_blank" rel="noopener noreferrer">
                        Instagram
                    </a>
                )}
                {place.unsplash_link && (
                    <a className="btn btn-secondary mr-2" href={place.unsplash_link} target="_blank" rel="noopener noreferrer">
                        Unsplash
                    </a>
                )}
            </div>
            <div className="row">
                {place.images.map((image, index) => (
                    <div key={index} className="col-md-4 mb-4">
                        <img src={image.url} className="img-fluid" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CheckPlaceNeedsAttention;
