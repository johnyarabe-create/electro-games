register: async (email, password, firstName, lastName) => {
    set({ loading: true, error: null });
    
    // 1. Crear usuario en auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { first_name: firstName, last_name: lastName }
        }
    });

    if (authError) {
        set({ error: authError.message, loading: false });
        return false;
    }

    // 2. Crear perfil manualmente
    if (authData.user) {
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id,
                first_name: firstName,
                last_name: lastName,
                email: email,
                level: 1,
                total_xp: 0,
                current_xp: 0,
                streak_days: 0
            });

        if (profileError) {
            console.error('Error creando perfil:', profileError);
            // No retornamos false aquí para no bloquear el registro
        }
    }

    set({ user: authData.user?.user_metadata, loading: false });
    return true;
},
