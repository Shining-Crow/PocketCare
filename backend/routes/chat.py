
import pymysql
import requests
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from config import Config
import os

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', Config.GEMINI_API_KEY)
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY

DB_CONFIG = {
    "host": Config.DB_HOST,
    "user": Config.DB_USER,
    "password": Config.DB_PASSWORD,
    "database": Config.DB_NAME,
    "port": int(Config.DB_PORT)
}

def get_db_connection():
    conn = pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)
    return conn

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/send', methods=['POST'])
@jwt_required()
def send_message():
    user_id = get_jwt_identity()
    data = request.get_json()
    user_message = data.get('message', '')
    if not user_message:
        return jsonify({'error': 'No message provided'}), 400
    # Save user message
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            "INSERT INTO chat_messages (user_id, sender, message) VALUES (%s, %s, %s)",
            (user_id, 'user', user_message)
        )
        conn.commit()
    conn.close()
    # AI response
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
        # Save AI response
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO chat_messages (user_id, sender, message) VALUES (%s, %s, %s)",
                (user_id, 'ai', ai_text)
            )
            conn.commit()
        conn.close()
        return jsonify({'response': ai_text})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/history', methods=['GET'])
def get_history():
    import sys
    print('--- /api/chat/history HEADERS ---', file=sys.stderr)
    print(dict(request.headers), file=sys.stderr)
    try:
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        verify_jwt_in_request()
        user_id = get_jwt_identity()
    except Exception as e:
        print('JWT ERROR:', e, file=sys.stderr)
        return jsonify({'error': 'JWT error', 'message': str(e)}), 422
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT sender, message, created_at FROM chat_messages WHERE user_id=%s ORDER BY created_at ASC",
            (user_id,)
        )
        history = cursor.fetchall()
    conn.close()
    return jsonify({'history': history})
