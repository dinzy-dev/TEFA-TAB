// File ini menyediakan definisi tipe untuk variabel lingkungan.
// Lingkungan eksekusi aplikasi mengeksposnya melalui `process.env`.
// Definisi ini mencegah kesalahan TypeScript saat mengakses `process.env`.

// Fix: Augment the existing NodeJS.ProcessEnv interface instead of redeclaring 'process'.
// This avoids conflicts with global types from packages like @types/node.
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      VITE_SUPABASE_URL: string;
      VITE_SUPABASE_ANON_KEY: string;
    }
  }
}

// Add an empty export to ensure this file is treated as a module.
export {};
