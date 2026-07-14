import type { JobStatus, JobType, StageName, ApplianceCategory, Role, CustomerType, Gender, PreferredLanguage, RequestSource } from "./types";

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

export const INVENTORY_TXN_TYPE_AR: Record<"receive" | "issue" | "return" | "transfer" | "adjust", string> = {
  receive: "استلام",
  issue: "صرف",
  return: "إرجاع",
  transfer: "نقل",
  adjust: "تسوية",
};

export const LOCATION_TYPE_AR: Record<"store" | "van" | "branch", string> = {
  store: "مخزن رئيسي",
  van: "شاحنة الفني",
  branch: "مخزن الفرع",
};

export const TECHNICIAN_STATUS_AR: Record<"Available" | "On Job" | "Off Duty", string> = {
  Available: "متاح",
  "On Job": "في مهمة",
  "Off Duty": "خارج الدوام",
};

export const WARRANTY_STATUS_AR: Record<"In Warranty" | "Out of Warranty" | "Unknown", string> = {
  "In Warranty": "ساري الضمان",
  "Out of Warranty": "خارج الضمان",
  Unknown: "غير معروف",
};

export const PAYMENT_STATUS_AR: Record<"paid" | "failed", string> = {
  paid: "مدفوع",
  failed: "فشل",
};

export const CUSTOMER_TYPE_AR: Record<CustomerType, string> = {
  individual: "فرد",
  corporate: "شركة",
};

export const GENDER_AR: Record<Gender, string> = {
  male: "ذكر",
  female: "أنثى",
};

export const PREFERRED_LANGUAGE_AR: Record<PreferredLanguage, string> = {
  ar: "العربية",
  en: "الإنجليزية",
};

export const REQUEST_SOURCE_AR: Record<RequestSource, string> = {
  walk_in: "زيارة مباشرة",
  phone: "اتصال هاتفي",
  whatsapp: "واتساب",
  app: "تطبيق الجوال",
  referral: "إحالة",
};

/** "English · Arabic" — the compact inline form used in badges, headers, and buttons. */
export function bi(en: string, ar: string): string {
  return `${en} · ${ar}`;
}
