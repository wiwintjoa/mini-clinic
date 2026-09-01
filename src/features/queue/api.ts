import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../app/api/client';
export type QueueEntry={id:string;queueNumber:string;status:'WAITING'|'CALLED'|'IN_CONSULTATION'|'COMPLETED'|'SKIPPED'|'CANCELLED';checkedInAt:string;appointmentId:string;appointmentType:string;startTime:string;patientId:string;patientName:string;mrn:string;dateOfBirth:string;gender:string;doctorId:string;visitId:string|null};
const unwrap=<T,>(response:{data:{data:T}})=>response.data.data;
export const useQueue=(date:string)=>useQuery({queryKey:['queue',date],queryFn:async()=>unwrap<QueueEntry[]>(await api.get('/queue',{params:{date}})),refetchInterval:15_000});
export const useQueueStatus=()=>{const client=useQueryClient();return useMutation({mutationFn:async({id,status}:{id:string;status:string})=>unwrap(await api.patch(`/queue/${id}/status`,{status})),onSuccess:()=>client.invalidateQueries({queryKey:['queue']})});};
export const useStartVisit=()=>{const client=useQueryClient();return useMutation({mutationFn:async(queueId:string)=>unwrap<{id:string}>(await api.post(`/visits/from-queue/${queueId}`)),onSuccess:()=>client.invalidateQueries({queryKey:['queue']})});};
