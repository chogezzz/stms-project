from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    username = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default="user", nullable=False)

    def __repr__(self):
        return f"<User {self.email}>"


class Simulation(db.Model):
    __tablename__ = "simulations"
    id = db.Column(db.Integer, primary_key=True)
    start_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    end_time = db.Column(db.DateTime, nullable=True)

    def __repr__(self):
        return f"<Simulation {self.id} start={self.start_time} end={self.end_time}>"


class TrafficData(db.Model):
    __tablename__ = "traffic_data"
    id = db.Column(db.Integer, primary_key=True)
    simulation_id = db.Column(db.Integer, db.ForeignKey("simulations.id"), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    lane = db.Column(db.String(128), nullable=False)
    vehicle_count = db.Column(db.Integer, nullable=False)
    queue_length = db.Column(db.Integer, nullable=False)
    avg_speed = db.Column(db.Float, nullable=False)
    emergency = db.Column(db.Boolean, default=False, nullable=False)

    simulation = db.relationship("Simulation", backref=db.backref("traffic_rows", lazy="dynamic"))

    def __repr__(self):
        return f"<TrafficData sim={self.simulation_id} lane={self.lane} count={self.vehicle_count}>"
