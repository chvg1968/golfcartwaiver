import { supabase } from '../utils/supabaseClient';

export async function authenticateUser() {
    try {
        const email = import.meta.env.VITE_SUPABASE_EMAIL;
        const password = import.meta.env.VITE_SUPABASE_PASSWORD;
        
        // Verificar si ya hay una sesión activa
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session) {
            return session.user;
        }

        // Si no hay sesión, intentar iniciar sesión
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('Error de autenticación:', error.message);
            throw new Error(`Error de autenticación: ${error.message}`);
        }

        return data.user;

    } catch (error) {
        console.error('Error en autenticación:', error);
        throw error;
    }
}