import express from 'express';
const app = express();
app.use('/quiz', express.static('dist-pages'));
app.listen(3201, '127.0.0.1');
