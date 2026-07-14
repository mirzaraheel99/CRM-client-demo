import { Field, Input, Select } from "./ui";
import { APPLIANCE_CATEGORY_AR, bi } from "../lib/domainAr";
import { APPLIANCE_CATEGORIES } from "../lib/applianceForm";
import type { ApplianceFormState } from "../lib/applianceForm";
import type { ApplianceCategory, Brand } from "../lib/types";

type FieldGroupProps = {
  value: ApplianceFormState;
  onChange: (patch: Partial<ApplianceFormState>) => void;
};

export function ApplianceBasicFields({ value, onChange, brands }: FieldGroupProps & { brands: Brand[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={bi("Brand", "العلامة التجارية")}>
        <Select value={value.brandId} onChange={(event) => onChange({ brandId: event.target.value })}>
          <option value="">{bi("Choose brand...", "اختر العلامة التجارية...")}</option>
          {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
        </Select>
      </Field>
      <Field label={bi("Category", "الفئة")}>
        <Select value={value.category} onChange={(event) => onChange({ category: event.target.value as ApplianceCategory })}>
          {APPLIANCE_CATEGORIES.map((item) => <option key={item} value={item}>{bi(item, APPLIANCE_CATEGORY_AR[item])}</option>)}
        </Select>
      </Field>
      <Field label={bi("Model", "الطراز")}><Input value={value.model} onChange={(event) => onChange({ model: event.target.value })} /></Field>
      <Field label={bi("Serial number / unit number", "الرقم التسلسلي / رقم الوحدة")}><Input value={value.serialNo} onChange={(event) => onChange({ serialNo: event.target.value })} /></Field>
      {value.category === "Mobile" && <Field label={bi("IMEI", "الآيمي")}><Input value={value.imeiNo} onChange={(event) => onChange({ imeiNo: event.target.value })} /></Field>}
      <Field label={bi("Purchase date", "تاريخ الشراء")}><Input type="date" value={value.purchaseDate} onChange={(event) => onChange({ purchaseDate: event.target.value })} /></Field>
    </div>
  );
}

export function AppliancePurchaseFields({ value, onChange }: FieldGroupProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={bi("Purchase invoice / receipt no.", "رقم فاتورة / إيصال الشراء")}><Input value={value.purchaseInvoiceNo} onChange={(event) => onChange({ purchaseInvoiceNo: event.target.value })} /></Field>
        <Field label={bi("Retailer / dealer name", "اسم المتجر / الموزع")}><Input value={value.retailerName} onChange={(event) => onChange({ retailerName: event.target.value })} /></Field>
        <Field label={bi("Purchase price (SAR)", "سعر الشراء (ريال)")}><Input type="number" min="0" value={value.purchasePrice} onChange={(event) => onChange({ purchasePrice: event.target.value })} /></Field>
        {value.amcActive && <Field label={bi("AMC / extended warranty expiry", "تاريخ انتهاء عقد الصيانة / الضمان الممدد")}><Input type="date" value={value.amcExpiryDate} onChange={(event) => onChange({ amcExpiryDate: event.target.value })} /></Field>}
      </div>
      <label className="flex items-center gap-2 text-sm text-[var(--color-ink-secondary)]">
        <input type="checkbox" checked={value.amcActive} onChange={(event) => onChange({ amcActive: event.target.checked })} className="h-4 w-4 rounded [border-color:var(--color-border)]" />
        {bi("Extended warranty / AMC active", "ضمان ممدد / عقد صيانة سنوي فعال")}
      </label>
    </div>
  );
}

export function ApplianceComplianceFields({ value, onChange }: FieldGroupProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={bi("SASO certification no.", "رقم شهادة سابر")}><Input value={value.sasoCertNo} onChange={(event) => onChange({ sasoCertNo: event.target.value })} /></Field>
      <Field label={bi("Energy efficiency rating", "تصنيف كفاءة الطاقة")}>
        <Select value={value.energyRating} onChange={(event) => onChange({ energyRating: event.target.value as ApplianceFormState["energyRating"] })}>
          <option value="">{bi("Not set", "غير محدد")}</option>
          {(["1", "2", "3", "4", "5"] as const).map((n) => <option key={n} value={n}>{"★".repeat(Number(n))} ({n})</option>)}
        </Select>
      </Field>
      <Field label={bi("Country of manufacture", "بلد الصنع")}><Input value={value.countryOfManufacture} onChange={(event) => onChange({ countryOfManufacture: event.target.value })} /></Field>
      <Field label={bi("Color", "اللون")}><Input value={value.color} onChange={(event) => onChange({ color: event.target.value })} /></Field>
      <Field label={bi("Specification / capacity", "المواصفات / السعة")}><Input value={value.specification} onChange={(event) => onChange({ specification: event.target.value })} placeholder="e.g. 1.5 Ton, 18 Cu.Ft, 8 Kg" /></Field>
      <Field label={bi("Installation date", "تاريخ التركيب")}><Input type="date" value={value.installationDate} onChange={(event) => onChange({ installationDate: event.target.value })} /></Field>
    </div>
  );
}

export function ApplianceSiteFields({ value, onChange }: FieldGroupProps) {
  return (
    <div className="space-y-3">
      <Field label={bi("Installed location at site", "موقع التركيب في الموقع")}><Input value={value.installedLocation} onChange={(event) => onChange({ installedLocation: event.target.value })} placeholder="e.g. Majlis, 2nd floor" /></Field>
      <Field label={bi("Product / serial-plate photo", "صورة المنتج / لوحة الرقم التسلسلي")}>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => onChange({ photoUrl: String(reader.result) });
            reader.readAsDataURL(file);
            event.target.value = "";
          }}
          className="block w-full text-sm text-[var(--color-ink-secondary)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-brand-1)]/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--color-brand-1)]"
        />
      </Field>
      {value.photoUrl && <img src={value.photoUrl} alt="Product preview" className="h-20 w-20 rounded-md border object-cover [border-color:var(--color-border)]" />}
    </div>
  );
}
