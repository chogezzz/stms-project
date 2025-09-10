# backend/Dockerfile
FROM python:3.13-slim

# Install SUMO + system deps
RUN apt-get update && apt-get install -y \
    sumo sumo-tools sumo-doc 
    # libglib2.0-0 libsm6 libxext6 libxrender-dev \
    # && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Expose Flask port
EXPOSE 5000

# Run Flask
CMD ["python", "app.py"]
