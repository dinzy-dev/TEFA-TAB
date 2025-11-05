import React from 'react';
import { Order } from '../types';
import { ORDER_STATUS_SEQUENCE } from '../constants';
import KanbanColumn from './KanbanColumn';

interface KanbanBoardProps {
    orders: Order[];
    onCardClick: (order: Order) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ orders, onCardClick }) => {
    return (
        <div className="flex gap-6 overflow-x-auto pb-4 -mx-4 px-4">
            {ORDER_STATUS_SEQUENCE.map(status => {
                const filteredOrders = orders.filter(order => order.status === status);
                return (
                    <KanbanColumn 
                        key={status} 
                        status={status} 
                        orders={filteredOrders}
                        onCardClick={onCardClick}
                    />
                );
            })}
        </div>
    );
};

export default KanbanBoard;
