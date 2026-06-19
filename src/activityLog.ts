import { supabase } from './supabase';

interface LogActivityParams {
  actionType: string;
  description: string;
  metadata?: Record<string, unknown> | null;
}

export async function logActivity({ actionType, description, metadata = null }: LogActivityParams) {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from('activity_logs').insert([
    {
      user_email: user?.email ?? 'desconhecido',
      action_type: actionType,
      description,
      metadata,
    },
  ]);

  if (error) {
    console.error('Erro ao registrar log de atividade:', error.message);
  }
}
