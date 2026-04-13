import { UserCircle } from 'lucide-react';
import type { Contact } from '../../types';

interface KanbanBoardProps {
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
  onStatusChange: (contactId: string, newStatus: Contact['status']) => void;
}

const columns: { status: Contact['status']; label: string; color: string }[] = [
  { status: 'new', label: 'New', color: 'border-t-primary-500' },
  { status: 'contacted', label: 'Contacted', color: 'border-t-amber-500' },
  { status: 'qualified', label: 'Qualified', color: 'border-t-blue-500' },
  { status: 'converted', label: 'Converted', color: 'border-t-accent-500' },
  { status: 'lost', label: 'Lost', color: 'border-t-gray-400' },
];

export default function KanbanBoard({ contacts, onContactClick, onStatusChange }: KanbanBoardProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
      {columns.map((col) => {
        const items = contacts.filter((c) => c.status === col.status);
        return (
          <div
            key={col.status}
            className={`flex-shrink-0 w-56 sm:w-64 bg-surface-tertiary rounded-lg border-t-4 ${col.color}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const contactId = e.dataTransfer.getData('contactId');
              if (contactId) onStatusChange(contactId, col.status);
            }}
          >
            <div className="px-3 py-2.5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">{col.label}</h3>
              <span className="text-xs text-text-muted bg-surface rounded-full px-2 py-0.5">{items.length}</span>
            </div>
            <div className="px-2 pb-2 space-y-2 min-h-[100px]">
              {items.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-surface rounded-lg p-3 shadow-sm border border-border cursor-pointer hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('contactId', contact.id)}
                  onClick={() => onContactClick(contact)}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <UserCircle className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {contact.firstName} {contact.lastName}
                      </p>
                    </div>
                  </div>
                  {contact.company && (
                    <p className="text-xs text-text-muted truncate">{contact.company}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {contact.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-surface-tertiary text-text-muted">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
