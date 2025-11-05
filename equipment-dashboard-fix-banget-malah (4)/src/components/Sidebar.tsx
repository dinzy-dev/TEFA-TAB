import React, { useRef } from 'react';
import { View, UserRole } from '../types';
import { VIEW_DISPLAY_NAMES } from '../constants';
import {
    HomeIcon,
    WrenchScrewdriverIcon,
    DocumentChartBarIcon,
    BanknotesIcon,
    UserCircleIcon,
    XMarkIcon,
    ArchiveBoxIcon,
    ArrowUpTrayIcon,
    SpinnerIcon
} from './Icons';

interface SidebarProps {
    currentView: View;
    setCurrentView: (view: View) => void;
    currentUserRole: UserRole;
    availableViews: View[];
    isOpen: boolean;
    onClose: () => void;
    logoUrl: string | null;
    onLogoUpload: (file: File) => void;
    isUploadingLogo: boolean;
}

const viewIcons: Record<View, React.ElementType> = {
    [View.DASHBOARD]: HomeIcon,
    [View.SPAREPARTS]: WrenchScrewdriverIcon,
    [View.PART_REQUESTS]: ArchiveBoxIcon,
    [View.QC]: DocumentChartBarIcon,
    [View.FINANCE]: BanknotesIcon,
    [View.CUSTOMER_PORTAL]: UserCircleIcon,
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, availableViews, isOpen, onClose, logoUrl, onLogoUpload, isUploadingLogo, currentUserRole }) => {
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onLogoUpload(file);
        }
    };
    
    const NavLink: React.FC<{ view: View }> = ({ view }) => {
        const Icon = viewIcons[view];
        const isActive = currentView === view;
        return (
            <li>
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        setCurrentView(view);
                    }}
                    className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
                        isActive
                            ? 'bg-primary text-white shadow-lg'
                            : 'text-foreground-muted hover:bg-surface-light hover:text-foreground'
                    }`}
                >
                    <Icon className="w-6 h-6 mr-3" />
                    <span className="font-medium">{VIEW_DISPLAY_NAMES[view]}</span>
                </a>
            </li>
        );
    };

    const sidebarContent = (
        <div className="flex flex-col h-full bg-surface text-foreground">
            <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-2">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Company Logo" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                        <WrenchScrewdriverIcon className="w-8 h-8 text-primary flex-shrink-0" />
                    )}
                    <h1 className="text-xl font-bold">TEFA Dashboard</h1>
                    {currentUserRole === UserRole.ADMIN && (
                        <>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/png, image/jpeg"
                                disabled={isUploadingLogo}
                            />
                            <button
                                onClick={handleUploadClick}
                                className="text-foreground-muted hover:text-foreground transition-colors ml-2"
                                title="Upload new logo"
                                disabled={isUploadingLogo}
                                aria-label="Upload logo"
                            >
                                {isUploadingLogo ? (
                                    <SpinnerIcon className="w-5 h-5 animate-spin" />
                                ) : (
                                    <ArrowUpTrayIcon className="w-5 h-5" />
                                )}
                            </button>
                        </>
                    )}
                </div>
                <button onClick={onClose} className="text-foreground-muted hover:text-foreground md:hidden" aria-label="Close menu">
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>
            <nav className="flex-1 p-4 overflow-y-auto">
                <ul className="space-y-2">
                    {availableViews.map(view => (
                       <NavLink key={view} view={view} />
                    ))}
                </ul>
            </nav>
             <div className="p-4 border-t border-gray-700 flex-shrink-0">
                <p className="text-xs text-center text-foreground-muted">&copy; 2024 TEFA. All rights reserved.</p>
            </div>
        </div>
    );
    
    return (
        <>
            <div 
                className={`fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                onClick={onClose}
                aria-hidden="true"
            ></div>
            <aside 
                className={`fixed top-0 left-0 z-40 w-64 h-full bg-surface shadow-xl transform transition-transform md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                role="dialog"
                aria-modal="true"
                aria-label="Sidebar"
            >
                {sidebarContent}
            </aside>

            <aside className="hidden md:flex md:flex-col w-64 flex-shrink-0">
                {sidebarContent}
            </aside>
        </>
    );
};

export default Sidebar;