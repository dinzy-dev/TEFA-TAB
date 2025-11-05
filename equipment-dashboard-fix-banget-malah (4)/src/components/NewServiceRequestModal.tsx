import React, { useState } from 'react';
import { RepairType } from '../types';
import Button from './ui/Button';
import { XMarkIcon } from './Icons';

interface NewServiceRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddOrder: (orderData: { customerName: string; equipment: string; repairType: RepairType }) => void;
}

const NewServiceRequestModal: React.FC<NewServiceRequestModalProps> = ({ isOpen, onClose, onAddOrder }) => {
    const [customerName, setCustomerName] = useState('');
    const [equipment, setEquipment] = useState('');
    const [repairType, setRepairType] = useState<RepairType>(RepairType.MINOR);
    const [error, setError] = useState('');

    if (!isOpen) {
        return null;
    }

    const handleSubmit = () => {
        if (!customerName.trim() || !equipment.trim()) {
            setError('All fields are required.');
            return;
        }
        onAddOrder({ customerName, equipment, repairType });
        
        setCustomerName('');
        setEquipment('');
        setRepairType(RepairType.MINOR);
        setError('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" aria-modal="true" role="dialog" onClick={onClose}>
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-foreground">New Service Request</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close modal">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                {error && <p className="text-red-500 text-sm mb-4" role="alert">{error}</p>}

                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="customerName" className="block text-sm font-medium text-foreground-muted mb-1">Customer Name</label>
                            <input
                                id="customerName"
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full bg-surface-light border border-gray-600 rounded-md py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="e.g., PT. Sukses Selalu"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="equipment" className="block text-sm font-medium text-foreground-muted mb-1">Equipment</label>
                            <input
                                id="equipment"
                                type="text"
                                value={equipment}
                                onChange={(e) => setEquipment(e.target.value)}
                                className="w-full bg-surface-light border border-gray-600 rounded-md py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="e.g., Bulldozer D85ESS"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="repairType" className="block text-sm font-medium text-foreground-muted mb-1">Repair Type</label>
                            <select
                                id="repairType"
                                value={repairType}
                                onChange={(e) => setRepairType(e.target.value as RepairType)}
                                className="w-full bg-surface-light border border-gray-600 rounded-md py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {Object.values(RepairType).map((type) => (
                                    <option key={type as string} value={type as string}>{type as string}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Create Request</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewServiceRequestModal;
