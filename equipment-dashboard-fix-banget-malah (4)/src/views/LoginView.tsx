import React, { useState } from 'react';
import { UserRole } from '../types';
import { login, signup, AuthenticatedUser } from '../lib/auth';
import Button from '../components/ui/Button';
import { WrenchScrewdriverIcon, UserPlusIcon, ArrowRightOnRectangleIcon } from '../components/Icons';
import { USER_ROLE_DISPLAY_NAMES } from '../constants';

interface LoginViewProps {
    onLoginSuccess: (user: AuthenticatedUser) => void;
}

type Mode = 'signin' | 'signup';

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
    const [mode, setMode] = useState<Mode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.ENGINEER);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setRole(UserRole.ENGINEER);
        setError(null);
        setIsLoading(false);
        setSuccessMessage(null);
    };
    
    const handleModeChange = (newMode: Mode) => {
        setMode(newMode);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        try {
            if (mode === 'signin') {
                const authenticatedUser = await login(email, password);
                if (authenticatedUser) {
                    onLoginSuccess(authenticatedUser);
                } else {
                    setError('Invalid email or password.');
                }
            } else { // signup
                const newUser = await signup(email, password, role);
                if (newUser) {
                    setSuccessMessage('Account created successfully! Please sign in.');
                    handleModeChange('signin');
                } else {
                    setError('An account with this email already exists.');
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-sm p-8 space-y-8 bg-surface rounded-lg shadow-2xl mx-4">
                <div className="text-center">
                    <WrenchScrewdriverIcon className="w-16 h-16 mx-auto text-primary" />
                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                        {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className="mt-2 text-sm text-foreground-muted">
                        {mode === 'signin' ? 'Sign in to access your dashboard.' : 'Fill in the details to get started.'}
                    </p>
                </div>

                {successMessage && (
                     <div className="p-3 text-center bg-green-900/50 border border-green-700 text-green-300 rounded-md text-sm" role="alert">
                        {successMessage}
                    </div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-foreground-muted">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 mt-1 text-foreground border-gray-600 rounded-md bg-surface-light focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                        />
                    </div>
                    <div>
                         <label htmlFor="password" className="block text-sm font-medium text-foreground-muted">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 mt-1 text-foreground border-gray-600 rounded-md bg-surface-light focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                        />
                    </div>

                    {mode === 'signup' && (
                        <div>
                            <label htmlFor="role-select" className="block text-sm font-medium text-foreground-muted">Role</label>
                            <select
                                id="role-select"
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                                className="w-full px-3 py-2 mt-1 text-foreground border-gray-600 rounded-md bg-surface-light focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {Object.entries(USER_ROLE_DISPLAY_NAMES)
                                    .filter(([key]) => key !== UserRole.CUSTOMER) // Customers shouldn't sign up this way
                                    .map(([key, value]) => (
                                       <option key={key} value={key}>{String(value)}</option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-md text-sm" role="alert">
                            {error}
                        </div>
                    )}

                    <div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Processing...' : (mode === 'signin' ? <><ArrowRightOnRectangleIcon className="w-5 h-5 mr-2"/>Sign In</> : <><UserPlusIcon className="w-5 h-5 mr-2"/>Sign Up</>)}
                        </Button>
                    </div>
                </form>

                <div className="text-center text-sm">
                    {mode === 'signin' ? (
                        <p className="text-foreground-muted">
                            Don't have an account?{' '}
                            <button onClick={() => handleModeChange('signup')} className="font-semibold text-primary hover:underline">Sign Up</button>
                        </p>
                    ) : (
                         <p className="text-foreground-muted">
                            Already have an account?{' '}
                            <button onClick={() => handleModeChange('signin')} className="font-semibold text-primary hover:underline">Sign In</button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginView;