import os
import requests
from flask import Blueprint, request, jsonify

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'AIzaSyA2OSYoCSMsnhI4frwh4wAo7Hh1QTnDcy4')
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/send', methods=['POST'])
def send_message():
    data = request.get_json()
    user_message = data.get('message', '')
    if not user_message:
        return jsonify({'error': 'No message provided'}), 400
    payload = {
        "contents": [
            {"parts": [
                {"text": (
                    "You are a professional health assistant. Only answer health-related questions. "
                    "If the question is not about health, politely say you can only answer health-related queries. "
                    "Keep your answers short, clear, and professional. "
                    "Always format your response using bullet points or numbered lists for clarity. "
                    "Avoid long paragraphs. Organize information so it's easy to read, like ChatGPT or Gemini web UI.\n\n"
                    f"User: {user_message}"
                )}
            ]}
        ]
    }
    try:
        response = requests.post(GEMINI_API_URL, json=payload)
        response.raise_for_status()
        gemini_response = response.json()
        ai_text = gemini_response['candidates'][0]['content']['parts'][0]['text']
        return jsonify({'response': ai_text})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
