FROM python:3.12-slim

WORKDIR /app

# Surya's recognition/layout models run in-process here (CPU). The LLM half
# runs in the separate surya-inference container, reached via
# SURYA_INFERENCE_URL — this image does not need llama-server.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8010

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8010"]
