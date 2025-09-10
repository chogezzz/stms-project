import traci
import os
import random

def start_simulation():
    try:
        config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../sumo/network.sumocfg"))
        if not os.path.exists(config_path):
            print(f"Error: SUMO config file not found at {config_path}")
            return None
        traci.start(["sumo", "-c", config_path])
        print("SUMO simulation started successfully")
        return traci
    except traci.exceptions.TraCIException as e:
        print(f"Failed to start SUMO: {e}")
        return None


def set_signal_state(traci, junction_id, sensors):
    if not traci:
        return

    NORTH_SOUTH_GREEN = "GGGggrrrrrGGGggrrrrr"
    EAST_WEST_GREEN = "rrrrrGGGggrrrrrGGGgg"
    YELLOW_TRANSITION = "yyyyyrrrrryyyyyrrrrr"
    ALL_RED = "rrrrrrrrrrrrrrrrrrrr"

    if not hasattr(set_signal_state, "last_green"):
        set_signal_state.last_green = None
        set_signal_state.green_start_time = 0
        set_signal_state.min_green_time = 10
        set_signal_state.emergency_active = False
        set_signal_state.emergency_direction = None
        set_signal_state.clearance_active = False
        set_signal_state.clearance_start_time = 0
        set_signal_state.clearance_duration = 3

    current_time = traci.simulation.getTime()

    # --- Emergency Priority ---
    if sensors.get("emergency") or set_signal_state.emergency_active:
        if sensors.get("emergency"):
            if not set_signal_state.emergency_active:
                print(f"[EVENT] Emergency detected at t={current_time}s, lane={sensors['emergency_lane']}")
            set_signal_state.emergency_active = True
            if "north_in" in sensors["emergency_lane"] or "south_in" in sensors["emergency_lane"]:
                traci.trafficlight.setRedYellowGreenState(junction_id, NORTH_SOUTH_GREEN)
                set_signal_state.emergency_direction = "north_south"
            elif "east_in" in sensors["emergency_lane"] or "west_in" in sensors["emergency_lane"]:
                traci.trafficlight.setRedYellowGreenState(junction_id, EAST_WEST_GREEN)
                set_signal_state.emergency_direction = "east_west"
            set_signal_state.green_start_time = current_time

        # When emergency is gone, start clearance phase
        if not any(traci.vehicle.getVehicleClass(v) == "emergency" for v in traci.vehicle.getIDList()):
            if set_signal_state.emergency_active:
                print(f"[EVENT] Emergency cleared at t={current_time}s")
                set_signal_state.emergency_active = False
                set_signal_state.clearance_active = True
                set_signal_state.clearance_start_time = current_time
        return

    # --- Clearance Phase ---
    if set_signal_state.clearance_active:
        traci.trafficlight.setRedYellowGreenState(junction_id, ALL_RED)
        if current_time - set_signal_state.clearance_start_time >= set_signal_state.clearance_duration:
            set_signal_state.clearance_active = False
        return

    # --- Auto Mode ---
    if sensors.get("mode") == "auto":
        lane_counts = {lane: count for lane, count in sensors.items() if "_in_" in lane}
        if current_time - set_signal_state.green_start_time >= set_signal_state.min_green_time:
            north_south_count = sum(lane_counts[l] for l in ["north_in_0", "north_in_1", "south_in_0", "south_in_1"])
            east_west_count = sum(lane_counts[l] for l in ["east_in_0", "east_in_1", "west_in_0", "west_in_1"])

            if north_south_count >= east_west_count:
                traci.trafficlight.setRedYellowGreenState(junction_id, NORTH_SOUTH_GREEN)
                set_signal_state.last_green = "north_south"
            else:
                traci.trafficlight.setRedYellowGreenState(junction_id, EAST_WEST_GREEN)
                set_signal_state.last_green = "east_west"

            set_signal_state.green_start_time = current_time


def add_sensor_noise(value, noise_level=0.1, min_val=0):
    """
    Adds ±noise_level% random noise to a sensor reading.
    Ensures value doesn't drop below min_val.
    """
    noise_factor = 1 + random.uniform(-noise_level, noise_level)
    noisy_value = value * noise_factor
    return max(min_val, round(noisy_value, 2))


def simulate_sensors():
    lanes = ["north_in_0", "north_in_1", "south_in_0", "south_in_1",
             "east_in_0", "east_in_1", "west_in_0", "west_in_1"]

    sensors = {lane: 0 for lane in lanes}
    sensors["queue_length"] = {lane: 0 for lane in lanes}
    sensors["avg_speed"] = {lane: 0.0 for lane in lanes}
    sensors["emergency"] = False
    sensors["emergency_lane"] = None
    sensors["mode"] = "auto"

    junction_id = "junction1"

    while traci.simulation.getMinExpectedNumber() > 0:
        traci.simulationStep()

        # Collect lane counts, queue length, and speed (with noise)
        for lane in lanes:
            raw_count = traci.lane.getLastStepVehicleNumber(lane)
            raw_queue = traci.lane.getLastStepHaltingNumber(lane)
            raw_speed = traci.lane.getLastStepMeanSpeed(lane)

            sensors[lane] = add_sensor_noise(raw_count, noise_level=0.05)
            sensors["queue_length"][lane] = add_sensor_noise(raw_queue, noise_level=0.1)
            sensors["avg_speed"][lane] = add_sensor_noise(raw_speed, noise_level=0.05)

        # Detect emergency vehicles
        vehicle_ids = traci.vehicle.getIDList()
        sensors["emergency"] = any(traci.vehicle.getVehicleClass(v) == "emergency" for v in vehicle_ids)
        if sensors["emergency"]:
            for v in vehicle_ids:
                if traci.vehicle.getVehicleClass(v) == "emergency":
                    sensors["emergency_lane"] = traci.vehicle.getLaneID(v)
                    break
        else:
            sensors["emergency_lane"] = None

        # Update signals
        set_signal_state(traci, junction_id, sensors)

        yield sensors

    traci.close()


def get_sensor_data():
    return next(simulate_sensors())
