import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePlaces } from '../context/PlacesContext';

const PhotoSelector: React.FC = () => {
    const { countryName, cityName } = useParams<{ countryName: string; cityName: string }>();
    const places = usePlaces();
    const [currentPlaceIndex, setCurrentPlaceIndex] = useState(0);

    if (!countryName || !cityName) {
        return <div>Error: Invalid country or city name.</div>;
    }

    const cityPlaces = places[countryName]?.[cityName];
    const placeNames = cityPlaces ? Object.keys(cityPlaces) : [];
    const currentPlaceName = placeNames.length > 0 ? placeNames[currentPlaceIndex] : '';
    const currentPlace = cityPlaces ? cityPlaces[currentPlaceName]?.[0] : null;

    const handleNext = () => {
        setCurrentPlaceIndex((prevIndex) => (prevIndex + 1) % placeNames.length);
    };

    const handlePrev = () => {
        setCurrentPlaceIndex((prevIndex) => (prevIndex - 1 + placeNames.length) % placeNames.length);
    };

    if (!cityPlaces || placeNames.length === 0) {
        return <div>Error: No places found for the given city.</div>;
    }

    return (
        <div className="container mt-5">
            <h2 className="mb-4">{cityName}</h2>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <button className="btn btn-secondary" onClick={handlePrev}>
                    Previous
                </button>
                <h4>
                    {currentPlaceIndex + 1} / {placeNames.length}
                </h4>
                <button className="btn btn-secondary" onClick={handleNext}>
                    Next
                </button>
            </div>
            <div className="card">
                <div className="row no-gutters">
                    <div className="col-md-6" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <div className="card-body">
                            <div className="row">
                                {currentPlace?.images.map((image) => (
                                    <div key={image.image_name} className="col-md-4 mb-3">
                                        <img src={image.url} alt={image.image_name ?? 'Image'} className="img-fluid" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6 d-flex flex-column">
                        <div className="flex-grow-2 mb-3 w-100" style={{ height: '75%' }}>
                            <div className="embed-responsive embed-responsive-16by9 h-100 w-100">
                                <iframe
                                    className="embed-responsive-item h-100 w-100"
                                    src={currentPlace?.wikipedia_link}
                                    title="Wikipedia"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                        <div className="flex-grow-1 w-100" style={{ height: '25%' }}>
                            <div className="embed-responsive embed-responsive-16by9 h-100 w-100">
                                {currentPlace?.google_maps_link ? (
                                    <a
                                        className="btn btn-primary h-100 w-100 d-flex align-items-center justify-content-center"
                                        href={currentPlace.google_maps_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Google Maps
                                    </a>
                                ) : (
                                    <div className="h-100 d-flex align-items-center justify-content-center">
                                        No Google Maps link available
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhotoSelector;
