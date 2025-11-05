import React, { useState, useEffect, useMemo } from 'react';
import { Sparepart, UserRole, PurchaseOrderStatus, SparepartStatus } from '../types';
import { supabase } from '../lib/supabase';
import { toCamelCase, toSnakeCase } from '../lib/utils';
import Table, { Column } from '../components/ui/Table';
import Button from '../components/ui/Button';
import { MagnifyingGlassIcon, PlusIcon } from '../components/Icons';
import RequestPurchaseModal from '../components/RequestPurchaseModal';
import AddStockModal from '../components/AddStockModal';
import Card from '../components/ui/Card';
import { AuthenticatedUser } from '../lib/auth';

interface SparepartsViewProps {
    currentUser: AuthenticatedUser;
}

const SparepartsView: React.FC<SparepartsViewProps> = ({ currentUser }) => {
    const [spareparts, setSpareparts] = useState<Sparepart[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');
    
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [selectedPartForPurchase, setSelectedPartForPurchase] = useState<Sparepart | null>(null);
    
    const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
    const [selectedPartForStock, setSelectedPartForStock] = useState<Sparepart | null>(null);

    const [notification, setNotification] = useState('');

    useEffect(() => {
        const fetchSpareparts = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.from('spareparts').select('*');
            if (error) {
                setError(`Failed to fetch spareparts: ${error.message}`);
            } else {
                setSpareparts(data.map(p => toCamelCase(p) as Sparepart));
            }
            setIsLoading(false);
        };
        fetchSpareparts();
    }, []);
    
    const filteredSpareparts = useMemo(() => {
        return spareparts.filter(part => {
            const matchesSearch =
                part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                part.partId.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' || part.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [spareparts, searchTerm, statusFilter]);
    
    const handleRequestPurchase = (part: Sparepart) => {
        setSelectedPartForPurchase(part);
        setIsPurchaseModalOpen(true);
    };

    const handlePurchaseSubmit = async (data: { partId: string; partName: string; quantity: number; justification: string }) => {
        const payload = {
            ...data,
            requestor: currentUser.username,
            requestDate: new Date().toISOString(),
            status: PurchaseOrderStatus.PENDING,
            requestorId: currentUser.id,
        };
        const { error } = await supabase.from('purchase_orders').insert(toSnakeCase(payload));
        if (error) {
            setError(`Failed to submit purchase request: ${error.message}`);
        } else {
            setNotification(`Purchase request for ${data.partName} submitted successfully.`);
            setTimeout(() => setNotification(''), 3000);
        }
        setIsPurchaseModalOpen(false);
        setSelectedPartForPurchase(null);
    };

    const handleOpenAddStockModal = (part: Sparepart) => {
        setSelectedPartForStock(part);
        setIsAddStockModalOpen(true);
    };

    const handleAddStockSubmit = async (quantity: number) => {
        if (!selectedPartForStock) return;

        const newStock = selectedPartForStock.stock + quantity;
        const newStatus = newStock > 0 ? SparepartStatus.AVAILABLE : selectedPartForStock.status;

        const originalSpareparts = [...spareparts];
        const updatedSpareparts = spareparts.map(p =>
            p.partId === selectedPartForStock.partId ? { ...p, stock: newStock, status: newStatus } : p
        );
        setSpareparts(updatedSpareparts);

        const { error: updateError } = await supabase
            .from('spareparts')
            .update({ stock: newStock, status: newStatus })
            .eq('part_id', selectedPartForStock.partId);

        if (updateError) {
            setError(`Failed to update stock: ${updateError.message}`);
            setSpareparts(originalSpareparts); // Revert on failure
        } else {
            setNotification(`Stock for ${selectedPartForStock.name} updated successfully.`);
            setTimeout(() => setNotification(''), 3000);
        }

        setIsAddStockModalOpen(false);
        setSelectedPartForStock(null);
    };

    const columns: Column<Sparepart>[] = [
        { header: 'Part ID', accessor: 'partId' },
        { header: 'Name', accessor: 'name' },
        { header: 'Stock', accessor: 'stock' },
        { header: 'Status', accessor: 'status', cell: (status: SparepartStatus) => {
            const color = status === SparepartStatus.AVAILABLE ? 'text-green-400' : 'text-yellow-400';
            return <span className={`font-semibold ${color}`}>{status}</span>;
        }},
        { header: 'Location', accessor: 'location' },
        {
            header: 'Actions',
            accessor: 'partId',
            cell: (_, row) => {
                if (currentUser.role === UserRole.PPIC) {
                    return (
                        <Button size="sm" onClick={() => handleOpenAddStockModal(row)}>
                            <PlusIcon className="w-4 h-4 mr-1"/>
                            Add Stock
                        </Button>
                    );
                }
                if (currentUser.role === UserRole.ENGINEER) {
                    return (
                        <Button size="sm" onClick={() => handleRequestPurchase(row)}>Request Purchase</Button>
                    );
                }
                return null;
            },
        }
    ];

    if (isLoading) return <p className="text-center text-foreground-muted">Loading spareparts inventory...</p>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-foreground mb-6">Spareparts Inventory</h1>

            {error && (
                <div className="p-4 mb-4 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                    <h3 className="font-bold">An Error Occurred</h3>
                    <p className="text-sm">{error}</p>
                </div>
            )}
            
            {notification && (
                 <div className="p-3 mb-4 text-center bg-green-900/50 border border-green-700 text-green-300 rounded-lg">
                    {notification}
                </div>
            )}

            <Card>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="relative flex-grow">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                        <input
                            type="text"
                            placeholder="Search by part name or ID..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-surface-light border border-gray-600 rounded-md py-2 pl-10 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                         className="bg-surface-light border border-gray-600 rounded-md py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="All">All Statuses</option>
                        {Object.values(SparepartStatus).map((s) => <option key={s as string} value={s as string}>{s as string}</option>)}
                    </select>
                </div>
                <Table columns={columns} data={filteredSpareparts} />
            </Card>

            <RequestPurchaseModal
                isOpen={isPurchaseModalOpen}
                onClose={() => setIsPurchaseModalOpen(false)}
                onSubmit={handlePurchaseSubmit}
                sparepart={selectedPartForPurchase}
            />

            <AddStockModal
                isOpen={isAddStockModalOpen}
                onClose={() => setIsAddStockModalOpen(false)}
                onSubmit={handleAddStockSubmit}
                sparepart={selectedPartForStock}
            />
        </div>
    );
};

export default SparepartsView;