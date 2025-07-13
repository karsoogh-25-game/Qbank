require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const db = require('./models');
const bcrypt = require('bcryptjs');

// Standard CJS requires for AdminJS v6
const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const AdminJSSequelize = require('@adminjs/sequelize');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('<h1>Contest Server is Running!</h1>');
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

const connectWithRetry = async () => {
  console.log('Attempting to connect to the database...');
  for (let retries = 10; retries > 0; retries--) {
    try {
      await db.sequelize.authenticate();
      console.log('Database connection has been established successfully.');
      return;
    } catch (err) {
      console.log(`Connection failed. Retrying... ${retries - 1} attempts left.`);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  throw new Error('Unable to connect to the database after multiple attempts.');
};

const start = async () => {
  try {
    await connectWithRetry();
    await db.sequelize.sync({ alter: true });
    console.log('All models were synchronized successfully.');

    AdminJS.registerAdapter({
      Resource: AdminJSSequelize.Resource,
      Database: AdminJSSequelize.Database,
    });

    const adminOptions = {
      rootPath: '/admin',
      resources: [
        { resource: db.Admin, options: { properties: { password: { isVisible: { list: false, show: false, edit: true, filter: false } } } } },
        db.Group,
        db.Question, // Question resource without any special features
        db.Submission,
      ],
      branding: { companyName: 'Contest Admin Panel', softwareBrochure: false },
    };

    const admin = new AdminJS(adminOptions);
    const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
      admin,
      {
        authenticate: async (email, password) => {
          const user = await db.Admin.findOne({ where: { username: email } });
          if (user) {
            const matched = await bcrypt.compare(password, user.password);
            if (matched) { return user; }
          }
          return false;
        },
        cookiePassword: 'a-super-secret-cookie-password-that-is-long',
      },
      null,
      {
        resave: false, saveUninitialized: true, secret: 'another-super-secret-cookie-password-that-is-long',
      }
    );
    app.use(admin.options.rootPath, adminRouter);

    const adminCount = await db.Admin.count();
    if (adminCount === 0) {
      const username = process.env.DEFAULT_ADMIN_USER;
      const password = process.env.DEFAULT_ADMIN_PASS;
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.Admin.create({ username, password: hashedPassword });
      console.log(`Default admin user '${username}' created.`);
    }

    server.listen(PORT, () => {
      console.log(`AdminJS started on http://localhost:3000${admin.options.rootPath}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();