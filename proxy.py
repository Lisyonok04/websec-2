from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from datetime import datetime

app = Flask(__name__)
CORS(app)

@app.route('/weather', methods=['GET'])
def weather_proxy():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    token = request.args.get('token')
    date = request.args.get('date', default=datetime.now().strftime('%Y-%m-%d'))
    
    if not lat or not lon or not token:
        return jsonify({"error": "Missing parameters: lat, lon, token"}), 400
    
    # Исправленный URL (соответствует реальному API)
    target_url = f'https://projecteol.ru/ru/api/weather?lat={lat}&lon={lon}&date={date}&token={token}'
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(target_url, headers=headers, timeout=10)
        
        return jsonify(response.json()), response.status_code, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    
    except Exception as e:
        return jsonify({
            "error": "Proxy error",
            "message": str(e),
            "url": target_url
        }), 500, {'Access-Control-Allow-Origin': '*'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)  # Важно: 0.0.0.0!