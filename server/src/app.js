require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const db = require('./models');
const bcrypt = require('bcryptjs');
const formidable = require('express-formidable');
const path = require('path');

// Standard CJS requires for AdminJS v6
const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const AdminJSSequelize = require('@adminjs/sequelize');
const uploadFeature = require('@adminjs/upload');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));
app.use(formidable());

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

    const localProvider = {
      bucket: 'public/uploads',
      opts: {
        baseUrl: '/uploads',
      },
    };
    
    // Manually define and bundle upload components
    const componentLoader = new AdminJS.ComponentLoader();
    const Components = {
        Edit: componentLoader.add('UploadEdit', path.resolve(__dirname, 'admin/components/UploadEdit')),
        Show: componentLoader.add('UploadShow', path.resolve(__dirname, 'admin/components/UploadShow')),
        List: componentLoader.add('UploadList', path.resolve(__dirname, 'admin/components/UploadList')),
    };

    const adminOptions = {
      rootPath: '/admin',
      componentLoader, // Pass the loader instance
      resources: [
        { resource: db.Admin, options: { properties: { password: { isVisible: { list: false, show: false, edit: true, filter: false } } } } },
        db.Group,
        { 
          resource: db.Question, 
          features: [uploadFeature({
            provider: { local: localProvider },
            properties: {
              key: 'filePath', file: 'upload', filename: 'filename', mimeType: 'mimeType', size: 'size',
            },
            validation: {
              mimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
              maxSize: 5 * 1024 * 1024,
            },
            // Tell the feature to use our bundled components
            component: {
                edit: Components.Edit,
                list: Components.List,
                show: Components.Show,
            },
          })] 
        },
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

// We need placeholder files for the bundler to work.
const fs = require('fs');
const dir = path.join(__dirname, 'admin/components');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}
fs.writeFileSync(path.join(dir, 'UploadEdit.jsx'), 'export default () => null');
fs.writeFileSync(path.join(dir, 'UploadShow.jsx'), 'export default () => null');
fs.writeFileSync(path.join(dir, 'UploadList.jsx'), 'export default () => null');


start();