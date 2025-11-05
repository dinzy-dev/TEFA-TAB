import React, { useState, useEffect, useMemo } from 'react';
import { PurchaseOrder, PurchaseOrderStatus } from '../types';
import { supabase } from '../lib/supabase';
import { toCamelCase, formatDate } from '../lib/utils';
import Table, { Column } from '../components/ui/Table';
import { MagnifyingGlassIcon } from '../components/Icons';
import Card from '../components/ui/Card';

const PurchaseOrdersView: React.FC = () => {
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');

    useEffect(() => {
        const fetchPurchaseOrders = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.from('purchase_orders').select('*').order('request_date', { ascending: false });
            if (error) {
                setError(`Failed to fetch purchase orders: ${error.message}`);
            } else {
                setPurchaseOrders(data.map(p => toCamelCase(p) as PurchaseOrder));
            }
            setIsLoading(false);
        };
        fetchPurchaseOrders();
    }, []);
    
    const filteredOrders = useMemo(() => {
        return purchaseOrders.filter(order => {
            const lowerSearch = searchTerm.toLowerCase();
            const matchesSearch =
                order.purchaseOrderId.toLowerCase().includes(lowerSearch) ||
                order.partName.toLowerCase().includes(lowerSearch) ||
                order.requestor.toLowerCase().includes(lowerSearch);
            const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [purchaseOrders, searchTerm, statusFilter]);

    const statusColors: Record<PurchaseOrderStatus, string> = {
        [PurchaseOrderStatus.PENDING]: 'bg-yellow-500/20 text-yellow-300',
        [PurchaseOrderStatus.APPROVED]: 'bg-blue-500/20 text-blue-300',
        [PurchaseOrderStatus.ORDERED]: 'bg-indigo-500/20 text-indigo-300',
        [PurchaseOrderStatus.RECEIVED]: 'bg-green-500/20 text-green-300',
        [PurchaseOrderStatus.CANCELLED]: 'bg-red-500/20 text-red-300',
    };

    const columns: Column<PurchaseOrder>[] = [
        { header: 'PO ID', accessor: 'purchaseOrderId' },
        { header: 'Part Name', accessor: 'partName' },
        { header: 'Quantity', accessor: 'quantity' },
        { header: 'Requestor', accessor: 'requestor' },
        { header: 'Request Date', accessor: 'requestDate', cell: (date) => formatDate(date) },
        { header: 'Status', accessor: 'status', cell: (status: PurchaseOrderStatus) => (
             <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>{status}</span>
        )},
    ];

    if (isLoading) return <p className="text-center text-foreground-muted">Loading purchase orders...</p>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-foreground mb-6">Purchase Orders</h1>
            {error && (
                <div className="p-4 mb-4 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                    <h3 className="font-bold">An Error Occurred</h3>
                    <p className="text-sm">{error}</p>
                </div>
            )}
            <Card>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="relative flex-grow">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                        <input
                            type="text"
                            placeholder="Search by PO ID, Part Name, or Requestor..."
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
                        {Object.values(PurchaseOrderStatus).map((s) => <option key={s as string} value={s as string}>{s as string}</option>)}
                    </select>
                </div>
                <Table columns={columns} data={filteredOrders} />
            </Card>
        </div>
    );
};

export default PurchaseOrdersView;