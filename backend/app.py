from flask import Flask, jsonify, request
from flask_cors import CORS
import traceback
import datetime
import jwt
from functools import wraps
from config import DevelopmentConfig
from reports import generate_simulation_pdf, generate_simulation_excel, generate_comparison_excel
from flask import send_file

# traci will be imported/used by simulation.start_simulation
import traci as traci_module

from simulation import simulate_sensors, start_simulation, set_signal_state
from models import db, User, Simulation, TrafficData
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app,supports_credentials=True)
# For more fine grained control on CORS
# CORS(app, 
#      origins=[
#          "http://localhost:3000",      # React development server
#          "http://127.0.0.1:5000",      # Flask server
#          # Add deployment domain if ever deployed lol
#      ],
#      methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
#      allow_headers=["Content-Type", "Authorization"],
#      supports_credentials=True
# )

# Load config from config.py
app.config.from_object(DevelopmentConfig)

db.init_app(app)

# globals
traci = None
sensor_generator = None
current_simulation_id = None


def ensure_db_and_default_user():
    """Create tables and default admin user (username='admin', password='admin') if missing."""
    with app.app_context():
        db.create_all()
        admin_username= "admin"
        admin_email = "admin@gmail.com"
        admin = User.query.filter_by(username=admin_username).first()
        if not admin:
            admin = User(
                username= admin_username,
                email=admin_email,
                password_hash=generate_password_hash("admin"),
                role="admin",
            )
            db.session.add(admin)
            db.session.commit()
            print("Created default admin user: admin/admin (email field = 'admin').")
        else:
            print("Default admin user already exists.")

with app.app_context():
    ensure_db_and_default_user()

