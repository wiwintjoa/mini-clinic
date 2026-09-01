import { Controller,Get,Param,ParseUUIDPipe } from '@nestjs/common';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { DoctorsService } from './doctors.service';
@Controller('doctors') export class DoctorsController{constructor(private readonly doctors:DoctorsService){}@Get()@RequirePermissions('APPOINTMENT_MANAGE_ANY')list(){return this.doctors.list();}@Get(':id/schedules')@RequirePermissions('APPOINTMENT_MANAGE_ANY')schedules(@Param('id',ParseUUIDPipe)id:string){return this.doctors.schedules(id);}}
