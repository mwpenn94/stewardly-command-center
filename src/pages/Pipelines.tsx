import { Plus, RefreshCw, Database, ArrowRight, Play, Pause, Settings } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import { useDataStore } from '../store/useDataStore';
import type { DataPipeline } from '../types';

const statusActions: Record<string, { icon: typeof Play; label: string }> = {
  active: { icon: Pause, label: 'Pause' },
  paused: { icon: Play, label: 'Resume' },
  error: { icon: RefreshCw, label: 'Retry' },
  configuring: { icon: Settings, label: 'Configure' },
};

export default function Pipelines() {
  const { pipelines: dataPipelines, updatePipeline } = useDataStore();

  const togglePipeline = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    updatePipeline(id, { status: newStatus as DataPipeline['status'] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Pipelines"
        subtitle="Integrations, ingestion, and sync status"
        action={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Pipeline</span>
            <span className="sm:hidden">New</span>
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center py-3">
          <p className="text-xl font-bold text-text-primary">{dataPipelines.length}</p>
          <p className="text-xs text-text-muted">Total Pipelines</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xl font-bold text-accent-600">
            {dataPipelines.filter((p) => p.status === 'active').length}
          </p>
          <p className="text-xs text-text-muted">Active</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xl font-bold text-text-primary">
            {dataPipelines.reduce((sum, p) => sum + p.recordsProcessed, 0).toLocaleString()}
          </p>
          <p className="text-xs text-text-muted">Records (Last Run)</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xl font-bold text-amber-600">
            {dataPipelines.filter((p) => p.status === 'error').length}
          </p>
          <p className="text-xs text-text-muted">Errors</p>
        </div>
      </div>

      {/* Pipeline Cards */}
      <div className="space-y-3">
        {dataPipelines.map((pipeline: DataPipeline) => {
          const action = statusActions[pipeline.status];
          const ActionIcon = action?.icon ?? Settings;

          return (
            <div key={pipeline.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-primary-50 flex-shrink-0">
                    <Database className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-text-primary">{pipeline.name}</h3>
                      <StatusBadge status={pipeline.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-text-muted">
                      <span className="truncate">{pipeline.source}</span>
                      <ArrowRight className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{pipeline.destination}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium">{pipeline.recordsProcessed.toLocaleString()} records</p>
                    <p className="text-xs text-text-muted">{pipeline.schedule}</p>
                  </div>
                  <div className="text-xs text-text-muted sm:text-right">
                    <p>Last run</p>
                    <p>{new Date(pipeline.lastRun).toLocaleString()}</p>
                  </div>
                  <button
                    className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs"
                    aria-label={`${action?.label} ${pipeline.name}`}
                    onClick={() => togglePipeline(pipeline.id, pipeline.status)}
                  >
                    <ActionIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{action?.label}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {dataPipelines.length === 0 && (
        <div className="card text-center py-12">
          <Database className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">No pipelines configured yet</p>
          <button className="btn-primary mt-4">Create Your First Pipeline</button>
        </div>
      )}
    </div>
  );
}
