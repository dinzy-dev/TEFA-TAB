import React from 'react';

export interface Column<T> {
    header: string;
    accessor: keyof T;
    cell?: (value: any, row: T) => React.ReactNode;
}

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
}

const Table = <T extends object,>({ columns, data }: TableProps<T>): React.ReactElement => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-foreground-muted">
                <thead className="text-xs text-foreground uppercase bg-surface-light">
                    <tr>
                        {columns.map((col, index) => (
                            <th key={index} scope="col" className="px-6 py-3">
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                     {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="text-center py-8 px-6">
                                No data available.
                            </td>
                        </tr>
                    ) : (
                        data.map((row, rowIndex) => (
                            <tr key={rowIndex} className="bg-surface border-b border-gray-700 hover:bg-surface-light">
                                {columns.map((col, colIndex) => (
                                    <td key={colIndex} className="px-6 py-4 text-foreground">
                                        {col.cell ? col.cell(row[col.accessor], row) : String(row[col.accessor])}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Table;