import type {
  CreateEmergencyContactInput,
  EmergencyContactRelationship,
  UpdateEmergencyContactInput,
} from "@glampack/shared";
import { apiDelete, apiGet, apiPatch, apiPost } from "../apiClient";

export interface EmergencyContact {
  id: string;
  employeeId: string;
  name: string;
  relationship: EmergencyContactRelationship;
  phoneNumber: string;
  email: string | null;
  address: string | null;
}

export const listEmergencyContacts = (employeeId: string) =>
  apiGet<EmergencyContact[]>(`/employees/${employeeId}/emergency-contacts`);

export const createEmergencyContact = (employeeId: string, data: CreateEmergencyContactInput) =>
  apiPost<EmergencyContact>(`/employees/${employeeId}/emergency-contacts`, data);

export const updateEmergencyContact = (id: string, data: UpdateEmergencyContactInput) =>
  apiPatch<EmergencyContact>(`/emergency-contacts/${id}`, data);

export const deleteEmergencyContact = (id: string) => apiDelete(`/emergency-contacts/${id}`);
