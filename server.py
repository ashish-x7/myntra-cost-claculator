from __future__ import annotations

import json
import os
import urllib.request
import urllib.error

from flask import Flask, Response, jsonify, request, send_from_directory

# Load .env file manually (no python-dotenv needed)
def load_dotenv(path: str = ".env") -> None:
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value

load_dotenv()

app = Flask(__name__, static_folder="dist", static_url_path="")

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]


def call_gemini(payload: dict, model: str) -> dict | None:
    """Call Gemini API with given payload. Returns parsed JSON or None on failure."""
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={GEMINI_KEY}"
    )
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None  # try next model
        raise
    except Exception:
        raise


# ── /api/parse-annexure ─────────────────────────────────────────────────────

@app.post("/api/parse-annexure")
def parse_annexure() -> Response:
    body = request.get_json(force=True) or {}
    text_items: list[str] = body.get("textItems", [])
    brand_name: str = body.get("brandName", "")
    mode: str = body.get("mode", "commission")

    if not GEMINI_KEY:
        return Response("Gemini API Key is not configured on the server.", status=400)

    full_text = " ".join(text_items)

    if mode == "commission":
        target_instruction = (
            f'Your task is to extract all Platform Commission slabs from the text for the brand: "{brand_name}".\n'
            "Do NOT extract Fixed Fee slabs. Only extract from the Platform Commission / Commission rates grid or section.\n"
            'If there are general default rules (e.g. Article Type is "ALL" or "Default"), extract them.\n'
            "All returned rules should have fixedFee set to 0."
        )
    else:
        target_instruction = (
            f'Your task is to extract all Fixed Fee slabs from the text for the brand: "{brand_name}".\n'
            "Do NOT extract Platform Commission slabs. Only extract from the Fixed Fee grid or section.\n"
            'Do NOT include general default rules (like Article Type "ALL" with 0 commission) that belong to the commission table.\n'
            "All returned rules should have commissionPercent set to 0."
        )

    prompt = (
        "You are an expert data parser. You are given the raw extracted text from a Myntra Commercial Terms Agreement (CTA) PDF annexure.\n"
        f"{target_instruction}\n\n"
        "Return a JSON array of objects conforming to the following TypeScript interface:\n"
        "interface FeeRule {\n"
        f'  brand: string; // The brand/party name, i.e., "{brand_name}"\n'
        '  category: string;\n'
        '  articleType: string;\n'
        '  gender: string;\n'
        '  lowerLimit: number;\n'
        '  upperLimit: number;\n'
        '  commissionPercent: number;\n'
        '  fixedFee: number;\n'
        "}\n\n"
        "Notes:\n"
        "1. Extract only the slabs relevant to the requested mode as instructed above.\n"
        "2. Keep the matching exact and complete.\n"
        "3. Return ONLY a valid JSON array. Do not wrap in markdown or any other text.\n\n"
        f"Raw PDF Text:\n{full_text}"
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }

    last_error = None
    for model in GEMINI_MODELS:
        try:
            data = call_gemini(payload, model)
            if data is None:
                continue  # 404, try next
            text = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
            )
            if not text:
                raise ValueError("No text in Gemini response")
            rules = json.loads(text)

            def coerce(r: dict) -> dict:
                upper = r.get("upperLimit")
                if upper is None or str(upper) == "Infinity" or (isinstance(upper, (int, float)) and upper >= 10_000_000):
                    upper = float("inf")
                else:
                    upper = float(upper)
                return {
                    **r,
                    "brand": brand_name,
                    "lowerLimit": float(r.get("lowerLimit") or 0),
                    "upperLimit": upper,
                    "commissionPercent": float(r.get("commissionPercent") or 0),
                    "fixedFee": float(r.get("fixedFee") or 0),
                }

            return jsonify({"rules": [coerce(r) for r in rules]})
        except Exception as exc:
            last_error = exc

    err_msg = str(last_error) if last_error else "All Gemini models failed."
    return Response(err_msg, status=500)


# ── /api/chat ────────────────────────────────────────────────────────────────

@app.post("/api/chat")
def chat() -> Response:
    body = request.get_json(force=True) or {}
    message: str = body.get("message", "")
    user_name: str = body.get("userName", "friend")

    if not GEMINI_KEY:
        return jsonify({"reply": "Server me API key configure nahi hai."})

    system_prompt = (
        f'You are AJ, the user\'s "Dashboard Friend" and business assistant for this Myntra Cost Calculator.\n'
        f'Your tone is extremely friendly, professional, and helpful. Always address the user as "{user_name}".\n\n'
        "CORE CAPABILITIES:\n"
        "1. Simple Math: Perform basic arithmetic (+, -, *, /).\n"
        "2. Percentage Logic: Handle queries like \"X% of Y\", \"percentage of X\", etc.\n"
        "3. Advanced Business Math:\n"
        "   - Reverse GST: Extract base price from a tax-inclusive price.\n"
        "   - Profit Margin vs Markup.\n"
        "   - Discount Stacking.\n"
        "   - Break-even calculations.\n"
        "4. Myntra-specific Help:\n"
        "   - Purchase Cost = MRP * (1 - Purchase Margin%) / (1 + Tax%)\n"
        "   - Purchase Tax = Purchase Cost * Tax%\n"
        "   - Final Purchase Cost = Purchase Cost + Purchase Tax\n"
        "   - Myntra Commission is deducted from selling price\n"
        "   - Fixed Fee is a flat charge per item\n\n"
        "GUIDELINES:\n"
        "- Respond in Hinglish (a natural mix of Hindi and English).\n"
        "- For math queries, clearly state the result and briefly show the formula.\n"
        "- Keep responses concise but warm."
    )

    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"parts": [{"text": message}]}],
    }

    try:
        data = call_gemini(payload, "gemini-2.0-flash")
        if data is None:
            return jsonify({"reply": "AI se connect nahi ho pa raha. Baad me try karo. 😔"})
        reply = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "Koi response nahi mila.")
        )
        return jsonify({"reply": reply})
    except Exception as exc:
        return jsonify({"reply": "I'm sorry, I'm having trouble connecting right now. 😔"})


# ── Static Files (React Build) ───────────────────────────────────────────────

@app.get("/")
def index() -> Response:
    return send_from_directory("dist", "index.html")


@app.get("/<path:path>")
def static_files(path: str) -> Response:
    if os.path.exists(os.path.join("dist", path)):
        return send_from_directory("dist", path)
    return send_from_directory("dist", "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3001))
    print(f"Server running on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
