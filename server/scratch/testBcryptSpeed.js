const bcrypt = require('bcryptjs');

const test = async () => {
  console.time('rounds 10');
  await bcrypt.hash('123456', 10);
  console.timeEnd('rounds 10');

  console.time('rounds 8');
  await bcrypt.hash('123456', 8);
  console.timeEnd('rounds 8');

  console.time('rounds 4');
  await bcrypt.hash('123456', 4);
  console.timeEnd('rounds 4');
};

test();
