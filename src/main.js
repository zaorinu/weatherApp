// main.js - dinâmico, pede localização, fallback por IP, atualiza HTML
const locationCacheKey = "user_location_cache_v2";
const ipApi = "https://ipapi.co/json/";
const wttrApi = "https://wttr.in/";

async function getLocationByIP() {
	const res = await fetch(ipApi);
	return res.json();
}

function cacheLocation(loc) {
	localStorage.setItem(locationCacheKey, JSON.stringify({ ...loc, ts: Date.now() }));
}

function getCachedLocation() {
	const raw = localStorage.getItem(locationCacheKey);
	if (!raw) return null;
	const data = JSON.parse(raw);
	if (Date.now() - data.ts > 10 * 60 * 1000) return null; // 10 min
	return data;
}

async function getWeatherByCoords(lat, lon) {
	const res = await fetch(`${wttrApi}${lat},${lon}?format=j1`);
	return res.json();
}

async function getWeatherByCity(city) {
	const res = await fetch(`${wttrApi}${encodeURIComponent(city)}?format=j1`);
	return res.json();
}

function updateWeatherUI(weather, loc) {
	const current = weather.current_condition && weather.current_condition[0];
	if (!current) return;
	document.querySelector(".temp").innerText = `${current.temp_C}°C`;
	document.querySelector(".city").innerText = `📍${loc.city || loc.region || loc.country_name || loc.country}`;
	document.getElementById("humildity").innerText = current.humidity + "%";
	document.getElementById("wind").innerText = current.windspeedKmph + " km/h";
	// Atualiza ícone
	const iconMap = {
		"Sunny": "clear.png",
		"Clear": "clear.png",
		"Partly cloudy": "clouds.png",
		"Cloudy": "clouds.png",
		"Overcast": "clouds.png",
		"Mist": "mist.png",
		"Patchy rain possible": "rain.png",
		"Light rain": "rain.png",
		"Moderate rain": "rain.png",
		"Heavy rain": "rain.png",
		"Snow": "snow.png",
		"Drizzle": "drizzle.png",
		// ... outros mapeamentos
	};
	let icon = iconMap[current.weatherDesc[0].value] || "clear.png";
	document.querySelector(".weather-icon").src = `images/${icon}`;
}

async function askForGeolocation() {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject("Geolocalização não suportada");
			return;
		}
		navigator.geolocation.getCurrentPosition(
			pos => resolve(pos.coords),
			err => reject(err)
		);
	});
}

async function main() {
	let loc = getCachedLocation();
	let weather;
	if (!loc) {
		try {
			const coords = await askForGeolocation();
			loc = { lat: coords.latitude, lon: coords.longitude, city: "", country: "" };
			cacheLocation(loc);
			weather = await getWeatherByCoords(coords.latitude, coords.longitude);
		} catch (e) {
			// Se usuário negar ou não suportar, usa IP
			loc = await getLocationByIP();
			cacheLocation(loc);
			weather = await getWeatherByCity(loc.city);
		}
	} else {
		if (loc.lat && loc.lon) {
			weather = await getWeatherByCoords(loc.lat, loc.lon);
		} else {
			weather = await getWeatherByCity(loc.city);
		}
	}
	updateWeatherUI(weather, loc);
}

document.addEventListener("DOMContentLoaded", main);
