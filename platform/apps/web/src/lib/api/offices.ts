import { apiDelete, apiGet, apiPatch, apiPost } from "../apiClient";

export interface Office {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
}

export const listOffices = () => apiGet<Office[]>("/offices");
export const createOffice = (data: { name: string; latitude: number; longitude: number }) =>
  apiPost<Office>("/offices", data);
export const updateOffice = (id: string, data: Partial<{ name: string; latitude: number; longitude: number }>) =>
  apiPatch<Office>(`/offices/${id}`, data);
export const deleteOffice = (id: string) => apiDelete<void>(`/offices/${id}`);
