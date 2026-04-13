import { useState } from 'react';
import { Eye, Code, Send, Copy } from 'lucide-react';

interface EmailTemplate {
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  footerText: string;
}

const defaultTemplate: EmailTemplate = {
  subject: '',
  preheader: '',
  heading: 'Welcome to Stewardly',
  body: 'We are excited to share our latest properties and opportunities with you.',
  ctaText: 'View Properties',
  ctaUrl: '#',
  footerText: 'Stewardly Property Management | 123 Main St, Austin TX',
};

interface EmailTemplateBuilderProps {
  onSend?: (template: EmailTemplate) => void;
}

export default function EmailTemplateBuilder({ onSend }: EmailTemplateBuilderProps) {
  const [template, setTemplate] = useState<EmailTemplate>(defaultTemplate);
  const [view, setView] = useState<'edit' | 'preview'>('edit');

  const update = <K extends keyof EmailTemplate>(key: K, value: string) =>
    setTemplate((prev) => ({ ...prev, [key]: value }));

  const previewHtml = `
    <div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;color:#1e293b;">
      <div style="background:#2563eb;color:white;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:24px;">${template.heading || 'Email Heading'}</h1>
      </div>
      <div style="padding:24px;background:white;border:1px solid #e2e8f0;">
        <p style="font-size:16px;line-height:1.6;color:#475569;">${template.body || 'Email body text...'}</p>
        ${template.ctaText ? `
          <div style="text-align:center;margin:24px 0;">
            <a href="${template.ctaUrl || '#'}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${template.ctaText}</a>
          </div>
        ` : ''}
      </div>
      <div style="padding:16px;background:#f8fafc;text-align:center;font-size:12px;color:#94a3b8;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:0;">
        ${template.footerText || ''}
      </div>
    </div>
  `;

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('edit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            view === 'edit' ? 'bg-primary-600 text-white' : 'bg-surface border border-border text-text-secondary hover:bg-surface-tertiary'
          }`}
        >
          <Code className="w-4 h-4" /> Edit
        </button>
        <button
          onClick={() => setView('preview')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            view === 'preview' ? 'bg-primary-600 text-white' : 'bg-surface border border-border text-text-secondary hover:bg-surface-tertiary'
          }`}
        >
          <Eye className="w-4 h-4" /> Preview
        </button>
      </div>

      {view === 'edit' ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Subject Line</label>
            <input
              className="input"
              value={template.subject}
              onChange={(e) => update('subject', e.target.value)}
              placeholder="e.g. Spring leasing specials inside!"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Preheader Text</label>
            <input
              className="input"
              value={template.preheader}
              onChange={(e) => update('preheader', e.target.value)}
              placeholder="Preview text shown in inbox"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Heading</label>
            <input
              className="input"
              value={template.heading}
              onChange={(e) => update('heading', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Body</label>
            <textarea
              className="input min-h-[100px]"
              value={template.body}
              onChange={(e) => update('body', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">CTA Button Text</label>
              <input
                className="input"
                value={template.ctaText}
                onChange={(e) => update('ctaText', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">CTA URL</label>
              <input
                className="input"
                value={template.ctaUrl}
                onChange={(e) => update('ctaUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Footer</label>
            <input
              className="input"
              value={template.footerText}
              onChange={(e) => update('footerText', e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-surface-tertiary p-4">
          <div className="text-xs text-text-muted mb-2">
            <strong>Subject:</strong> {template.subject || '(no subject)'}
          </div>
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => onSend?.(template)}
        >
          <Send className="w-4 h-4" /> Send Campaign
        </button>
        <button
          className="btn-secondary flex items-center gap-2"
          onClick={() => navigator.clipboard.writeText(previewHtml)}
        >
          <Copy className="w-4 h-4" /> Copy HTML
        </button>
      </div>
    </div>
  );
}
