'use server';

import { db, teams, vehicles } from '@/db';
import { revalidatePath } from 'next/cache';

export async function createTeam(formData: FormData) {
  if (!db) return { error: 'Banco de dados indisponível' };

  const name = formData.get('name') as string;
  const leaderName = formData.get('leaderName') as string;
  const phone = formData.get('phone') as string;

  if (!name || !leaderName) {
    return { error: 'Nome da equipe e líder são obrigatórios' };
  }

  try {
    await db.insert(teams).values({
      name,
      leaderName,
      phone: phone || null,
      isActive: true,
    });
    
    revalidatePath('/portal/operacional');
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar equipe:', error);
    return { error: 'Falha ao criar equipe' };
  }
}

export async function createVehicle(formData: FormData) {
  if (!db) return { error: 'Banco de dados indisponível' };

  const name = formData.get('name') as string;
  const plate = formData.get('plate') as string;
  const type = formData.get('type') as string;

  if (!name || !type) {
    return { error: 'Nome e tipo são obrigatórios' };
  }

  try {
    await db.insert(vehicles).values({
      name,
      plate: plate || null,
      type,
      isActive: true,
    });
    
    revalidatePath('/portal/operacional');
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar veículo:', error);
    return { error: 'Falha ao criar veículo' };
  }
}

export async function submitChecklist(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  // Mock action for checklist - eventually it could create an internal service request or expense
  console.log('Checklist submetido:', Object.fromEntries(formData));
  return { success: true };
}
