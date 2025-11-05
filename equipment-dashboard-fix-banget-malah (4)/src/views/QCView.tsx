import React, { useState, useEffect, useMemo } from 'react';
import { QCReport } from '../types';
import { supabase } from '../lib/supabase';
import { toCamelCase, formatDate } from '../lib/utils';
import Table, { Column } from '../components/ui/Table';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { MagnifyingGlassIcon, ArrowDownTrayIcon, CheckCircleIcon, XCircleIcon } from '../components/Icons';

const QCView: React.FC = () => {
    const [reports, setReports] = useState<QCReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [resultFilter, setResultFilter] = useState<string>('All');

    useEffect(() => {
        const fetchReports = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.from('qc_reports').select('*');
            if (error) {
                setError(`Failed to fetch QC reports: ${error.message}`);
            } else {
                setReports(data.map(r => toCamelCase(r) as QCReport));
            }
            setIsLoading(false);
        };
        fetchReports();
    }, []);

    const filteredReports = useMemo(() => {
        return reports.filter(report => {
            const lowerSearch = searchTerm.toLowerCase();
            const matchesSearch =
                report.qcId.toLowerCase().includes(lowerSearch) ||
                report.serviceId.toLowerCase().includes(lowerSearch) ||
                report.inspector.toLowerCase().includes(lowerSearch);
            const matchesResult = resultFilter === 'All' || report.testResult === resultFilter;
            return matchesSearch && matchesResult;
        });
    }, [reports, searchTerm, resultFilter]);

    const columns: Column<QCReport>[] = [
        { header: 'Report ID', accessor: 'qcId' },
        { header: 'Service ID', accessor: 'serviceId' },
        { header: 'Test Result', accessor: 'testResult', cell: (result: 'Pass' | 'Fail') => (
            <span className={`flex items-center gap-2 font-semibold ${result === 'Pass' ? 'text-green-400' : 'text-red-400'}`}>
                {result === 'Pass' ? <CheckCircleIcon className="w-5 h-5"/> : <XCircleIcon className="w-5 h-5" />}
                {result}
            </span>
        )},
        { header: 'Inspector', accessor: 'inspector' },
        { header: 'Inspection Date', accessor: 'inspectionDate', cell: (date) => formatDate(date) },
        { header: 'Actions', accessor: 'certificateFileUrl', cell: (url) => (
            url ? <Button size="sm" onClick={() => window.open(url, '_blank')}><ArrowDownTrayIcon className="w-4 h-4 mr-2"/> View Certificate</Button> : <span className="text-xs text-foreground-muted">N/A</span>
        )},
    ];
    
    if (isLoading) return <p className="text-center text-foreground-muted">Loading QC reports...</p>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-foreground mb-6">Quality Control Reports</h1>
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
                            placeholder="Search by Report ID, Service ID, or Inspector..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-surface-light border border-gray-600 rounded-md py-2 pl-10 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                     <select
                        value={resultFilter}
                        onChange={e => setResultFilter(e.target.value)}
                         className="bg-surface-light border border-gray-600 rounded-md py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="All">All Results</option>
                        <option value="Pass">Pass</option>
                        <option value="Fail">Fail</option>
                    </select>
                </div>
                <Table columns={columns} data={filteredReports} />
            </Card>
        </div>
    );
};

export default QCView;