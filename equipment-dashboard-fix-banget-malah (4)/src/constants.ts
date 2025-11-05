import { OrderStatus, UserRole, View } from './types';

export const ORDER_STATUS_SEQUENCE = [
    OrderStatus.NEW,
    OrderStatus.REPAIR,
    OrderStatus.QC,
    OrderStatus.DELIVERY,
    OrderStatus.PAID,
];

export const ORDER_STATUS_DISPLAY_NAMES = {
    [OrderStatus.NEW]: 'New Request',
    [OrderStatus.REPAIR]: 'Repair in Progress',
    [OrderStatus.QC]: 'Quality Control',
    [OrderStatus.DELIVERY]: 'Ready for Delivery',
    [OrderStatus.PAID]: 'Paid & Closed',
};

export const USER_ROLE_DISPLAY_NAMES = {
    [UserRole.ADMIN]: 'Administrator',
    [UserRole.CUSTOMER]: 'Customer',
    [UserRole.MARKETING]: 'Marketing',
    [UserRole.ENGINEER]: 'Engineer',
    [UserRole.PPIC]: 'PPIC',
    [UserRole.QC]: 'QC',
    [UserRole.FINANCE]: 'Finance',
};

export const VIEW_DISPLAY_NAMES = {
    [View.DASHBOARD]: 'Dashboard',
    [View.SPAREPARTS]: 'Spareparts',
    [View.PART_REQUESTS]: 'Part Requests',
    [View.QC]: 'QC Reports',
    [View.FINANCE]: 'Finance',
    [View.CUSTOMER_PORTAL]: 'My Service',
};