def token_required(f):
    """Decorator to require JWT token for protected routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check if token is in the Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'message': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.filter_by(email=data['email']).first()
            if not current_user:
                return jsonify({'message': 'Token is invalid'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated


def admin_required(f):
    """Decorator to require admin role for protected routes."""
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.role != 'admin':
            return jsonify({'message': 'Admin access required'}), 403
        return f(current_user, *args, **kwargs)
    
    return decorated


@app.route("/api/login", methods=["POST"])
def login():
    """Authenticate user and return JWT token."""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Username and password required'}), 400
    
    username = data['username']
    password = data['password']
    
    with app.app_context():
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password_hash, password):
            # Generate JWT token - using config value
            token = jwt.encode({
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=app.config['JWT_EXPIRATION_HOURS'])
            }, app.config['JWT_SECRET_KEY'], algorithm='HS256')
            
            return jsonify({
                'token': token,
                'user': {
                    'username': user.username,
                    'email': user.email,
                    'role': user.role
                },
                'expires_in': app.config['JWT_EXPIRATION_HOURS'] * 60 * 60  # hours to seconds
            }), 200
        
        return jsonify({'message': 'Invalid credentials'}), 401


@app.route("/api/users", methods=["POST"])
@token_required
@admin_required
def create_user(current_user):
    """Create a new user (admin only)."""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Username, email and password required'}), 400
    
    username = data['username']
    email = data['email']
    password = data['password']
    role = data.get('role', 'user')  # Default to 'user' role
    
    # Validate role
    if role not in ['user', 'admin']:
        return jsonify({'message': 'Invalid role. Must be "user" or "admin"'}), 400
    
    with app.app_context():
        # Check if user already exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({'message': 'User already exists'}), 409
        
        # Create new user
        new_user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
            role=role
        )
        
        try:
            db.session.add(new_user)
            db.session.commit()
            
            return jsonify({
                'message': 'User created successfully',
                'user': {
                    'username': new_user.username,
                    'email': new_user.email,
                    'role': new_user.role
                }
            }), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'message': 'Failed to create user'}), 500


@app.route("/api/users", methods=["GET"])
@token_required
@admin_required
def list_users(current_user):
    """List all users (admin only)."""
    with app.app_context():
        users = User.query.all()
        return jsonify([
            {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role
            } for user in users
        ]), 200


def restart_simulation():
    """
    Closes any existing SUMO connection and starts a new one.
    Also creates a Simulation DB row and stores current_simulation_id.
    """
    global traci, sensor_generator, current_simulation_id

    try:
        if traci:
            try:
                traci_module.close(False)
            except Exception:
                # ignore any close errors
                pass
            traci = None
    except Exception:
        pass

    traci = start_simulation()
    if not traci:
        return False

    sensor_generator = simulate_sensors()

    # Create a simulation record in DB
    with app.app_context():
        sim = Simulation(start_time=datetime.datetime.utcnow())
        db.session.add(sim)
        db.session.commit()
        current_simulation_id = sim.id
        print(f"Started new simulation id={current_simulation_id}")

    return True


def end_current_simulation():
    """Set end_time for current simulation in DB."""
    global current_simulation_id
    with app.app_context():
        if current_simulation_id is not None:
            sim = Simulation.query.get(current_simulation_id)
            if sim and sim.end_time is None:
                sim.end_time = datetime.datetime.utcnow()
                db.session.commit()
                print(f"Marked simulation id={current_simulation_id} ended at {sim.end_time}")
    current_simulation_id = None


def store_sensor_readings(sensors):
    """
    sensors returned from simulate_sensors() contains:
      - per-lane counts (sensors['north_in_0'], etc.)
      - sensors['queue_length'][lane]
      - sensors['avg_speed'][lane]
      - sensors['emergency']
    We'll insert a row per lane with the current simulation id.
    """
    global current_simulation_id
    if current_simulation_id is None:
        return

    timestamp = datetime.datetime.utcnow()
    lane_keys = [k for k in sensors.keys() if isinstance(k, str) and k.endswith(("_in_0", "_in_1"))]

    with app.app_context():
        rows = []
        for lane in lane_keys:
            try:
                vehicle_count = int(round(float(sensors.get(lane, 0))))
            except Exception:
                vehicle_count = 0
            try:
                queue_length = int(round(float(sensors.get("queue_length", {}).get(lane, 0))))
            except Exception:
                queue_length = 0
            try:
                avg_speed = float(sensors.get("avg_speed", {}).get(lane, 0.0))
            except Exception:
                avg_speed = 0.0

            td = TrafficData(
                simulation_id=current_simulation_id,
                timestamp=timestamp,
                lane=lane,
                vehicle_count=vehicle_count,
                queue_length=queue_length,
                avg_speed=avg_speed,
                emergency=bool(sensors.get("emergency", False)),
            )
            rows.append(td)
        if rows:
            db.session.bulk_save_objects(rows)
            db.session.commit()


@app.route("/api/sensors", methods=["GET"])
@token_required
def sensors(current_user):
    global traci, sensor_generator

    try:
        # If no sim or sim has ended
        if not traci or traci.simulation.getMinExpectedNumber() == 0:
            end_current_simulation()  # mark in DB
            return jsonify({
                "simulation_running": False,
                "message": "No active simulation"
            }), 200

        sensors = next(sensor_generator)  # may raise StopIteration
        store_sensor_readings(sensors)
        sensors["simulation_id"] = current_simulation_id
        sensors["simulation_running"] = True
        return jsonify(sensors), 200

    except StopIteration:
        # Simulation ended
        end_current_simulation()
        return jsonify({
            "simulation_running": False,
            "message": "Simulation ended"
        }), 200

    except Exception as e:
        print(f"Error in /api/sensors: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/signal", methods=["POST"])
@token_required
def signal(current_user):
    global traci, sensor_generator
    try:
        # If no sim or sim ended
        if not traci or traci.simulation.getMinExpectedNumber() == 0:
            end_current_simulation()
            return jsonify({
                "simulation_running": False,
                "message": "No active simulation"
            }), 200

        data = request.json or {}
        mode = data.get("mode", "auto")
        sensors = {"mode": mode}

        if mode == "manual":
            sensors["lane"] = data.get("lane")
            sensors["state"] = data.get("state")
            sensors["emergency"] = False
            sensors["emergency_lane"] = None
        else:
            sensors.update(next(sensor_generator))  # reuse current sensor data

        set_signal_state(traci, "junction1", sensors)

        return jsonify({
            "status": "Signal updated",
            "mode": mode,
            "simulation_running": True,
            "simulation_id": current_simulation_id
        }), 200

    except StopIteration:
        end_current_simulation()
        return jsonify({
            "simulation_running": False,
            "message": "Simulation ended"
        }), 200

    except Exception as e:
        print(f"Error in /api/signal: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Internal server error"}), 500
    

@app.route("/api/simulations/start", methods=["POST"])
@token_required
def start_new_simulation(current_user):
    end_current_simulation()
    if restart_simulation():
        return jsonify({"message": "Simulation started", "id": current_simulation_id}), 200
    return jsonify({"error": "Failed to start simulation"}), 500

@app.route("/api/simulations/end", methods=["POST"])
@token_required
def end_simulation(current_user):
    end_current_simulation()
    return jsonify({"message": "Simulation ended"}), 200


@app.route("/api/simulations", methods=["GET"])
@token_required
def list_simulations(current_user):
    """Return list of simulations (id, start_time, end_time)."""
    with app.app_context():
        sims = Simulation.query.order_by(Simulation.id.desc()).limit(50).all()
        return jsonify([
            {"id": s.id, "start_time": s.start_time.isoformat(), "end_time": s.end_time.isoformat() if s.end_time else None}
            for s in sims
        ])


@app.route("/api/traffic/<int:simulation_id>", methods=["GET"])
@token_required
def get_traffic_for_sim(current_user, simulation_id):
    """Return latest traffic rows for a simulation (paginated simple)."""
    with app.app_context():
        rows = TrafficData.query.filter_by(simulation_id=simulation_id).order_by(TrafficData.timestamp.asc()).limit(2000).all()
        return jsonify([
            {
                "timestamp": r.timestamp.isoformat(),
                "lane": r.lane,
                "vehicle_count": r.vehicle_count,
                "queue_length": r.queue_length,
                "avg_speed": r.avg_speed,
                "emergency": r.emergency
            } for r in rows
        ])


@app.route("/api/dashboard/summary", methods=["GET"])
@token_required
def dashboard_summary(current_user):
    with app.app_context():
        # Global stats
        total_sims = Simulation.query.count()
        total_vehicles = db.session.query(db.func.sum(TrafficData.vehicle_count)).scalar() or 0
        avg_queue = db.session.query(db.func.avg(TrafficData.queue_length)).scalar() or 0
        emergency_count = db.session.query(db.func.count()).filter(TrafficData.emergency == True).scalar() or 0

        current_sim = Simulation.query.filter(Simulation.end_time == None).first()

        # Per-simulation aggregates (last 5 simulations, newest first)
        sims = Simulation.query.order_by(Simulation.id.desc()).limit(5).all()
        sim_summaries = []
        for s in sims:
            stats = db.session.query(
                db.func.sum(TrafficData.vehicle_count),
                db.func.avg(TrafficData.queue_length),
                db.func.count().filter(TrafficData.emergency == True)
            ).filter(TrafficData.simulation_id == s.id).first()

            sim_summaries.append({
                "id": s.id,
                "start_time": s.start_time.isoformat(),
                "end_time": s.end_time.isoformat() if s.end_time else None,
                "total_vehicles": int(stats[0] or 0),
                "avg_queue_length": float(stats[1] or 0),
                "emergencies": int(stats[2] or 0)
            })

        return jsonify({
            "global": {
                "total_simulations": total_sims,
                "total_vehicles": int(total_vehicles),
                "avg_queue_length": float(avg_queue),
                "emergencies_handled": int(emergency_count),
                "current_simulation": {
                    "id": current_sim.id if current_sim else None,
                    "start_time": current_sim.start_time.isoformat() if current_sim else None
                }
            },
            "recent_simulations": sim_summaries
        })

@app.route("/api/reports/simulation/<int:sim_id>.pdf", methods=["GET"])
@token_required
def simulation_report_pdf(current_user, sim_id):
    buffer = generate_simulation_pdf(sim_id)
    if not buffer:
        return jsonify({"error": "Simulation not found"}), 404
    return send_file(buffer, as_attachment=True, download_name=f"simulation_{sim_id}.pdf", mimetype="application/pdf")

@app.route("/api/reports/simulation/<int:sim_id>.xlsx", methods=["GET"])
@token_required
def simulation_report_excel(current_user, sim_id):
    buffer = generate_simulation_excel(sim_id)
    if not buffer:
        return jsonify({"error": "Simulation not found"}), 404
    return send_file(buffer, as_attachment=True, download_name=f"simulation_{sim_id}.xlsx", mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

@app.route("/api/reports/comparison.xlsx", methods=["POST"])
@token_required
def comparison_report_excel(current_user):
    data = request.get_json() or {}
    sim_ids = data.get("simulation_ids", [])

    if not sim_ids or not isinstance(sim_ids, list):
        return jsonify({"error": "simulation_ids must be a list"}), 400

    buffer = generate_comparison_excel(sim_ids)
    return send_file(
        buffer,
        as_attachment=True,
        download_name="simulation_comparison.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )

if __name__ == "__main__":
    ensure_db_and_default_user()
    app.run(debug=True, port=5000)
