import React, { useState, useEffect } from 'react';
import { ORDER_STATUS_SEQUENCE } from '../constants';
import { Order, OrderStatus } from '../types';
import Card from '../components/ui/Card';
import { ArrowDownTrayIcon } from '../components/Icons';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { toCamelCase, formatDate } from '../lib/utils';

interface CustomerViewProps {
    serviceId: string;
}

const CustomerView: React.FC<CustomerViewProps> = ({ serviceId }) => {
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCustomerOrder = async () => {
             if (!serviceId || !serviceId.toUpperCase().startsWith('SRV-')) {
                setError('Invalid or missing Service ID.');
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError(null);
            
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('service_id', serviceId)
                .single();

            if (error) {
                setError(`Could not find details for ${serviceId}. Please ensure the ID is correct.`);
            } else if (data) {
                setOrder(toCamelCase(data) as Order);
            } else {
                setOrder(null);
            }
            setIsLoading(false);
        };
        fetchCustomerOrder();
    }, [serviceId]);

    if (isLoading) {
        return <p className="text-center text-foreground-muted">Loading your service details...</p>;
    }

    if (error) {
         return (
            <div className="p-4 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                <h3 className="font-bold">Could not load service details</h3>
                <p className="text-sm">{error}</p>
            </div>
        );
    }
    
    if (!order) {
        return <p className="text-center text-foreground-muted">No active service requests found for your account.</p>;
    }

    const currentStatusIndex = ORDER_STATUS_SEQUENCE.indexOf(order.status);

    const TimelineStep: React.FC<{ status: OrderStatus; index: number }> = ({ status, index }) => {
        const isCompleted = index < currentStatusIndex;
        const isCurrent = index === currentStatusIndex;
        return (
            <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${isCompleted || isCurrent ? 'bg-primary text-white' : 'bg-surface-light text-foreground-muted'}`}>
                    {isCompleted ? '✓' : '•'}
                </div>
                <div className={`ml-4 ${isCompleted || isCurrent ? 'text-foreground' : 'text-foreground-muted'}`}>
                    <h4 className="font-semibold">{status}</h4>
                </div>
            </div>
        );
    }
    
    return (
        <div>
            <h1 className="text-3xl font-bold text-foreground mb-6">My Service Portal</h1>
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-foreground">{order.equipment}</h2>
                                <p className="text-accent font-semibold">{order.serviceId}</p>
                            </div>
                            <span className="px-3 py-1 text-sm font-medium rounded-full bg-primary text-white">{order.status}</span>
                        </div>
                        
                        <p className="text-foreground-muted mb-6">Track the progress of your service request below.</p>
                        
                        <div className="space-y-4">
                            {ORDER_STATUS_SEQUENCE.map((status, index) => (
                                <TimelineStep 
                                    key={status} 
                                    status={status}
                                    index={index}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-4">Documents</h3>
                        <div className="space-y-3">
                             <Button disabled={currentStatusIndex < 3} className="w-full justify-start">
                                <ArrowDownTrayIcon className="w-5 h-5 mr-3"/> BAST (Delivery Note)
                            </Button>
                             <Button disabled={currentStatusIndex < 4} className="w-full justify-start">
                                <ArrowDownTrayIcon className="w-5 h-5 mr-3"/> Final Invoice
                            </Button>
                        </div>

                         <div className="mt-8">
                            <h3 className="text-xl font-bold mb-4">Details</h3>
                            <ul className="text-sm space-y-2 text-foreground-muted">
                                <li><strong>Request Date:</strong> {formatDate(order.requestDate)}</li>
                                <li><strong>Repair Type:</strong> {order.repairType}</li>
                                <li><strong>Assigned Engineer:</strong> {order.assignedEngineer}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default CustomerView;
