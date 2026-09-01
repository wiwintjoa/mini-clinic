export type PatientMeasurement = {
  id: string; patientId: string; visitId: string | null; systolicBloodPressure: number; diastolicBloodPressure: number;
  weightKg: string; heightCm: string; temperature: string | null; heartRate: number | null; respiratoryRate: number | null;
  oxygenSaturation: number | null; measuredAt: string; measuredBy: string;
};

export type Patient = {
  id: string; mrn: string; fullName: string; nik: string | null; dateOfBirth: string; gender: 'MALE'|'FEMALE'|'OTHER';
  phone: string; email: string | null; address: string; bloodType: string | null; emergencyContactName: string | null;
  emergencyContactPhone: string | null; emergencyContactRelationship: string | null; paymentType: 'SELF_PAY'|'INSURANCE'|'COMPANY'|'OTHER';
  insuranceProvider: string | null; insuranceMemberNumber: string | null; status: 'ACTIVE'|'INACTIVE'; registeredAt: string;
  createdAt: string; updatedAt: string; latestMeasurement?: PatientMeasurement | null;
};

export type InitialMeasurementInput = { systolicBloodPressure:number;diastolicBloodPressure:number;weightKg:number;heightCm:number;temperature?:number;heartRate?:number;respiratoryRate?:number;oxygenSaturation?:number;visitId?:string };
export type CreatePatientInput = { fullName:string;nik?:string;dateOfBirth:string;gender:Patient['gender'];phone:string;email?:string;address:string;bloodType?:string;emergencyContact:{name?:string;phone?:string;relationship?:string};payment:{type:Patient['paymentType'];insuranceProvider?:string;insuranceMemberNumber?:string};initialMeasurement:InitialMeasurementInput };
export type UpdatePatientInput = Partial<Omit<Patient,'id'|'mrn'|'registeredAt'|'createdAt'|'updatedAt'|'latestMeasurement'>>;
export type PaginatedPatients = { data: Patient[]; meta: { page:number;limit:number;total:number;totalPages:number } };
export type PaginatedMeasurements = { data: PatientMeasurement[]; meta:{page:number;limit:number;total:number;totalPages:number} };
export type PossibleDuplicate = Pick<Patient,'id'|'mrn'|'fullName'|'dateOfBirth'|'phone'>;
