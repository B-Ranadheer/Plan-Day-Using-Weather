const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const { EMAIL, PASSWORD } = require('./env.js')
const app = express();
const port = 3002;

// MySQL connection configuration
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Pothireddy',
  database: 'aks' // Assuming your database is named 'aks'
});

// Connect to MySQL (handled automatically with connection pool)

// Middleware for parsing JSON bodies
app.use(bodyParser.json());

// Use cors middleware to enable CORS
app.use(cors());

// Route to execute SQL query (using async/await for cleaner syntax)
app.post('/execute-sql', async (req, res) => {
  const { sqlQuery } = req.body;

  try {
    const [result] = await pool.query(sqlQuery);
    console.log('SQL query executed successfully');
    res.json({ message: 'SQL query executed successfully', result });
  } catch (err) {
    console.error('Error executing SQL query:', err);
    res.status(500).json({ error: 'An error occurred while executing SQL query' });
  }
});

// Route to get tasks (demonstrating prepared statements)
app.get('/tasks', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT * FROM tasks');
    console.log('Tasks fetched successfully');
    res.json(result);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'An error occurred while fetching tasks' });
  }
});

// Route to add a task (demonstrating parameterized queries)
app.post('/tasks', async (req, res) => {
  const { title, description } = req.body;

  try {
    const [result] = await pool.query('INSERT INTO tasks (title, description) VALUES (?, ?)', [title, description]);
    console.log('Task added successfully');
    res.json({ message: 'Task added successfully', taskId: result.insertId }); // Get the inserted task ID
  } catch (err) {
    console.error('Error adding task:', err);
    res.status(500).json({ error: 'An error occurred while adding task' });
  }
});



app.post('/send-email', async (req, res) => {
  try {
    // Fetch the list of users
    const [users] = await pool.query('SELECT email, username FROM users');

    // Fetch the list of tasks
    const [tasks] = await pool.query('SELECT * FROM tasks');

    // Create a transporter for sending emails
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL,
        pass: PASSWORD,
      },
    });

    // Send the email to each user
    for (const user of users) {
      // Construct the email body
      let emailBody = `Greetings, ${user.username}!\n\nThis is the plan for your day on ${tasks[0].date_}:\n\n`;
      tasks.forEach(task => {
        const formattedTime = task.time_.toString().slice(0, 5); // Extract only the time part (HH:mm)
        if (formattedTime >= '00:00' && formattedTime <= '23:00') {
          emailBody += `${formattedTime}: ${task.task}\n`;
        }
      });

      const mailOptions = {
        from: EMAIL,
        to: user.email,
        subject: 'Daily Tasks',
        text: emailBody,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
        } else {
          console.log('Email sent:', info.response);
        }
      });
    }

    res.json({ message: 'Emails sent successfully' });
  } catch (err) {
    console.error('Error sending emails:', err);
    res.status(500).json({ error: 'An error occurred while sending emails' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});