import type { FrcMatchSubmissionSchema } from "@/schema/scouting";

export type SubmissionResult =
  | { success: true; message: string }
  | { success: false; message: string };

export type PageState = "meta" | "running" | "summary";

export type SectionConfig = {
  id: string;
  label: string;
};

export type PhotoPreview = {
  id: string;
  storageId?: string;
  previewUrl: string;
  fileName: string;
  status: "uploading" | "uploaded" | "failed";
};

export type FrcMatchFormValues = FrcMatchSubmissionSchema;
