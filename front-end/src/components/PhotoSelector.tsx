import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePlaces } from '../context/PlacesContext';
import './styles/PhotoSelector.css';
import apiClient from '../util/apiClient';
import { Link } from 'react-router-dom'
interface Image {
    image_name: string;
    url: string;
    id: number;
}

const PhotoSelector: React.FC = () => {
    const { countryName, cityName } = useParams<{ countryName: string; cityName: string }>();
    const places = usePlaces();
    const [currentPlaceIndex, setCurrentPlaceIndex] = useState(0);
    const [selectedImages, setSelectedImages] = useState<Image[]>([]);
    const [topImages, setTopImages] = useState<Image[]>([]);
    const [isStepOne, setIsStepOne] = useState(true);

    if (!countryName || !cityName) {
        return <div>Error: Invalid country or city name.</div>;
    }

    const cityPlaces = places[countryName]?.[cityName];
    const placeNames = cityPlaces ? Object.keys(cityPlaces) : [];
    const currentPlaceName = placeNames.length > 0 ? placeNames[currentPlaceIndex] : '';
    const currentPlace = cityPlaces ? cityPlaces[currentPlaceName]?.[0] : null;

    const handleNext = () => {
        setCurrentPlaceIndex((prevIndex) => (prevIndex + 1) % placeNames.length);
        resetSelection();
    };

    const handlePrev = () => {
        setCurrentPlaceIndex((prevIndex) => (prevIndex - 1 + placeNames.length) % placeNames.length);
        resetSelection();
    };

    const handleImageClick = (image: Image) => {
        if (isStepOne) {
            setSelectedImages((prevSelectedImages) => {
                const isSelected = prevSelectedImages.some((img) => img.id === image.id);
                if (isSelected) {
                    return prevSelectedImages.filter((img) => img.id !== image.id);
                } else {
                    return [...prevSelectedImages, image];
                }
            });
        } else {
            setTopImages((prevTopImages) => {
                const isSelected = prevTopImages.some((img) => img.id === image.id);
                if (isSelected) {
                    return prevTopImages.filter((img) => img.id !== image.id);
                } else {
                    return prevTopImages.length < 3 ? [...prevTopImages, image] : prevTopImages;
                }
            });
        }
    };

    const handleDeleteImages = async () => {
        try {
            console.log('Deleting images with IDs:', selectedImages.map((image) => image.id));

            const response = await apiClient.post('/deleteImages', {
                imageIds: selectedImages.map((image) => image.id),
                place_id: currentPlace?.place_id
            });

            console.log('Response from server:', response);

            if (response.status === 200) {
                console.log('Images deleted successfully');

                // Remove deleted images from the state
                setSelectedImages([]);

                // Update the images in the current place
                if (currentPlace) {
                    const updatedImages = currentPlace.images.filter(
                        (image) => !selectedImages.some((selectedImage) => selectedImage.id === image.id)
                    );
                    console.log('Updated images:', updatedImages);

                    currentPlace.images = updatedImages;
                }

                setIsStepOne(false);
            }
        } catch (error) {
            console.error('Error deleting images:', error);
            alert('Failed to delete images');
        }
    };

    const handleSelectTop = async () => {
        try {
            const response = await apiClient.post('/setTop', {
                imageIds: topImages.map((image) => image.id),
                place_id: currentPlace?.place_id
            });
            if (response.status === 200) {
                setTopImages([]);
                setIsStepOne(true);
                handleNext();
            }
        } catch (error) {
            console.error('Error setting top images:', error);
            alert('Failed to set top images');
        }
    };

    const resetSelection = () => {
        setSelectedImages([]);
        setTopImages([]);
        setIsStepOne(true);
    };

    if (!cityPlaces || placeNames.length === 0) {
        return <div>Error: No places found for the given city.</div>;
    }

    console.log('Selected Images:', selectedImages);
    console.log('Top Images:', topImages);

    return (
        <div className="container mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <Link to="/" className="btn btn-primary">
                    Home
                </Link>
                <h2>{cityName}</h2>
            </div>
            <h4 className="mb-4">{currentPlaceName}</h4>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <button className="btn btn-secondary" onClick={handlePrev}>
                    Previous
                </button>
                <div className="text-center">
                    <h4>
                        {currentPlaceIndex + 1} / {placeNames.length}
                    </h4>
                    <h3 className={`mb-4 ${isStepOne ? 'text-danger' : 'text-primary'}`}>
                        {isStepOne ? 'Supprimer les images' : 'Sélectionner le top 3'}
                    </h3>
                </div>
                <div className="mt-4">
                    {isStepOne ? (
                        <button
                            className="btn btn-danger mt-3"
                            onClick={handleDeleteImages}
                            disabled={selectedImages.length === 0}
                        >
                            Supprimer les images
                        </button>
                    ) : (
                        <div>
                            <h4>Choisir le top 3 des images</h4>
                            <button
                                className="btn btn-primary mt-3"
                                onClick={handleSelectTop}
                                disabled={topImages.length !== 3}
                            >
                                Confirmer le Top 3 & Lieu suivant
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="row no-gutters">
                    <div className="col-md-8" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <div className="card-body">
                            <div className="row image-grid">
                                {currentPlace?.images.map((image) => {
                                    const isSelectedDelete = selectedImages.some((img) => img.id === image.id);
                                    const topIndex = topImages.findIndex((img) => img.id === image.id);
                                    return (
                                        <div
                                            key={image.id}
                                            className={`col-4 mb-3 image-container ${isSelectedDelete
                                                ? 'selected-delete'
                                                : topIndex !== -1
                                                    ? 'selected-top'
                                                    : ''
                                                }`}
                                            onClick={() => handleImageClick(image)}
                                        >
                                            <img src={image.url} alt={image.image_name ?? 'Image'} className="img-fluid" />
                                            {isSelectedDelete && (
                                                <div className="selected-overlay">✓</div>
                                            )}
                                            {topIndex !== -1 && (
                                                <div className="selected-overlay">{topIndex + 1}</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4 d-flex flex-column">
                        <div className="flex-grow-1 mb-3 w-100" style={{ height: '90%' }}>
                            <div className="embed-responsive embed-responsive-16by9 h-100 w-100">
                                <iframe
                                    className="embed-responsive-item h-100 w-100"
                                    src={currentPlace?.wikipedia_link}
                                    title="Wikipedia"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                        <div className="flex-grow-2 w-100" style={{ height: '10%' }}>
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
