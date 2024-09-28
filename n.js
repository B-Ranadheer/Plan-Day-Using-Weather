const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session'); // Session management library

const app = express();
const port = 3000;

// Apply the CORS middleware (usually placed before routes)
app.use(cors());

// Middleware to parse JSON bodies (should be before routes)
app.use(bodyParser.json());

// Assuming you use mysql2/promise for connection pooling
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Pothireddy', // Replace with your actual password
  database: 'aks',
});

// Configure session management (replace secret key with a strong random value)
const sessionConfig = {
  secret: 'how are you doing man', // Replace with a long, random string
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true for https environments
};
app.use(session(sessionConfig));

/*app.post('/weatherdata', async (req, res) => {
  const BaseURL = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/weatherdata/';
  const ApiKey = '236SM38B2ZGCNQ2XHU4PLWLFN';
  const UnitGroup = 'metric';
  const Locations = 'warangal';
  const QueryType = 'FORECAST';
  const AggregateHours = '1';
  const URL = `${BaseURL}${QueryType.toLowerCase()}?aggregateHours=${AggregateHours}&unitGroup=${UnitGroup}&locations=${Locations}&key=${ApiKey}&contentType=json`;
  console.log(' - Running query URL:', URL);
    try {
        const response = await fetch(URL);
        const weatherData = await response.json();

        const errorCode = weatherData.errorCode || 0;
        if (errorCode > 0) {
            console.log("An error occurred retrieving the data:", weatherData.message);
            return res.status(500).json({ error: 'An error occurred retrieving weather data' });
        }

        // Clear out existing data in the table
        cnx.query("TRUNCATE TABLE weather_data_schema.weather_data", (err, result) => {
            if (err) {
                console.log("Error truncating table:", err);
                return res.status(500).json({ error: 'Error truncating table' });
            }
        });

        const insert_weather_data = "INSERT INTO weather_data_schema.weather_data (address, latitude, longitude, datetime, tempmax, tempmin, temp, precip, wspd, wdir, wgust, pressure, uv_index, sunrise, sunset, humidity, visibility, feelslike) VALUES ?";
        const values = [];

        const locations = weatherData.locations;
        for (const [locationId, location] of Object.entries(locations)) {
            for (const value of location.values) {
                const data_wx = [
                    location.address,
                    location.latitude,
                    location.longitude,
                    new Date(value.datetime),
                    value.tempmax || null,
                    value.tempmin || null,
                    value.temp,
                    value.precip,
                    value.wspd,
                    value.wdir,
                    value.wgust,
                    value.sealevelpressure,
                    value.uvindex || 0,
                    new Date(value.sunrise),
                    new Date(value.sunset),
                    value.humidity || 0,
                    value.visibility || 0,
                    value.feelslike || null
                ];
                values.push(data_wx);
            }
        }

        cnx.query(insert_weather_data, [values], (err, result) => {
            if (err) {
                console.log("Error inserting data into MySQL:", err);
                return res.status(500).json({ error: 'Error inserting data into MySQL' });
            }

            console.log("Weather data inserted into MySQL successfully");
            res.status(200).json({ message: 'Weather data inserted successfully' });
        });

        cnx.end();
    } catch (err) {
        console.log('An error occurred while fetching weather data:', err);
        res.status(500).json({ error: 'An error occurred while fetching weather data' });
    }
});



});*/


app.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check for existing email
    const sqlCheckEmail = 'SELECT * FROM users WHERE email = ?';
    const [existingUser] = await pool.query(sqlCheckEmail, [email]);
    if (existingUser.length > 0) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    // Insert user with prepared statement
    const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    const [result] = await pool.query(sql, [username, email, password]);
    
    if (result.affectedRows > 0) { // Check if user was inserted
      res.status(200).send({ message: 'Successful' });
    } else {
      console.error('Error inserting user:', result); // Log potential insertion errors
      res.status(500).json({ error: 'Error creating user' });
    }
  } catch (err) {
    console.error('Error during signup:', err);
    res.status(500).json({ error: 'Error signing up' });
  }
});


app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ?';
  try {
    const [result] = await pool.query(sql, [email]);
    if (result.length > 0) {
      const user = result[0];

      const isPasswordValid = (password == user.password);
      if (isPasswordValid) {
        req.session.user = user; // Store user data in session
        console.log('User logged in successfully');
        res.status(200).send({ message: 'Successful' }); // Set status code and send response
      } else {
        req.session.message = 'Invalid email or password'; // Message for login page
        res.redirect('/'); // Redirect back to login page on failed login attempt
      }
    } else {
      req.session.message = 'Invalid email or password'; // Message for login page
      res.redirect('/'); // Redirect back to login page on failed login attempt
    }
  } catch (err) {
    console.error('Error querying user:', err);
    res.status(500).send('Error logging in');
  }
});


// ... (rest of your server.js code)

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
