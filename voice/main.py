import os
import sys
# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
# from pipeline.stt import transcribe_audio
# from pipeline.tts import generate_speech

app = FastAPI(title="Voice Pipeline Service")

@app.websocket("/voice/stream")
async def voice_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_bytes()
            # 1. Chunk audio
            # 2. VAD processing
            # 3. Whisper STT (OpenAI API)
            # 4. LangGraph Agent Call
            # 5. OpenAI TTS
            await websocket.send_text("Processed voice frame")
    except WebSocketDisconnect:
        print("Voice client disconnected")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
