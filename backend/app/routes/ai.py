import json
import os
import urllib.error
import urllib.request
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from app import crud, schemas

router = APIRouter()

DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "openrouter": "openai/gpt-4o-mini",
    "groq": "llama-3.3-70b-versatile",
    "anthropic": "claude-sonnet-5-5",
    "gemini": "gemini-3.5-flash",
    "custom": "gpt-4o-mini",
}

DEFAULT_BASE_URLS = {
    "openai": "https://api.openai.com/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "groq": "https://api.groq.com/openai/v1",
    "custom": "",
}

CHAT_SYSTEM_PROMPT = (
    "You are StudySphere, a knowledgeable and friendly AI assistant for university students. "
    "Give accurate, practical, and well-structured answers. Use Markdown, short paragraphs, "
    "bullet lists, and fenced code blocks with a language tag when code is involved. "
    "When a student asks for study help, include concrete steps and examples."
)

STUDY_SYSTEM_PROMPT = (
    "You are the StudySphere Academic Study Assistant, a patient tutor for university-level "
    "computer science, mathematics, engineering, and general academic subjects. Explain concepts "
    "step by step, define key terms, show worked examples, point out common mistakes, and end with "
    "a short practice question when useful. Use Markdown and fenced code blocks with a language tag. "
    "If a question is ambiguous, state your assumptions and solve the most likely version."
)


def _provider_config():
    key = (os.getenv("AI_API_KEY") or "").strip()
    # Claude (Anthropic) is the default AI. If only a key is given, use Claude.
    provider = (os.getenv("AI_PROVIDER") or "").strip().lower() or ("anthropic" if key else "")
    model = (os.getenv("AI_MODEL") or "").strip()
    base_url = (os.getenv("AI_BASE_URL") or "").strip()
    allow_demo = (os.getenv("AI_ALLOW_DEMO") or "false").strip().lower() in ("1", "true", "yes")

    if provider in ("", "demo", "none"):
        provider = provider or "demo"
        model = model or ""
        return {
            "provider": provider,
            "key": key,
            "model": model,
            "base_url": base_url,
            "configured": False,
            "allow_demo": allow_demo,
        }

    if provider not in DEFAULT_MODELS:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Unsupported AI_PROVIDER '{provider}'. Use openai, anthropic, gemini, "
                "groq, openrouter, or custom."
            ),
        )

    model = model or DEFAULT_MODELS[provider]
    base_url = base_url or DEFAULT_BASE_URLS.get(provider, "")
    configured = bool(key) or (provider == "custom" and bool(base_url))
    return {
        "provider": provider,
        "key": key,
        "model": model,
        "base_url": base_url.rstrip("/"),
        "configured": configured,
        "allow_demo": allow_demo,
    }


def _status_payload():
    cfg = _provider_config()
    return {
        "configured": cfg["configured"],
        "provider": cfg["provider"] if cfg["configured"] else "not-configured",
        "model": cfg["model"],
        "demo_mode": bool(cfg["allow_demo"] and not cfg["configured"]),
    }


def _post_json(url: str, payload: dict, headers: dict, timeout: int = 60):
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")[:400]
        raise HTTPException(status_code=502, detail=f"AI provider error {exc.code}: {body}") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach the AI provider: {exc}") from exc


def _call_openai_compatible(cfg, messages, temperature):
    url = f"{cfg['base_url']}/chat/completions"
    payload = {
        "model": cfg["model"],
        "messages": messages,
        "temperature": temperature,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {cfg['key']}",
    }
    if cfg["provider"] == "openrouter":
        headers["HTTP-Referer"] = "http://127.0.0.1:8000"
        headers["X-Title"] = "StudySphere"
    result = _post_json(url, payload, headers)
    try:
        return result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="AI provider returned an unexpected response.") from exc


def _call_anthropic(cfg, messages, temperature):
    system = "\n\n".join(m["content"] for m in messages if m["role"] == "system") or CHAT_SYSTEM_PROMPT
    chat_messages = [m for m in messages if m["role"] in ("user", "assistant")]
    payload = {
        "model": cfg["model"],
        "max_tokens": 1600,
        "temperature": temperature,
        "system": system,
        "messages": chat_messages,
    }
    headers = {
        "Content-Type": "application/json",
        "x-api-key": cfg["key"],
        "anthropic-version": "2023-06-01",
    }
    result = _post_json("https://api.anthropic.com/v1/messages", payload, headers)
    try:
        return result["content"][0]["text"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="Anthropic returned an unexpected response.") from exc


