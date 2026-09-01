import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../app/api/client';
import type { Prescription } from '../prescriptions/api';

const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export type PharmacyQueueItem = {
  id: string;
  prescriptionNumber: string;
  status: string;
  submittedAt: string;
  patientName: string;
  mrn: string;
};

export type DispenseResult = Prescription & {
  allocations: Array<{ prescriptionItemId: string; medicineBatchId: string; quantity: number }>;
};

export const usePharmacyQueue = () => useQuery({
  queryKey: ['pharmacy', 'prescriptions'],
  queryFn: async () => unwrap<PharmacyQueueItem[]>(await api.get('/pharmacy/prescriptions')),
  refetchInterval: 15_000,
});

export const usePharmacyPrescription = (id: string | null) => useQuery({
  queryKey: ['pharmacy', 'prescription', id],
  queryFn: async () => unwrap<Prescription>(await api.get(`/pharmacy/prescriptions/${id}`)),
  enabled: Boolean(id),
});

function usePrescriptionAction(action: 'process' | 'ready' | 'dispense') {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap<Prescription | DispenseResult>(await api.post(`/pharmacy/prescriptions/${id}/${action}`)),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['pharmacy'] });
      void client.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export const useProcessPrescription = () => usePrescriptionAction('process');
export const useReadyPrescription = () => usePrescriptionAction('ready');
export const useDispensePrescription = () => usePrescriptionAction('dispense');
