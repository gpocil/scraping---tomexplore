import React, { useState, useEffect } from 'react';
import { IPlace, IImage } from '../model/Interfaces';
import './styles/PhotoSelectorCity.css';
import apiClient from '../util/apiClient';
import { useNavigate } from 'react-router-dom';
import { usePlaces } from '../context/PlacesContext';

interface PhotoSelectorPlaceProps {
    place: IPlace;
    onComplete: () => void;
}

const PhotoSelectorPlace: React.FC<PhotoSelectorPlaceProps> = ({ place, onComplete }) => {
    const navigate = useNavigate();
    const { updatePlaces } = usePlaces();
    const [selectedImages, setSelectedImages] = useState<IImage[]>([]);
    const [topImages, setTopImages] = useState<IImage[]>([]);
    const [isStepOne, setIsStepOne] = useState(true);
    const [isPlaceComplete, setIsPlaceComplete] = useState(false);

    useEffect(() => {
        if (isPlaceComplete) {
            onComplete();
        }
    }, [isPlaceComplete, onComplete]);

    const handleImageClick = (image: IImage) => {
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
            const response = await apiClient.post('/front/deleteImages', {
                imageIds: selectedImages.map((image) => image.id),
                place_id: place?.place_id
            });

            if (response.status === 200) {
                setSelectedImages([]);
                place.images = place.images.filter(
                    (image) => !selectedImages.some((selectedImage) => selectedImage.id === image.id)
                );
                setIsStepOne(false);
            }
        } catch (error) {
            console.error('Error deleting images:', error);
            alert('Failed to delete images');
        }
    };

    const handleSelectTop = async () => {
        try {
            const response = await apiClient.post('/front/setTop', {
                imageIds: topImages.map((image) => image.id),
                place_id: place?.place_id
            });
            if (response.status === 200) {
                setTopImages([]);
                setIsStepOne(true);
                setIsPlaceComplete(true);
            }
        } catch (error) {
            console.error('Error setting top images:', error);
            alert('Failed to set top images');
        }
    };

    if (isPlaceComplete) {
        updatePlaces();
        return (
            <div className="container mt-5 text-center">
                <h1>Lieu terminé</h1>
                <button className="btn btn-primary mt-3" onClick={() => navigate('/')}>
                    Accueil
                </button>
            </div>
        );
    }

    if (!place) {
        return <div>Error: No place found.</div>;
    }

    const totalImages = place?.images?.length || 0;

    return (
        <div className="container mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <button className="btn btn-primary" onClick={() => navigate('/')}>
                    Home
                </button>
                <h2>{place.place_name}</h2>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="text-center">
                    <h4>
                        {isStepOne ? 'Supprimer les images' : 'Sélectionner le top 3'}
                    </h4>
                </div>
                <div className="mt-4">
                    {isStepOne ? (
                        selectedImages.length === 0 ? (
                            <button className="btn btn-primary mt-3" onClick={() => setIsStepOne(false)}>
                                Aucune image à supprimer
                            </button>
                        ) : (
                            <button className="btn btn-danger mt-3" onClick={handleDeleteImages}>
                                Supprimer les images
                            </button>
                        )
                    ) : (
                        <button
                            className="btn btn-primary mt-3"
                            onClick={handleSelectTop}
                            disabled={totalImages > 3 ? topImages.length !== 3 : topImages.length > 3}
                        >
                            Confirmer le Top 3
                        </button>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="row no-gutters">
                    <div className="col-md-8" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <div className="card-body">
                            <div className="row image-grid">
                                {place?.images?.map((image) => {
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
                                            {isSelectedDelete && <div className="selected-overlay">✓</div>}
                                            {topIndex !== -1 && <div className="selected-overlay">{topIndex + 1}</div>}
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
                                    src={place?.wikipedia_link}
                                    title="Wikipedia"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                        <div className="flex-grow-2 w-100" style={{ height: '10%' }}>
                            <div className="embed-responsive embed-responsive-16by9 h-100 w-100">
                                {place?.google_maps_link ? (
                                    <a
                                        className="btn btn-primary h-100 w-100 d-flex align-items-center justify-content-center"
                                        href={place.google_maps_link}
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

export default PhotoSelectorPlace;
