import React from 'react';
import { Order } from '../types';
import { CalendarDaysIcon, UserIcon } from './Icons';
import { formatDate } from '../lib/utils';

interface KanbanCardProps {
    order: Order;
    onClick: (order: Order) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ order, onClick }) => {
    const progressColor = order.progress < 40 ? 'bg-red-500' : order.progress < 80 ? 'bg-yellow-500' : 'bg-green-500';

    return (
        <div 
            className="bg-surface-light p-4 rounded-md shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer border border-gray-700"
            onClick={() => onClick(order)}
            role="button"
            aria-label={`View details for ${order.serviceId}`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-foreground">{order.serviceId}</span>
                <span className="text-xs bg-secondary text-white px-2 py-1 rounded-full">{order.repairType}</span>
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">{order.equipment}</p>
            <p className="text-sm text-foreground-muted mb-3">{order.customerName}</p>
            
            <div className="flex justify-between items-center text-xs text-foreground-muted mb-3">
                <div className="flex items-center gap-1">
                    <CalendarDaysIcon className="w-4 h-4" />
                    <span>{formatDate(order.requestDate)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <UserIcon className="w-4 h-4" />
                    <span>{order.assignedEngineer}</span>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                    <span className="text-foreground-muted">Progress</span>
                    <span className="font-semibold text-foreground">{order.progress}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                        className={`h-2 rounded-full ${progressColor}`} 
                        style={{ width: `${order.progress}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default KanbanCard;
