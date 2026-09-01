import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { roles, users } from './schema';
import { appointments, clinicServices, doctorSchedules, doctors } from './schema/operations';
import { patients } from './schema/patients';

const doctorAccounts = [
  ['doctor@clinic.local','Dr. Demo Physician','General Practice','SIP-DEMO-001'],
  ['doctor2@clinic.local','Dr. Maya Clinic','Pediatrics','SIP-DEMO-002'],
  ['doctor3@clinic.local','Dr. Raka Clinic','Internal Medicine','SIP-DEMO-003'],
] as const;

export async function seedOperations(db:NodePgDatabase<typeof schema>,passwordHash:string){
  const[doctorRole]=await db.select().from(roles).where(eq(roles.name,'DOCTOR')).limit(1);
  for(const[email,fullName]of doctorAccounts)await db.insert(users).values({roleId:doctorRole.id,email,fullName,passwordHash}).onConflictDoNothing();
  const doctorUsers=await db.select().from(users).where(eq(users.roleId,doctorRole.id));
  for(const[email,,specialty,licenseNumber]of doctorAccounts){const user=doctorUsers.find((item)=>item.email===email)!;await db.insert(doctors).values({userId:user.id,specialty,licenseNumber}).onConflictDoNothing();}
  const doctorRows=await db.select().from(doctors);
  for(const doctor of doctorRows)for(const dayOfWeek of[1,2,3,4,5,6])await db.insert(doctorSchedules).values({doctorId:doctor.id,dayOfWeek,startTime:'08:00',endTime:'16:00',breakStart:'12:00',breakEnd:'13:00',slotDurationMinutes:30,maximumPatients:14}).onConflictDoNothing();
  const serviceSeeds=[['CONS-GP','General Consultation','General outpatient consultation',20,'150000.00'],['CONS-SP','Specialist Consultation','Specialist outpatient consultation',30,'250000.00'],['FOLLOW','Follow-up Consultation','Scheduled clinical follow-up',20,'100000.00']]as const;
  for(const[code,name,description,durationMinutes,price]of serviceSeeds)await db.insert(clinicServices).values({code,name,description,durationMinutes,price}).onConflictDoNothing();
  const[serviceRows,patientRows,adminRows]=await Promise.all([db.select().from(clinicServices),db.select().from(patients).limit(3),db.select().from(users).where(eq(users.email,'admin@clinic.local')).limit(1)]);
  const date=new Date().toISOString().slice(0,10);
  for(let index=0;index<Math.min(3,patientRows.length,doctorRows.length);index++){const start=`0${8+index}:00`.slice(-5);const end=`0${8+index}:30`.slice(-5);await db.insert(appointments).values({patientId:patientRows[index].id,doctorId:doctorRows[index].id,serviceId:serviceRows[index%serviceRows.length].id,appointmentDate:date,startTime:start,endTime:end,status:index===0?'CONFIRMED':'BOOKED',notes:'Synthetic development appointment',createdBy:adminRows[0].id}).onConflictDoNothing();}
}
