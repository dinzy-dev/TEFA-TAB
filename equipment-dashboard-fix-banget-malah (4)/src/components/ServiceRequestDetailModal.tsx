import React, { useState, useEffect } from 'react';
import { Order, RepairType, UserRole, OrderStatus, RepairLog, Sparepart, SparepartStatus, PartRequest, PartRequestStatus, PurchaseOrderStatus } from '../types';
import Button from './ui/Button';
import { XMarkIcon, ClipboardDocumentListIcon, TruckIcon, CheckBadgeIcon, CurrencyDollarIcon } from './Icons';
import { formatDate, toCamelCase, toSnakeCase } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { ORDER_STATUS_DISPLAY_NAMES } from '../constants';
import { AuthenticatedUser } from '../lib/auth';

interface ServiceRequestDetailModalProps {
    isOpen: boolean;
    order: Order;
    onClose: () => void;
    onUpdateOrder: (order: Order) => void;
    currentUser: AuthenticatedUser;
}

const ServiceRequestDetailModal: React.FC<ServiceRequestDetailModalProps> = ({ isOpen, order, onClose, onUpdateOrder, currentUser }) => {
    const [repairType, setRepairType] = useState<RepairType>(order.repairType);
    const [notes, setNotes] = useState('');
    const [qcResult, setQcResult] = useState<'Pass' | 'Fail'>('Pass');
    const [actionError, setActionError] = useState('');
    const [availableParts, setAvailableParts] = useState<Sparepart[]>([]);
    const [requestedParts, setRequestedParts] = useState<PartRequest[]>([]);
    const [selectedPartId, setSelectedPartId] = useState<string>('');
    const [requestQuantity, setRequestQuantity] = useState<number>(1);
    const [isPartRequestLoading, setIsPartRequestLoading] = useState(false);
    const [partRequestError, setPartRequestError] = useState('');

    useEffect(() => {
        setRepairType(order.repairType);
        setNotes('');
        setQcResult('Pass');
        setActionError('');
        setAvailableParts([]);
        setRequestedParts([]);
        setSelectedPartId('');
        setRequestQuantity(1);
        setPartRequestError('');

        const fetchRelatedData = async () => {
            // Fetch parts already requested for this order, regardless of status
            const { data: requestsData, error: requestsError } = await supabase
                .from('part_requests')
                .select('*')
                .eq('service_id', order.serviceId)
                .order('request_date', { ascending: false });
            
            if (requestsError) {
                setActionError('Could not load part requests.');
            } else if (requestsData) {
                setRequestedParts(requestsData.map(r => toCamelCase(r) as PartRequest));
            }

            if (order.status === OrderStatus.REPAIR || (order.status === OrderStatus.NEW && currentUser.role === UserRole.ENGINEER)) {
                // Fetch available spareparts for the dropdown
                const { data: partsData } = await supabase
                    .from('spareparts')
                    .select('*')
                    .eq('status', SparepartStatus.AVAILABLE)
                    .gt('stock', 0);

                if (partsData) {
                    const camelCasedParts = partsData.map(p => toCamelCase(p) as Sparepart);
                    setAvailableParts(camelCasedParts);
                    if (camelCasedParts.length > 0) {
                        setSelectedPartId(camelCasedParts[0].partId); // Default selection
                    }
                }
            }
        };

        if (isOpen) {
            fetchRelatedData();
        }

    }, [order, isOpen, currentUser]);
    
    if (!isOpen) return null;

    const handleAddLog = (action: string, customNotes: string, author: string): RepairLog => ({
        logId: `LOG-${Date.now()}`,
        serviceId: order.serviceId,
        action,
        date: new Date().toISOString(),
        engineer: author,
        notes: customNotes.trim() || "No additional notes.",
    });

    const handleEngineerSubmitDiagnosis = () => {
        const newLog = handleAddLog('Initial Diagnosis', notes, currentUser.username);
        const updatedOrder: Order = {
            ...order,
            status: OrderStatus.REPAIR,
            repairType,
            assignedEngineer: currentUser.username,
            progress: 40,
            repairLogs: [...order.repairLogs, newLog],
        };
        onUpdateOrder(updatedOrder);
    };
    
    const handleAddRepairLog = () => {
        if (!notes.trim()) {
            setActionError('Notes cannot be empty for a log entry.');
            return;
        }
        setActionError('');
        const action = currentUser.role === UserRole.ENGINEER ? 'Repair Log Added' : 'PPIC Log';
        const newLog = handleAddLog(action, notes, currentUser.username);
        onUpdateOrder({ ...order, repairLogs: [...order.repairLogs, newLog] });
        setNotes('');
    };

    const handleCompleteRepair = () => {
        const finalLogNote = notes.trim() ? `Final repair note: ${notes}` : 'Repair work completed.';
        const newLog = handleAddLog('Repair Completed', finalLogNote, currentUser.username);
        onUpdateOrder({ ...order, status: OrderStatus.QC, progress: 90, repairLogs: [...order.repairLogs, newLog] });
    };

    const handleQCSubmit = () => {
        const newLog = handleAddLog(`QC Inspection: ${qcResult}`, notes, currentUser.username);
        if (qcResult === 'Fail') {
            onUpdateOrder({ ...order, qcResult: 'Fail', repairLogs: [...order.repairLogs, newLog] });
            return;
        }
        onUpdateOrder({ ...order, status: OrderStatus.DELIVERY, progress: 95, qcResult: 'Pass', repairLogs: [...order.repairLogs, newLog] });
    };

    const handleFinanceConfirmPayment = () => {
        const newLog = handleAddLog('Payment Confirmed', 'Payment received and order is now closed.', currentUser.username);
        onUpdateOrder({ ...order, status: OrderStatus.PAID, progress: 100, repairLogs: [...order.repairLogs, newLog] });
    };

    const handleRequestPart = async () => {
        if (!selectedPartId || requestQuantity <= 0) {
            setPartRequestError('Please select a part and specify a valid quantity.');
            return;
        }

        const selectedPart = availableParts.find(p => p.partId === selectedPartId);
        if (!selectedPart || selectedPart.stock < requestQuantity) {
            setPartRequestError('Invalid quantity or part not available in sufficient stock.');
            return;
        }

        setPartRequestError('');
        setIsPartRequestLoading(true);

        const jobType = order.repairType === RepairType.MINOR ? 'Injector' : 'Fuel Pump';
        
        const newPartRequestPayload = {
            serviceId: order.serviceId,
            partId: selectedPart.partId,
            partName: selectedPart.name,
            quantityRequested: requestQuantity,
            requestorName: currentUser.username,
            status: PartRequestStatus.PENDING,
            customerName: order.customerName,
            jobType: jobType,
            requestDate: new Date().toISOString(),
            requestorId: currentUser.id,
        };

        const { data, error } = await supabase
            .from('part_requests')
            .insert(toSnakeCase(newPartRequestPayload))
            .select()
            .single();
        
        setIsPartRequestLoading(false);
        
        if (error) {
            setPartRequestError('Failed to submit request: ' + error.message);
        } else if (data) {
            const logNote = notes.trim()
                ? `Diagnosis: ${notes}. Requested ${requestQuantity} x ${selectedPart.name}.`
                : `Diagnosed and requested ${requestQuantity} x ${selectedPart.name}. Awaiting marketing approval.`;

            const newLog = handleAddLog('Diagnosis & Part Request', logNote, currentUser.username);

            const updatedOrder: Order = {
                ...order,
                repairType,
                assignedEngineer: currentUser.username,
                progress: 25,
                repairLogs: [...order.repairLogs, newLog],
            };
            onUpdateOrder(updatedOrder);
        }
    };

    const handleCustomerConfirmation = async (approved: boolean) => {
        setActionError('');
        const approvalNote = approved 
            ? 'Parts request approved. Repair can now begin.' 
            : 'Parts request rejected. Awaiting engineer action.';
        const newLog = handleAddLog(
            approved ? 'Request Approved' : 'Request Rejected',
            approvalNote,
            currentUser.username
        );

        const newPartStatus = approved ? PartRequestStatus.APPROVED : PartRequestStatus.REJECTED;
        const { error: updateError } = await supabase
            .from('part_requests')
            .update({ status: newPartStatus })
            .eq('service_id', order.serviceId)
            .eq('status', PartRequestStatus.PENDING);

        if (updateError) {
            setActionError('Failed to update part request status: ' + updateError.message);
            return;
        }

        const updatedRequestedParts = requestedParts.map(p => 
            p.status === PartRequestStatus.PENDING ? { ...p, status: newPartStatus } : p
        );
        setRequestedParts(updatedRequestedParts);

        const updatedOrder: Order = {
            ...order,
            status: approved ? OrderStatus.REPAIR : order.status,
            progress: approved ? 60 : 25,
            repairLogs: [...order.repairLogs, newLog],
        };
        onUpdateOrder(updatedOrder);
    };
    
    const handleConfirmPurchaseOrder = async () => {
        setActionError('');
        const partsToOrder = requestedParts.filter(p => p.status === PartRequestStatus.APPROVED);
        if (partsToOrder.length === 0) {
            setActionError('No approved parts available to create a purchase order.');
            return;
        }

        const newPurchaseOrders = partsToOrder.map(part => ({
            partId: part.partId,
            partName: part.partName,
            quantity: part.quantityRequested,
            justification: `For service order ${order.serviceId}`,
            requestor: currentUser.username,
            requestDate: new Date().toISOString(),
            status: PurchaseOrderStatus.PENDING,
            requestorId: currentUser.id,
        }));

        const { error: poError } = await supabase
            .from('purchase_orders')
            .insert(newPurchaseOrders.map(p => toSnakeCase(p)));
        
        if (poError) {
            setActionError(`Failed to create purchase orders: ${poError.message}`);
            return;
        }

        const partRequestIdsToUpdate = partsToOrder.map(p => p.requestId);
        const { error: partUpdateError } = await supabase
            .from('part_requests')
            .update({ status: PartRequestStatus.ORDERED })
            .in('request_id', partRequestIdsToUpdate);
        
        if (partUpdateError) {
            setActionError(`Failed to update part request status: ${partUpdateError.message}`);
            return;
        }

        const newLog = handleAddLog('Purchase Order Confirmed', `PO created for ${partsToOrder.length} approved part(s). Sent to PPIC.`, currentUser.username);
        
        const updatedRequestedParts = requestedParts.map(p => 
            partRequestIdsToUpdate.includes(p.requestId) ? { ...p, status: PartRequestStatus.ORDERED } : p
        );
        setRequestedParts(updatedRequestedParts);

        onUpdateOrder({ ...order, progress: 70, repairLogs: [...order.repairLogs, newLog] });
    };

    const renderActionPanel = () => {
        const commonTextArea = (label: string) => (
            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-foreground-muted mb-1">{label}</label>
                <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full bg-surface border border-gray-600 rounded-md py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
        );

        if (order.status === OrderStatus.NEW) {
             if (currentUser.role === UserRole.ENGINEER) {
                const hasPendingParts = requestedParts.some(p => p.status === PartRequestStatus.PENDING);
                if(hasPendingParts) {
                    return (
                        <div className="bg-surface-light p-4 rounded-lg mt-6 text-center">
                            <p className="text-foreground-muted">Parts have been requested. Awaiting approval from Marketing.</p>
                        </div>
                    );
                }

                return (
                    <div className="space-y-6">
                        <div className="bg-surface-light p-4 rounded-lg mt-6">
                            <h4 className="text-lg font-semibold text-foreground mb-3">Step 1: Diagnosis</h4>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="repairType" className="block text-sm font-medium text-foreground-muted mb-1">Classify Repair Type</label>
                                    <select id="repairType" value={repairType} onChange={(e) => setRepairType(e.target.value as RepairType)} className="w-full bg-surface border border-gray-600 rounded-md py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                                        {Object.values(RepairType).map((type) => <option key={type as string} value={type as string}>{type as string}</option>)}
                                    </select>
                                </div>
                                {commonTextArea("Diagnosis Notes")}
                                <Button onClick={handleEngineerSubmitDiagnosis} className="w-full">Submit Diagnosis &amp; Start Repair (No Parts Needed)</Button>
                            </div>
                        </div>
                        <div className="bg-surface-light p-4 rounded-lg">
                            <h4 className="text-lg font-semibold text-foreground mb-3">Or, Request In-Stock Spareparts</h4>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="part-select" className="block text-sm font-medium text-foreground-muted mb-1">Select Part</label>
                                    <select id="part-select" value={selectedPartId} onChange={(e) => setSelectedPartId(e.target.value)} className="w-full bg-surface border border-gray-600 rounded-md py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary" disabled={availableParts.length === 0}>
                                        {availableParts.length > 0 ? (
                                            availableParts.map(part => <option key={part.partId} value={part.partId}>{part.name} (Stock: {part.stock})</option>)
                                        ) : ( <option>No available parts in stock</option> )}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="part-quantity" className="block text-sm font-medium text-foreground-muted mb-1">Quantity</label>
                                    <input id="part-quantity" type="number" value={requestQuantity} onChange={(e) => setRequestQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))} min="1" className="w-full bg-surface border border-gray-600 rounded-md py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                {partRequestError && <p className="text-red-400 text-sm">{partRequestError}</p>}
                                <Button onClick={handleRequestPart} disabled={isPartRequestLoading || availableParts.length === 0}> {isPartRequestLoading ? 'Submitting...' : 'Diagnose & Request Parts'} </Button>
                            </div>
                        </div>
                    </div>
                );
            }
            if (currentUser.role === UserRole.MARKETING) {
                 const hasPendingParts = requestedParts.some(p => p.status === PartRequestStatus.PENDING);
                 if (hasPendingParts) {
                    return (
                        <div className="bg-surface-light p-4 rounded-lg mt-6">
                            <h4 className="text-lg font-semibold text-foreground mb-3">Part Request Approval</h4>
                            <p className="text-sm text-foreground-muted mb-4">The engineer has requested parts. Please review and approve to proceed with the repair.</p>
                            {actionError && <p className="text-red-400 text-sm mt-2">{actionError}</p>}
                            <div className="flex gap-3 mt-4">
                                <Button variant="secondary" onClick={() => handleCustomerConfirmation(false)}>Reject Request</Button>
                                <Button onClick={() => handleCustomerConfirmation(true)} className="flex-1">Approve Part Request</Button>
                            </div>
                        </div>
                    );
                }
            }
        }
        
        if (order.status === OrderStatus.REPAIR) {
            if (currentUser.role === UserRole.ENGINEER) {
                 return (
                    <div className="space-y-6">
                        {requestedParts.length > 0 && (
                            <div className="bg-surface-light p-4 rounded-lg mt-6">
                                <h5 className="font-semibold text-foreground mb-2">Requested Parts for this Order:</h5>
                                <ul className="text-sm space-y-2 max-h-32 overflow-y-auto">
                                    {requestedParts.map(req => (
                                        <li key={req.requestId} className="flex justify-between items-center bg-surface p-2 rounded-md">
                                            <span>{req.partName} (Qty: {req.quantityRequested})</span>
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                req.status === PartRequestStatus.PENDING ? 'bg-yellow-500/20 text-yellow-300' :
                                                req.status === PartRequestStatus.APPROVED ? 'bg-blue-500/20 text-blue-300' :
                                                req.status === PartRequestStatus.ORDERED ? 'bg-green-500/20 text-green-300' :
                                                'bg-red-500/20 text-red-300'
                                            }`}>{req.status}</span>
                                        </li>
                                    ))}
                                </ul>
                                {requestedParts.some(p => p.status === PartRequestStatus.APPROVED) && (
                                    <Button onClick={handleConfirmPurchaseOrder} className="w-full mt-4">
                                        Confirm Purchase Order
                                    </Button>
                                )}
                            </div>
                        )}
                        <div className="bg-surface-light p-4 rounded-lg">
                            <h4 className="text-lg font-semibold text-foreground mb-3">Repair Actions</h4>
                            {commonTextArea("Add Repair Log / Final Notes")}
                            {actionError && <p className="text-red-400 text-sm mt-2">{actionError}</p>}
                            <div className="flex gap-3 mt-4">
                                <Button variant="secondary" onClick={handleAddRepairLog}>Add Repair Log</Button>
                                <Button onClick={handleCompleteRepair} className="flex-1"><TruckIcon className="w-5 h-5 mr-2"/>Complete Repair &amp; Send to QC</Button>
                            </div>
                        </div>
                    </div>
                );
            }
            if (currentUser.role === UserRole.PPIC) {
                return (
                    <div className="bg-surface-light p-4 rounded-lg mt-6">
                        <h4 className="text-lg font-semibold text-foreground mb-3">PPIC Actions</h4>
                        {commonTextArea("Add Sparepart / Stock Notes")}
                        {actionError && <p className="text-red-400 text-sm mt-2">{actionError}</p>}
                        <Button onClick={handleAddRepairLog} className="w-full mt-4">Add PPIC Log</Button>
                    </div>
                );
            }
        }
        if (order.status === OrderStatus.QC && currentUser.role === UserRole.QC) {
             return (
                 <div className="bg-surface-light p-4 rounded-lg mt-6">
                    <h4 className="text-lg font-semibold text-foreground mb-3">Quality Control Inspection</h4>
                    <div className="space-y-4">
                        <div>
                            <span className="block text-sm font-medium text-foreground-muted mb-2">Inspection Result</span>
                            <div className="flex gap-4 p-2 rounded-md bg-surface">
                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="qcResult" value="Pass" checked={qcResult === 'Pass'} onChange={() => setQcResult('Pass')} className="form-radio text-primary focus:ring-primary"/> Pass</label>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="qcResult" value="Fail" checked={qcResult === 'Fail'} onChange={() => setQcResult('Fail')} className="form-radio text-red-500 focus:ring-red-500"/> Fail</label>
                            </div>
                        </div>
                        {qcResult === 'Fail' && <p className="text-yellow-400 text-xs mt-2 p-2 bg-yellow-900/50 rounded-md">Note: Submitting a "Fail" result will log the issue and keep the order in QC for rework.</p>}
                        {commonTextArea("Inspection Notes")}
                        <Button onClick={handleQCSubmit} className="w-full"><CheckBadgeIcon className="w-5 h-5 mr-2"/> Submit Inspection Result</Button>
                    </div>
                </div>
            );
        }
        if (order.status === OrderStatus.DELIVERY && currentUser.role === UserRole.FINANCE) {
            return (
                 <div className="bg-surface-light p-4 rounded-lg mt-6">
                    <h4 className="text-lg font-semibold text-foreground mb-3">Finance Actions</h4>
                    <p className="text-sm text-foreground-muted mb-4">Confirm payment to close this service order.</p>
                    <Button onClick={handleFinanceConfirmPayment} className="w-full"><CurrencyDollarIcon className="w-5 h-5 mr-2"/>Confirm Payment &amp; Close Order</Button>
                </div>
             );
        }

        return null;
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl mx-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">{order.equipment}</h2>
                        <p className="text-accent font-semibold">{order.serviceId}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close modal"><XMarkIcon className="w-6 h-6" /></button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm mb-6">
                        <div><strong className="text-foreground-muted w-32 inline-block">Customer</strong>: <span className="text-foreground">{order.customerName}</span></div>
                        <div><strong className="text-foreground-muted w-32 inline-block">Status</strong>: <span className="text-foreground font-semibold">{ORDER_STATUS_DISPLAY_NAMES[order.status]}</span></div>
                        <div><strong className="text-foreground-muted w-32 inline-block">Request Date</strong>: <span className="text-foreground">{formatDate(order.requestDate)}</span></div>
                        <div><strong className="text-foreground-muted w-32 inline-block">Assigned Engineer</strong>: <span className="text-foreground">{order.assignedEngineer}</span></div>
                        {order.qcResult && <div className="md:col-span-2"><strong className="text-foreground-muted w-32 inline-block">QC Result</strong>: <span className={`font-bold ${order.qcResult === 'Pass' ? 'text-green-400' : 'text-red-400'}`}>{order.qcResult}</span></div>}
                    </div>
                    
                     {order.repairLogs.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2"><ClipboardDocumentListIcon className="w-5 h-5" />Repair Logs</h4>
                            <div className="space-y-3 text-sm border-l-2 border-primary pl-4">
                                {order.repairLogs.map(log => (
                                    <div key={log.logId} className="bg-surface-light p-3 rounded-md">
                                        <p className="font-semibold">{log.action} by {log.engineer} on {formatDate(log.date)}</p>
                                        <p className="text-foreground-muted italic">"{log.notes}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Show requested parts list even when not in engineer action panel */}
                    {requestedParts.length > 0 && currentUser.role !== UserRole.ENGINEER && order.status !== OrderStatus.REPAIR && (
                         <div className="bg-surface-light p-4 rounded-lg mb-6">
                            <h5 className="font-semibold text-foreground mb-2">Requested Parts for this Order:</h5>
                            <ul className="text-sm space-y-2 max-h-32 overflow-y-auto">
                                {requestedParts.map(req => (
                                    <li key={req.requestId} className="flex justify-between items-center bg-surface p-2 rounded-md">
                                        <span>{req.partName} (Qty: {req.quantityRequested})</span>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                            req.status === PartRequestStatus.PENDING ? 'bg-yellow-500/20 text-yellow-300' :
                                            req.status === PartRequestStatus.APPROVED ? 'bg-blue-500/20 text-blue-300' :
                                            req.status === PartRequestStatus.ORDERED ? 'bg-green-500/20 text-green-300' :
                                            'bg-red-500/20 text-red-300'
                                        }`}>{req.status}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {renderActionPanel()}
                </div>
                
                 <div className="p-4 bg-surface-light rounded-b-lg flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

export default ServiceRequestDetailModal;