import React, { useState } from 'react';
import { Sparepart } from '../types';
import Button from './ui/Button';
import { XMarkIcon } from './Icons';

interface AddStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (quantity: number) => void;
    sparepart: Sparepart | null;
}

const AddStockModal: React.FC<AddStockModalProps> = ({ isOpen, onClose, onSubmit, sparepart }) => {
    const [quantity, setQuantity] = useState(1);
    const [error, setError] = useState('');

    if (!isOpen || !sparepart) {
        return null;
    }

    const handleSubmit = () => {
        if (quantity <= 0) {
            setError('Quantity must be a positive number.');
            return;
        }
        onSubmit(quantity);
        
        // Reset form for next time
        setQuantity(1);
        setError('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog" onClick={onClose}>
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md mx-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-foreground">Add Stock</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close modal">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="mb-4 p-3 bg-surface-light rounded-md">
                    <p className="text-sm text-foreground-muted">Part Name: <span className="font-semibold text-foreground">{sparepart.name}</span></p>
                    <p className="text-sm text-foreground-muted">Current Stock: <span className="font-semibold text-foreground">{sparepart.stock}</span></p>
                </div>
                
                {error && <p className="text-red-500 text-sm mb-4" role="alert">{error}</p>}

                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="quantity" className="block text-sm font-medium text-foreground-muted mb-1">Quantity to Add</label>
                            <input
                                id="quantity"
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                                className="w-full bg-surface-light border border-gray-600 rounded-md py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                min="1"
                                required
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Confirm Add</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStockModal;