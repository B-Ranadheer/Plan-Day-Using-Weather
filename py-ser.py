import json
import mysql.connector
from datetime import datetime, timezone
import urllib.request
from flask import Flask, jsonify, request

app = Flask(__name__)

# This is the core of our weather query URL
BaseURL = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/weatherdata/'

ApiKey = '236SM38B2ZGCNQ2XHU4PLWLFN'
# UnitGroup sets the units of the output - us or metric
UnitGroup = 'metric'

# FORECAST or HISTORY
QueryType = 'FORECAST'

# 1=hourly, 24=daily
AggregateHours = '1'

@app.route('/fetch-weather-data', methods=['GET'])
def fetch_weather_data():
    # Get location from request query parameters
    location = request.args.get('location')

    if not location:
        return jsonify({"error": "Location parameter is missing"}), 400

    # Build the entire query
    URL = f'{BaseURL}{QueryType.lower()}?aggregateHours={AggregateHours}&unitGroup={UnitGroup}&locations={location}&key={ApiKey}&contentType=json'

    try:
        response = urllib.request.urlopen(URL)
        data = response.read()
        weatherData = json.loads(data.decode('utf-8'))
    except Exception as e:
        return jsonify({"error": f"An error occurred while fetching weather data: {e}"}), 500

    errorCode = weatherData.get("errorCode", 0)

    if errorCode > 0:
        return jsonify({"error": f"An error occurred retrieving the data: {weatherData.get('message', '')}"}), 500

    try:
        cnx = mysql.connector.connect(host='localhost',
                                       user='root',
                                       passwd='Pothireddy',
                                       database='weather_data_schema')
        cursor = cnx.cursor()

        # In this example, clear out the existing data in the table
        cursor.execute("TRUNCATE TABLE weather_data_schema.weather_data")
        cnx.commit()

        insert_weather_data = ("INSERT INTO weather_data_schema.weather_data "
                               "(address, latitude, longitude, datetime, tempmax, tempmin, temp, precip, wspd, wdir, wgust, pressure, uv_index, sunrise, sunset, humidity, visibility, feelslike ) "
                               "VALUES (%(address)s, %(latitude)s, %(longitude)s, %(datetime)s, %(tempmax)s, %(tempmin)s, %(temp)s, %(precip)s, %(wspd)s, %(wdir)s, %(wgust)s, %(pressure)s, %(uv_index)s, %(sunrise)s, %(sunset)s, %(humidity)s, %(visibility)s, %(feelslike)s)")

        # Iterate through the locations
        locations = weatherData["locations"]
        for locationid, location in locations.items():
            # Iterate through the values (values are the time periods in the weather data)
            for value in location["values"]:
                data_wx = {
                    'address': location["address"],
                    'latitude': location["latitude"],
                    'longitude': location["longitude"],
                    'datetime': datetime.fromtimestamp(value["datetime"] / 1000., timezone.utc),
                    'tempmax': value.get("tempmax", None),  # Provide default value if key is not present
                    'tempmin': value.get("tempmin", None),  # Provide default value if key is not present
                    'temp': value["temp"],
                    'precip': value["precip"],
                    'wspd': value["wspd"],
                    'wdir': value["wdir"],
                    'wgust': value["wgust"],
                    'pressure': value["sealevelpressure"],
                    'uv_index': value.get("uvindex", 0),
                    'sunrise': datetime.fromtimestamp(value.get("sunrise", 0) / 1000., timezone.utc).time(),
                    'sunset': datetime.fromtimestamp(value.get("sunset", 0) / 1000., timezone.utc).time(),
                    'humidity': value.get("humidity", 0),
                    'visibility': value.get("visibility", 0),
                    'feelslike': value.get("feelslike")  # Provide default value if key is not present
                }
                cursor.execute(insert_weather_data, data_wx)
                cnx.commit()

        cursor.close()
        cnx.close()
        return jsonify({"message": "Weather data fetched and inserted successfully"}), 200
    except mysql.connector.Error as err:
        return jsonify({"error": f"Error inserting data into MySQL: {err}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=3001)
