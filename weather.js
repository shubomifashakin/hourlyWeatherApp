import "core-js/stable";
import { async } from "regenerator-runtime";

const cursor = document.querySelector(".cursor");
const searchBar = document.querySelector(".map-search");
const mapElement = document.querySelector("#map");
const mapForm = document.querySelector(".mapForm");
const currentWeather = document.querySelector(".current-weather");
const countryError = document.querySelector(".country-error");
const weatherDetailsContainer = document.querySelector(
  ".weather-details-container"
);
const weatherInfoOthers = document.querySelector(".weather-info-others");

//app styles
document.addEventListener("mousemove", function (e) {
  cursor.classList.remove("cursor-inactive");
  cursor.style.top = `${e.clientY}px`;
  cursor.style.left = `${e.clientX}px`;
});

//when the whole page has finished loading,remove default cursor
window.addEventListener("load", function (e) {
  document.documentElement.style.cursor = "none";
});

document.addEventListener("mouseleave", function (e) {
  cursor.classList.toggle("cursor-inactive");
});

//searchbar styles
searchBar.addEventListener("mouseover", function (e) {
  cursor.classList.add("cursor-input");
});

searchBar.addEventListener("mouseleave", function (e) {
  cursor.classList.remove("cursor-input");
});

//get the details of country using longitude and latitude
async function backwardGeocoding(lat, lng) {
  try {
    //get the name of the country
    const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=ecacfc9cbf77488f850e70d020146a45`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error();
    }

    const responseToJson = await response.json();
    return responseToJson.results[0];
  } catch (err) {
    console.log(err);

    //we returned a rejected promise from the function
    throw err;
  }
}

//get the details of the country using country name
async function forwardGeocoding(country) {
  try {
    //get the name of the country
    const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${country}&key=ecacfc9cbf77488f850e70d020146a45`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(response.status);
    }

    const responseToJson = await response.json();
    return responseToJson.results[0];
  } catch (err) {
    console.log(err);

    //if the response was not okay then also throw an error
    throw err;
  }
}

