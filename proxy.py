"""
Прокси-сервер для получения прогноза погоды
Работает на: http://localhost:8080/weather?lat=...&lon=...&token=...
"""

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import requests
from datetime import datetime
import logging

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Создаем приложение Flask
app = Flask(__name__)

# Включаем CORS для всех маршрутов
CORS(app, resources={
    r"/weather": {
        "origins": "*",  # Разрешаем запросы с любого домена
        "methods": ["GET", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# ДЕМО-ДАННЫЕ (на случай, если API недоступен)
DEMO_WEATHER_DATA = {
    "city": "Москва",
    "date": "2026-04-07",
    "forecast": [
        {"day": "Пн", "temp": 12, "precipitation": 2, "wind": 4},
        {"day": "Вт", "temp": 15, "precipitation": 0, "wind": 3},
        {"day": "Ср", "temp": 18, "precipitation": 5, "wind": 6},
        {"day": "Чт", "temp": 14, "precipitation": 8, "wind": 7},
        {"day": "Пт", "temp": 16, "precipitation": 1, "wind": 5}
    ]
}

@app.route('/weather', methods=['GET', 'OPTIONS'])
def weather_proxy():
    """
    Обработчик запросов к погодному API
    Поддерживает: GET (основной запрос) и OPTIONS (предварительный CORS-запрос)
    """
    
    # Шаг 1: Обработка предварительного запроса (CORS preflight)
    if request.method == 'OPTIONS':
        logger.info("Получен OPTIONS-запрос (CORS preflight)")
        return _build_cors_response(jsonify({"status": "ok"}), 200)
    
    # Шаг 2: Получаем параметры из запроса
    logger.info("Получен GET-запрос к /weather")
    
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    token = request.args.get('token')
    date = request.args.get('date', default=datetime.now().strftime('%Y-%m-%d'))
    
    # Шаг 3: Валидация параметров
    if not lat or not lon or not token:
        logger.warning(f"Отсутствуют обязательные параметры: lat={lat}, lon={lon}, token={token}")
        return _build_cors_response(
            jsonify({
                "error": "Missing required parameters",
                "required": ["lat", "lon", "token"],
                "received": {"lat": lat, "lon": lon, "token": "present" if token else None}
            }),
            400
        )
    
    logger.info(f"Запрос погоды: lat={lat}, lon={lon}, date={date}")
    
    # Шаг 4: Формируем URL для реального API
    target_url = f'https://projecteol.ru/ru/api/weather?lat={lat}&lon={lon}&date={date}&token={token}'
    
    # Шаг 5: Делаем запрос к реальному API
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        logger.info(f"Отправляем запрос к: {target_url}")
        response = requests.get(target_url, headers=headers, timeout=10)
        
        # Шаг 6: Если API ответил успешно — возвращаем его данные
        if response.status_code == 200:
            logger.info(f"Успешный ответ от API: {response.status_code}")
            return _build_cors_response(jsonify(response.json()), 200)
        
        # Шаг 7: Если API вернул ошибку — логируем и возвращаем демо-данные
        logger.warning(f"API вернул ошибку: {response.status_code} - {response.text}")
        logger.info("Возвращаем демо-данные как fallback")
        return _build_cors_response(jsonify(DEMO_WEATHER_DATA), 200)
    
    # Шаг 8: Обработка исключений (сеть недоступна, таймаут и т.д.)
    except requests.exceptions.RequestException as e:
        logger.error(f"Ошибка при запросе к API: {str(e)}")
        logger.info("Возвращаем демо-данные из-за ошибки сети")
        return _build_cors_response(jsonify(DEMO_WEATHER_DATA), 200)
    
    # Шаг 9: Любые другие исключения
    except Exception as e:
        logger.exception(f"Неожиданная ошибка: {str(e)}")
        return _build_cors_response(
            jsonify({
                "error": "Internal server error",
                "message": str(e)
            }),
            500
        )

@app.route('/')
def home():
    """Корневая страница — информация о прокси"""
    return """
    <h1>🌤️ Прокси-сервер для прогноза погоды</h1>
    <p>Работает на порту 8080</p>
    <p>Пример запроса:</p>
    <code>http://localhost:8080/weather?lat=55.75&lon=37.62&token=ВАШ_ТОКЕН</code>
    <p>Для учебных целей возвращает демо-данные, если реальный API недоступен.</p>
    """, 200, {'Access-Control-Allow-Origin': '*'}

def _build_cors_response(response, status_code):
    """
    Добавляет CORS-заголовки к любому ответу
    """
    response.status_code = status_code
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Max-Age'] = '3600'
    return response

if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("🚀 Запуск прокси-сервера для прогноза погоды")
    logger.info("📍 Доступен по адресу: http://localhost:8080/weather")
    logger.info("💡 Для теста открой в браузере:")
    logger.info("   http://localhost:8080/weather?lat=55.75&lon=37.62&token=test")
    logger.info("=" * 60)
    
    # Запускаем сервер
    app.run(host='0.0.0.0', port=8080, debug=True)