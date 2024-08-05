import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

interface UploadPhotosModalProps {
    show: boolean;
    onHide: () => void;
    onSubmit: (files: File[]) => void;
}

const UploadPhotosModal: React.FC<UploadPhotosModalProps> = ({ show, onHide, onSubmit }) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setSelectedFiles(Array.from(event.target.files));
        }
    };

    const handleSubmit = () => {
        onSubmit(selectedFiles);
        setSelectedFiles([]);
        onHide();
    };

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>Upload Photos</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group>
                        <Form.Label>Select Photos</Form.Label>
                        <Form.Control
                            type="file"
                            multiple
                            accept=".jpg,.jpeg,.png"
                            onChange={handleFileChange}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Close
                </Button>
                <Button variant="primary" onClick={handleSubmit}>
                    Upload
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default UploadPhotosModal;
