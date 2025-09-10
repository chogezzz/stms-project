"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { useAuthStore } from "@/store/auth.store";
import { DashboardService } from "@/service/dashboard.service";
import { DashboardSummary } from "@/types/service";
import {
  Clock,
  Car,
  AlertTriangle,
  BarChart3,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Page() {
  const token = useAuthStore((state) => state.token);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [selectedSim, setSelectedSim] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);

  const fetchData = async () => {
    if (!token) return;
    try {
      const res = await DashboardService.getSummary(token);
      if (res.data) setSummary(res.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    setRefreshInterval(interval);

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const chartConfig = {
    vehicles: {
      label: "Vehicle Count",
      color: "var(--color-primary)",
    },
    queue: {
      label: "Queue Length",
      color: "var(--color-chart-3)",
    },

    speed: {
      label: "Avg Speed",
      color: "var(--color-chart-4)",
    },
  } satisfies ChartConfig;

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getSimulationDuration = (startTime: string, endTime: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };

  const isSimulationActive = (endTime: string | null) => {
    return endTime === null;
  };

  const getTrafficEfficiencyScore = (
    sim: DashboardSummary["recent_simulations"][number]
  ) => {
    // Simple efficiency calculation based on queue length and emergencies
    const baseScore = 100;
    const queuePenalty = Math.min(sim.avg_queue_length * 10, 30);
    const emergencyPenalty = Math.min(sim.emergencies * 0.1, 20);
    return Math.max(baseScore - queuePenalty - emergencyPenalty, 0).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="mx-auto h-8 w-8 animate-pulse text-primary mb-4" />
          <p>Loading traffic simulation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Traffic Control Center
          </h1>
          <p className="text-muted-foreground">
            Real-time SUMO traffic simulation monitoring & analytics
          </p>
        </div>
        {/* {summary?.global.current_simulation && (
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Live Simulation
              </span>
            </div>
            <p className="font-mono text-lg">
              SIM-{summary.global.current_simulation.id}
            </p>
            <p className="text-xs text-muted-foreground">
              Running for{" "}
              {getSimulationDuration(
                summary.global.current_simulation.start_time,
                null
              )}
            </p>
          </div>
        )} */}
      </div>

      {/* System Status Alert */}
      {!summary?.global.current_simulation && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-destructive">
                No active simulation detected. Traffic management system is
                idle.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Simulations
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.global.total_simulations ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Simulation runs completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Vehicles Processed
            </CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(summary?.global.total_vehicles ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total across all simulations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Queue Length
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.global.avg_queue_length?.toFixed(1) ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Vehicles per lane average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Emergency Events
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(summary?.global.emergencies_handled ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Critical incidents handled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Simulation Status & Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Simulations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Simulation Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary?.recent_simulations?.slice(0, 5).map((sim) => (
                <div
                  key={sim.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isSimulationActive(sim.end_time)
                          ? "bg-green-500 animate-pulse"
                          : "bg-gray-400"
                      }`}
                    />
                    <div>
                      <p className="font-medium">Simulation #{sim.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(sim.start_time)}
                      </p>
                      {sim.end_time && (
                        <p className="text-xs text-muted-foreground">
                          Duration:{" "}
                          {getSimulationDuration(sim.start_time, sim.end_time)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex space-x-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {sim.total_vehicles.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {sim.avg_queue_length.toFixed(1)}
                      </span>
                      {sim.emergencies > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          {sim.emergencies}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`text-xs px-2 py-1 rounded ${
                          isSimulationActive(sim.end_time)
                            ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isSimulationActive(sim.end_time)
                          ? "RUNNING"
                          : "COMPLETED"}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Score: {getTrafficEfficiencyScore(sim)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(summary?.recent_simulations?.length ?? 0) > 0 && (
                <>
                  <div className="flex justify-between items-center p-3 bg-primary/5 border border-primary/10 rounded-lg">
                    <div>
                      <p className="font-medium text-primary">
                        Average Throughput
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Vehicles per simulation
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {summary && summary.recent_simulations
                          ? Math.round(
                              summary.recent_simulations.reduce(
                                (sum, sim) => sum + sim.total_vehicles,
                                0
                              ) / summary.recent_simulations.length
                            ).toLocaleString()
                          : "0"}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
                    <div>
                      <p className="font-medium text-green-600 dark:text-green-400">
                        Best Performance
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Lowest queue length
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {summary && summary.recent_simulations
                          ? Math.min(
                              ...summary.recent_simulations.map(
                                (s) => s.avg_queue_length
                              )
                            ).toFixed(1)
                          : "0.0"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        vehicles/lane
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">
                    <div>
                      <p className="font-medium text-yellow-600 dark:text-yellow-400">
                        Emergency Rate
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Events per simulation
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {summary && summary.recent_simulations
                          ? Math.round(
                              summary.recent_simulations.reduce(
                                (sum, sim) => sum + sim.emergencies,
                                0
                              ) / summary.recent_simulations.length
                            )
                          : 0}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Section */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Select Simulation ID
            </p>
            <Select onValueChange={(value) => setSelectedSim(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a simulation" />
              </SelectTrigger>
              <SelectContent>
                {summary?.recent_simulations.map((sim) => (
                  <SelectItem key={sim.id} value={String(sim.id)}>
                    Simulation #{sim.id} ({sim.start_time})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!selectedSim}
              onClick={() =>
                DashboardService.downloadSimulationPdf(
                  token ?? "",
                  Number(selectedSim)
                ).catch(() => toast.error("Failed to download PDF"))
              }
            >
              Download PDF
            </Button>
            <Button
              variant="outline"
              disabled={!selectedSim}
              onClick={() =>
                DashboardService.downloadSimulationExcel(
                  token ?? "",
                  Number(selectedSim)
                ).catch(() => toast.error("Failed to download Excel"))
              }
            >
              Download Excel
            </Button>
          </div>

          {/* Comparison: multi-select */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Select Simulations for Comparison
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border p-2 rounded">
              {summary?.recent_simulations.map((sim) => (
                <label key={sim.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    value={sim.id}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedForCompare((prev) => [...prev, sim.id]);
                      } else {
                        setSelectedForCompare((prev) =>
                          prev.filter((id) => id !== sim.id)
                        );
                      }
                    }}
                  />
                  Simulation #{sim.id}
                </label>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            disabled={selectedForCompare.length < 2}
            onClick={() =>
              DashboardService.downloadComparisonExcel(
                token ?? "",
                selectedForCompare
              ).catch(() => toast.error("Failed to download Comparison Excel"))
            }
          >
            Compare Report
          </Button>
        </CardContent>
      </Card>

      {/* Charts - Show if multiple simulations exist */}
      {summary?.recent_simulations && summary.recent_simulations.length > 1 && (
        <div className="grid gap-6">
          {/* Traffic Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Traffic Volume Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Vehicle throughput and queue performance across recent
                simulations
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart
                    data={summary.recent_simulations.slice().reverse()}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="id"
                      tickFormatter={(value) => `SIM-${value}`}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value, name) => [
                        typeof value === "number"
                          ? value.toLocaleString()
                          : value,
                        name,
                      ]}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="total_vehicles"
                      stroke="var(--color-primary)"
                      fill="var(--color-primary)"
                      fillOpacity={0.1}
                      name=" Total Vehicles"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avg_queue_length"
                      stroke="var(--color-chart-3)"
                      strokeWidth={2}
                      name="Avg Queue Length"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Emergency Events Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Emergency Response Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Emergency incidents and system response across simulations
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={summary.recent_simulations.slice().reverse()}
                    barSize={60}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="id"
                      tickFormatter={(value) => `SIM-${value}`}
                    />
                    <YAxis />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value) => [value, " Emergency Events"]}
                    />
                    <Bar
                      dataKey="emergencies"
                      fill="var(--color-destructive)"
                      name="Emergency Events"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
