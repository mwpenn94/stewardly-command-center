import { useState } from 'react';
import FormField from '../ui/FormField';
import type { Campaign } from '../../types';

interface CampaignFormProps {
  initial?: Campaign;
  onSubmit: (data: Omit<Campaign, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export default function CampaignForm({ initial, onSubmit, onCancel }: CampaignFormProps) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    type: initial?.type ?? 'email' as Campaign['type'],
    status: initial?.status ?? 'draft' as Campaign['status'],
    audience: initial?.audience ?? '',
    reach: initial?.reach ?? 0,
    engagement: initial?.engagement ?? 0,
    conversions: initial?.conversions ?? 0,
    budget: initial?.budget ?? 0,
    spent: initial?.spent ?? 0,
    startDate: initial?.startDate ?? '',
    endDate: initial?.endDate ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Campaign Name" required value={form.name} onChange={(e) => update('name', (e.target as HTMLInputElement).value)} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField as="select" label="Channel" required value={form.type} onChange={(e) => update('type', (e.target as HTMLSelectElement).value as Campaign['type'])}>
          <option value="email">Email</option>
          <option value="social">Social Media</option>
          <option value="sms">SMS</option>
          <option value="print">Print</option>
          <option value="digital_ad">Digital Ads</option>
        </FormField>
        <FormField as="select" label="Status" value={form.status} onChange={(e) => update('status', (e.target as HTMLSelectElement).value as Campaign['status'])}>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </FormField>
        <FormField label="Target Audience" required value={form.audience} placeholder="e.g. Prospective Tenants" onChange={(e) => update('audience', (e.target as HTMLInputElement).value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Start Date" type="date" required value={form.startDate} onChange={(e) => update('startDate', (e.target as HTMLInputElement).value)} />
        <FormField label="End Date" type="date" value={form.endDate} onChange={(e) => update('endDate', (e.target as HTMLInputElement).value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Budget ($)" type="number" min={0} value={form.budget} onChange={(e) => update('budget', Number((e.target as HTMLInputElement).value))} />
        <FormField label="Spent ($)" type="number" min={0} value={form.spent} onChange={(e) => update('spent', Number((e.target as HTMLInputElement).value))} />
      </div>
      {initial && (
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Reach" type="number" min={0} value={form.reach} onChange={(e) => update('reach', Number((e.target as HTMLInputElement).value))} />
          <FormField label="Engagement" type="number" min={0} value={form.engagement} onChange={(e) => update('engagement', Number((e.target as HTMLInputElement).value))} />
          <FormField label="Conversions" type="number" min={0} value={form.conversions} onChange={(e) => update('conversions', Number((e.target as HTMLInputElement).value))} />
        </div>
      )}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">{initial ? 'Update' : 'Create'} Campaign</button>
      </div>
    </form>
  );
}
