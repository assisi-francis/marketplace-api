import { sequelize } from './models/index.js';

sequelize.sync({ force: true })
  .then(() => {
    console.log('User table created successfully');
    process.exit();
  })
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });