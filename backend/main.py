from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
import httpx, os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

HF_TOKEN = os.getenv("HF_TOKEN")
MODEL = "mistralai/Mistral-7B-Instruct-v0.2"  # swap any HF chat model

class ChatRequest(BaseModel):
    messages: list[dict]  # [{ role: "user", content: "..." }]

@app.post("/chat")
async def chat(req: ChatRequest):
    async def stream():
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream(
                "POST",
                f"https://api-inference.huggingface.co/models/{MODEL}/v1/chat/completions",
                headers={"Authorization": f"Bearer {HF_TOKEN}"},
                json={
                    "model": MODEL,
                    "messages": req.messages,
                    "max_tokens": 1024,
                    "stream": True,
                },
            ) as resp:
                async for line in resp.aiter_lines():
                    if line.startswith("data: ") and "[DONE]" not in line:
                        yield {"data": line[6:]}  # strip "data: " prefix

    return EventSourceResponse(stream())