"use client";
import { useEffect, useState } from "react";
import { TrafficManagementService } from "@/service/traffic-management.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { SensorsResponse } from "@/types/service";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { laneLabels } from "@/lib/constants";

export default function Page() {
  const token = useAuthStore((state) => state.token);
  const [loading, setLoading] = useState(false);
  const [sensors, setSensors] = useState<SensorsResponse | null>(null);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [lastEmergency, setLastEmergency] = useState(false);
  const [selectedSim, setSelectedSim] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);

  // Fetch sensors periodically
  useEffect(() => {
    if (!token) return;
    let timer: NodeJS.Timeout;

    const fetchSensors = async () => {
      const { data, error } = await TrafficManagementService.getSensors(
        token ?? ""
      );
      if (error) {
        console.error(error);
        return;
      }
      if (data) {
        setSensors(data);

        if (data.simulation_running) {
          // Emergency detection
          if (data.emergency && !lastEmergency) {
            toast.error(
              `Emergency vehicle detected on ${
                data.emergency_lane
                  ? laneLabels[data.emergency_lane] ?? data.emergency_lane
                  : "unknown lane"
              }`
            );
            // // play siren audio
            // const audio = new Audio("/siren.mp3");
            // audio.play().catch(() => {});
          }
          setLastEmergency(!!data.emergency);
        }
      }
    };

    fetchSensors();
    // eslint-disable-next-line prefer-const
    timer = setInterval(fetchSensors, 1000); // poll every second
    return () => clearInterval(timer);
  }, [token, lastEmergency]);

  const handleModeChange = async (checked: boolean) => {
    const newMode: "auto" | "manual" = checked ? "manual" : "auto";
    setMode(newMode);
    setLoading(true);
    const { error } = await TrafficManagementService.updateSignal(token ?? "", {
      mode: newMode,
    });
    setLoading(false);
    if (error) {
      console.error(error);
      toast.error("Failed to change mode");
    } else {
      toast.success(`Mode changed to ${newMode}`);
    }
  };

  const updateLaneSignal = async (lane: string, state: string) => {
    setLoading(true);
    const { error } = await TrafficManagementService.updateSignal(token ?? "", {
      mode: "manual",
      lane,
      state,
    });
    setLoading(false);
    if (error) {
      console.error(error);
      toast.error("Failed to update signal");
    } else {
      toast.success(`Signal for ${laneLabels[lane] ?? lane} set to ${state}`);
    }
  };

  const handleStartSimulation = async () => {
    setLoading(true);
    const { data, error } = await TrafficManagementService.startSimulation(
      token ?? ""
    );
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success(`Simulation started (id: ${data?.id})`);
      setSensors(null); // force refetch
    }
  };

  const handleEndSimulation = async () => {
    setLoading(true);
    const { data, error } = await TrafficManagementService.endSimulation(
      token ?? ""
    );
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success(data?.message ?? "Simulation ended");
      setSensors(null);
    }
  };

  const simulationRunning = sensors?.simulation_running;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Traffic Management
          </h1>
          <p className="text-muted-foreground">
            View and manage incoming traffic in realtime.
          </p>
        </div>

        {simulationRunning ? (
          <Button
            variant="destructive"
            disabled={loading}
            onClick={handleEndSimulation}
          >
            End Simulation
          </Button>
        ) : (
          <Button disabled={loading} onClick={handleStartSimulation}>
            Start Simulation
          </Button>
        )}
      </div>

      {/* Junction Map Card */}
      <Card>
        <CardHeader>
          <CardTitle>Junction Map</CardTitle>
        </CardHeader>
        <CardContent>
          {!sensors ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !simulationRunning ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-muted-foreground mb-2">
                No active simulation running.
              </p>
              {/* <Button onClick={handleStartSimulation} disabled={loading}>
                Start a New Simulation
              </Button> */}
            </div>
          ) : (
            <>
              {/* Mode switch */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm">Auto</span>
                <Switch
                  checked={mode === "manual"}
                  onCheckedChange={handleModeChange}
                  disabled={loading}
                />
                <span className="text-sm">Manual</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {["north_in_0", "south_in_0", "east_in_0", "west_in_0"].map(
                  (lane) => (
                    <div
                      key={lane}
                      className="rounded-xl border p-4 shadow-sm bg-card"
                    >
                      <h3 className="font-semibold capitalize">
                        {laneLabels[lane] ?? lane}
                      </h3>
                      <p className="text-sm">
                        Vehicles: {sensors[lane] as number}
                      </p>
                      <p className="text-sm">
                        Queue: {sensors.queue_length?.[lane] ?? 0}
                      </p>
                      <p className="text-sm">
                        Avg Speed: {sensors.avg_speed?.[lane] ?? 0} km/h
                      </p>
                      {mode === "manual" && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateLaneSignal(lane, "G")}
                          >
                            Green
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateLaneSignal(lane, "R")}
                          >
                            Red
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateLaneSignal(lane, "Y")}
                          >
                            Yellow
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
