import React from 'react';
import { Modal, Button } from 'react-bootstrap';

interface DeletePlaceModalProps {
    show: boolean;
    onHide: () => void;
    onConfirm: () => void;
}

const DeletePlaceModal: React.FC<DeletePlaceModalProps> = ({ show, onHide, onConfirm }) => {
    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Confirmation de suppression</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                Êtes-vous sûr de vouloir supprimer ce lieu ? Cette action est irréversible.
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Annuler
                </Button>
                <Button variant="danger" onClick={onConfirm}>
                    Confirmer
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default DeletePlaceModal;
