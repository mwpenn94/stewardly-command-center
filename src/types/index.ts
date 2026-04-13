export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  type: 'residential' | 'commercial' | 'mixed';
  units: number;
  occupancyRate: number;
  monthlyRevenue: number;
  status: 'active' | 'maintenance' | 'vacant';
  imageUrl?: string;
  createdAt: string;
}

export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  propertyId: string;
  unitNumber: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  status: 'active' | 'late' | 'pending' | 'former';
  balance: number;
}

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  tenantId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  category: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  type: 'lead' | 'prospect' | 'tenant' | 'vendor' | 'partner';
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  notes: string;
  lastContactedAt: string;
  createdAt: string;
  tags: string[];
}

export interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'social' | 'sms' | 'print' | 'digital_ad';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  audience: string;
  reach: number;
  engagement: number;
  conversions: number;
  budget: number;
  spent: number;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totalProperties: number;
  totalUnits: number;
  occupancyRate: number;
  monthlyRevenue: number;
  openMaintenanceRequests: number;
  activeTenants: number;
  upcomingLeaseExpirations: number;
  outstandingBalance: number;
}

export interface Activity {
  id: string;
  type: 'payment' | 'maintenance' | 'lease' | 'contact' | 'campaign';
  title: string;
  description: string;
  timestamp: string;
  entityId: string;
}

export interface DataPipeline {
  id: string;
  name: string;
  source: string;
  destination: string;
  status: 'active' | 'paused' | 'error' | 'configuring';
  lastRun: string;
  recordsProcessed: number;
  schedule: string;
}
