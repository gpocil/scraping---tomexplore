import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

interface NeedsAttentionDetailsProps {
    show: boolean;
    onHide: () => void;
    onSubmit: (details: string) => void;
}

const NeedsAttentionDetails: React.FC<NeedsAttentionDetailsProps> = ({ show, onHide, onSubmit }) => {
    const [details, setDetails] = useState('');

    const handleSubmit = () => {
        onSubmit(details);
        setDetails(''); // Clear the text field after submission
        onHide(); // Close the modal
    };

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>Quel est le problème ?</Modal.Title>
            </Modal.Header>
            <Modal.Body>
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
                <Button variant="primary" onClick={handleSubmit}>
                    Envoyer
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default NeedsAttentionDetails;
