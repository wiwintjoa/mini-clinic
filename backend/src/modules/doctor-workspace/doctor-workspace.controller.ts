import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { DoctorWorkspaceService } from './doctor-workspace.service';
@Controller('doctor')
export class DoctorWorkspaceController{constructor(private readonly workspace:DoctorWorkspaceService){}@Get('patients/:patientId/history')@RequirePermissions('VISIT_READ_ANY')history(@Param('patientId',ParseUUIDPipe)patientId:string,@CurrentUser()user:AuthenticatedUser){return this.workspace.patientHistory(patientId,user.id);}}
