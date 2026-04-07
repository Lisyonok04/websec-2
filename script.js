let map = L.map('map').setView([64.0, 100.0], 4);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

let cities = [];
let markers = {};

async function loadCities() {
    console.log("Загрузка городов...");
    try {
            const response = await fetch('cities.json');
            const raw = await response.json();
            if (raw[0] && typeof raw[0].lat === 'number') {
                cities = raw.map(c => ({ name: c.name, latitude: c.lat, longitude: c.lon }));
            } else if (raw[0] && typeof raw[0].latitude === 'number') {
                cities = raw.map(c => ({ name: c.name, latitude: c.latitude, longitude: c.longitude }));
            } else throw new Error();
        } catch(err) {
            console.warn("Используем fallback-список");
            cities = [
                { name: "Москва", latitude: 55.751244, longitude: 37.618423 },
                { name: "Санкт-Петербург", latitude: 59.931058, longitude: 30.360909 },
                { name: "Новосибирск", latitude: 55.030199, longitude: 82.920430 },
                { name: "Екатеринбург", latitude: 56.838011, longitude: 60.597474 },
                { name: "Казань", latitude: 55.796127, longitude: 49.106405 }
            ];
        }
    console.log(`Загружено городов: ${cities.length}`);
    addMarkersToMap();
}

function addMarkersToMap() {
    Object.values(markers).forEach(m => map.removeLayer(m));
    markers = {};
    cities.forEach(city => {
        const marker = L.marker([city.latitude, city.longitude]).addTo(map);
        marker.on('click', () => fetchWeather(city.latitude, city.longitude, city.name));
        marker.bindTooltip(city.name);
        markers[city.name] = marker;
    });
    console.log(`Маркеров добавлено: ${Object.keys(markers).length}`);
    if (cities.length) map.setView([cities[0].latitude, cities[0].longitude], 6);
}

const searchInput = document.getElementById('city-search');
const searchBtn = document.getElementById('search-btn');

function searchCity() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return alert("Введите название");
    const found = cities.find(c => c.name.toLowerCase() === query || c.name.toLowerCase().startsWith(query));
    if (found) {
        map.setView([found.latitude, found.longitude], 10);
        fetchWeather(found.latitude, found.longitude, found.name);
    } else {
        alert(`Город "${searchInput.value}" не найден`);
    }
}
searchBtn.addEventListener('click', searchCity);
searchInput.addEventListener('keypress', e => e.key === 'Enter' && searchCity());

async function fetchWeather(lat, lon, cityName) {
    try {
        document.getElementById('weather-title').innerHTML = `⏳ Загрузка погоды для города ${cityName}...`;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto&forecast_days=7`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        const dates = data.daily.time;
        const temps = data.daily.temperature_2m_max;
        const rains = data.daily.precipitation_sum;
        const winds = data.daily.windspeed_10m_max;
        
        document.getElementById('weather-title').innerHTML = `🌤️ Прогноз погоды: ${cityName}`;
        createOrUpdateChart('tempChart', dates, temps, 'Температура макс. (°C)', 'rgba(255,99,132,0.2)', 'rgba(255,99,132,1)', 'line');
        createOrUpdateChart('rainChart', dates, rains, 'Осадки (мм)', 'rgba(54,162,235,0.2)', 'rgba(54,162,235,1)', 'bar');
        createOrUpdateChart('windChart', dates, winds, 'Ветер макс. (м/с)', 'rgba(75,192,192,0.2)', 'rgba(75,192,192,1)', 'line');
    } catch (error) {
        console.error('Ошибка погоды:', error);
        document.getElementById('weather-title').innerHTML = `❌ Ошибка загрузки для ${cityName}`;
        showDemoWeather(cityName);
    }
}

function showDemoWeather(cityName) {
    const dates = ['День 1','День 2','День 3','День 4','День 5'];
    const temps = [5,7,6,4,3];
    const rains = [2,0,5,1,8];
    const winds = [4,5,3,6,7];
    document.getElementById('weather-title').innerHTML = `🌦️ Демо-прогноз: ${cityName}`;
    createOrUpdateChart('tempChart', dates, temps, 'Температура (°C)', 'rgba(255,99,132,0.2)', 'rgba(255,99,132,1)', 'line');
    createOrUpdateChart('rainChart', dates, rains, 'Осадки (мм)', 'rgba(54,162,235,0.2)', 'rgba(54,162,235,1)', 'bar');
    createOrUpdateChart('windChart', dates, winds, 'Ветер (м/с)', 'rgba(75,192,192,0.2)', 'rgba(75,192,192,1)', 'line');
}

function createOrUpdateChart(chartId, labels, data, label, bgColor, borderColor, type) {
    const canvas = document.getElementById(chartId);
    if (!canvas) {
        console.error(`Canvas элемент #${chartId} не найден`);
        return;
    }
    
    if (window[chartId] && typeof window[chartId].destroy === 'function') {
        window[chartId].destroy();
        window[chartId] = null;
    }
    
    try {
        window[chartId] = new Chart(canvas.getContext('2d'), {
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
    } catch(e) {
        console.error(`Ошибка создания графика ${chartId}:`, e);
    }
    
    const infoMsg = document.getElementById('info-message');
    if (infoMsg) infoMsg.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', loadCities);