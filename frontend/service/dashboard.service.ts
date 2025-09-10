import { API_BASE_URL } from "@/lib/constants";
import { ApiResponse, DashboardSummary, SimulationEntity } from "@/types/service";


export class DashboardService {
  private static getAuthHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  static async getSummary(token: string): Promise<ApiResponse<DashboardSummary>> {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/summary`, {
        method: "GET",
        headers: this.getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data: DashboardSummary = await response.json();
      return { data };
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      return {
        error: error instanceof Error ? error.message : "Failed to fetch summary",
      };
    }
  }

  static async getSimulations(token: string): Promise<ApiResponse<SimulationEntity[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/simulations`, {
        method: "GET",
        headers: this.getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data: SimulationEntity[] = await response.json();
      return { data };
    } catch (error) {
      console.error("Error fetching simulations:", error);
      return {
        error: error instanceof Error ? error.message : "Failed to fetch simulations",
      };
    }
  }

  static async downloadSimulationPdf(token: string, simId: number) {
    const response = await fetch(
      `${API_BASE_URL}/reports/simulation/${simId}.pdf`,
      {
        method: "GET",
        headers: this.getAuthHeaders(token),
      }
    );
    if (!response.ok) throw new Error("Failed to download PDF");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `simulation_${simId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // Download a simulation Excel
  static async downloadSimulationExcel(token: string, simId: number) {
    const response = await fetch(
      `${API_BASE_URL}/reports/simulation/${simId}.xlsx`,
      {
        method: "GET",
        headers: this.getAuthHeaders(token),
      }
    );
    if (!response.ok) throw new Error("Failed to download Excel");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `simulation_${simId}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // Download a comparison Excel for multiple simulations
  static async downloadComparisonExcel(token: string, simIds: number[]) {
    const response = await fetch(`${API_BASE_URL}/reports/comparison.xlsx`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ simulation_ids: simIds }),
    });
    if (!response.ok) throw new Error("Failed to download comparison Excel");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `simulation_comparison.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
