import React from 'react';
import { Order, OrderStatus } from '../types';
import KanbanCard from './KanbanCard';
import { ORDER_STATUS_DISPLAY_NAMES } from '../constants';

interface KanbanColumnProps {
    status: OrderStatus;
    orders: Order[];
    onCardClick: (order: Order) => void;
}

const statusColors: Record<OrderStatus, string> = {
    [OrderStatus.NEW]: 'border-t-blue-500',
    [OrderStatus.REPAIR]: 'border-t-orange-500',
    [OrderStatus.QC]: 'border-t-purple-500',
    [OrderStatus.DELIVERY]: 'border-t-green-500',
    [OrderStatus.PAID]: 'border-t-gray-500',
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, orders, onCardClick }) => {
    return (
        <div className="flex-shrink-0 w-80 bg-surface rounded-lg shadow-lg">
            <div className={`p-4 border-t-4 ${statusColors[status]} rounded-t-lg`}>
                <h3 className="font-bold text-lg text-foreground flex items-center justify-between">
                    {ORDER_STATUS_DISPLAY_NAMES[status]}
                    <span className="text-sm font-medium bg-surface-light text-foreground-muted rounded-full px-2 py-1">{orders.length}</span>
                </h3>
            </div>
            <div className="p-2 space-y-3 h-[calc(100vh-250px)] overflow-y-auto">
                {orders.map(order => (
                    <KanbanCard key={order.serviceId} order={order} onClick={onCardClick} />
                ))}
            </div>
        </div>
    );
};

export default KanbanColumn;