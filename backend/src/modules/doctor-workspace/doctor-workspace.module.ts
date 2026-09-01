import { Module } from '@nestjs/common';
import { DoctorWorkspaceController } from './doctor-workspace.controller';
import { DoctorWorkspaceService } from './doctor-workspace.service';
@Module({controllers:[DoctorWorkspaceController],providers:[DoctorWorkspaceService]})
export class DoctorWorkspaceModule{}
