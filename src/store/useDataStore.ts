import { create } from 'zustand';
import type { Property, Tenant, MaintenanceRequest, Contact, Campaign, DataPipeline } from '../types';
import {
  properties as mockProperties,
  tenants as mockTenants,
  maintenanceRequests as mockMaintenance,
  contacts as mockContacts,
  campaigns as mockCampaigns,
  dataPipelines as mockPipelines,
} from '../data/mock';

interface DataState {
  properties: Property[];
  tenants: Tenant[];
  maintenanceRequests: MaintenanceRequest[];
  contacts: Contact[];
  campaigns: Campaign[];
  pipelines: DataPipeline[];

  addProperty: (p: Omit<Property, 'id' | 'createdAt'>) => void;
  updateProperty: (id: string, updates: Partial<Property>) => void;
  deleteProperty: (id: string) => void;

  addTenant: (t: Omit<Tenant, 'id'>) => void;
  updateTenant: (id: string, updates: Partial<Tenant>) => void;
  deleteTenant: (id: string) => void;

  addMaintenanceRequest: (m: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMaintenanceRequest: (id: string, updates: Partial<MaintenanceRequest>) => void;

  addContact: (c: Omit<Contact, 'id' | 'createdAt'>) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;

  addCampaign: (c: Omit<Campaign, 'id' | 'createdAt'>) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;

  addPipeline: (p: Omit<DataPipeline, 'id'>) => void;
  updatePipeline: (id: string, updates: Partial<DataPipeline>) => void;
}

let nextId = 100;
const genId = (prefix: string) => `${prefix}${nextId++}`;
const today = () => new Date().toISOString().split('T')[0];

export const useDataStore = create<DataState>((set) => ({
  properties: mockProperties,
  tenants: mockTenants,
  maintenanceRequests: mockMaintenance,
  contacts: mockContacts,
  campaigns: mockCampaigns,
  pipelines: mockPipelines,

  addProperty: (p) =>
    set((s) => ({
      properties: [...s.properties, { ...p, id: genId('p'), createdAt: today() }],
    })),
  updateProperty: (id, updates) =>
    set((s) => ({
      properties: s.properties.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  deleteProperty: (id) =>
    set((s) => ({ properties: s.properties.filter((p) => p.id !== id) })),

  addTenant: (t) =>
    set((s) => ({ tenants: [...s.tenants, { ...t, id: genId('t') }] })),
  updateTenant: (id, updates) =>
    set((s) => ({
      tenants: s.tenants.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  deleteTenant: (id) =>
    set((s) => ({ tenants: s.tenants.filter((t) => t.id !== id) })),

  addMaintenanceRequest: (m) =>
    set((s) => ({
      maintenanceRequests: [
        ...s.maintenanceRequests,
        { ...m, id: genId('m'), createdAt: today(), updatedAt: today() },
      ],
    })),
  updateMaintenanceRequest: (id, updates) =>
    set((s) => ({
      maintenanceRequests: s.maintenanceRequests.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: today() } : m
      ),
    })),

  addContact: (c) =>
    set((s) => ({
      contacts: [...s.contacts, { ...c, id: genId('c'), createdAt: today() }],
    })),
  updateContact: (id, updates) =>
    set((s) => ({
      contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  deleteContact: (id) =>
    set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) })),

  addCampaign: (c) =>
    set((s) => ({
      campaigns: [...s.campaigns, { ...c, id: genId('camp'), createdAt: today() }],
    })),
  updateCampaign: (id, updates) =>
    set((s) => ({
      campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  addPipeline: (p) =>
    set((s) => ({
      pipelines: [...s.pipelines, { ...p, id: genId('dp') }],
    })),
  updatePipeline: (id, updates) =>
    set((s) => ({
      pipelines: s.pipelines.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
}));
