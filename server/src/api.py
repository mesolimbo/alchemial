#!<.env PYTHON_PATH>

import os
import sys
import json
import requests
from flask import Flask, request, jsonify
from wsgiref.handlers import CGIHandler
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

@app.route("/", methods=["GET", "POST"])
def generate():
    if request.method == "GET":
        return jsonify({"status": "API is working", "method": "GET"})
    
    try:
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({"error": "Prompt is required"}), 400
        
        prompt = data['prompt']
        
        # Get API key from environment
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not api_key:
            return jsonify({"error": "API key not configured"}), 500
        
        # Make request to Anthropic API
        response = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={
                'Content-Type': 'application/json',
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01'
            },
            json={
                'model': 'claude-3-5-haiku-20241022',
                'max_tokens': 60,
                'messages': [{'role': 'user', 'content': prompt}]
            },
            timeout=30
        )
        
        if not response.ok:
            return jsonify({"error": f"API request failed: {response.status_code}"}), 500
        
        return response.json()
        
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Request error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/")
def index():
    return app.send_static_file('index.html')

# For static files, you might want to add additional routes or configure static folder

if __name__ == '__main__':
    CGIHandler().run(app)