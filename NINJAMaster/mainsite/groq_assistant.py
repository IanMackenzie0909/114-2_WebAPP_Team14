import json
import os
import urllib.error
import urllib.request

from .timeline_data import load_timeline_payload, search_timeline_events


GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"
MAX_CONTEXT_EVENTS = 10
MAX_CONTEXT_CHARS = 14000
LOCAL_GUARD_MODEL = "local-insufficient-data-guard"
INSUFFICIENT_ANSWER = "目前本站資料不足，無法根據內建時間線資料回答這個問題。"

UNSUPPORTED_DETAIL_TERMS = [
    "最喜歡",
    "生日",
    "身高",
    "體重",
    "完整家譜",
    "每一條的名字",
    "每一集",
    "台詞",
    "精確日期",
    "哪一天",
    "母親叫什麼名字",
]

QUERY_ALIASES = {
    "時間雙子": "時光雙胞胎 Acronix Krux 時之戰",
    "時光雙子": "時光雙胞胎 Acronix Krux 時之戰",
    "時間雙胞胎": "時光雙胞胎 Acronix Krux 時之戰",
    "time twins": "時光雙胞胎 Acronix Krux Battle for All of Time",
    "merge": "大融合 融合 The Merge Dragons Rising",
    "大融合": "融合 The Merge Dragons Rising",
    "新元素": "新元素力量 科技 Technology 熱能 Heat 風 Wind 聚合 Fusion 震動 Quake",
    "黃金武器": "黃金武器 Golden Weapons 光明神殿 第一旋風忍術大師 創造忍者國",
    "大吞噬者": "大吞噬者 Great Devourer 伽瑪當 Garmadon 邪惡之毒",
    "來源龍": "來源龍 Source Dragons Source Dragon 元素之力 龍能之核",
    "source dragon": "來源龍 Source Dragons Source Dragon 元素之力 龍能之核",
    "source dragons": "來源龍 Source Dragons Source Dragon 元素之力 龍能之核",
    "龍能之核": "龍能之核 第一旋風忍術大師 來源龍 各國度平衡 母花園 水晶峰 荒野",
    "國度水晶": "國度水晶 Realm Crystal 第一旋風忍術大師 領域",
    "realm crystal": "國度水晶 Realm Crystal 第一旋風忍術大師 領域",
    "赤蘭": "赤蘭 Nya 水之元素 水之忍者 Seabound 海洋 融合 Wojira 赤地 Jay",
    "nya": "赤蘭 Nya 水之元素 水之忍者 Seabound 海洋 融合 Wojira 赤地 Jay",
    "妮雅": "赤蘭 Nya 水之元素 水之忍者 Seabound 海洋 融合 Wojira 赤地 Jay",
    "赤地": "赤地 Kai 火之元素 火之忍者 赤蘭 Nya",
    "kai": "赤地 Kai 火之元素 火之忍者 赤蘭 Nya",
    "阿剛": "阿剛 Cole 大地元素 土之忍者 Lilly",
    "cole": "阿剛 Cole 大地元素 土之忍者 Lilly",
    "阿光": "阿光 Jay 閃電元素 閃電忍者 赤蘭 Nya",
    "jay": "阿光 Jay 閃電元素 閃電忍者 赤蘭 Nya",
    "冰忍": "冰忍 Zane 冰之元素 冰皇帝 Dr. Julien",
    "zane": "冰忍 Zane 冰之元素 冰皇帝 Dr. Julien",
    "勞埃德": "勞埃德 Lloyd Lloyd Montgomery Garmadon 綠忍者 黃金忍者 能量元素 伽瑪當",
    "lloyd": "勞埃德 Lloyd 綠忍者 黃金忍者",
    "ras": "拉斯 Ras Lord Ras 血月 五禁者",
    "第一代旋風忍術大師": "第一旋風忍術大師 First Spinjitzu Master 創造 黃金武器 國度水晶 忍者國 龍能之核 蛇族 元素大師",
    "初代旋風忍術大師": "第一旋風忍術大師 First Spinjitzu Master 創造 黃金武器 國度水晶 忍者國 龍能之核 蛇族 元素大師",
    "第一旋風忍術大師": "第一旋風忍術大師 First Spinjitzu Master 創造 黃金武器 國度水晶 忍者國 龍能之核 蛇族 元素大師",
    "first spinjitzu master": "第一旋風忍術大師 First Spinjitzu Master 創造 黃金武器 國度水晶 忍者國 龍能之核 蛇族 元素大師",
    "鬼族": "Oni 鬼怪 鬼族與龍族 第一領域",
    "龍族": "Dragon 龍族 鬼族與龍族 第一領域",
}

CHARACTER_QUERY_ALIASES = {
    "赤蘭": ["赤蘭", "Nya"],
    "nya": ["赤蘭", "Nya"],
    "妮雅": ["赤蘭", "Nya"],
    "勞埃德": ["勞埃德", "Lloyd"],
    "lloyd": ["勞埃德", "Lloyd"],
    "赤地": ["赤地", "Kai"],
    "kai": ["赤地", "Kai"],
    "阿剛": ["阿剛", "Cole"],
    "cole": ["阿剛", "Cole"],
    "阿光": ["阿光", "Jay"],
    "jay": ["阿光", "Jay"],
    "冰忍": ["冰忍", "Zane"],
    "zane": ["冰忍", "Zane"],
}


class GroqAssistantError(Exception):
    pass


class GroqConfigurationError(GroqAssistantError):
    pass


