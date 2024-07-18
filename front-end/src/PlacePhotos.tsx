import React, { useState } from 'react';
import axiosInstance from './util/apiClient';
import 'bootstrap/dist/css/bootstrap.min.css';

const PlacePhotos: React.FC = () => {
    const [placeId, setPlaceId] = useState<number | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [apiResponse, setApiResponse] = useState<string[] | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPlaceId(Number(e.target.value));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (placeId !== null) {
            fetchImagesByPlaceId(placeId);
        }
    };

    const fetchImagesByPlaceId = async (placeId: number) => {
        try {
            const response = await axiosInstance.get<string[]>(`/${placeId}/images`);
            setApiResponse(response.data);
            setImages(response.data);
        } catch (error) {
            console.error('Error fetching images:', error);
        }
    };

    return (
        <div className="container mt-5">
            <div className="row">
                <div className="col-8">
                    <h1 className="mb-4">Place Photos</h1>
                    <form onSubmit={handleSubmit} className="mb-4">
                        <div className="input-group">
                            <input
                                type="number"
                                className="form-control"
                                value={placeId ?? ''}
                                onChange={handleInputChange}
                                placeholder="Enter Place ID"
                            />
                            <div className="input-group-append">
                                <button className="btn btn-primary" type="submit">Récup images</button>
                            </div>
                        </div>
                    </form>

                    <div className="row">
                        {images.length > 0 ? (
                            images.map((image, index) => (
                                <div className="col-4 col-md-3 col-lg-2 mb-3 px-1" key={index}>
                                    <div className="card">
                                        <img src={image} alt={`Image ${index}`} className="card-img-top" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted">No images found. Please enter a valid Place ID.</p>
                        )}
                    </div>
                </div>
                <div className="col-4">
                    {/* Placeholder for the content on the right */}
                    <h2>Right Section</h2>
                    <p>Additional content can be placed here.</p>
                </div>
            </div>
        </div>
    );
};

export default PlacePhotos;
