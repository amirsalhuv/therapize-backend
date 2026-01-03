import { PartialType } from '@nestjs/swagger';
import { CreatePatientProfileDto } from './create-patient.dto';

export class UpdatePatientProfileDto extends PartialType(CreatePatientProfileDto) {}