class GroqServiceError(GroqAssistantError):
    pass


def expand_timeline_query(question):
    expanded = [question]
    lower_question = question.lower()

    for key, aliases in QUERY_ALIASES.items():
        if key.lower() in lower_question:
            expanded.append(aliases)

    return " ".join(part for part in expanded if part).strip()


def is_first_spinjitzu_master_question(question):
    lower_question = (question or "").lower()
    return any(
        term in lower_question
        for term in [
            "第一代旋風忍術大師",
            "初代旋風忍術大師",
            "第一旋風忍術大師",
            "first spinjitzu master",
        ]
    )


def get_character_aliases_for_question(question):
    lower_question = (question or "").lower()
    aliases = []

    for key, values in CHARACTER_QUERY_ALIASES.items():
        if key.lower() in lower_question:
            aliases.extend(values)

    deduped = []
    for alias in aliases:
        if alias not in deduped:
            deduped.append(alias)

    return deduped


def is_unsupported_detail_question(question):
    normalized_question = (question or "").strip().lower()
    return any(term.lower() in normalized_question for term in UNSUPPORTED_DETAIL_TERMS)


def get_relevant_events(question, limit=MAX_CONTEXT_EVENTS):
    payload = load_timeline_payload()
    events = payload.get("events", [])
    expanded_query = expand_timeline_query(question)
    ranked_events = search_timeline_events(events, expanded_query)

    if is_first_spinjitzu_master_question(question):
        exact_events = [
            event
            for event in ranked_events
            if "第一旋風忍術大師" in event.get("search_text", "")
            or "first spinjitzu master" in event.get("search_text", "").lower()
        ]
        if exact_events:
            ranked_events = exact_events

    character_aliases = get_character_aliases_for_question(question)
    if character_aliases:
        exact_events = [
            event
            for event in ranked_events
            if any(alias in event.get("search_text", "") for alias in character_aliases)
        ]
        if exact_events:
            ranked_events = exact_events

    return ranked_events[:limit]


def build_context_text(events):
    chunks = []
    current_length = 0

    for event in events:
        details = event.get("details", [])
        detail_text = "\n".join(f"- {detail}" for detail in details[:12])
        chunk = (
            f"[{event.get('id')}]\n"
            f"標題：{event.get('title')}\n"
            f"分類：{event.get('era')} / {event.get('section')}\n"
            f"摘要：{event.get('summary')}\n"
            f"內容：\n{detail_text}"
        )

        if current_length + len(chunk) > MAX_CONTEXT_CHARS:
            break

        chunks.append(chunk)
        current_length += len(chunk)

    return "\n\n".join(chunks)


def build_messages(question, context_text):
    system_prompt = (
        "你是 NINJAGO Archive 的繁體中文世界觀問答助手。"
        "你只能根據提供的本站時間線資料回答，不可使用外部知識補完。"
        "如果資料不足，請明確說目前本站資料不足。"
        "如果問題詢問生日、身高、喜好、精確日期、逐集台詞、完整家譜等細節，必須只有在資料明確寫出時才回答。"
        "回答要精簡、可讀；如果問題涉及順序，請用時間線條列。"
        "回答最後用「資料來源」列出用到的事件 id。"
    )
    user_prompt = (
        f"使用者問題：{question}\n\n"
        f"本站時間線資料：\n{context_text if context_text else '（沒有找到相關資料）'}"
    )

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def call_groq_chat(messages):
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        raise GroqConfigurationError("GROQ_API_KEY is not configured.")

    model = os.environ.get("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip() or DEFAULT_GROQ_MODEL
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
        "top_p": 0.9,
        "max_completion_tokens": 900,
        "stream": False,
    }
    request = urllib.request.Request(
        GROQ_CHAT_COMPLETIONS_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "NINWEB-Ninjago-Archive/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        error_body = error.read().decode("utf-8", errors="replace")
        if error.code == 403 and "1010" in error_body:
            raise GroqServiceError(
                "Groq/Cloudflare blocked this request with error 1010. "
                "The request now sends an explicit API User-Agent; restart the Django server and try again. "
                "If it still happens, your current network/IP is being blocked by Groq's edge protection."
            ) from error
        raise GroqServiceError(f"Groq API returned HTTP {error.code}: {error_body}") from error
    except urllib.error.URLError as error:
        raise GroqServiceError(f"Could not reach Groq API: {error.reason}") from error
    except TimeoutError as error:
        raise GroqServiceError("Groq API request timed out.") from error

    try:
        answer = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as error:
        raise GroqServiceError("Groq API returned an unexpected response shape.") from error

    return answer.strip(), model


def answer_ninjago_question(question):
    if is_unsupported_detail_question(question):
        return {
            "answer": INSUFFICIENT_ANSWER,
            "model": LOCAL_GUARD_MODEL,
            "context_count": 0,
            "sources": [],
        }

    events = get_relevant_events(question)
    if not events:
        return {
            "answer": INSUFFICIENT_ANSWER,
            "model": LOCAL_GUARD_MODEL,
            "context_count": 0,
            "sources": [],
        }

    context_text = build_context_text(events)
    messages = build_messages(question, context_text)
    answer, model = call_groq_chat(messages)

    sources = [
        {
            "id": event.get("id"),
            "title": event.get("title"),
            "section": event.get("section"),
            "file": event.get("source", {}).get("file"),
            "line": event.get("source", {}).get("line"),
        }
        for event in events
    ]

    return {
        "answer": answer,
        "model": model,
        "context_count": len(events),
        "sources": sources,
    }
