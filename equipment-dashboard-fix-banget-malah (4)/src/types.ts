export enum OrderStatus {
    NEW = 'New Request',
    REPAIR = 'Repair in Progress',
    QC = 'Quality Control',
    DELIVERY = 'Ready for Delivery',
    PAID = 'Paid & Closed',
}

export enum UserRole {
    ADMIN = 'ADMIN',
    CUSTOMER = 'CUSTOMER',
    MARKETING = 'MARKETING',
    ENGINEER = 'ENGINEER',
    PPIC = 'PPIC',
    QC = 'QC',
    FINANCE = 'FINANCE',
}

export enum RepairType {
    MINOR = 'Minor',
    FULL = 'Full Service',
}

export enum SparepartStatus {
    AVAILABLE = 'Available',
    BO = 'Back Order',
    ORDERED = 'Ordered',
}

export enum InvoiceStatus {
    PENDING = 'Pending',
    PAID = 'Paid',
    OVERDUE = 'Overdue',
}

export enum PurchaseOrderStatus {
    PENDING = 'Pending Approval',
    APPROVED = 'Approved',
    ORDERED = 'Ordered',
    RECEIVED = 'Received',
    CANCELLED = 'Cancelled',
}

export enum PartRequestStatus {
    PENDING = 'Pending',
    APPROVED = 'Approved',
    REJECTED = 'Rejected',
    ORDERED = 'Ordered',
}

export interface Order {
    serviceId: string;
    customerName: string;
    requestDate: string;
    status: OrderStatus;
    repairType: RepairType;
    assignedEngineer: string;
    equipment: string;
    progress: number;
    repairLogs: RepairLog[];
    qcResult?: 'Pass' | 'Fail';
}

export interface Sparepart {
    partId: string;
    name: string;
    stock: number;
    status: SparepartStatus;
    location: string;
}

export interface RepairLog {
    logId: string;
    serviceId: string;
    action: string;
    date: string;
    engineer: string;
    notes: string;
}

export interface QCReport {
    qcId: string;
    serviceId: string;
    testResult: 'Pass' | 'Fail';
    certificateFileUrl?: string;
    inspectionDate: string;
    inspector: string;
    notes: string;
}

export interface Invoice {
    invoiceId: string;
    serviceId: string;
    customerName: string;
    amount: number;
    status: InvoiceStatus;
    dueDate: string;
    issueDate: string;
}

export interface PurchaseOrder {
    purchaseOrderId: string;
    partId: string;
    partName: string;
    quantity: number;
    justification: string;
    requestor: string;
    requestDate: string;
    status: PurchaseOrderStatus;
}

export interface PartRequest {
    requestId: string;
    serviceId: string;
    partId: string;
    partName: string;
    quantityRequested: number;
    requestorName: string;
    requestDate: string;
    status: PartRequestStatus;
    customerName: string;
    jobType: 'Injector' | 'Fuel Pump';
}

export enum View {
    DASHBOARD = 'DASHBOARD',
    SPAREPARTS = 'SPAREPARTS',
    PART_REQUESTS = 'PART_REQUESTS',
    QC = 'QC',
    FINANCE = 'FINANCE',
    CUSTOMER_PORTAL = 'CUSTOMER_PORTAL',
}