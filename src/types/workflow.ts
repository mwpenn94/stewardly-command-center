export interface WorkflowStep {
  id: string;
  type: 'email' | 'sms' | 'wait' | 'condition';
  config: {
    template?: string;
    message?: string;
    delayDays?: number;
    condition?: string;
  };
}

export interface OutreachWorkflow {
  id: string;
  name: string;
  trigger: 'new_lead' | 'lease_expiring' | 'payment_overdue' | 'manual';
  status: 'active' | 'paused' | 'draft';
  steps: WorkflowStep[];
  enrolledCount: number;
  completedCount: number;
  createdAt: string;
}
