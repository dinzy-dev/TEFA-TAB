import { UserRole } from '../types';
import { supabase } from './supabase';
import { toCamelCase } from './utils';

export interface AuthenticatedUser {
    id: string;
    role: UserRole;
    username: string; // This will hold the email
    customerOrderId?: string;
}

/**
 * Signs up a new user using Supabase Auth and creates a corresponding profile
 * in the public 'users' table.
 * @returns The new user object if successful, or null if the username (email) is already taken.
 */
export const signup = async (email: string, password: string, role: UserRole): Promise<AuthenticatedUser | null> => {
    // Check our public table first for a better UX, as we are using the email as the username.
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', email)
        .maybeSingle();

    if (existingUser) {
        return null;
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            // FIX: The confirmation link was defaulting to localhost. By setting
            // emailRedirectTo, we ensure Supabase generates a link that points
            // back to the correct application URL.
            emailRedirectTo: window.location.origin,
        },
    });

    if (authError) {
        throw new Error(authError.message);
    }
    
    const user = authData.user;
    if (!user) {
        // This may happen if email confirmation is enabled in Supabase project settings.
        throw new Error('Sign up did not return a user. Email confirmation might be required.');
    }

    // Insert public profile information. The 'users' table now acts as a profiles table.
    const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
            id: user.id,
            username: email, // Use email as the display username
            role: role,
            // FIX: The 'users' table has a legacy NOT NULL constraint on the 'password' column.
            // We insert a non-sensitive placeholder to satisfy this constraint without storing
            // the actual password, which is securely handled by Supabase Auth.
            password: 'auth_placeholder'
        })
        .select()
        .single();
    
    if (profileError) {
        // If profile creation fails, we should ideally delete the user from auth.users
        // to avoid orphaned auth users. This requires admin privileges or specific database functions.
        console.error('Error creating user profile:', profileError);
        throw new Error(`User created in auth, but failed to create profile: ${profileError.message}`);
    }

    return toCamelCase(profileData) as AuthenticatedUser;
};


/**
 * Logs in a user using Supabase Auth and fetches their profile data.
 * @returns The authenticated user object if credentials are valid, otherwise null.
 */
export const login = async (email: string, password: string): Promise<AuthenticatedUser | null> => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
            return null; // Don't throw for bad passwords, just return null.
        }
        console.error('Error logging in:', authError);
        throw new Error(authError.message);
    }

    if (authData.user) {
        const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('id, username, role')
            .eq('id', authData.user.id)
            .single();

        if (profileError) {
            console.error('Error fetching user profile:', profileError.message);
            // Sign out to prevent user being in a broken state (auth OK, but no profile data)
            await supabase.auth.signOut();
            throw new Error('Successfully authenticated, but failed to fetch user profile.');
        }

        if (profileData) {
            return toCamelCase(profileData) as AuthenticatedUser;
        }
    }

    return null;
};