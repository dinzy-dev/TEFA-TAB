import React from 'react';
import { UserRole } from '../types';
import { BellIcon, ChevronDownIcon, Bars3Icon } from './Icons';
import Button from './ui/Button';
import { USER_ROLE_DISPLAY_NAMES } from '../constants';

interface HeaderProps {
    username: string;
    role: UserRole;
    onLogout: () => void;
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ username, role, onLogout, onMenuClick }) => {
    return (
        <header className="bg-surface shadow-md p-4 flex justify-between items-center z-10 flex-shrink-0">
            <div className="flex items-center gap-4">
                 <button onClick={onMenuClick} className="text-foreground-muted hover:text-foreground md:hidden" aria-label="Open menu">
                    <Bars3Icon className="w-6 h-6" />
                </button>
                <div className="hidden md:block">
                    <h2 className="text-2xl font-semibold text-foreground">Welcome, {username}!</h2>
                    <p className="text-sm text-foreground-muted">Here's your overview for today.</p>
                </div>
            </div>
            <div className="flex items-center gap-4 md:gap-6">
                <Button onClick={onLogout} variant="secondary" size="sm">
                    Logout
                </Button>
                <button className="text-foreground-muted hover:text-foreground relative">
                    <BellIcon className="w-6 h-6" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">3</span>
                </button>
                <div className="flex items-center gap-3">
                    <img src={`https://api.dicebear.com/8.x/initials/svg?seed=${username}`} alt="User Avatar" className="w-10 h-10 rounded-full bg-primary" />
                    <div className="hidden md:block">
                        <p className="font-semibold text-foreground capitalize">{username}</p>
                        <p className="text-xs text-foreground-muted">{USER_ROLE_DISPLAY_NAMES[role]}</p>
                    </div>
                     <ChevronDownIcon className="hidden md:block w-5 h-5 text-foreground-muted"/>
                </div>
            </div>
        </header>
    );
};

export default Header;