//request the country weather data using longitude and latitude
async function requestCountryWeather(lat, lng) {
  try {
    const result = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relativehumidity_2m,pressure_msl,visibility,windspeed_10m&past_days=3`
    );

    //if the api request sent back an error
    if (!result) {
      throw new Error(`Something went wrong ${result.status}`);
    }

    const resultToJson = await result.json();

    return resultToJson;
  } catch (err) {
    //if the request failed
    alert(err);

    //if we returned a rejected promise from the function
    throw err;
  }
}

let map;

//when user loads page automatically get location and show weather in location
navigator.geolocation.getCurrentPosition(gotLocation, failedToGetLocation);

//executed if the navigator was able to get the users location
function gotLocation(location) {
  const { latitude, longitude } = location.coords;

  //display users current location on map
  displayLocationOnMap(latitude, longitude);
}

//executed when the navigator failed to get the users location
function failedToGetLocation() {
  alert("Failed To Get Your Location");
}

//this creates the map on the map container
function createMap(lat, lng) {
  map = L.map("map", { attributionControl: false }).setView([lat, lng], 10.5);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);

  //adding a marker to indicate that it is our location
  let marker = L.marker([lat, lng]).addTo(map);
}

//displays location on map
function displayLocationOnMap(lat, lng) {
  //creates The map
  createMap(lat, lng);

  //get the country details using the lat and long obtained
  backwardGeocoding(lat, lng).then((countryResults) => {
    //the name of the state gotten from country api
    //remove the word "state" from the name of the state
    const countryState = `${countryResults.components.state.replace(
      " State",
      ""
    )}`;

    const countryShortCode = `${countryResults.components["ISO_3166-1_alpha-2"]}`;

    //request weather for this country
    requestCountryWeather(lat, lng)
      .then((weatherdata) => {
        //use the weatherdata
        handleWeatherData(weatherdata, countryState, countryShortCode);
      })
      .catch((err) => {
        console.log(err);
      });
  });
}

//when the user searches for a country
mapForm.addEventListener("submit", function (e) {
  e.preventDefault();
  //get the name of country requested from the searchbar
  const country = searchBar.value;
  searchBar.value = "";

  //find the country details
  forwardGeocoding(country)
    .then((countryResults) => {
      //if the country is undefined it means that it does not exist
      if (countryResults === undefined) {
        throw new Error("Country not Found");
      }

      //sets the short code of the country
      let countryShortCode = `${countryResults.components["ISO_3166-1_alpha-2"]}`;

      let countryState;

      //if we search a country, it doesnt have a state. so set the state to that country
      if (
        countryResults.components.country &&
        !countryResults.components.state
      ) {
        countryState = countryResults.components.country;
      }
      //if we search for a continent, it does not have a country or state, set to continent name
      else if (!countryResults.components.country) {
        countryState = countryResults.components.place;
        countryShortCode = countryState.slice(0, 3);
      } else {
        countryState = `${countryResults.components.state.replace(
          " State",
          ""
        )}`;
      }

      //get the latitude and longitude from country
      const { lat, lng } = countryResults.geometry;

      //show location on map
      //if the map has already been created then just pan to view
      if (map) {
        map.panTo(new L.LatLng(lat, lng));
      }
      //if the user denied access, then map was not created, then create a new map with searched location
      else {
        createMap(lat, lng);
      }

      //adding a marker to indicate that it is our location
      let marker = L.marker([lat, lng]).addTo(map);

      //get the weather data of country using the lat and lng obtained
      requestCountryWeather(lat, lng)
        .then((weatherdata) => {
          //remove the data generated from first initialization
          removePreviouslyRenderedHtml();

          //use the weather data
          handleWeatherData(weatherdata, countryState, countryShortCode);
        })
        .catch((err) => {
          console.log(err);
        });
    })
    .catch((err) => {
      //error handler for when the country does not exist
      countryError.textContent = err;
      countryError.classList.add("country-error-active");
    });
});

//function to show weather details on html
function renderCurrentWeatherDetails(countryState, countryShortCode, tempNow) {
  //todays date formatted using intl
  const todaysDate = Intl.DateTimeFormat("en-us", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  const html = `  <div class="weather-date-info">
  <p class="weather-country">${countryState}<span class="weather-country-code">${countryShortCode}</span></p>
  <p class="weather-date">${todaysDate}</p>
</div>
<div class="weather-temp"><i class="temp-icon fa-solid fa-temperature-quarter"></i> ${tempNow}</div>`;

  currentWeather.insertAdjacentHTML("beforeend", html);

  //if we previously searched a wrong country remove the error message
  countryError.classList.remove("country-error-active");
}

//to remove the previously rendered data from html when a new request is made
function removePreviouslyRenderedHtml() {
  const firstChildOfCurrentWeather = currentWeather.childNodes;

  const childrenOfWeatherOthers = weatherInfoOthers.childNodes;

  [...firstChildOfCurrentWeather].forEach((c) => c.remove());

  [...childrenOfWeatherOthers].forEach((c) => c.remove());
}

function handleWeatherData(weatherdata, countryState, countryShortCode) {
  const year = String(new Date().getFullYear());
  const month = String(new Date().getMonth() + 1);
  const day = String(new Date().getDate());
  const hour = String(new Date().getHours());

  //make the datestring of the weather data
  const dateString = `${year}-${month.padStart(2, "0")}-${day.padStart(
    2,
    "0"
  )}T${hour.padStart(2, "0")}:00`;

  const weatherHourly = weatherdata.hourly;
  //current time
  const indexOfTimeNow = weatherHourly.time.indexOf(dateString);

  //current temperature
  const tempNow =
    weatherHourly.temperature_2m[indexOfTimeNow] +
    weatherdata.hourly_units.temperature_2m;

  //current windspeed
  const windSpeedNow =
    weatherHourly.windspeed_10m[indexOfTimeNow] +
    weatherdata.hourly_units.windspeed_10m;

  //current humidity
  const humidityNow =
    weatherHourly.relativehumidity_2m[indexOfTimeNow] +
    weatherdata.hourly_units.relativehumidity_2m;

  //current visibility
  const visibilityNow =
    weatherHourly.visibility[indexOfTimeNow] +
    weatherdata.hourly_units.visibility;

  const weatherDesc = ["WINDSPEED", "HUMIDITY", "VISIBILITY"];
  const allWeatherIcons = [
    `fa-solid fa-wind`,
    "fa fa-solid fa-droplet",
    "fa fa-eye",
  ];
  const allWeatherData = [windSpeedNow, humidityNow, visibilityNow];

  //show on html
  renderCurrentWeatherDetails(countryState, countryShortCode, tempNow);

  //show other weather data on html
  allWeatherData.forEach((wData, i) => {
    renderWeatherOthers(wData, i, allWeatherIcons, weatherDesc);
  });
}

function renderWeatherOthers(othersWeatherData, index, iconsArr, weatherDesc) {
  const html = ` <div class="current-weather-others" data-others-id="others-${index}">
  <div class="weather-icon-container"><i class=" ${iconsArr[index]} weather-icon" aria-hidden="true"></i></div>
  <div class="weather-others-info">
  <div>
  <p class="weather-others-data">${weatherDesc[index]}</p>
    <p class="weather-others-data">${othersWeatherData}</p>
  </div>
  </div>
</div>`;

  weatherInfoOthers.insertAdjacentHTML("beforeend", html);
}

weatherInfoOthers.addEventListener("click", function (e) {
  const el = e.target.closest(".current-weather-others");
  // el.innerHTML = "";
  el.classList.toggle("current-weather-others-active");
});
