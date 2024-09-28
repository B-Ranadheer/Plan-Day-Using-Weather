const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const https = require('https'); // Import the built-in https module
const mysql = require('mysql2/promise');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

const sessionConfig = {
  secret: 'how are you doing man', // Replace with a long, random string
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true for https environments
};
app.use(session(sessionConfig));

app.post('/save-weather-data', async (req, res) => {
  try {
    const location = req.query.location;

    const AggregateHours = '1';
    const startDate = '2024-04-06';
    const endDate = '2024-04-06';
    const BaseURL = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/weatherdata/';
    const QueryType = 'HISTORY';
    const UnitGroup = 'metric';
    const ApiKey = '8R6YPGGMY3HX44KEAFVN2RNEE';
    const QueryParams = `${QueryType.toLowerCase()}?combinationMethod=aggregate&aggregateHours=1&startDateTime=${startDate}T00:00:00&endDateTime=${endDate}T23:59:59&collectStationContributions=true&maxStations=3&maxDistance=-1&includeNormals=false&contentType=csv&unitGroup=${UnitGroup}&locationMode=single&key=${ApiKey}&locations=${location}`;

    const url = `${BaseURL}${QueryParams}`;

    // console.log(url);

    const response = await fetchWeatherData(url);
    // console.log(response);

    // Handle potential empty response
    if (!response) {
      throw new Error('Empty weather data response');
    }

    const data = response.split('\n').map(line => {
      // Skip empty lines
      if (!line.trim()) return null; // Or an empty array if you prefer

      return line.split(',');
    }).filter(line => line); // Remove null/empty entries (if applicable)

    await parseAndInsertData(data, 'akshay_data8');

    console.log('Weather data inserted into database');
    res.status(200).json({ message: 'Weather data inserted successfully' });
  } catch (error) {
    console.error('Error saving weather data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function fetchWeatherData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        resolve(data);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}
function splitAndConvertRow(row) {
  const fields = [];
  let currentField = '';
  let inQuotes = false;
//   console.log(row);

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"' && !inQuotes) {
      inQuotes = true; // Start of quote
    } else if (char === '"' && inQuotes) {
      inQuotes = false; // End of quote
      fields.push(currentField);
      currentField = '';
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField.trim()); // Push trimmed current field
      currentField = '';
    } else {
      currentField += char; // Add character to current field
    }
  }

  // Handle the last field after the loop
  if (currentField.length > 0) {
    fields.push(currentField.trim()); // Push trimmed last field
  }
  fields.splice(1,1);
  fields.splice(2,1);
//   console.log(fields[1]);
  // console.log(fields);
  // Handle fields with commas within quotes
  const formattedFields = fields.map(field => {
    if (field.startsWith('"') && field.endsWith('"')) {
      // Remove leading and trailing quotes for quoted fields
      return field.slice(1, -1);
    } else if (!isNaN(field)) {
      // Convert to number if appropriate
      return parseFloat(field);
    } else {
      // Enclose other fields in quotes
      return `"${field}"`;
    }
  }); 

  // console.log(formattedFields);
  return formattedFields.join(' ');

}
async function parseAndInsertData(data, tableName) {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Pothireddy',
    database: 'aks'
  });

  for (let i = 1; i < data.length; i++) { // Start from 0 to handle headers (optional)
    const row = data[i];

    const rowString = row.join(',');
    const line = rowString.replace(/'([^']*)'/g, '$1');
    // console.log(line);
    if (!line) continue; // Skip empty lines

    try {
      // console.log(line);
      const fields = splitAndConvertRow(line);
      const array = fields.split(' ');
      for (let i = 0; i < array.length; i++) {
        // console.log(array[i]);
          if (array[i] === "NaN") {
            array[i] = "NULL";
          }
        }
      // console.log(array[10]);
      
      
      
const query = `INSERT INTO ${tableName} (location, date_ ,time_, temperature_celsius, apparent_temperature_celsius, dew_point_celsius, humidity, wind_speed_kmh, wind_gust_kmh, wind_bearing_degrees, cloud_cover, weather_type, precipitation_mm, precipitation_hours, visibility_km, pressure_mb, station, latitude, longitude, location_name, timezone, data_source, elevation, condition_k) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
const values = array;
await pool.query(query, values);
      
    } catch (error) {
      console.error('Error inserting data:', error);
      // Handle specific errors if needed (e.g., duplicate key violation)
    }
  }

  console.log('Data inserted into the database');

  pool.end(); // Close the connection pool
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


