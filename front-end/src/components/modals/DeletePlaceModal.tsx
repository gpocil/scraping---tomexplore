import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

interface DeletePlaceModalProps {
    show: boolean;
    onHide: () => void;
    onConfirm: (details: string) => void;
}


const DeletePlaceModal: React.FC<DeletePlaceModalProps> = ({ show, onHide, onConfirm }) => {

    const [details, setDetails] = useState('');

    const handleSubmit = () => {
        onConfirm(details);
        setDetails(''); // Clear the text field after submission
        onHide(); // Close the modal
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Confirmation de suppression</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                Êtes-vous sûr de vouloir supprimer ce lieu ? Cette action est irréversible.
                <Form>
                    <Form.Group controlId="details">
                        <Form.Label>Détails</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                        />
                    </Form.Group>
                </Form>

            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Annuler
                </Button>
                <Button variant="danger" onClick={handleSubmit} disabled={details.length <= 15}>
                    Confirmer
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default DeletePlaceModal;
