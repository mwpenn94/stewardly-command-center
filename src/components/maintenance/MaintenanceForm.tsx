import { useState } from 'react';
import FormField from '../ui/FormField';
import { useDataStore } from '../../store/useDataStore';
import type { MaintenanceRequest } from '../../types';

interface MaintenanceFormProps {
  initial?: MaintenanceRequest;
  onSubmit: (data: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export default function MaintenanceForm({ initial, onSubmit, onCancel }: MaintenanceFormProps) {
  const properties = useDataStore((s) => s.properties);
  const tenants = useDataStore((s) => s.tenants);
  const [form, setForm] = useState({
    propertyId: initial?.propertyId ?? (properties[0]?.id ?? ''),
    tenantId: initial?.tenantId ?? (tenants[0]?.id ?? ''),
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    priority: initial?.priority ?? 'medium' as MaintenanceRequest['priority'],
    status: initial?.status ?? 'open' as MaintenanceRequest['status'],
    category: initial?.category ?? '',
    assignedTo: initial?.assignedTo ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const filteredTenants = tenants.filter((t) => t.propertyId === form.propertyId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Title" required value={form.title} onChange={(e) => update('title', (e.target as HTMLInputElement).value)} />
      <FormField as="textarea" label="Description" required value={form.description} onChange={(e) => update('description', (e.target as HTMLTextAreaElement).value)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField as="select" label="Property" required value={form.propertyId} onChange={(e) => update('propertyId', (e.target as HTMLSelectElement).value)}>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </FormField>
        <FormField as="select" label="Tenant" required value={form.tenantId} onChange={(e) => update('tenantId', (e.target as HTMLSelectElement).value)}>
          {filteredTenants.map((t) => (
            <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
          ))}
          {filteredTenants.length === 0 && <option value="">No tenants at this property</option>}
        </FormField>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Category" required value={form.category} placeholder="e.g. Plumbing, HVAC, Electrical" onChange={(e) => update('category', (e.target as HTMLInputElement).value)} />
        <FormField as="select" label="Priority" required value={form.priority} onChange={(e) => update('priority', (e.target as HTMLSelectElement).value as MaintenanceRequest['priority'])}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </FormField>
        <FormField as="select" label="Status" value={form.status} onChange={(e) => update('status', (e.target as HTMLSelectElement).value as MaintenanceRequest['status'])}>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </FormField>
      </div>
      <FormField label="Assigned To" value={form.assignedTo} placeholder="Contractor or team name" onChange={(e) => update('assignedTo', (e.target as HTMLInputElement).value)} />
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">{initial ? 'Update' : 'Create'} Request</button>
      </div>
    </form>
  );
}
