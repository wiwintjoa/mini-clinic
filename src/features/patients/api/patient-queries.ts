import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { patientApi, PatientQuery } from './patient-api';
export const patientKeys = { all: ['patients'] as const, list: (query:PatientQuery) => [...patientKeys.all,'list',query] as const, detail:(id:string)=>[...patientKeys.all,'detail',id] as const, measurements:(id:string,page:number)=>[...patientKeys.all,id,'measurements',page] as const };
export const usePatients = (query:PatientQuery) => useQuery({ queryKey:patientKeys.list(query), queryFn:()=>patientApi.list(query), placeholderData:keepPreviousData });
export const usePatient = (id:string) => useQuery({queryKey:patientKeys.detail(id),queryFn:()=>patientApi.get(id),enabled:Boolean(id)});
export const useMeasurements=(id:string,page:number)=>useQuery({queryKey:patientKeys.measurements(id,page),queryFn:()=>patientApi.measurements(id,page),enabled:Boolean(id),placeholderData:keepPreviousData});
export const useCreatePatient = () => { const client=useQueryClient(); return useMutation({mutationFn:patientApi.create,onSuccess:()=>client.invalidateQueries({queryKey:patientKeys.all})}); };
export const useUpdatePatient = () => { const client=useQueryClient(); return useMutation({mutationFn:patientApi.update,onSuccess:()=>client.invalidateQueries({queryKey:patientKeys.all})}); };
export const useAddMeasurement=()=>{const client=useQueryClient();return useMutation({mutationFn:patientApi.addMeasurement,onSuccess:(_data,input)=>Promise.all([client.invalidateQueries({queryKey:patientKeys.detail(input.id)}),client.invalidateQueries({queryKey:[...patientKeys.all,input.id,'measurements']})])});};
