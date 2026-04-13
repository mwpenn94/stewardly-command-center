import { useState } from 'react';
import { Plus, Mail, MessageSquare, Clock, GitBranch, Trash2, ArrowDown } from 'lucide-react';
import type { WorkflowStep } from '../../types/workflow';

const stepTypeConfig = {
  email: { icon: Mail, label: 'Send Email', color: 'bg-primary-50 text-primary-600' },
  sms: { icon: MessageSquare, label: 'Send SMS', color: 'bg-accent-50 text-accent-600' },
  wait: { icon: Clock, label: 'Wait', color: 'bg-amber-50 text-amber-600' },
  condition: { icon: GitBranch, label: 'Condition', color: 'bg-purple-50 text-purple-600' },
};

interface WorkflowBuilderProps {
  steps: WorkflowStep[];
  onChange: (steps: WorkflowStep[]) => void;
}

let stepIdCounter = 0;

export default function WorkflowBuilder({ steps, onChange }: WorkflowBuilderProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const addStep = (type: WorkflowStep['type']) => {
    const id = `step-${++stepIdCounter}`;
    const config: WorkflowStep['config'] = {};
    if (type === 'email') config.template = 'Default template';
    if (type === 'sms') config.message = '';
    if (type === 'wait') config.delayDays = 3;
    if (type === 'condition') config.condition = '';
    onChange([...steps, { id, type, config }]);
    setShowAddMenu(false);
  };

  const updateStep = (id: string, config: WorkflowStep['config']) => {
    onChange(steps.map((s) => (s.id === id ? { ...s, config: { ...s.config, ...config } } : s)));
  };

  const removeStep = (id: string) => {
    onChange(steps.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-3">
      {steps.length === 0 && (
        <div className="text-center py-8 text-text-muted text-sm">
          No steps yet. Add your first workflow step below.
        </div>
      )}

      {steps.map((step, index) => {
        const config = stepTypeConfig[step.type];
        const Icon = config.icon;
        return (
          <div key={step.id}>
            {index > 0 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="w-4 h-4 text-text-muted" />
              </div>
            )}
            <div className="card p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${config.color} flex-shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-text-primary">{config.label}</p>
                    <button
                      onClick={() => removeStep(step.id)}
                      className="p-1 rounded hover:bg-red-50 text-text-muted hover:text-red-600"
                      aria-label="Remove step"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {step.type === 'email' && (
                    <input
                      className="input text-sm"
                      value={step.config.template ?? ''}
                      onChange={(e) => updateStep(step.id, { template: e.target.value })}
                      placeholder="Email template name"
                    />
                  )}
                  {step.type === 'sms' && (
                    <textarea
                      className="input text-sm min-h-[60px]"
                      value={step.config.message ?? ''}
                      onChange={(e) => updateStep(step.id, { message: e.target.value })}
                      placeholder="SMS message content"
                    />
                  )}
                  {step.type === 'wait' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-muted">Wait</span>
                      <input
                        type="number"
                        className="input w-20 text-sm"
                        min={1}
                        value={step.config.delayDays ?? 3}
                        onChange={(e) => updateStep(step.id, { delayDays: Number(e.target.value) })}
                      />
                      <span className="text-sm text-text-muted">days</span>
                    </div>
                  )}
                  {step.type === 'condition' && (
                    <input
                      className="input text-sm"
                      value={step.config.condition ?? ''}
                      onChange={(e) => updateStep(step.id, { condition: e.target.value })}
                      placeholder="e.g. opened_last_email = true"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Add step */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full btn-secondary flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Step
        </button>
        {showAddMenu && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-10 p-1">
            {(Object.entries(stepTypeConfig) as [WorkflowStep['type'], typeof stepTypeConfig.email][]).map(
              ([type, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => addStep(type)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surface-tertiary text-left text-sm"
                  >
                    <div className={`p-1.5 rounded ${config.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    {config.label}
                  </button>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}
