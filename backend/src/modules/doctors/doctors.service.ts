import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DATABASE, Database } from '../../database/database.module';
import { doctorSchedules, doctors } from '../../database/schema/operations';
import { users } from '../../database/schema';
@Injectable()
export class DoctorsService { constructor(@Inject(DATABASE) private readonly db:Database){} async list(){return this.db.select({id:doctors.id,fullName:users.fullName,specialty:doctors.specialty,licenseNumber:doctors.licenseNumber}).from(doctors).innerJoin(users,eq(doctors.userId,users.id)).where(and(eq(doctors.isActive,true),eq(users.isActive,true))).orderBy(users.fullName);} async schedules(doctorId:string){return this.db.select().from(doctorSchedules).where(and(eq(doctorSchedules.doctorId,doctorId),eq(doctorSchedules.isActive,true))).orderBy(doctorSchedules.dayOfWeek,doctorSchedules.startTime);} }
