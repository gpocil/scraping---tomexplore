import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IPlace, IImage } from '../model/Interfaces';
import apiClient from '../util/apiClient';
import UploadPhotosModal from './modals/UploadPhotosModal';
import DeletePlaceModal from './modals/DeletePlaceModal';
import { Button, Container, Row, Col, Form, Spinner } from 'react-bootstrap';
import './styles/CheckPlaceNeedsAttention.css';
import { usePlaces } from '../context/PlacesContext';

interface CheckPlaceNeedsAttentionProps {
    place: IPlace;
}

const CheckPlaceNeedsAttention: React.FC<CheckPlaceNeedsAttentionProps> = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const place = (location.state as { place: IPlace }).place;
    const { updatePlaces } = usePlaces();

    const [selectedImages, setSelectedImages] = useState<IImage[]>([]);
    const [topImages, setTopImages] = useState<IImage[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSettingTop, setIsSettingTop] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showInstagramInput, setShowInstagramInput] = useState(false);
    const [instagramLink, setInstagramLink] = useState(place.instagram_link || '');
    const [isScraping, setIsScraping] = useState(false);
    const [images, setImages] = useState<IImage[]>(place.images || []);

    useEffect(() => {
        console.log('Component mounted');
        return () => {
            console.log('Component unmounted');
        };
    }, []);

    useEffect(() => {
        setImages(place.images);
    }, [place.images]);

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
    const generateGoogleSearchUrl = (placeName: string, cityName: string): string => {
        const query = `${placeName} ${cityName} instagram`.replace(/\s+/g, '+');
        return `https://www.google.com/search?q=${query}`;
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
                setImages(prevImages => prevImages.filter(
                    (image) => !selectedImages.some((selectedImage) => selectedImage.id === image.id)
                ));
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
                handleBackClick();
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

    const handleDeletePlace = async () => {
        try {
            const response = await apiClient.post('/front/setPlaceToBeDeleted', {
                place_id: place?.place_id
            });

            if (response.status === 200) {
                updatePlaces();
                handleBackClick();
            }
        } catch (error) {
            console.error('Error deleting place:', error);
            alert('Failed to delete place');
        }
    };

    const handleInstagramUpdate = async () => {
        setIsScraping(true);
        try {
            const response = await apiClient.post('/front/updateInstagram', {
                place_id: place?.place_id,
                instagram_link: instagramLink
            });

            if (response.status === 200) {
                await updateImages();
                updatePlaces();
                alert('Instagram updated and images scraped successfully');
            }
        } catch (error) {
            console.error('Error updating Instagram:', error);
            alert('Failed to update Instagram');
        } finally {
            setIsScraping(false);
        }
    };

    const updateImages = async () => {
        try {
            const response = await apiClient.get(`/front/${place?.place_id}/images`);
            console.log('Update images response:', response);
            if (response.status === 200) {
                const newImages = response.data.map((url: string, index: number) => ({
                    id: index,
                    image_name: url.split('/').pop() || `image_${index}`,
                    url: url
                }));
                setImages(newImages);
            }
        } catch (error) {
            console.error('Error updating images:', error);
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
                    <Button className="mb-3 w-100" variant="success" onClick={() => {
                        const url = generateGoogleSearchUrl(place.place_name, "");
                        window.open(url, '_blank');
                    }}>
                        📷 Rechercher Instagram
                    </Button>

                    <Button className="mb-3 w-100" variant="info" onClick={() => setShowInstagramInput(!showInstagramInput)}>
                        {showInstagramInput ? '❌ Annuler' : '📸 Mettre l\'Instagram à jour'}
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
                        <Row className="justify-content-center">
                            <Col xs="auto">
                                <Button className="mb-3" variant="danger" onClick={() => setShowDeleteModal(true)}>
                                    🗑️ Supprimer le lieu
                                </Button>
                            </Col>
                        </Row>
                    </div>

                    {showInstagramInput && (
                        <Row className="justify-content-center">
                            <Col xs="auto">
                                <Form.Group controlId="instagramLink">
                                    <Form.Label>Instagram Link</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={instagramLink}
                                        onChange={(e) => setInstagramLink(e.target.value)}
                                        placeholder="Enter new Instagram link"
                                    />
                                </Form.Group>
                                <Button className="mt-3" variant="primary" onClick={handleInstagramUpdate} disabled={isScraping}>
                                    {isScraping ? (
                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                    ) : (
                                        'Mettre à jour Instagram'
                                    )}
                                </Button>
                            </Col>
                        </Row>
                    )}

                    <Row>
                        {images.map((image, index) => (
                            <Col md={4} key={index} className="mb-4">
                                <div
                                    className={`image-container ${selectedImages.includes(image) ? 'selected-delete' : ''} ${topImages.includes(image) ? 'selected-top' : ''}`}
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
            <DeletePlaceModal
                show={showDeleteModal}
                onHide={() => setShowDeleteModal(false)}
                onConfirm={handleDeletePlace}
            />
        </Container>
    );
};

export default CheckPlaceNeedsAttention;
