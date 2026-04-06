// script.js – улучшенная версия с отладкой

// ------------------- 1. ИНИЦИАЛИЗАЦИЯ КАРТЫ -------------------
let map = L.map('map').setView([64.0, 100.0], 4);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
}).addTo(map);

// ------------------- 2. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ -------------------
let cities = [];        // массив городов в формате {name, latitude, longitude}
let markers = {};       // объект для быстрого доступа к маркерам по имени
let activePopup = null; // для закрытия предыдущего попапа

// ------------------- 3. ЗАГРУЗКА ГОРОДОВ (с fallback) -------------------
async function loadCities() {
    console.log("Загрузка данных о городах...");
    
    // Пытаемся загрузить russia-cities.json
    let data = null;
    try {
        const response = await fetch('cities.json');
        if (response.ok) {
            data = await response.json();
            console.log(`✅ Загружен cities.json, количество записей: ${data.length}`);
        }
    } catch (e) {
            console.warn("cities.json не найден");
    }
    
    
    // Если данные есть – преобразуем в единый формат
    if (data && Array.isArray(data)) {
        // Определяем формат: если первый объект имеет поля coords.lat, то это формат russia-cities
        if (data[0] && data[0].coords && typeof data[0].coords.lat === 'number') {
            cities = data.map(city => ({
                name: city.name,
                latitude: city.coords.lat,
                longitude: city.coords.lon,
                population: city.population
            }));
            console.log("✅ Преобразован формат russia-cities.json");
        } 
        // Если уже есть поля name, latitude, longitude
        // СТАЛО
        else if (data[0] && typeof data[0].lat === 'number' && typeof data[0].lon === 'number') {
            cities = data.map(city => ({
                name: city.name,
                latitude: city.lat,
                longitude: city.lon,
                population: city.population
            }));
            console.log("✅ Используется формат {name, lat, lon}");
        }
// Если есть поля latitude/longitude
        else if (data[0] && typeof data[0].latitude === 'number' && typeof data[0].longitude === 'number') {
            cities = data;
            console.log("✅ Используется формат {name, latitude, longitude}");
        }
        else {
            console.error("❌ Неизвестный формат JSON. Ожидается массив с name/latitude/longitude или name/coords.lat/lon");
            cities = getFallbackCities();
        }
    } else {
        console.warn("⚠️ Нет загруженных данных, используем встроенный список из 5 городов");
        cities = getFallbackCities();
    }
    
    console.log(`Итоговое количество городов для отображения: ${cities.length}`);
    addMarkersToMap();
}

// Встроенный список на случай, если JSON не загрузился (чтобы вы сразу увидели маркеры)
function getFallbackCities() {
    return [
        { name: "Москва", latitude: 55.751244, longitude: 37.618423 },
        { name: "Санкт-Петербург", latitude: 59.931058, longitude: 30.360909 },
        { name: "Новосибирск", latitude: 55.030199, longitude: 82.920430 },
        { name: "Екатеринбург", latitude: 56.838011, longitude: 60.597474 },
        { name: "Казань", latitude: 55.796127, longitude: 49.106405 }
    ];
}

// ------------------- 4. ДОБАВЛЕНИЕ МАРКЕРОВ НА КАРТУ -------------------
function addMarkersToMap() {
    // Очищаем старые маркеры, если есть
    for (let key in markers) {
        if (markers[key]) map.removeLayer(markers[key]);
    }
    markers = {};
    
    cities.forEach(city => {
        // Проверяем, что координаты корректны
        if (!isFinite(city.latitude) || !isFinite(city.longitude)) {
            console.warn(`Некорректные координаты для города ${city.name}`, city);
            return;
        }
        
        const marker = L.marker([city.latitude, city.longitude]).addTo(map);
        marker.on('click', () => {
            // Закрываем предыдущий попап, если он открыт
            if (activePopup) map.closePopup(activePopup);
            fetchWeather(city.latitude, city.longitude, city.name);
        });
        
        // Добавляем всплывающую подсказку при наведении (необязательно)
        marker.bindTooltip(city.name, { sticky: true });
        
        markers[city.name] = marker;
    });
    console.log(`✅ Добавлено маркеров: ${Object.keys(markers).length}`);
}

// ------------------- 5. ПОИСК ГОРОДА -------------------
const searchInput = document.getElementById('city-search');
const searchBtn = document.getElementById('search-btn');

function searchCity() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
        alert("Введите название города");
        return;
    }
    
    // Ищем точное совпадение или начинающееся с запроса
    const foundCity = cities.find(city => 
        city.name.toLowerCase() === query || 
        city.name.toLowerCase().startsWith(query)
    );
    
    if (foundCity) {
        map.setView([foundCity.latitude, foundCity.longitude], 10);
        // Имитируем клик по маркеру
        if (markers[foundCity.name]) {
            markers[foundCity.name].fire('click');
        } else {
            // На случай, если маркер почему-то не создан
            fetchWeather(foundCity.latitude, foundCity.longitude, foundCity.name);
        }
    } else {
        alert(`Город "${searchInput.value}" не найден. Попробуйте: Москва, Санкт-Петербург, Новосибирск...`);
    }
}

