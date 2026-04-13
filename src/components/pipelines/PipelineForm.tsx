import { useState } from 'react';
import FormField from '../ui/FormField';
import type { DataPipeline } from '../../types';

interface PipelineFormProps {
  initial?: DataPipeline;
  onSubmit: (data: Omit<DataPipeline, 'id'>) => void;
  onCancel: () => void;
}

export default function PipelineForm({ initial, onSubmit, onCancel }: PipelineFormProps) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    source: initial?.source ?? '',
    destination: initial?.destination ?? '',
    status: initial?.status ?? 'configuring' as DataPipeline['status'],
    lastRun: initial?.lastRun ?? new Date().toISOString(),
    recordsProcessed: initial?.recordsProcessed ?? 0,
    schedule: initial?.schedule ?? 'Daily',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Pipeline Name" required value={form.name} placeholder="e.g. Zillow Listings Sync" onChange={(e) => update('name', (e.target as HTMLInputElement).value)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Source" required value={form.source} placeholder="e.g. Zillow API" onChange={(e) => update('source', (e.target as HTMLInputElement).value)} />
        <FormField label="Destination" required value={form.destination} placeholder="e.g. Properties Database" onChange={(e) => update('destination', (e.target as HTMLInputElement).value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField as="select" label="Schedule" required value={form.schedule} onChange={(e) => update('schedule', (e.target as HTMLSelectElement).value)}>
          <option value="Hourly">Hourly</option>
          <option value="Every 2 hours">Every 2 hours</option>
          <option value="Every 6 hours">Every 6 hours</option>
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
        </FormField>
        <FormField as="select" label="Status" value={form.status} onChange={(e) => update('status', (e.target as HTMLSelectElement).value as DataPipeline['status'])}>
          <option value="configuring">Configuring</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </FormField>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">{initial ? 'Update' : 'Create'} Pipeline</button>
      </div>
    </form>
  );
}
