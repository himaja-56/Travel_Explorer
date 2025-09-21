// Import API keys from the configuration file
import { unsplashApiKey, openWeatherMapApiKey, geminiApiKey } from './config.js';

// --- DOM Element References ---
const searchForm = document.getElementById('search-form');
const destinationInput = document.getElementById('destination-input');
const resultsContainer = document.getElementById('results-container');
const initialMessage = document.getElementById('initial-message');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('error-message');
const mainContentGrid = document.getElementById('main-content-grid');
const destinationName = document.getElementById('destination-name');
const mapButton = document.getElementById('map-button');
const weatherInfo = document.getElementById('weather-info');
const imageGallery = document.getElementById('image-gallery');
const generateItineraryBtn = document.getElementById('generate-itinerary-btn');
const itineraryLoader = document.getElementById('itinerary-loader');
const itineraryError = document.getElementById('itinerary-error');
const itineraryResult = document.getElementById('itinerary-result');
const tripDaysInput = document.getElementById('trip-days');

let currentDestination = '';

// --- Event Listeners ---
searchForm.addEventListener('submit', handleSearch);
generateItineraryBtn.addEventListener('click', handleItineraryGeneration);
mapButton.addEventListener('click', () => {
    if (currentDestination) {
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentDestination)}`;
        window.open(mapUrl, '_blank');
    }
});

async function handleSearch(e) {
    e.preventDefault();
    const query = destinationInput.value.trim();
    if (!query) {
        displayError("Please enter a destination.");
        return;
    }
    fetchDestinationData(query);
}

async function fetchDestinationData(query) {
    showLoadingState();
    itineraryResult.classList.add('hidden');
    
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${query}&appid=${openWeatherMapApiKey}&units=metric`;
    const imageUrl = `https://api.unsplash.com/search/photos?query=${query} travel&client_id=${unsplashApiKey}&per_page=9`;

    if (unsplashApiKey.includes('YOUR_') || openWeatherMapApiKey.includes('YOUR_')) {
        displayError("API keys are missing. Please add your Unsplash and OpenWeatherMap API keys.");
        return;
    }

    try {
        const [weatherResponse, imagesResponse] = await Promise.all([fetch(weatherUrl), fetch(imageUrl)]);
        if (!weatherResponse.ok) throw new Error(`Weather data not found for "${query}"`);
        if (!imagesResponse.ok) throw new Error('Could not fetch images.');

        const weatherData = await weatherResponse.json();
        const imagesData = await imagesResponse.json();
        
        currentDestination = weatherData.name;
        updateUI(weatherData, imagesData);
    } catch (error) {
        displayError(error.message);
    }
}

function updateUI(weatherData, imagesData) {
    hideAllStates();
    destinationName.textContent = weatherData.name;
    updateWeatherUI(weatherData);
    updateImageGalleryUI(imagesData.results);
    
    mainContentGrid.classList.remove('hidden');
    setTimeout(() => mainContentGrid.classList.add('opacity-100'), 10);
}

