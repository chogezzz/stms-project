import { API_BASE_URL } from "@/lib/constants";
import { ApiResponse, SensorsResponse, SignalResponse } from "@/types/service";

export class TrafficManagementService {
  private static getAuthHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  // GET sensors
  static async getSensors(
    token: string
  ): Promise<ApiResponse<SensorsResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/sensors`, {
        method: "GET",
        headers: this.getAuthHeaders(token),
      });

      const json = await response.json();

      if (!response.ok) {
        return { error: json.error || "Failed to fetch sensors" };
      }

      // Normalize simulation state
      if (json.simulation_running === false) {
        return {
          data: {
            simulation_running: false,
            message: json.message ?? "No active simulation",
          } as SensorsResponse,
        };
      }

      return { data: json as SensorsResponse };
    } catch (error) {
      console.error("Error fetching sensors:", error);
      return {
        error:
          error instanceof Error ? error.message : "Failed to fetch sensors",
      };
    }
  }

  // POST signal
  static async updateSignal(
    token: string,
    body: { mode: "auto" | "manual"; lane?: string; state?: string }
  ): Promise<ApiResponse<SignalResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/signal`, {
        method: "POST",
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(body),
      });

      const json = await response.json();

      if (!response.ok) {
        return { error: json.error || "Failed to update signal" };
      }

      // Normalize simulation state
      if (json.simulation_running === false) {
        return {
          data: {
            simulation_running: false,
            message: json.message ?? "No active simulation",
          } as SignalResponse,
        };
      }

      return { data: json as SignalResponse };
    } catch (error) {
      console.error("Error updating signal:", error);
      return {
        error:
          error instanceof Error ? error.message : "Failed to update signal",
      };
    }
  }

  // POST start simulation
  static async startSimulation(
    token: string
  ): Promise<ApiResponse<{ id: number }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/simulations/start`, {
        method: "POST",
        headers: this.getAuthHeaders(token),
      });
      const json = await response.json();

      if (!response.ok) {
        return { error: json.error || "Failed to start simulation" };
      }
      return { data: json };
    } catch (error) {
      console.error("Error starting simulation:", error);
      return {
        error:
          error instanceof Error ? error.message : "Failed to start simulation",
      };
    }
  }

  // POST end simulation
  static async endSimulation(
    token: string
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/simulations/end`, {
        method: "POST",
        headers: this.getAuthHeaders(token),
      });
      const json = await response.json();

      if (!response.ok) {
        return { error: json.error || "Failed to end simulation" };
      }
      return { data: json };
    } catch (error) {
      console.error("Error ending simulation:", error);
      return {
        error:
          error instanceof Error ? error.message : "Failed to end simulation",
      };
    }
  }

  
}
