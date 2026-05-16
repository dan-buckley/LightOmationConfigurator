import { api } from './client';

export interface HealthStatus {
  status: string;
  environment: string;
  database: string;
}

export const checkHealth = () => api.get<HealthStatus>('/api/v1/health');
