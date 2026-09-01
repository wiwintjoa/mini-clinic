import { api } from '../../../app/api/client';
import type { CreatePatientInput, InitialMeasurementInput, PaginatedMeasurements, PaginatedPatients, Patient, PossibleDuplicate, UpdatePatientInput } from '../types';

type Envelope<T> = { data: T; message: string };
export type PatientQuery = { page:number;limit:number;search:string;sortBy?:string;sortDirection?:'asc'|'desc' };
export const patientApi = {
  list: async (query: PatientQuery) => (await api.get<PaginatedPatients>('/patients', { params: query })).data,
  get: async (id: string) => (await api.get<Envelope<Patient>>(`/patients/${id}`)).data.data,
  duplicates: async (params:{nik?:string;phone?:string;fullName?:string;dateOfBirth?:string}) => (await api.get<Envelope<PossibleDuplicate[]>>('/patients/duplicates',{params})).data.data,
  create: async (input: CreatePatientInput) => (await api.post<Envelope<Patient>>('/patients', input)).data.data,
  update: async ({id,input}:{id:string;input:UpdatePatientInput}) => (await api.patch<Envelope<Patient>>(`/patients/${id}`, input)).data.data,
  measurements: async (id:string,page=1) => (await api.get<PaginatedMeasurements>(`/patients/${id}/vital-signs`,{params:{page,limit:10}})).data,
  addMeasurement: async ({id,input}:{id:string;input:InitialMeasurementInput}) => (await api.post<Envelope<unknown>>(`/patients/${id}/vital-signs`,input)).data.data,
};
