import React, { useState, useEffect, useMemo } from 'react';
import { Invoice, InvoiceStatus } from '../types';
import { supabase } from '../lib/supabase';
import { toCamelCase, formatDate } from '../lib/utils';
import Table, { Column } from '../components/ui/Table';
import Card from '../components/ui/Card';
import { MagnifyingGlassIcon } from '../components/Icons';

const FinanceView: React.FC = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');

    useEffect(() => {
        const fetchInvoices = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.from('invoices').select('*');
            if (error) {
                setError(`Failed to fetch invoices: ${error.message}`);
            } else {
                setInvoices(data.map(i => toCamelCase(i) as Invoice));
            }
            setIsLoading(false);
        };
        fetchInvoices();
    }, []);

    const summaryData = useMemo(() => {
        return invoices.reduce((acc, invoice) => {
            if (invoice.status === InvoiceStatus.PAID) {
                acc.revenue += invoice.amount;
            } else if (invoice.status === InvoiceStatus.PENDING) {
                acc.pending += invoice.amount;
            } else if (invoice.status === InvoiceStatus.OVERDUE) {
                acc.overdue += invoice.amount;
            }
            return acc;
        }, { revenue: 0, pending: 0, overdue: 0 });
    }, [invoices]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(invoice => {
            const lowerSearch = searchTerm.toLowerCase();
            const matchesSearch =
                invoice.invoiceId.toLowerCase().includes(lowerSearch) ||
                invoice.customerName.toLowerCase().includes(lowerSearch);
            const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [invoices, searchTerm, statusFilter]);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const statusColors: Record<InvoiceStatus, string> = {
        [InvoiceStatus.PENDING]: 'text-yellow-300',
        [InvoiceStatus.PAID]: 'text-green-300',
        [InvoiceStatus.OVERDUE]: 'text-red-300',
    };

    const columns: Column<Invoice>[] = [
        { header: 'Invoice ID', accessor: 'invoiceId' },
        { header: 'Customer', accessor: 'customerName' },
        { header: 'Amount', accessor: 'amount', cell: (amount) => formatCurrency(amount) },
        { header: 'Status', accessor: 'status', cell: (status: InvoiceStatus) => (
            <span className={`font-semibold ${statusColors[status]}`}>{status}</span>
        )},
        { header: 'Issue Date', accessor: 'issueDate', cell: (date) => formatDate(date) },
        { header: 'Due Date', accessor: 'dueDate', cell: (date) => formatDate(date) },
    ];
    
    if (isLoading) return <p className="text-center text-foreground-muted">Loading financial data...</p>;
    
    return (
        <div>
            <h1 className="text-3xl font-bold text-foreground mb-6">Finance Overview</h1>
             {error && (
                <div className="p-4 mb-4 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                    <h3 className="font-bold">An Error Occurred</h3>
                    <p className="text-sm">{error}</p>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="bg-gradient-to-br from-green-800 to-green-900">
                    <h3 className="text-lg font-semibold text-green-200">Total Revenue (Paid)</h3>
                    <p className="text-3xl font-bold text-white mt-2">{formatCurrency(summaryData.revenue)}</p>
                </Card>
                 <Card className="bg-gradient-to-br from-yellow-800 to-yellow-900">
                    <h3 className="text-lg font-semibold text-yellow-200">Pending Payments</h3>
                    <p className="text-3xl font-bold text-white mt-2">{formatCurrency(summaryData.pending)}</p>
                </Card>
                 <Card className="bg-gradient-to-br from-red-800 to-red-900">
                    <h3 className="text-lg font-semibold text-red-200">Overdue Payments</h3>
                    <p className="text-3xl font-bold text-white mt-2">{formatCurrency(summaryData.overdue)}</p>
                </Card>
            </div>
            <Card>
                <h2 className="text-xl font-bold text-foreground mb-4">All Invoices</h2>
                 <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="relative flex-grow">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                        <input
                            type="text"
                            placeholder="Search by Invoice ID or Customer..."
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
                        {Object.values(InvoiceStatus).map((s) => <option key={s as string} value={s as string}>{s as string}</option>)}
                    </select>
                </div>
                <Table columns={columns} data={filteredInvoices} />
            </Card>
        </div>
    );
};

export default FinanceView;