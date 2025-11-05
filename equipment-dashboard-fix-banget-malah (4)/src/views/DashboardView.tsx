import React, { useState, useEffect } from 'react';
import { Order, UserRole, OrderStatus, RepairType } from '../types';
import KanbanBoard from '../components/KanbanBoard';
import { PlusIcon, XMarkIcon } from '../components/Icons';
import Button from '../components/ui/Button';
import NewServiceRequestModal from '../components/NewServiceRequestModal';
import ServiceRequestDetailModal from '../components/ServiceRequestDetailModal';
import { supabase } from '../lib/supabase';
import { toCamelCase, toSnakeCase } from '../lib/utils';
import { AuthenticatedUser } from '../lib/auth';

interface DashboardViewProps {
    currentUser: AuthenticatedUser;
}

const DashboardView: React.FC<DashboardViewProps> = ({ currentUser }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [transientError, setTransientError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            setIsLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('request_date', { ascending: false });

            if (error) {
                setError(`Failed to fetch orders: ${error.message}`);
            } else if (data) {
                setOrders(data.map(order => toCamelCase(order) as Order));
            }
            setIsLoading(false);
        };

        fetchOrders();
    }, []);

    const handleAddOrder = async (orderData: { customerName: string; equipment: string; repairType: RepairType }) => {
        setTransientError(null);
        const newOrderPayload = {
            customerName: orderData.customerName,
            equipment: orderData.equipment,
            repairType: orderData.repairType,
            requestDate: new Date().toISOString(),
            status: OrderStatus.NEW,
            assignedEngineer: 'N/A',
            progress: 5,
            repairLogs: [],
            userId: currentUser.id,
        };

        const { data, error } = await supabase
            .from('orders')
            .insert(toSnakeCase(newOrderPayload))
            .select()
            .single();

        if (error) {
            setTransientError('Error creating new service request: ' + error.message);
        } else if (data) {
            setOrders(prevOrders => [toCamelCase(data) as Order, ...prevOrders]);
        }
    };

    const handleUpdateOrder = async (updatedOrder: Order) => {
        setTransientError(null);
        
        // Use object destructuring to immutably separate the primary key (serviceId)
        // from the rest of the data that needs to be updated. This avoids the
        // TypeScript error with the 'delete' operator on a required property.
        const { serviceId, ...updatePayload } = updatedOrder;

        const { data, error } = await supabase
            .from('orders')
            .update(toSnakeCase(updatePayload))
            .eq('service_id', serviceId)
            .select()
            .single();
        
        if (error) {
            setTransientError('Error updating service request: ' + error.message);
        } else if (data) {
            const result = toCamelCase(data) as Order;
            setOrders(prevOrders => prevOrders.map(order => order.serviceId === result.serviceId ? result : order));
            setSelectedOrder(result); // Keep modal open by refreshing its data
        }
    };

    const handleSelectOrder = (order: Order) => {
        setSelectedOrder(order);
    };

    const handleCloseDetailModal = () => {
        setSelectedOrder(null);
    };

    const canCreateOrder = [UserRole.MARKETING].includes(currentUser.role);

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <h1 className="text-3xl font-bold text-foreground mb-4 md:mb-0">Global Order Status</h1>
                {canCreateOrder && (
                    <Button onClick={() => setIsNewRequestModalOpen(true)}>
                        <PlusIcon className="w-5 h-5 mr-2"/>
                        New Service Request
                    </Button>
                )}
            </div>
            
            {transientError && (
                <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-4" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{transientError}</span>
                    <button onClick={() => setTransientError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3" aria-label="Close">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            )}

            {isLoading && <p className="text-center text-foreground-muted">Loading orders...</p>}
            {error && (
                <div className="p-4 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                    <h3 className="font-bold">Failed to load data</h3>
                    <p className="text-sm">{error}</p>
                </div>
            )}
            {!isLoading && !error && <KanbanBoard orders={orders} onCardClick={handleSelectOrder} />}
            
            <NewServiceRequestModal 
                isOpen={isNewRequestModalOpen}
                onClose={() => setIsNewRequestModalOpen(false)}
                onAddOrder={handleAddOrder}
            />

            {selectedOrder && (
                 <ServiceRequestDetailModal
                    order={selectedOrder}
                    isOpen={!!selectedOrder}
                    onClose={handleCloseDetailModal}
                    onUpdateOrder={handleUpdateOrder}
                    currentUser={currentUser}
                />
            )}
        </div>
    );
};

export default DashboardView;