import express from 'express';
import apminsight from 'apminsight';

apminsight.config();

const app = express();
const PORT = 3000;

const getOrder = async (orderId) => {
    // Añadimos un parámetro personalizado para que aparezca en los rastreos de Site24x7
    apminsight.addCustomParameter('order_id', orderId);
    
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ id: orderId, item: 'Laptop', price: 1200 });
        }, 500);
    });
};

app.get('/', (req, res) => {
  res.send('¡Hola! El servidor de monitoreo está funcionando.');
});

app.get('/order/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const order = await getOrder(id);
        res.json(order);
    } catch (error) {
        // Reportamos el error explícitamente a Site24x7
        apminsight.trackError(error);
        res.status(500).send('Error al obtener la orden');
    }
});

app.get('/slow', (req, res) => {
    apminsight.addCustomParameter('test_type', 'latency_test');
    setTimeout(() => {
        res.send('Esta es una respuesta lenta para probar el monitoreo');
    }, 2000);
});

app.get('/error', (req, res) => {
    const customError = new Error('Fallo crítico simulado en ' + new Date().toISOString());
    apminsight.trackError(customError);
    // Forzamos un código 500 y un mensaje claro
    res.status(500).json({
        status: 'error',
        message: 'Esto es un error intencional para Site24x7',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});