import { useState } from 'react';
import FormField from '../ui/FormField';
import { useDataStore } from '../../store/useDataStore';
import type { Tenant } from '../../types';

interface TenantFormProps {
  initial?: Tenant;
  onSubmit: (data: Omit<Tenant, 'id'>) => void;
  onCancel: () => void;
}

export default function TenantForm({ initial, onSubmit, onCancel }: TenantFormProps) {
  const properties = useDataStore((s) => s.properties);
  const [form, setForm] = useState({
    firstName: initial?.firstName ?? '',
    lastName: initial?.lastName ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    propertyId: initial?.propertyId ?? (properties[0]?.id ?? ''),
    unitNumber: initial?.unitNumber ?? '',
    leaseStart: initial?.leaseStart ?? '',
    leaseEnd: initial?.leaseEnd ?? '',
    monthlyRent: initial?.monthlyRent ?? 0,
    status: initial?.status ?? 'active' as Tenant['status'],
    balance: initial?.balance ?? 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="First Name" required value={form.firstName} onChange={(e) => update('firstName', (e.target as HTMLInputElement).value)} />
        <FormField label="Last Name" required value={form.lastName} onChange={(e) => update('lastName', (e.target as HTMLInputElement).value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Email" type="email" required value={form.email} onChange={(e) => update('email', (e.target as HTMLInputElement).value)} />
        <FormField label="Phone" type="tel" value={form.phone} onChange={(e) => update('phone', (e.target as HTMLInputElement).value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField as="select" label="Property" required value={form.propertyId} onChange={(e) => update('propertyId', (e.target as HTMLSelectElement).value)}>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </FormField>
        <FormField label="Unit Number" required value={form.unitNumber} onChange={(e) => update('unitNumber', (e.target as HTMLInputElement).value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Lease Start" type="date" required value={form.leaseStart} onChange={(e) => update('leaseStart', (e.target as HTMLInputElement).value)} />
        <FormField label="Lease End" type="date" required value={form.leaseEnd} onChange={(e) => update('leaseEnd', (e.target as HTMLInputElement).value)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Monthly Rent" type="number" min={0} required value={form.monthlyRent} onChange={(e) => update('monthlyRent', Number((e.target as HTMLInputElement).value))} />
        <FormField as="select" label="Status" value={form.status} onChange={(e) => update('status', (e.target as HTMLSelectElement).value as Tenant['status'])}>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="late">Late</option>
          <option value="former">Former</option>
        </FormField>
        <FormField label="Balance" type="number" value={form.balance} onChange={(e) => update('balance', Number((e.target as HTMLInputElement).value))} />
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">{initial ? 'Update' : 'Add'} Tenant</button>
      </div>
    </form>
  );
}
