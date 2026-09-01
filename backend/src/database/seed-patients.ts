import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { mrnCounters, patients } from './schema/patients';

const demoNames = ['Ayu Lestari','Bima Pratama','Citra Maharani','Dewa Saputra','Eka Wulandari','Farhan Ramadhan','Gita Permata','Hadi Santoso','Intan Kirana','Joko Nugroho','Kartika Sari','Lukman Hakim','Maya Puspita','Nanda Wijaya','Olivia Anjani','Putra Mahendra','Qori Azzahra','Raka Firmansyah','Sinta Melati','Teguh Kurniawan'];

export async function seedPatients(db: NodePgDatabase<typeof schema>) {
  for (const [index, fullName] of demoNames.entries()) {
    const number = index + 1;
    await db.insert(patients).values({
      mrn: `CLN-${number.toString().padStart(6, '0')}`,
      fullName,
      nik: `9999000000${number.toString().padStart(6, '0')}`,
      dateOfBirth: `${1980 + (index % 25)}-${String((index % 12) + 1).padStart(2, '0')}-15`,
      gender: index % 2 === 0 ? 'FEMALE' : 'MALE',
      phone: `08000000${number.toString().padStart(3, '0')}`,
      email: `patient${number}@example.test`,
      address: `Demo Address ${number}, Example District`,
      bloodType: ['A+','B+','O+','AB+'][index % 4] as 'A+'|'B+'|'O+'|'AB+',
      status: 'ACTIVE',
    }).onConflictDoNothing({ target: patients.mrn });
  }
  await db.update(mrnCounters).set({ nextValue: sql`GREATEST(${mrnCounters.nextValue}, 21)` }).where(sql`${mrnCounters.clinicCode} = 'CLN'`);
}
