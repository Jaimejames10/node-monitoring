import tracer from 'dd-trace';
tracer.init({
  service: 'nodeapp-monitoring-demo', // Nombre descriptivo del servicio
  env: 'test',                       // Entorno (prod, staging, test)
  version: '1.0.0',                  // Versión de la app
  hostname: 'localhost',
  port: 8126,
  debug: true,
  runtimeMetrics: true,
  logInjection: true
});

import express from 'express';

const app = express();
const PORT = 3000;

// Middleware para añadir el nombre del recurso basado en la ruta (ayuda al monitoreo por URL)
app.use((req, res, next) => {
    const span = tracer.scope().active();
    if (span) {
        span.setTag('http.url_path', req.path);
    }
    next();
});

// Endpoint de salud (Health Check) - Ideal para Datadog Synthetics
app.get('/health', (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now()
    };
    try {
        res.send(healthcheck);
    } catch (error) {
        healthcheck.message = error;
        res.status(503).send();
    }
});

// Capturar excepciones no controladas (Caídas del sistema)
process.on('uncaughtException', (error) => {
    const span = tracer.scope().active() || tracer.startSpan('uncaught_exception');
    span.addTags({
        'error.msg': error.message,
        'error.stack': error.stack,
        'error.type': error.name,
        'system.status': 'critical_crash'
    });
    span.finish();
    console.error('CRASH DETECTADO:', error);
    setTimeout(() => process.exit(1), 1000);
});

app.get('/', (req, res) => {
  res.send('¡Hola! El servidor de monitoreo está funcionando. Prueba \n http://localhost:3000/health \n http://localhost:3000/order/123 \n http://localhost:3000/slow o \n http://localhost:3000/error');
});

app.get('/order/:id', async (req, res) => {
    const id = req.params.id;
    const span = tracer.scope().active();
    if (span) {
        span.setTag('order.id', id);
        span.setTag('resource.name', `GET /order/${id}`);
    }
    
    try {
        // Simulación de búsqueda
        const order = await new Promise((resolve) => {
            setTimeout(() => resolve({ id, item: 'Laptop', price: 1200 }), 100);
        });
        res.json(order);
    } catch (error) {
        res.status(500).send('Error al obtener la orden');
    }
});

app.get('/slow', (req, res) => {
    setTimeout(() => {
        res.send('Esta es una respuesta lenta para probar latencia en Datadog');
    }, 2000);
});

app.get('/error', (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'Error intencional para ver alertas en Datadog'
    });
});

app.listen(PORT, () => {
  console.log(`Servidor de pruebas corriendo en http://localhost:${PORT}`);
});