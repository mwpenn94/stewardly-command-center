import { Mail, Phone, Building2, Tag, Clock, MessageSquare, FileText, Calendar } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import type { Contact } from '../../types';

interface ContactDetailProps {
  contact: Contact;
  onEdit: () => void;
}

const timelineEvents = [
  { id: '1', type: 'email', label: 'Welcome email sent', date: '2025-04-12' },
  { id: '2', type: 'note', label: 'Left voicemail re: property tour', date: '2025-04-10' },
  { id: '3', type: 'meeting', label: 'Initial consultation scheduled', date: '2025-04-08' },
  { id: '4', type: 'created', label: 'Contact created', date: '2025-04-05' },
];

const eventIcons: Record<string, typeof Mail> = {
  email: Mail,
  note: MessageSquare,
  meeting: Calendar,
  created: FileText,
};

export default function ContactDetail({ contact, onEdit }: ContactDetailProps) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={contact.type} />
        <StatusBadge status={contact.status} />
      </div>

      {/* Contact Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-text-muted flex-shrink-0" />
          <a href={`mailto:${contact.email}`} className="text-sm text-primary-600 hover:underline truncate">{contact.email}</a>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-text-muted flex-shrink-0" />
          <a href={`tel:${contact.phone}`} className="text-sm text-primary-600 hover:underline">{contact.phone}</a>
        </div>
        {contact.company && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-text-muted flex-shrink-0" />
            <span className="text-sm">{contact.company}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-text-muted flex-shrink-0" />
          <span className="text-sm text-text-muted">Last contacted: {new Date(contact.lastContactedAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Tags */}
      {contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {contact.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-800">
              <Tag className="w-3 h-3" /> {tag}
            </span>
          ))}
        </div>
      )}

      {/* Notes */}
      {contact.notes && (
        <div className="bg-surface-tertiary rounded-lg p-3">
          <p className="text-xs text-text-muted mb-1">Notes</p>
          <p className="text-sm">{contact.notes}</p>
        </div>
      )}

      {/* Activity Timeline */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Activity Timeline</h3>
        <div className="space-y-0">
          {timelineEvents.map((event, idx) => {
            const Icon = eventIcons[event.type] || FileText;
            return (
              <div key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="p-1.5 rounded-full bg-surface-tertiary">
                    <Icon className="w-3.5 h-3.5 text-text-muted" />
                  </div>
                  {idx < timelineEvents.length - 1 && (
                    <div className="w-px flex-1 bg-border my-1" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium text-text-primary">{event.label}</p>
                  <p className="text-xs text-text-muted">{new Date(event.date).toLocaleDateString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button className="btn-primary" onClick={onEdit}>Edit Contact</button>
    </div>
  );
}
