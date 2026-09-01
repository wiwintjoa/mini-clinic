import 'dotenv/config';
import { hash } from 'argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { permissions, rolePermissions, roles, users } from './schema';
import { seedPatients } from './seed-patients';
import { seedOperations } from './seed-operations';
import { seedClinical } from './seed-clinical';
import { seedMedicines } from './seed-medicines';
import { seedInventory } from './seed-inventory';
const grants: Record<string, string[]> = { ADMIN: ['USER_MANAGE','AUDIT_READ','REPORT_READ','PATIENT_READ_ANY','PATIENT_CREATE','PATIENT_UPDATE','APPOINTMENT_MANAGE_ANY','QUEUE_READ_ANY','QUEUE_MANAGE_ANY','VISIT_READ_ANY','INVENTORY_READ','INVENTORY_UPDATE','BILLING_CREATE','PAYMENT_CREATE'], RECEPTIONIST: ['PATIENT_READ_ANY','PATIENT_CREATE','PATIENT_UPDATE','APPOINTMENT_MANAGE_ANY','QUEUE_READ_ANY','QUEUE_MANAGE_ANY','BILLING_CREATE','PAYMENT_CREATE'], DOCTOR: ['PATIENT_READ_ANY','APPOINTMENT_READ_ASSIGNED','QUEUE_READ_ASSIGNED','QUEUE_MANAGE_ASSIGNED','VISIT_READ_ANY','VISIT_CREATE','DIAGNOSIS_CREATE','PRESCRIPTION_CREATE','INVENTORY_READ'], PHARMACIST: ['PRESCRIPTION_PROCESS','PRESCRIPTION_DISPENSE','INVENTORY_READ','INVENTORY_UPDATE'], PATIENT: ['PATIENT_READ_SELF','APPOINTMENT_MANAGE_SELF','VISIT_READ_SELF','BILLING_READ_SELF'] };
const accounts = [['ADMIN','admin@clinic.local','Clinic Administrator'],['RECEPTIONIST','receptionist@clinic.local','Front Office Demo'],['DOCTOR','doctor@clinic.local','Dr. Demo Physician'],['PHARMACIST','pharmacist@clinic.local','Pharmacy Demo'],['PATIENT','patient@clinic.local','Patient Demo']] as const;
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL }); const db = drizzle(pool, { schema });
  for (const name of Object.keys(grants)) await db.insert(roles).values({ name }).onConflictDoNothing();
  for (const name of [...new Set(Object.values(grants).flat())]) await db.insert(permissions).values({ name }).onConflictDoNothing();
  const roleRows = await db.select().from(roles); const permissionRows = await db.select().from(permissions);
  for (const [roleName, names] of Object.entries(grants)) for (const name of names) await db.insert(rolePermissions).values({ roleId: roleRows.find((item) => item.name === roleName)!.id, permissionId: permissionRows.find((item) => item.name === name)!.id }).onConflictDoNothing();
  const passwordHash = await hash(process.env.SEED_PASSWORD ?? 'ClinicDemo123!');
  for (const [roleName,email,fullName] of accounts) if (!(await db.select({ id: users.id }).from(users).where(eq(users.email,email)))[0]) await db.insert(users).values({ roleId: roleRows.find((item) => item.name === roleName)!.id,email,fullName,passwordHash });
  await seedPatients(db);
  const [portalUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, 'patient@clinic.local')).limit(1);
  if (portalUser) {
    const [linked] = await db.select({ id: schema.patients.id }).from(schema.patients).where(eq(schema.patients.portalUserId, portalUser.id)).limit(1);
    if (!linked) {
      const [firstPatient] = await db.select({ id: schema.patients.id }).from(schema.patients).orderBy(schema.patients.mrn).limit(1);
      if (firstPatient) await db.update(schema.patients).set({ portalUserId: portalUser.id }).where(eq(schema.patients.id, firstPatient.id));
    }
  }
  await seedOperations(db, passwordHash);
  await seedClinical(db);
  await seedMedicines(db);
  await seedInventory(db);
  await pool.end();
}
void main();
