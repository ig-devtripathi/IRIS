FROM python:3.11-slim

# Install Node.js 20
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Create a non-root user (Required for Hugging Face best practices)
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Copy project files with correct ownership
COPY --chown=user . .

# Build React frontend
WORKDIR /app/frontend
RUN npm install && npm run build

# Final setup
WORKDIR /app/backend

# Expose Hugging Face required port
EXPOSE 7860

# Start FastAPI from backend/ dir so bare "import config" works
WORKDIR /app/backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
