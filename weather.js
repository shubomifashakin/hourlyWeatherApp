import "core-js/stable";
import { async } from "regenerator-runtime";

class Weather {
  cursor = document.querySelector(".cursor");
  searchBar = document.querySelector(".map-search");
  mapElement = document.querySelector("#map");
  mapForm = document.querySelector(".mapForm");
  currentWeather = document.querySelector(".current-weather");
  countryError = document.querySelector(".country-error");
  weatherDetailsContainer = document.querySelector(
    ".weather-details-container"
  );
  weatherInfoOthers = document.querySelector(".weather-info-others");

  map;

  constructor() {
    //app styles
    document.addEventListener("mousemove", (e) => {
      this.cursor.classList.remove("cursor-inactive");
      this.cursor.style.top = `${e.clientY}px`;
      this.cursor.style.left = `${e.clientX}px`;
    });

    //when the whole page has finished loading,remove default cursor
    window.addEventListener("load", function (e) {
      document.documentElement.style.cursor = "none";
    });

    document.addEventListener("mouseleave", (e) => {
      this.cursor.classList.toggle("cursor-inactive");
    });

    //searchbar styles
    this.searchBar.addEventListener("mouseover", (e) => {
      this.cursor.classList.add("cursor-input");
    });

    this.searchBar.addEventListener("mouseleave", (e) => {
      this.cursor.classList.remove("cursor-input");
    });

    this.weatherInfoOthers.addEventListener("click", function (e) {
      const el = e.target.closest(".current-weather-others");
      // el.innerHTML = "";
      el.classList.toggle("current-weather-others-active");
    });

    //when user loads page automatically get location and show weather in location
    navigator.geolocation.getCurrentPosition(
      this.gotLocation.bind(this),
      this.failedToGetLocation
    );

    //when the user searches for a country
    this.mapForm.addEventListener(
      "submit",
      this.handleCountrySearch.bind(this)
    );
  }

  //executed if the navigator was able to get the users location
  gotLocation(location) {
    const { latitude, longitude } = location.coords;

    //display users current location on map
    this.displayLocationOnMap(latitude, longitude);
  }

  //executed when the navigator failed to get the users location
  failedToGetLocation() {
    alert("Failed To Get Your Location");
  }

  async handleCountrySearch(e) {
    e.preventDefault();
    //get the name of country requested from the searchbar
    const country = this.searchBar.value;
    this.searchBar.value = "";

    //find the country details
    const countryResults = await this.forwardGeocoding(country);
    try {
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
      if (this.map) {
        this.map.panTo(new L.LatLng(lat, lng));
      }
      //if the user denied access, then map was not created, then create a new map with searched location
      else {
        this.createMap(lat, lng);
      }

      //adding a marker to indicate that it is our location
      let marker = L.marker([lat, lng]).addTo(this.map);

      //get the weather data of country using the lat and lng obtained
      const weatherdata = await this.requestCountryWeather(lat, lng);

      //remove the data generated from first initialization
      this.removePreviouslyRenderedHtml();

      //use the weather data
      this.handleWeatherData(weatherdata, countryState, countryShortCode);
    } catch (err) {
      //error handler for when the country does not exist
      this.countryError.textContent = err;
      this.countryError.classList.add("country-error-active");
      throw err;
    }
  }
  //get the details of country using longitude and latitude
  async backwardGeocoding(lat, lng) {
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
  async forwardGeocoding(country) {
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
      this.countryError.textContent = err;
      //if the response was not okay then also throw an error
      throw err;
    }
  }

  //request the country weather data using longitude and latitude
  async requestCountryWeather(lat, lng) {
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

  //this creates the map on the map container
  createMap(lat, lng) {
    this.map = L.map("map", { attributionControl: false }).setView(
      [lat, lng],
      10.5
    );

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(this.map);

    //adding a marker to indicate that it is our location
    let marker = L.marker([lat, lng]).addTo(this.map);
  }

  //displays location on map
  async displayLocationOnMap(lat, lng) {
    //creates The map
    this.createMap(lat, lng);

    //get the country details using the lat and long obtained
    const countryResults = await this.backwardGeocoding(lat, lng);
    //the name of the state gotten from country api
    //remove the word "state" from the name of the state
    const countryState = `${countryResults.components.state.replace(
      " State",
      ""
    )}`;

    const countryShortCode = `${countryResults.components["ISO_3166-1_alpha-2"]}`;

    //request weather for this country
    const weatherData = await this.requestCountryWeather(lat, lng);
    //use the weatherdata
    this.handleWeatherData(weatherData, countryState, countryShortCode);
  }

  //function to show weather details on html
  renderCurrentWeatherDetails(countryState, countryShortCode, tempNow) {
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

    this.currentWeather.insertAdjacentHTML("beforeend", html);

    //if we previously searched a wrong country remove the error message
    this.countryError.classList.remove("country-error-active");
  }

  //to remove the previously rendered data from html when a new request is made
  removePreviouslyRenderedHtml() {
    const firstChildOfCurrentWeather = this.currentWeather.childNodes;

    const childrenOfWeatherOthers = this.weatherInfoOthers.childNodes;

    [...firstChildOfCurrentWeather].forEach((c) => c.remove());

    [...childrenOfWeatherOthers].forEach((c) => c.remove());
  }

  handleWeatherData(weatherdata, countryState, countryShortCode) {
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
    this.renderCurrentWeatherDetails(countryState, countryShortCode, tempNow);

    //show other weather data on html
    allWeatherData.forEach((wData, i) => {
      this.renderWeatherOthers(wData, i, allWeatherIcons, weatherDesc);
    });
  }

  renderWeatherOthers(othersWeatherData, index, iconsArr, weatherDesc) {
    const html = ` <div class="current-weather-others" data-others-id="others-${index}">
  <div class="weather-icon-container"><i class=" ${iconsArr[index]} weather-icon" aria-hidden="true"></i></div>
  <div class="weather-others-info">
  <div>
  <p class="weather-others-data">${weatherDesc[index]}</p>
    <p class="weather-others-data">${othersWeatherData}</p>
  </div>
  </div>
</div>`;

    this.weatherInfoOthers.insertAdjacentHTML("beforeend", html);
  }
}

const weatherApp = new Weather();
