import type { JobStatus, JobType, StageName, ApplianceCategory, Role } from "./types";

// Arabic aliases for operational vocabulary that appears throughout the app —
// separate from the customer-facing per-item alias in InventoryItem.nameAr.
// Shown as "English · Arabic" alongside the English label rather than behind
// a language toggle, since staff who only read Arabic need it visible at all
// times, not switched to.
export const JOB_STATUS_AR: Record<JobStatus, string> = {
  Received: "مستلم",
  "In Diagnosis": "قيد التشخيص",
  "Waiting Approval": "بانتظار الموافقة",
  "In Repair": "قيد الإصلاح",
  QA: "فحص الجودة",
  Ready: "جاهز",
  Delivered: "تم التسليم",
};

export const JOB_TYPE_AR: Record<JobType, string> = {
  warranty: "ضمان",
  non_warranty: "بدون ضمان",
};

export const STAGE_NAME_AR: Record<StageName, string> = {
  Received: "الاستلام",
  "Warranty Validation": "التحقق من الضمان",
  Diagnosis: "التشخيص",
  Estimate: "التقدير",
  "Customer Approval": "موافقة العميل",
  "OEM Approval": "موافقة الشركة المصنعة",
  Repair: "الإصلاح",
  QA: "فحص الجودة",
  "Ready for Handover": "جاهز للتسليم",
  Delivered: "تم التسليم",
};

export const APPLIANCE_CATEGORY_AR: Record<ApplianceCategory, string> = {
  AC: "مكيف",
  Refrigerator: "ثلاجة",
  Washer: "غسالة",
  Mobile: "جوال",
  TV: "تلفاز",
  Microwave: "ميكروويف",
};

export const ROLE_AR: Record<Role, string> = {
  front_desk: "الاستقبال",
  technician: "فني",
  supervisor: "مشرف",
  manager: "مدير",
  admin: "مسؤول النظام",
};

export const CHANNEL_AR: Record<"whatsapp" | "sms" | "email", string> = {
  whatsapp: "واتساب",
  sms: "رسالة نصية",
  email: "بريد إلكتروني",
};

export const COMM_STATUS_AR: Record<"sent" | "delivered" | "read" | "failed", string> = {
  sent: "تم الإرسال",
  delivered: "تم التوصيل",
  read: "تمت القراءة",
  failed: "فشل الإرسال",
};

/** "English · Arabic" — the compact inline form used in badges, headers, and buttons. */
export function bi(en: string, ar: string): string {
  return `${en} · ${ar}`;
}
