import React, { useState, useMemo, useEffect } from 'react';
import { UserRole, View } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './views/DashboardView';
import SparepartsView from './views/SparepartsView';
import FinanceView from './views/FinanceView';
import QCView from './views/QCView';
import CustomerView from './views/CustomerView';
import LoginView from './views/LoginView';
import { AuthenticatedUser } from './lib/auth';
import PartRequestsView from './views/PartRequestsView';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
    const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [appError, setAppError] = useState<string | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

     const toCamelCase = (obj: any): any => {
        if (Array.isArray(obj)) {
            return obj.map(v => toCamelCase(v));
        } else if (obj !== null && obj.constructor === Object) {
            return Object.keys(obj).reduce((result, key) => {
                const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
                result[camelKey] = toCamelCase(obj[key]);
                return result;
            }, {} as {[key: string]: any});
        }
        return obj;
    };

    const handleLoginSuccess = (user: AuthenticatedUser) => {
        setAuthenticatedUser(user);
        setAppError(null);
        if (user.role === UserRole.CUSTOMER) {
            setCurrentView(View.CUSTOMER_PORTAL);
        } else {
            setCurrentView(View.DASHBOARD);
        }
    };

    useEffect(() => {
        const getLogo = async () => {
            const { data } = supabase.storage.from('logos').getPublicUrl('app_logo');
            // Use fetch to check if the URL is valid before setting it, preventing 404s
            fetch(data.publicUrl).then(res => {
                if (res.ok) {
                    setLogoUrl(`${data.publicUrl}?t=${new Date().getTime()}`);
                }
            });
        };
        getLogo();

        const setUserProfile = async (user: User | null) => {
            if (user) {
                const { data: profileData, error: profileError } = await supabase
                    .from('users')
                    .select('id, username, role')
                    .eq('id', user.id)
                    .single();
                
                if (profileError) {
                    console.error("Error fetching profile:", profileError.message);
                    setAppError(`Authentication successful, but failed to load your profile. Please try refreshing or contact support. (${profileError.message})`);
                    await supabase.auth.signOut();
                    setAuthenticatedUser(null);
                } else if (profileData) {
                    handleLoginSuccess(toCamelCase(profileData) as AuthenticatedUser);
                }
            } else {
                setAuthenticatedUser(null);
                setCurrentView(View.DASHBOARD);
            }
        };
        
        const checkCurrentSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                await setUserProfile(session?.user ?? null);
            } catch (error) {
                 console.error("Error during initial session check:", error);
                 setAppError("Failed to initialize the application. Please refresh the page.");
                 await supabase.auth.signOut();
                 setAuthenticatedUser(null);
            } finally {
                setIsAuthLoading(false);
            }
        };

        checkCurrentSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            await setUserProfile(session?.user ?? null);
            // After an auth event, loading is effectively finished for that event.
            // This is especially for the case of redirect from email confirmation.
            setIsAuthLoading(false); 
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };

    }, []);

    const availableViews = useMemo(() => {
        if (!authenticatedUser) return [];
        switch (authenticatedUser.role) {
            case UserRole.ADMIN:
                return [View.DASHBOARD, View.SPAREPARTS, View.PART_REQUESTS, View.QC, View.FINANCE];
            case UserRole.CUSTOMER:
                return [View.CUSTOMER_PORTAL];
            case UserRole.MARKETING:
                return [View.DASHBOARD, View.FINANCE, View.PART_REQUESTS];
            case UserRole.ENGINEER:
                return [View.DASHBOARD, View.SPAREPARTS];
            case UserRole.PPIC:
                return [View.DASHBOARD, View.SPAREPARTS, View.PART_REQUESTS];
            case UserRole.QC:
                return [View.DASHBOARD, View.QC];
            case UserRole.FINANCE:
                return [View.DASHBOARD, View.FINANCE];
            default:
                return [];
        }
    }, [authenticatedUser]);
    
    useEffect(() => {
        if (authenticatedUser && !availableViews.includes(currentView)) {
            setCurrentView(availableViews[0] || View.DASHBOARD);
        }
    }, [authenticatedUser, availableViews, currentView]);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            setAppError(`Logout failed: ${error.message}`);
        } else {
            setAuthenticatedUser(null);
            setCurrentView(View.DASHBOARD);
        }
    };

    const handleLogoUpload = async (file: File) => {
        if (!file) return;
        setIsUploadingLogo(true);
        setAppError(null);
        const { error } = await supabase.storage
            .from('logos')
            .upload('app_logo', file, {
                cacheControl: '3600',
                upsert: true,
            });
        
        if (error) {
            setAppError(`Logo upload failed: ${error.message}`);
        } else {
            const { data } = supabase.storage.from('logos').getPublicUrl('app_logo');
            setLogoUrl(`${data.publicUrl}?t=${new Date().getTime()}`);
        }
        setIsUploadingLogo(false);
    };

    const renderView = () => {
        try {
            if (!authenticatedUser) return null;
    
            switch (currentView) {
                case View.DASHBOARD:
                    return <DashboardView currentUser={authenticatedUser} />;
                case View.SPAREPARTS:
                    return <SparepartsView currentUser={authenticatedUser} />;
                case View.PART_REQUESTS:
                    return <PartRequestsView currentUser={authenticatedUser} />;
                case View.FINANCE:
                    return <FinanceView />;
                case View.QC:
                    return <QCView />;
                case View.CUSTOMER_PORTAL:
                    return <CustomerView serviceId={authenticatedUser.customerOrderId || "N/A"} />;
                default:
                    return <DashboardView currentUser={authenticatedUser}/>;
            }
        } catch (error: unknown) {
            console.error("Error rendering view:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return (
                <div className="p-6 text-center bg-surface-light rounded-lg m-4 border border-red-700">
                    <h2 className="text-xl font-bold text-red-400 mb-2">Oops! Something went wrong.</h2>
                    <p className="text-foreground-muted mb-4">There was an error trying to display this part of the application. Please try refreshing the page.</p>
                    <pre className="text-xs text-left bg-background p-2 rounded text-red-500 overflow-x-auto">{errorMessage}</pre>
                </div>
            );
        }
    };

    if (isAuthLoading) {
        return (
             <div className="flex items-center justify-center h-screen bg-background">
                <p className="text-foreground-muted">Loading application...</p>
            </div>
        );
    }

    if (!authenticatedUser) {
        return <LoginView onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="flex h-screen bg-background text-text-primary">
            <Sidebar
                currentView={currentView}
                setCurrentView={setCurrentView}
                currentUserRole={authenticatedUser.role}
                availableViews={availableViews}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                logoUrl={logoUrl}
                onLogoUpload={handleLogoUpload}
                isUploadingLogo={isUploadingLogo}
            />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header 
                    username={authenticatedUser.username} 
                    role={authenticatedUser.role}
                    onLogout={handleLogout}
                    onMenuClick={() => setIsSidebarOpen(true)}
                />
                <main className="flex-1 overflow-y-auto p-6">
                    {appError && (
                         <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-4" role="alert">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{appError}</span>
                            <button onClick={() => setAppError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3" aria-label="Close">
                                &times;
                            </button>
                        </div>
                    )}
                    {renderView()}
                </main>
            </div>
        </div>
    );
};

export default App;