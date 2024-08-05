import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlaces } from '../context/PlacesContext';
import { IPlace, IImage } from '../model/Interfaces';
import apiClient from '../util/apiClient';
import UploadPhotosModal from './UploadPhotosModal';
import { Button, Container, Row, Col } from 'react-bootstrap';
import './styles/CheckPlaceNeedsAttention.css';

const CheckPlaceNeedsAttention: React.FC = () => {
    const { placeId } = useParams<{ placeId: string }>();
    const { findPlaceById, updatePlaces } = usePlaces();
    const navigate = useNavigate();

    const [selectedImages, setSelectedImages] = useState<IImage[]>([]);
    const [topImages, setTopImages] = useState<IImage[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSettingTop, setIsSettingTop] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    const place: IPlace | undefined = useMemo(() => {
        console.log('useMemo called with placeId:', placeId);
        if (!placeId) return undefined;
        const foundPlace = findPlaceById(Number(placeId));
        console.log('Found place:', foundPlace);
        return foundPlace;
    }, [findPlaceById, placeId]);

    useEffect(() => {
        console.log('Component mounted');
        return () => {
            console.log('Component unmounted');
        };
    }, []);

    if (!placeId || !place) {
        console.log('No place found for placeId:', placeId);
        return <Container className="mt-5">Lieu non trouvé</Container>;
    }

    const handleImageClick = (image: IImage) => {
        console.log('Image clicked:', image);
        if (isDeleting) {
            setSelectedImages((prevSelectedImages) => {
                const isSelected = prevSelectedImages.some((img) => img.id === image.id);
                const newSelectedImages = isSelected
                    ? prevSelectedImages.filter((img) => img.id !== image.id)
                    : [...prevSelectedImages, image];
                console.log('Updated selectedImages:', newSelectedImages);
                return newSelectedImages;
            });
        } else if (isSettingTop) {
            setTopImages((prevTopImages) => {
                const isSelected = prevTopImages.some((img) => img.id === image.id);
                const newTopImages = isSelected
                    ? prevTopImages.filter((img) => img.id !== image.id)
                    : prevTopImages.length < 3 ? [...prevTopImages, image] : prevTopImages;
                console.log('Updated topImages:', newTopImages);
                return newTopImages;
            });
        }
    };

    const handleDeleteImages = async () => {
        console.log('Deleting images:', selectedImages);
        try {
            const response = await apiClient.post('/front/deleteImages', {
                imageIds: selectedImages.map((image) => image.id),
                place_id: place?.place_id
            });
            console.log('Delete images response:', response);

            if (response.status === 200) {
                setSelectedImages([]);
                place.images = place.images.filter(
                    (image) => !selectedImages.some((selectedImage) => selectedImage.id === image.id)
                );
                updatePlaces();
            }
        } catch (error) {
            console.error('Error deleting images:', error);
            alert('Failed to delete images');
        }
    };

    const handleSetTopImages = async () => {
        console.log('Setting top images:', topImages);
        try {
            const response = await apiClient.post('/front/setTop', {
                imageIds: topImages.map((image) => image.id),
                place_id: place?.place_id
            });
            console.log('Set top images response:', response);

            if (response.status === 200) {
                setTopImages([]);
                place.checked = true;
                updatePlaces();
            }
        } catch (error) {
            console.error('Error setting top images:', error);
            alert('Failed to set top images');
        }
    };

    const handleUploadSubmit = async (files: File[]) => {
        console.log('Uploading files:', files);
        const formData = new FormData();
        files.forEach(file => {
            formData.append('photos', file);
            console.log('Added file to FormData:', file.name);
        });

        const placeId = place.place_id.toString();
        console.log('Added place_id to FormData:', placeId);

        try {
            const response = await apiClient.post(`/front/uploadPhotos/${placeId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log('Upload response:', response);
            if (response.status === 200) {
                updatePlaces();
                alert('Photos uploaded successfully');
            }
        } catch (error) {
            console.error('Error uploading photos:', error);
            alert('Failed to upload photos');
        }
    };

    const handleBackClick = () => {
        console.log('Navigating back');
        navigate('/places-needing-attention');
    };

    return (
        <Container className="mt-5">
            <Row>
                <Col md={2} className="d-flex flex-column align-items-start">
                    <Button className="mb-3 w-100" variant="primary" onClick={handleBackClick}>
                        🔙 Retour
                    </Button>
                    <Button className="mb-3 w-100" variant="danger" onClick={() => setIsDeleting(!isDeleting)}>
                        {isDeleting ? '❌ Annuler' : '🗑️ Supprimer photos'}
                    </Button>
                    <Button className="mb-3 w-100" variant="primary" onClick={() => setIsSettingTop(!isSettingTop)}>
                        {isSettingTop ? '❌ Annuler' : '⭐ Définir top 3 et valider'}
                    </Button>
                    <Button className="mb-3 w-100" variant="success" onClick={() => setShowUploadModal(true)}>
                        📤 Uploader des photos
                    </Button>
                    {isDeleting && (
                        <Button className="mb-3 w-100" variant="danger" onClick={handleDeleteImages} disabled={selectedImages.length === 0}>
                            🗑️ Confirmer suppression
                        </Button>
                    )}
                    {isSettingTop && (
                        <Button className="mb-3 w-100" variant="primary" onClick={handleSetTopImages} disabled={topImages.length !== 3}>
                            ⭐ Confirmer top 3
                        </Button>
                    )}
                </Col>
                <Col md={10}>
                    <h1 className="mb-4 text-center">{place.place_name}</h1>
                    {place.details && <h2 className="mb-4 text-center">🚨 {place.details}</h2>}
                    <div className="mb-4 text-center">
                        {place.wikipedia_link && (
                            <a className="btn btn-secondary mx-2 mb-2" href={place.wikipedia_link} target="_blank" rel="noopener noreferrer">
                                🌐 Wikipedia
                            </a>
                        )}
                        {place.google_maps_link && (
                            <a className="btn btn-secondary mx-2 mb-2" href={place.google_maps_link} target="_blank" rel="noopener noreferrer">
                                🗺️ Google Maps
                            </a>
                        )}
                        {place.instagram_link && (
                            <a className="btn btn-secondary mx-2 mb-2" href={place.instagram_link} target="_blank" rel="noopener noreferrer">
                                📸 Instagram
                            </a>
                        )}
                        {place.unsplash_link && (
                            <a className="btn btn-secondary mx-2 mb-2" href={place.unsplash_link} target="_blank" rel="noopener noreferrer">
                                📷 Unsplash
                            </a>
                        )}
                    </div>

                    <Row>
                        {place.images.map((image, index) => (
                            <Col md={4} key={index} className="mb-4 image-container">
                                <div
                                    className={`image-wrapper ${selectedImages.includes(image) ? 'selected-delete' : ''} ${topImages.includes(image) ? 'selected-top' : ''}`}
                                    onClick={() => handleImageClick(image)}
                                >
                                    <img src={image.url} className="img-fluid rounded" />
                                    {selectedImages.includes(image) && <div className="selected-overlay">✓</div>}
                                    {topImages.includes(image) && <div className="selected-overlay">{topImages.indexOf(image) + 1}</div>}
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Col>
            </Row>
            <UploadPhotosModal
                show={showUploadModal}
                onHide={() => setShowUploadModal(false)}
                onSubmit={handleUploadSubmit}
            />
        </Container>
    );
};

export default CheckPlaceNeedsAttention;
