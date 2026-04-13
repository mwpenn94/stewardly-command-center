import { useState } from 'react';
import FormField from '../ui/FormField';
import type { Property } from '../../types';

interface PropertyFormProps {
  initial?: Property;
  onSubmit: (data: Omit<Property, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export default function PropertyForm({ initial, onSubmit, onCancel }: PropertyFormProps) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    address: initial?.address ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    zip: initial?.zip ?? '',
    type: initial?.type ?? 'residential' as Property['type'],
    units: initial?.units ?? 1,
    occupancyRate: initial?.occupancyRate ?? 0,
    monthlyRevenue: initial?.monthlyRevenue ?? 0,
    status: initial?.status ?? 'active' as Property['status'],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Property Name" required value={form.name} onChange={(e) => update('name', (e.target as HTMLInputElement).value)} />
      <FormField label="Address" required value={form.address} onChange={(e) => update('address', (e.target as HTMLInputElement).value)} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <FormField label="City" required value={form.city} onChange={(e) => update('city', (e.target as HTMLInputElement).value)} />
        <FormField label="State" required value={form.state} onChange={(e) => update('state', (e.target as HTMLInputElement).value)} />
        <FormField label="ZIP" required value={form.zip} onChange={(e) => update('zip', (e.target as HTMLInputElement).value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField as="select" label="Type" required value={form.type} onChange={(e) => update('type', (e.target as HTMLSelectElement).value as Property['type'])}>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="mixed">Mixed</option>
        </FormField>
        <FormField as="select" label="Status" required value={form.status} onChange={(e) => update('status', (e.target as HTMLSelectElement).value as Property['status'])}>
          <option value="active">Active</option>
          <option value="maintenance">Maintenance</option>
          <option value="vacant">Vacant</option>
        </FormField>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Units" type="number" min={1} required value={form.units} onChange={(e) => update('units', Number((e.target as HTMLInputElement).value))} />
        <FormField label="Occupancy %" type="number" min={0} max={100} value={form.occupancyRate} onChange={(e) => update('occupancyRate', Number((e.target as HTMLInputElement).value))} />
        <FormField label="Monthly Revenue" type="number" min={0} value={form.monthlyRevenue} onChange={(e) => update('monthlyRevenue', Number((e.target as HTMLInputElement).value))} />
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">{initial ? 'Update' : 'Create'} Property</button>
      </div>
    </form>
  );
}
