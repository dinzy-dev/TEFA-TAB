import React, { useState, useEffect, useMemo } from 'react';
import { PartRequest, PartRequestStatus, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { toCamelCase, formatDate } from '../lib/utils';
import Table, { Column } from '../components/ui/Table';
import { MagnifyingGlassIcon, ArrowDownTrayIcon } from '../components/Icons';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { AuthenticatedUser } from '../lib/auth';

// Interface for the consolidated/grouped request data structure
interface GroupedPartRequest {
    serviceId: string;
    customerName: string;
    requestorName: string;
    jobType: 'Injector' | 'Fuel Pump';
    lastRequestDate: string;
    status: PartRequestStatus;
    parts: {
        partId: string;
        partName: string;
        quantityRequested: number;
    }[];
}

interface PartRequestsViewProps {
    currentUser: AuthenticatedUser;
}

const PartRequestsView: React.FC<PartRequestsViewProps> = ({ currentUser }) => {
    const [partRequests, setPartRequests] = useState<PartRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>(PartRequestStatus.PENDING);

    useEffect(() => {
        const fetchPartRequests = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('part_requests')
                .select('*')
                .order('request_date', { ascending: false });

            if (error) {
                setError(`Failed to fetch part requests: ${error.message}`);
            } else {
                setPartRequests(data.map(p => toCamelCase(p) as PartRequest));
            }
            setIsLoading(false);
        };
        fetchPartRequests();
    }, []);

    const handleStatusChange = async (serviceId: string, newStatus: PartRequestStatus) => {
        const originalRequests = [...partRequests];
        const updatedRequests = partRequests.map(req =>
            req.serviceId === serviceId && req.status === PartRequestStatus.PENDING ? { ...req, status: newStatus } : req
        );
        setPartRequests(updatedRequests);

        const { error: updateError } = await supabase
            .from('part_requests')
            .update({ status: newStatus })
            .eq('service_id', serviceId)
            .eq('status', PartRequestStatus.PENDING);

        if (updateError) {
            setError(`Failed to update status: ${updateError.message}`);
            setPartRequests(originalRequests); // Revert on failure
        } else {
            // Log the approval action to the main service order
            try {
                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .select('repair_logs')
                    .eq('service_id', serviceId)
                    .single();

                if (orderError) throw orderError;
                
                const newLog = {
                    logId: `LOG-${Date.now()}`,
                    serviceId: serviceId,
                    action: `Part Request ${newStatus}`,
                    date: new Date().toISOString(),
                    engineer: 'PPIC User',
                    notes: `Status for pending parts was updated to ${newStatus} by PPIC.`,
                };

                const { error: logUpdateError } = await supabase
                    .from('orders')
                    .update({ repair_logs: [...(orderData.repair_logs || []), newLog] })
                    .eq('service_id', serviceId);

                if (logUpdateError) throw logUpdateError;

            } catch (logError: any) {
                console.error(`Failed to add approval log to order ${serviceId}: ${logError.message}`);
                // Non-critical error, the main status is updated, but we should be aware of the logging issue.
            }
        }
    };


    const groupedRequests = useMemo(() => {
        if (partRequests.length === 0) return [];

        const requestsByServiceId = partRequests.reduce((acc: Record<string, PartRequest[]>, request) => {
            if (!acc[request.serviceId]) {
                acc[request.serviceId] = [];
            }
            acc[request.serviceId].push(request);
            return acc;
        }, {} as Record<string, PartRequest[]>);

        const getOverallStatus = (requests: PartRequest[]): PartRequestStatus => {
            const statuses = new Set(requests.map(r => r.status));
            if (statuses.has(PartRequestStatus.PENDING)) return PartRequestStatus.PENDING;
            if (statuses.has(PartRequestStatus.APPROVED)) return PartRequestStatus.APPROVED;
            if (statuses.has(PartRequestStatus.ORDERED)) return PartRequestStatus.ORDERED;
            if (statuses.has(PartRequestStatus.REJECTED)) return PartRequestStatus.REJECTED;
            return requests[0]?.status || PartRequestStatus.PENDING;
        };
        
        // FIX: Explicitly type `requests` as PartRequest[] to prevent TypeScript from inferring it as `unknown`.
        const groups: GroupedPartRequest[] = Object.values(requestsByServiceId).map((requests: PartRequest[]) => {
            // FIX: Create a shallow copy before sorting to avoid mutating the array, which is used later.
            const latestRequest = [...requests].sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())[0];
            return {
                serviceId: latestRequest.serviceId,
                customerName: latestRequest.customerName,
                requestorName: latestRequest.requestorName,
                jobType: latestRequest.jobType,
                lastRequestDate: latestRequest.requestDate,
                status: getOverallStatus(requests),
                parts: requests.map(r => ({
                    partId: r.partId,
                    partName: r.partName,
                    quantityRequested: r.quantityRequested,
                })),
            };
        });
        
        return groups.sort((a, b) => 
            new Date(b.lastRequestDate).getTime() - new Date(a.lastRequestDate).getTime()
        );

    }, [partRequests]);


    const handleDownloadRPL = async (group: GroupedPartRequest) => {
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select('repair_logs')
            .eq('service_id', group.serviceId)
            .single();

        if (orderError) {
            console.error("Failed to fetch order details for PDF:", orderError);
            alert("Could not generate PDF. Failed to fetch order details.");
            return;
        }

        const repairLogs = (orderData.repair_logs as any[]) || [];
        const diagnosisLog = repairLogs.find(log => log.action === 'Diagnosis & Part Request');
        let diagnosisNotes = "No diagnosis notes were provided with this request.";

        if (diagnosisLog && diagnosisLog.notes) {
            if (diagnosisLog.notes.startsWith('Diagnosis: ')) {
                const fullNote = diagnosisLog.notes.split('.')[0];
                diagnosisNotes = fullNote.substring('Diagnosis: '.length).trim();
            }
        }

        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        let yPos = 20;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('report service', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Order ID: ${group.serviceId}`, margin, yPos);
        yPos += 7;
        doc.text(`Customer Name: ${group.customerName}`, margin, yPos);
        yPos += 7;
        doc.text(`Mechanic Name: ${group.requestorName}`, margin, yPos);
        yPos += 7;
        doc.text(`Job Type: ${group.jobType}`, margin, yPos);
        yPos += 12;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Diagnosis Notes', margin, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(diagnosisNotes, pageWidth - margin * 2);
        doc.text(splitNotes, margin, yPos);
        yPos += (splitNotes.length * 5) + 5;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Recommended Part List (RPL)', margin, yPos);
        yPos += 10;


        const tableColumns = ["No.", "Nama Suku Cadang", "Kuantitas", "Catatan"];
        const tableRows = group.parts.map((part, index) => [
            index + 1,
            part.partName,
            part.quantityRequested,
            ""
        ]);

        (doc as any).autoTable({
            head: [tableColumns],
            body: tableRows,
            startY: yPos,
            theme: 'grid',
            headStyles: {
                fillColor: '#3B82F6',
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            },
            styles: {
                cellPadding: 3,
                fontSize: 10,
            },
            margin: { left: margin, right: margin },
        });
        
        doc.save(`RPL-${group.serviceId}.pdf`);
    };

    const filteredRequests = useMemo(() => {
        return groupedRequests.filter(group => {
            const lowerSearch = searchTerm.toLowerCase();
            const matchesGroupInfo =
                group.serviceId.toLowerCase().includes(lowerSearch) ||
                group.customerName.toLowerCase().includes(lowerSearch) ||
                group.requestorName.toLowerCase().includes(lowerSearch);
            
            const matchesPartName = group.parts.some(part => 
                part.partName.toLowerCase().includes(lowerSearch)
            );

            const matchesStatus = statusFilter === 'All' || group.status === statusFilter;
            return (matchesGroupInfo || matchesPartName) && matchesStatus;
        });
    }, [groupedRequests, searchTerm, statusFilter]);

    const statusColors: Record<PartRequestStatus, string> = {
        [PartRequestStatus.PENDING]: 'bg-yellow-500/20 text-yellow-300',
        [PartRequestStatus.APPROVED]: 'bg-blue-500/20 text-blue-300',
        [PartRequestStatus.REJECTED]: 'bg-red-500/20 text-red-300',
        [PartRequestStatus.ORDERED]: 'bg-green-500/20 text-green-300',
    };

    const columns: Column<GroupedPartRequest>[] = [
        { header: 'Service ID', accessor: 'serviceId' },
        { 
            header: 'Requested Parts', 
            accessor: 'parts', 
            cell: (parts) => (
                <ul className="list-disc list-inside text-xs space-y-1">
                  {(parts as GroupedPartRequest['parts']).map((p, i) => (
                    <li key={`${p.partId}-${i}`}>
                        <span className="font-semibold">{p.partName}</span> (Qty: {p.quantityRequested})
                    </li>
                  ))}
                </ul>
            )
        },
        { header: 'Requestor', accessor: 'requestorName' },
        { header: 'Last Request Date', accessor: 'lastRequestDate', cell: (date) => formatDate(date as string) },
        { header: 'Status', accessor: 'status', cell: (status: PartRequestStatus, row) => {
            if (status === PartRequestStatus.PENDING && currentUser.role === UserRole.PPIC) {
                return (
                    <select
                        value={status}
                        onChange={(e) => handleStatusChange(row.serviceId, e.target.value as PartRequestStatus)}
                        className="bg-surface-light border border-gray-600 rounded-md py-1 px-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <option value={PartRequestStatus.PENDING}>Pending</option>
                        <option value={PartRequestStatus.APPROVED}>Approved</option>
                    </select>
                );
            }
            return (
                 <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>{status}</span>
            )
        }},
        { header: 'Actions', accessor: 'serviceId', cell: (_, row) => (
            (row.status === PartRequestStatus.APPROVED || row.status === PartRequestStatus.ORDERED) && (
                <Button size="sm" onClick={() => handleDownloadRPL(row)}>
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                    Download RPL
                </Button>
            )
        )},
    ];

    if (isLoading) return <p className="text-center text-foreground-muted">Loading part requests...</p>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-foreground mb-6">Internal Part Requests</h1>
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
                            placeholder="Search by Service ID, Part, Customer..."
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
                        {Object.values(PartRequestStatus).map((s) => <option key={s as string} value={s as string}>{s as string}</option>)}
                    </select>
                </div>
                <Table columns={columns} data={filteredRequests} />
            </Card>
        </div>
    );
};

export default PartRequestsView;