function updateWeatherUI(data) {
    const temp = Math.round(data.main.temp);
    const condition = data.weather[0].main;
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;
    
    const utcTime = new Date().getTime();
    const localTimeOffset = data.timezone * 1000;
    const localDate = new Date(utcTime + localTimeOffset);
    const localTimeString = localDate.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: true });

    const weatherIcons = {
        'Clear': 'fa-sun text-yellow-400', 'Clouds': 'fa-cloud text-gray-400',
        'Rain': 'fa-cloud-showers-heavy text-blue-500', 'Drizzle': 'fa-cloud-rain text-blue-400',
        'Thunderstorm': 'fa-bolt text-yellow-500', 'Snow': 'fa-snowflake text-blue-200',
        'Mist': 'fa-smog text-gray-500', 'Smoke': 'fa-smog text-gray-500',
        'Haze': 'fa-smog text-gray-500', 'Dust': 'fa-smog text-gray-500', 'Fog': 'fa-smog text-gray-500'
    };
    const iconClass = weatherIcons[condition] || 'fa-question-circle text-gray-400';

    weatherInfo.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-6">
            <div class="flex items-center space-x-4">
                <i class="fas ${iconClass} text-5xl"></i>
                <div>
                    <p class="text-4xl font-bold">${temp}°C</p>
                    <p class="text-gray-500 dark:text-gray-400 capitalize">${data.weather[0].description}</p>
                </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div class="flex items-center space-x-2"><i class="fas fa-tint w-4 text-center text-blue-400"></i><span>Humidity:</span><span class="font-semibold">${humidity}%</span></div>
                <div class="flex items-center space-x-2"><i class="fas fa-wind w-4 text-center text-gray-400"></i><span>Wind:</span><span class="font-semibold">${windSpeed} m/s</span></div>
                <div class="flex items-center space-x-2"><i class="far fa-clock w-4 text-center text-purple-400"></i><span>Local Time:</span><span class="font-semibold">${localTimeString}</span></div>
            </div>
        </div>
    `;
}

function updateImageGalleryUI(images) {
    imageGallery.innerHTML = '';
    if (images.length === 0) {
         imageGallery.innerHTML = '<p class="text-gray-500 col-span-full">No images found for this destination.</p>';
         return;
    }
    images.forEach(img => {
        const imgElement = document.createElement('div');
        imgElement.classList.add('overflow-hidden', 'rounded-lg', 'shadow-md', 'hover:shadow-xl', 'transition-shadow', 'duration-300');
        imgElement.innerHTML = `<img src="${img.urls.regular}" alt="${img.alt_description || 'Destination image'}" class="gallery-img" onerror="this.onerror=null;this.src='https://placehold.co/600x400/e2e8f0/4a5568?text=Image+Not+Found';">`;
        imageGallery.appendChild(imgElement);
    });
}

async function handleItineraryGeneration() {
    if (geminiApiKey.includes('YOUR_')) {
        displayItineraryError("Please add your Gemini API key to generate an itinerary.");
        return;
    }

    itineraryLoader.classList.remove('hidden');
    itineraryResult.classList.add('hidden');
    itineraryError.classList.add('hidden');

    const days = tripDaysInput.value;
    const interests = [...document.querySelectorAll('.interest-checkbox:checked')].map(cb => cb.value).join(', ');

    const prompt = `You are an expert travel guide. Create a detailed, day-by-day travel itinerary for a ${days}-day trip to ${currentDestination}. The traveler is interested in ${interests || 'general sightseeing'}.
    For each day, suggest a 'Morning', 'Afternoon', and 'Evening' activity with a brief, engaging description for each.
    At the end, include a "Good to Know" section with practical tips about: local currency, 1-2 essential phrases in the local language, and common transportation methods.
    Format the output in clean HTML. Use <h4> for day titles (e.g., 'Day 1: Arrival and Exploration'), <h5> for time of day (e.g., 'Morning'), and <p> for descriptions. The 'Good to Know' section should use an <h4> title. Do not include \`\`\`html or any markdown.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Failed to generate itinerary. The model may be overloaded.");
        }

        const result = await response.json();
        const itineraryHtml = result.candidates[0].content.parts[0].text;
        
        displayItinerary(itineraryHtml);

    } catch (error) {
        displayItineraryError(error.message);
    } finally {
        itineraryLoader.classList.add('hidden');
    }
}

function displayItinerary(htmlContent) {
    itineraryResult.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-2xl font-bold">Your Custom Itinerary</h3>
                <button id="copy-itinerary-btn" class="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-semibold py-2 px-4 rounded-lg transition-colors">
                    <i class="fas fa-copy mr-2"></i>Copy
                </button>
            </div>
            <div id="itinerary-content" class="prose dark:prose-invert max-w-none">${htmlContent}</div>
        </div>`;
    itineraryResult.classList.remove('hidden');
    
    document.getElementById('copy-itinerary-btn').addEventListener('click', (e) => {
        const button = e.currentTarget;
        const textToCopy = document.getElementById('itinerary-content').innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
            button.innerHTML = '<i class="fas fa-check mr-2"></i>Copied!';
            setTimeout(() => { button.innerHTML = '<i class="fas fa-copy mr-2"></i>Copy'; }, 2000);
        });
    });

    // Make it an accordion
    const dayTitles = itineraryResult.querySelectorAll('h4');
    dayTitles.forEach(title => {
        title.classList.add('cursor-pointer', 'select-none', 'flex', 'justify-between', 'items-center', 'py-2');
        title.innerHTML += '<i class="fas fa-chevron-down transition-transform duration-300"></i>';
        
        let content = title.nextElementSibling;
        let wrapper = document.createElement('div');
        wrapper.classList.add('accordion-content');
        
        while(content && content.tagName !== 'H4') {
            wrapper.appendChild(content);
            content = title.nextElementSibling;
        }
        title.insertAdjacentElement('afterend', wrapper);
        
        title.addEventListener('click', () => {
            const icon = title.querySelector('i');
            const allWrappers = itineraryResult.querySelectorAll('.accordion-content');
            const allIcons = itineraryResult.querySelectorAll('h4 i');

            // Close all others
            allWrappers.forEach(w => { if (w !== wrapper) w.style.maxHeight = null; });
            allIcons.forEach(i => { if(i !== icon) i.classList.remove('rotate-180'); });
            
            // Toggle current one
            icon.classList.toggle('rotate-180');
            if(wrapper.style.maxHeight) {
                wrapper.style.maxHeight = null;
            } else {
                wrapper.style.maxHeight = wrapper.scrollHeight + "px";
            }
        });
    });
}

function hideAllStates() {
    initialMessage.classList.add('hidden');
    loader.classList.add('hidden');
    errorMessage.classList.add('hidden');
    mainContentGrid.classList.add('hidden');
    mainContentGrid.classList.remove('opacity-100');
}

function showLoadingState() {
    hideAllStates();
    loader.classList.remove('hidden');
}

function displayError(message) {
    hideAllStates();
    errorMessage.querySelector('p').textContent = `Error: ${message}`;
    errorMessage.classList.remove('hidden');
}

function displayItineraryError(message) {
    itineraryLoader.classList.add('hidden');
    itineraryError.querySelector('p').textContent = `Error: ${message}`;
    itineraryError.classList.remove('hidden');
}

