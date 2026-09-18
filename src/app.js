const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const config = require('./config/config');
const morgan = require('./config/morgan');
const { jwtStrategy } = require('./config/passport');
const { authLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');

const app = express();

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// set security HTTP headers
app.use(helmet());

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// sanitize request data
app.use(xss());
app.use(mongoSanitize());

// gzip compression
app.use(compression());

// enable cors
app.use(cors());
app.options('*', cors());

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/v1/auth', authLimiter);
}

// Health check route for AWS Load Balancer
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Professional HTML Landing Page for Root Route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Enterprise Node.js API | Live on AWS</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: center; max-width: 500px; width: 100%; border: 1px solid #334155; }
            h1 { color: #38bdf8; margin-bottom: 10px; font-size: 24px; }
            p { color: #94a3b8; font-size: 14px; margin-bottom: 20px; }
            .badge { background: #065f46; color: #34d399; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 20px; }
            .links { display: flex; justify-content: center; gap: 10px; }
            a { background: #0284c7; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; transition: background 0.2s; }
            a:hover { background: #0369a1; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>🚀 Enterprise API is Live!</h1>
            <p>Managed via Terraform, AWS ASG, ALB & CI/CD Pipelines.</p>
            <div class="badge">Status: Healthy & Running</div>
            <div class="links">
                <a href="/healthz" target="_blank">Health Check</a>
                <a href="/v1" target="_blank">API Routes</a>
            </div>
        </div>
    </body>
    </html>
  `);
});

// v1 api routes
app.use('/v1', routes);

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;