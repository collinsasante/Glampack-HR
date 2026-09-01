import type { ClaimStatus, CreateMedicalClaimInput, DecideMedicalClaimInput } from "@glampack/shared";
import { apiGet, apiPatch, apiPost } from "../apiClient";

export interface MedicalClaimReceipt {
  id: string;
  filename: string;
  s3Key: string;
  url: string;
}

export interface MedicalClaim {
  id: string;
  employeeId: string;
  dateOfVisit: string;
  hospitalClinicName: string;
  descriptionOfTreatment: string;
  amountSpent: string;
  status: ClaimStatus;
  adminNotes: string | null;
  receipts: MedicalClaimReceipt[];
  createdAt: string;
  updatedAt: string;
}

export const listMedicalClaims = (params: { employeeId?: string; status?: string } = {}) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return apiGet<MedicalClaim[]>(`/medical-claims${query ? `?${query}` : ""}`);
};

export const createMedicalClaim = (data: CreateMedicalClaimInput) =>
  apiPost<MedicalClaim>("/medical-claims", data);
export const approveMedicalClaim = (id: string, data: DecideMedicalClaimInput = {}) =>
  apiPatch<MedicalClaim>(`/medical-claims/${id}/approve`, data);
export const rejectMedicalClaim = (id: string, data: DecideMedicalClaimInput) =>
  apiPatch<MedicalClaim>(`/medical-claims/${id}/reject`, data);

interface PresignResponse {
  uploadUrl: string;
  fields: Record<string, string>;
  s3Key: string;
  publicUrl: string;
}

export const presignMedicalReceipt = (contentType: string) =>
  apiPost<PresignResponse>("/uploads/medical-receipts/presign", { contentType });

export const presignAnnouncementImage = (contentType: string) =>
  apiPost<PresignResponse>("/uploads/announcement-images/presign", { contentType });

// Uploads directly to S3 using the presigned POST fields — the file itself never
// touches our own server, matching the presigned-POST design in lib/s3.ts on the API.
export async function uploadFileToS3(presign: PresignResponse, file: File): Promise<void> {
  const formData = new FormData();
  for (const [key, value] of Object.entries(presign.fields)) {
    formData.append(key, value);
  }
  formData.append("file", file);

  const res = await fetch(presign.uploadUrl, { method: "POST", body: formData });
  if (!res.ok) throw new Error("File upload to S3 failed");
}