def _call_gemini(cfg, messages, temperature):
    system = "\n\n".join(m["content"] for m in messages if m["role"] == "system")
    contents = []
    for message in messages:
        if message["role"] == "system":
            continue
        contents.append(
            {
                "role": "model" if message["role"] == "assistant" else "user",
                "parts": [{"text": message["content"]}],
            }
        )
    payload = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": system}]} if system else None,
        "generationConfig": {"temperature": temperature, "maxOutputTokens": 1600},
    }
    payload = {k: v for k, v in payload.items() if v is not None}
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{cfg['model']}:generateContent"
    )
    result = _post_json(
        url,
        payload,
        {
            "Content-Type": "application/json",
            "x-goog-api-key": cfg["key"],
        },
    )
    try:
        return result["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="Gemini returned an unexpected response.") from exc


def _call_provider(cfg, messages, temperature):
    if cfg["provider"] == "anthropic":
        return _call_anthropic(cfg, messages, temperature)
    if cfg["provider"] == "gemini":
        return _call_gemini(cfg, messages, temperature)
    return _call_openai_compatible(cfg, messages, temperature)


def _attachment_context(attachments):
    if not attachments:
        return ""
    parts = ["The student attached the following documents. Use them as context when relevant:"]
    for attachment in attachments:
        content = (attachment.content or "").strip()
        if len(content) > 8000:
            content = content[:8000] + "\n...[truncated]"
        parts.append(f"\n--- {attachment.name} ({attachment.type or 'file'}) ---\n{content or '[No readable text]'}")
    return "\n".join(parts)


def _messages_for_provider(conversation_messages, prompt, mode, attachments, extra_system):
    system = STUDY_SYSTEM_PROMPT if mode == "study" else CHAT_SYSTEM_PROMPT
    if extra_system:
        system += f"\n\nStudent preferences: {extra_system}"
    attachment_context = _attachment_context(attachments)
    if attachment_context:
        system += f"\n\n{attachment_context}"

    history = []
    for message in conversation_messages[-12:]:
        role = "assistant" if message["role"] == "assistant" else "user"
        history.append({"role": role, "content": message["content"]})
    if prompt:
        history.append({"role": "user", "content": prompt})
    return [{"role": "system", "content": system}] + history


def _generate(conversation_messages, prompt, mode, attachments, temperature, extra_system, cfg):
    if not cfg["configured"]:
        raise HTTPException(
            status_code=503,
            detail=(
                "The AI provider is not configured. Set AI_PROVIDER and AI_API_KEY in "
                "backend/.env and restart the server. Supported AI_PROVIDER values: "
                "openai, anthropic, gemini, groq, openrouter, custom. "
                "No placeholder answers are returned."
            ),
        )
    messages = _messages_for_provider(conversation_messages, prompt, mode, attachments, extra_system)
    return _call_provider(cfg, messages, temperature)


def _title_from(message: str, attachments) -> str:
    title = " ".join((message or "").split())
    if not title and attachments:
        title = f"Document: {attachments[0].name}"
    if not title:
        title = "New conversation"
    return title[:80]


@router.get("/status", response_model=schemas.AIStatus)
def ai_status():
    return _status_payload()


@router.get("/conversations", response_model=list[schemas.ConversationSummary])
def conversations(
    mode: str = Query("all", pattern="^(all|chat|study)$"),
    limit: int = Query(100, ge=1, le=200),
):
    return crud.list_chat_conversations(mode, limit)


@router.get("/conversations/{conversation_id}")
def conversation_detail(conversation_id: int):
    result = crud.get_chat_conversation(conversation_id)
    if not result:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return result


@router.patch("/conversations/{conversation_id}", response_model=schemas.ConversationSummary)
def rename_conversation(conversation_id: int, payload: schemas.ConversationRename):
    updated = crud.rename_chat_conversation(conversation_id, payload.title)
    if not updated:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {
        "id": updated["id"],
        "title": updated["title"],
        "mode": updated["mode"],
        "preview": "",
        "message_count": 0,
        "created_at": updated["created_at"],
        "updated_at": updated["updated_at"],
    }


@router.delete("/conversations/{conversation_id}")
def remove_conversation(conversation_id: int):
    if not crud.delete_chat_conversation(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"ok": True}


@router.delete("/conversations")
def clear_conversations(mode: str = Query("all", pattern="^(all|chat|study)$")):
    deleted = crud.delete_all_chat_conversations(mode)
    return {"ok": True, "deleted": deleted}


@router.post("/chat", response_model=schemas.AIChatResponse)
def chat(payload: schemas.AIChatRequest):
    cfg = _provider_config()
    prompt = (payload.message or "").strip()
    if not prompt and not payload.attachments:
        raise HTTPException(status_code=422, detail="Message or at least one attachment is required.")
    if not prompt and payload.attachments:
        prompt = "Please summarize and explain the attached document."

    conversation_id = payload.conversation_id
    conversation = None
    history = []
    mode = payload.mode

    if conversation_id:
        result = crud.get_chat_conversation(conversation_id)
        if not result:
            raise HTTPException(status_code=404, detail="Conversation not found")
        conversation = result["conversation"]
        history = result["messages"]
        mode = conversation["mode"]

    temperature = payload.temperature if payload.temperature is not None else 0.7
    response_text = _generate(
        history, prompt, mode, payload.attachments, temperature, payload.system_prompt, cfg
    )

    now = datetime.utcnow().isoformat()
    if not payload.save_history:
        return schemas.AIChatResponse(
            conversation_id=None,
            title=_title_from(prompt, payload.attachments),
            response=response_text,
            demo_mode=False,
            provider=cfg["provider"],
            model=cfg["model"],
            messages=[
                schemas.ChatMessageOut(
                    id=-2,
                    role="user",
                    content=prompt,
                    attachments=payload.attachments,
                    created_at=now,
                ),
                schemas.ChatMessageOut(
                    id=-1,
                    role="assistant",
                    content=response_text,
                    attachments=[],
                    created_at=now,
                ),
            ],
        )

    if not conversation_id:
        conversation_id = crud.create_chat_conversation(_title_from(prompt, payload.attachments), mode)
        conversation = crud.get_chat_conversation(conversation_id)["conversation"]

    crud.add_chat_message(conversation_id, "user", prompt, payload.attachments)
    crud.add_chat_message(conversation_id, "assistant", response_text)
    result = crud.get_chat_conversation(conversation_id)

    return schemas.AIChatResponse(
        conversation_id=conversation_id,
        title=result["conversation"]["title"],
        response=response_text,
        demo_mode=False,
        provider=cfg["provider"],
        model=cfg["model"],
        messages=result["messages"],
    )


@router.post("/conversations/{conversation_id}/regenerate", response_model=schemas.AIChatResponse)
def regenerate(conversation_id: int, payload: schemas.AIChatRequest):
    cfg = _provider_config()
    result = crud.get_chat_conversation(conversation_id)
    if not result:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = result["messages"]
    user_messages = [m for m in messages if m["role"] == "user"]
    if not user_messages:
        raise HTTPException(status_code=422, detail="There is no user message to regenerate.")

    crud.delete_last_assistant_message(conversation_id)
    result = crud.get_chat_conversation(conversation_id)
    history = [m for m in result["messages"] if m["id"] != user_messages[-1]["id"]]
    prompt = user_messages[-1]["content"]
    temperature = payload.temperature if payload.temperature is not None else 0.7
    response_text = _generate(
        history, prompt, result["conversation"]["mode"], user_messages[-1]["attachments"],
        temperature, payload.system_prompt, cfg,
    )
    crud.add_chat_message(conversation_id, "assistant", response_text)
    result = crud.get_chat_conversation(conversation_id)
    return schemas.AIChatResponse(
        conversation_id=conversation_id,
        title=result["conversation"]["title"],
        response=response_text,
        demo_mode=False,
        provider=cfg["provider"],
        model=cfg["model"],
        messages=result["messages"],
    )