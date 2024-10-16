import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

interface NeedsAttentionDetailsProps {
    show: boolean;
    onHide: () => void;
    onSubmit: (details: string) => void;
}

const NeedsAttentionDetails: React.FC<NeedsAttentionDetailsProps> = ({ show, onHide, onSubmit }) => {
    const [details, setDetails] = useState('');
    const [isChecked, setIsChecked] = useState(false);

    const handleCheckboxChange = () => {
        setIsChecked(!isChecked);
        if (!isChecked) {
            setDetails('10 - manque de photos');
        } else {
            setDetails('');
        }
    };

    const handleSubmit = () => {
        onSubmit(details);
        setDetails('');
        setIsChecked(false);
        onHide();
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
                            value={isChecked ? '10 - manque de photos' : details}
                            onChange={(e) => setDetails(e.target.value)}
                            disabled={isChecked}
                        />
                    </Form.Group>
                    <Form.Group controlId="notEnoughPhotos">
                        <Form.Check
                            type="checkbox"
                            label="Pas assez de photos"
                            checked={isChecked}
                            onChange={handleCheckboxChange}
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
