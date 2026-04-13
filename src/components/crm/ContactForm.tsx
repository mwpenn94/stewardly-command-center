import { useState } from 'react';
import FormField from '../ui/FormField';
import type { Contact } from '../../types';

interface ContactFormProps {
  initial?: Contact;
  onSubmit: (data: Omit<Contact, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export default function ContactForm({ initial, onSubmit, onCancel }: ContactFormProps) {
  const [form, setForm] = useState({
    firstName: initial?.firstName ?? '',
    lastName: initial?.lastName ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    company: initial?.company ?? '',
    type: initial?.type ?? 'lead' as Contact['type'],
    source: initial?.source ?? '',
    status: initial?.status ?? 'new' as Contact['status'],
    notes: initial?.notes ?? '',
    lastContactedAt: initial?.lastContactedAt ?? new Date().toISOString().split('T')[0],
    tags: initial?.tags ?? [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      update('tags', [...form.tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    update('tags', form.tags.filter((t) => t !== tag));
  };

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
      <FormField label="Company" value={form.company} onChange={(e) => update('company', (e.target as HTMLInputElement).value)} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField as="select" label="Type" required value={form.type} onChange={(e) => update('type', (e.target as HTMLSelectElement).value as Contact['type'])}>
          <option value="lead">Lead</option>
          <option value="prospect">Prospect</option>
          <option value="tenant">Tenant</option>
          <option value="vendor">Vendor</option>
          <option value="partner">Partner</option>
        </FormField>
        <FormField as="select" label="Status" value={form.status} onChange={(e) => update('status', (e.target as HTMLSelectElement).value as Contact['status'])}>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="converted">Converted</option>
          <option value="lost">Lost</option>
        </FormField>
        <FormField label="Source" value={form.source} placeholder="e.g. Website, Referral" onChange={(e) => update('source', (e.target as HTMLInputElement).value)} />
      </div>
      <FormField as="textarea" label="Notes" value={form.notes} onChange={(e) => update('notes', (e.target as HTMLTextAreaElement).value)} />

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Tags</label>
        <div className="flex gap-2 mb-2 flex-wrap">
          {form.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-800">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-primary-600" aria-label={`Remove tag ${tag}`}>&times;</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            className="input flex-1"
            placeholder="Type a tag and press Enter"
          />
          <button type="button" onClick={addTag} className="btn-secondary text-sm">Add</button>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">{initial ? 'Update' : 'Add'} Contact</button>
      </div>
    </form>
  );
}
