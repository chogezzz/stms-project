export interface UserEntity {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: string;
}

export interface DashboardSummary {
  global: {
    total_simulations: number;
    total_vehicles: number;
    avg_queue_length: number;
    emergencies_handled: number;
    current_simulation: {
      id: number;
      start_time: string;
    } | null;
  };
  recent_simulations: SimulationStats[];
}

export interface SimulationStats {
  id: number;
  start_time: string;
  end_time: string | null;
  total_vehicles: number;
  avg_queue_length: number;
  emergencies: number;
}

export interface SimulationEntity {
  id: number;
  start_time: string;
  end_time: string | null;
}

export interface SensorData {
  mode: string;
  emergency: boolean;
  emergency_lane: string | null;
  queue_length: Record<string, number>;
  avg_speed: Record<string, number>;
  [lane: string]: unknown; // for lane counts like "north_in_0"
}

export interface SignalUpdateRequest {
  mode: "auto" | "manual";
  lane?: string;
  state?: string; // e.g., "G", "R", "Y"
}

export interface SensorsResponse {
  simulation_running: boolean;
  message?: string;
  simulation_id?: number;
  mode: "auto" | "manual";
  emergency: boolean;
  emergency_lane: string | null;
  avg_speed: Record<string, number>;
  queue_length: Record<string, number>;
  [lane: string]:
    | number
    | string
    | boolean
    | null
    | Record<string, number>
    | undefined;
}

export interface SignalResponse {
  simulation_running: boolean;
  message?: string;
  status?: string;
  mode?: "auto" | "manual";
  simulation_id?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