searchBtn.addEventListener('click', searchCity);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchCity();
});

// ------------------- 6. РАБОТА С ПОГОДНЫМ API -------------------
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzc1Mzg3MjA1LCJpYXQiOjE3NzUzODY5MDUsImp0aSI6ImYwNjQ2NzU1NDY2ZTRmMDk4YjJmZjc0ODJjYWU0OWMxIiwidXNlcl9pZCI6IjM2NTQifQ.TXWDYHAIz-VBflSnF4mbF79GGisZOTeg9y2ANTSw6vI';
const API_URL = 'https://api.projecteol.ru/v1/forecast/';
async function fetchWeather(lat, lon, cityName) {
    try {
        document.getElementById('weather-title').innerHTML = `⏳ Загрузка погоды для ${cityName}...`;

        //const url = `${API_URL}?lat=${lat}&lon=${lon}&token=${API_TOKEN}`;
        const today = new Date().toISOString().split('T')[0];
        const url = `http://localhost:8080/weather?lat=${lat}&lon=${lon}&date=${today}&token=${API_TOKEN}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        processWeatherData(data, cityName);
    } catch (error) {
        console.error('Ошибка API погоды:', error);
        document.getElementById('weather-title').innerHTML = `❌ Ошибка загрузки для ${cityName}`;
        showDemoWeather(cityName); // временно покажем демо-графики
    }
}

// Демо-данные, чтобы графики хоть как-то рисовались (пока нет токена)
function showDemoWeather(cityName) {
    const dates = ['День 1', 'День 2', 'День 3', 'День 4', 'День 5'];
    const temps = [5, 7, 6, 4, 3];
    const rains = [2, 0, 5, 1, 8];
    const winds = [4, 5, 3, 6, 7];
    document.getElementById('weather-title').innerHTML = `🌦️ Демо-прогноз: ${cityName}`;
    updateChart('tempChart', dates, temps, 'Температура (°C)', 'rgba(255,99,132,0.2)', 'rgba(255,99,132,1)', 'line');
    updateChart('rainChart', dates, rains, 'Осадки (мм)', 'rgba(54,162,235,0.2)', 'rgba(54,162,235,1)', 'bar');
    updateChart('windChart', dates, winds, 'Ветер (м/с)', 'rgba(75,192,192,0.2)', 'rgba(75,192,192,1)', 'line');
}

function processWeatherData(data, cityName) {
    // data - это массив почасовых прогнозов
    if (!Array.isArray(data) || data.length === 0) {
        console.error("Нет данных от API", data);
        showDemoWeather(cityName);
        return;
    }

    // Группируем по дням
    const daily = {};
    data.forEach(item => {
        const date = item.dt_forecast.split(' ')[0]; // "2026-04-06"
        if (!daily[date]) {
            daily[date] = { temps: [], rains: [], winds: [] };
        }
        daily[date].temps.push(item.temp_2_cel);
        daily[date].rains.push(item.prate);
        daily[date].winds.push(item.wind_speed_10);
    });

    // Вычисляем средние за день
    const dates = [];
    const temps = [];
    const rains = [];
    const winds = [];

    for (const [date, values] of Object.entries(daily)) {
        dates.push(date);
        const avgTemp = values.temps.reduce((a,b) => a+b,0) / values.temps.length;
        temps.push(avgTemp.toFixed(1));
        const totalRain = values.rains.reduce((a,b) => a+b,0);
        rains.push(totalRain.toFixed(1));
        const avgWind = values.winds.reduce((a,b) => a+b,0) / values.winds.length;
        winds.push(avgWind.toFixed(1));
    }

    document.getElementById('weather-title').innerHTML = `🌤️ Прогноз погоды: ${cityName}`;
    updateChart('tempChart', dates, temps, 'Температура (°C)', 'rgba(255,99,132,0.2)', 'rgba(255,99,132,1)', 'line');
    updateChart('rainChart', dates, rains, 'Осадки (мм)', 'rgba(54,162,235,0.2)', 'rgba(54,162,235,1)', 'bar');
    updateChart('windChart', dates, winds, 'Ветер (м/с)', 'rgba(75,192,192,0.2)', 'rgba(75,192,192,1)', 'line');
}

// ------------------- 7. ОТРИСОВКА ГРАФИКОВ -------------------
function updateChart(chartId, labels, data, label, bgColor, borderColor, type) {
    const ctx = document.getElementById(chartId).getContext('2d');
    if (window[chartId]) {
        window[chartId].data.labels = labels;
        window[chartId].data.datasets[0].data = data;
        window[chartId].update();
    } else {
        window[chartId] = new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    // Убираем заглушку "нажмите на город"
    const infoMsg = document.getElementById('info-message');
    if (infoMsg) infoMsg.style.display = 'none';
}
// Инициализация карты и загрузка городов
document.addEventListener('DOMContentLoaded', () => {
    loadCities(); // Это нужно добавить!
});